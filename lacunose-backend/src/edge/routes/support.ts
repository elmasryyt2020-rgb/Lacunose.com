/**
 * GET  /v1/support/thread   — the user's active thread + last 50 messages
 * POST /v1/support/messages — append a user message, enqueue outbound email
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type {
  SendSupportMessageRequest,
  SendSupportMessageResponse,
  SupportJob,
  SupportMessage,
  SupportThread,
} from '@lacunose/types';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { log } from '../../lib/logger.js';
import { checkUserRate } from '../rateLimit.js';
import { supportQueue } from '../queues.js';
import { makeMessageId } from '../../email/threading.js';

const logger = log.child('edge');

const SendSchema = z.object({
  body: z.string().min(1).max(10_000),
  thread_id: z.string().uuid().optional(),
}) satisfies z.ZodType<SendSupportMessageRequest>;

async function getOrCreateActiveThread(userId: string): Promise<SupportThread> {
  const sb = supabaseAdmin();
  // Prefer an open thread; fall back to the most recent.
  const { data: open, error: e1 } = await sb
    .from('support_threads')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'open')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (e1) throw new Error(`thread_lookup_failed: ${e1.message}`);
  if (open) return open as SupportThread;

  const { data: latest, error: e2 } = await sb
    .from('support_threads')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (e2) throw new Error(`thread_lookup_failed: ${e2.message}`);
  if (latest) return latest as SupportThread;

  // None at all — create a new one. The partial unique index
  // `support_threads_one_open_per_user` means two parallel requests race
  // safely: exactly one insert wins; the other gets 23505, at which point
  // we re-read the now-existing open thread.
  const { data: created, error: e3 } = await sb
    .from('support_threads')
    .insert({ user_id: userId })
    .select('*')
    .single();
  if (created) return created as SupportThread;

  if (e3?.code === '23505') {
    const { data: afterRace } = await sb
      .from('support_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'open')
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (afterRace) return afterRace as SupportThread;
  }

  throw new Error(`thread_create_failed: ${e3?.message ?? 'no_row'}`);
}

const plugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /v1/support/thread
  fastify.get('/v1/support/thread', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const started = Date.now();
    const user = req.user!;
    try {
      const thread = await getOrCreateActiveThread(user.id);
      const sb = supabaseAdmin();
      const { data: messages, error } = await sb
        .from('support_messages')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw new Error(error.message);

      logger.info('support_thread_fetched', {
        reqId: req.id,
        userId: user.id,
        threadId: thread.id,
        n: messages?.length ?? 0,
        latencyMs: Date.now() - started,
      });
      reply.send({ thread, messages: (messages ?? []) as SupportMessage[] });
    } catch (err) {
      logger.error('support_thread_failed', {
        reqId: req.id,
        userId: user.id,
        err: (err as Error).message,
      });
      reply.code(500).send({ error: 'thread_failed' });
    }
  });

  // POST /v1/support/messages
  fastify.post('/v1/support/messages', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const started = Date.now();
    const user = req.user!;

    const parsed = SendSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;

    const rate = await checkUserRate(user.id, 'support');
    if (!rate.allowed) {
      reply
        .header('Retry-After', String(rate.retryAfterSec ?? 60))
        .code(429)
        .send({ error: 'rate_limited', retry_after_sec: rate.retryAfterSec });
      return;
    }

    const sb = supabaseAdmin();

    let thread: SupportThread;
    try {
      if (body.thread_id) {
        const { data, error } = await sb
          .from('support_threads')
          .select('*')
          .eq('id', body.thread_id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) {
          reply.code(404).send({ error: 'thread_not_found' });
          return;
        }
        thread = data as SupportThread;
      } else {
        thread = await getOrCreateActiveThread(user.id);
      }
    } catch (err) {
      logger.error('support_thread_resolve_failed', {
        reqId: req.id,
        userId: user.id,
        err: (err as Error).message,
      });
      reply.code(500).send({ error: 'thread_failed' });
      return;
    }

    // Build Message-ID for threading.
    const messageId = makeMessageId();

    // Find the latest email_message_id on this thread (for In-Reply-To).
    const { data: last } = await sb
      .from('support_messages')
      .select('email_message_id')
      .eq('thread_id', thread.id)
      .not('email_message_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const parentMessageId: string | undefined =
      (last?.email_message_id as string | undefined) ?? undefined;

    const { data: inserted, error: insertErr } = await sb
      .from('support_messages')
      .insert({
        thread_id: thread.id,
        is_user: true,
        body: body.body,
        email_message_id: messageId,
        in_reply_to: parentMessageId ?? null,
        attachments: [],
      })
      .select('*')
      .single();
    if (insertErr || !inserted) {
      logger.error('support_message_insert_failed', {
        reqId: req.id,
        userId: user.id,
        err: insertErr?.message,
      });
      reply.code(500).send({ error: 'insert_failed' });
      return;
    }

    // Enqueue outbound email job. `message_id` is the RFC-5322 Message-ID
    // (the email header value) — the worker/SMTP layer consumes it verbatim.
    const job: Extract<SupportJob, { kind: 'send_outbound' }> = {
      kind: 'send_outbound',
      thread_id: thread.id,
      message_id: messageId,
      body: body.body,
      user_email: user.email,
      user_id: user.id,
      ticket_code: thread.ticket_code,
      ...(parentMessageId ? { parent_message_id: parentMessageId } : {}),
    };
    await supportQueue.add('send_outbound', job, {
      removeOnComplete: 1000,
      removeOnFail: 1000,
      attempts: 5,
      backoff: { type: 'exponential', delay: 10_000 },
    });

    const resp: SendSupportMessageResponse = {
      message: inserted as SupportMessage,
      thread,
    };
    logger.info('support_message_sent', {
      reqId: req.id,
      userId: user.id,
      threadId: thread.id,
      messageId: inserted.id,
      latencyMs: Date.now() - started,
    });
    reply.code(201).send(resp);
  });
};

export default plugin;
