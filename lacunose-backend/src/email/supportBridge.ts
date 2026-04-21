/**
 * High-level orchestrator for the email-backed support bridge.
 *
 * Imported by the support worker (src/workers/support.ts, out of this task's
 * scope). Two entry points:
 *
 *   handleOutbound(job): send a user message to the staff inbox.
 *   handleInboundPoll(): poll Zoho IMAP, route replies back into threads,
 *                         create notifications + push.
 */
import { fetch as undiciFetch } from 'undici';
import type { SupportJob } from '@lacunose/types';
import { env } from '../lib/env.js';
import { log } from '../lib/logger.js';
import { redis } from '../lib/redis.js';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { sendViaZoho } from './zohoSmtp.js';
import { pollInbox, type InboundEmail } from './zohoImap.js';
import { makeTicketSubject, stripReplyQuotes } from './threading.js';

const logger = log.child('support');

const LAST_POLL_KEY = 'support:lastPoll';
const MAX_POLL_LOOKBACK_MS = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// Outbound: user message → staff email
// ---------------------------------------------------------------------------

export async function handleOutbound(
  job: Extract<SupportJob, { kind: 'send_outbound' }>
): Promise<void> {
  const sb = supabaseAdmin();

  // Prior email_message_ids on this thread, chronological, for References header.
  const { data: priorMessages, error: priorErr } = await sb
    .from('support_messages')
    .select('email_message_id, created_at')
    .eq('thread_id', job.thread_id)
    .not('email_message_id', 'is', null)
    .order('created_at', { ascending: true });
  if (priorErr) {
    logger.error('support_prior_lookup_failed', {
      threadId: job.thread_id,
      err: priorErr.message,
    });
  }
  const references = (priorMessages ?? [])
    .map((r) => r.email_message_id as string | null)
    .filter((x): x is string => Boolean(x) && x !== job.message_id);

  const subject = makeTicketSubject(job.ticket_code, job.body);

  const headerBlock =
    `From user: ${job.user_email}\n` +
    `App version: (not yet available)\n` +
    `Ticket: ${job.ticket_code}\n` +
    `Thread: https://support.lacunose.com/t/${job.ticket_code}   (future admin tool)\n\n` +
    `--- message ---\n` +
    `${job.body}\n`;

  const headers: Record<string, string> = {
    'X-Lacunose-Thread': job.thread_id,
    'X-Lacunose-User': job.user_id,
    'X-Lacunose-Email': job.user_email,
    'X-Lacunose-Ticket': job.ticket_code,
  };

  await sendViaZoho({
    to: env.SUPPORT_STAFF_ADDRESS,
    subject,
    text: headerBlock,
    messageId: job.message_id,
    ...(job.parent_message_id ? { inReplyTo: job.parent_message_id } : {}),
    references,
    headers,
  });

  logger.info('support_outbound_sent', {
    threadId: job.thread_id,
    ticket: job.ticket_code,
    references: references.length,
  });
}

// ---------------------------------------------------------------------------
// Inbound: staff email → support_messages row + notification + push
// ---------------------------------------------------------------------------

async function resolveThread(inbound: InboundEmail): Promise<{
  thread_id: string;
  user_id: string;
} | null> {
  const sb = supabaseAdmin();

  const headerThread = inbound.xLacunoseHeaders['x-lacunose-thread'];
  if (headerThread) {
    const { data } = await sb
      .from('support_threads')
      .select('id, user_id')
      .eq('id', headerThread)
      .maybeSingle();
    if (data) return { thread_id: data.id as string, user_id: data.user_id as string };
  }

  // Fall back: match In-Reply-To / References against known email_message_ids.
  const candidates = [inbound.inReplyTo, ...inbound.references].filter(
    (x): x is string => typeof x === 'string' && x.length > 0
  );
  if (candidates.length === 0) return null;

  const { data: match } = await sb
    .from('support_messages')
    .select('thread_id')
    .in('email_message_id', candidates)
    .limit(1)
    .maybeSingle();
  if (!match) return null;

  const { data: thread } = await sb
    .from('support_threads')
    .select('id, user_id')
    .eq('id', match.thread_id)
    .maybeSingle();
  if (!thread) return null;
  return { thread_id: thread.id as string, user_id: thread.user_id as string };
}

/** Chunk array into sub-arrays of at most `size` items. */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function pruneDeadTokens(deadTokens: string[]): Promise<void> {
  if (deadTokens.length === 0) return;
  const sb = supabaseAdmin();
  const { error } = await sb.from('push_tokens').delete().in('token', deadTokens);
  if (error) {
    logger.warn('push_token_prune_failed', { err: error.message });
    return;
  }
  logger.info('push_tokens_pruned', { count: deadTokens.length });
}

async function sendExpoPush(userId: string, title: string, body: string): Promise<void> {
  if (!env.EXPO_ACCESS_TOKEN) return;
  const sb = supabaseAdmin();
  const { data: tokens, error } = await sb
    .from('push_tokens')
    .select('token, platform')
    .eq('user_id', userId);
  if (error || !tokens || tokens.length === 0) return;

  const messages = tokens.map((t) => ({
    to: t.token,
    sound: 'default',
    title,
    body,
    data: { kind: 'support_reply' },
  }));

  // Expo's push endpoint caps at 100 messages per request.
  const dead: string[] = [];
  for (const batch of chunk(messages, 100)) {
    try {
      const res = await undiciFetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        logger.warn('expo_push_non_2xx', { status: res.status });
        continue;
      }
      const payload = (await res.json()) as { data?: Array<{ status?: string; details?: { error?: string } }> };
      const tickets = payload.data ?? [];
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (!ticket) continue;
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          const msg = batch[i];
          if (msg?.to) dead.push(msg.to);
        }
      }
    } catch (err) {
      logger.warn('expo_push_failed', { err: (err as Error).message });
    }
  }
  if (dead.length > 0) await pruneDeadTokens(dead);
}

async function onInboundMessage(inbound: InboundEmail): Promise<void> {
  const sb = supabaseAdmin();

  // Duplicate guard — if we already stored this Message-ID, skip.
  const { data: existing } = await sb
    .from('support_messages')
    .select('id')
    .eq('email_message_id', inbound.messageId)
    .maybeSingle();
  if (existing) return;

  const routed = await resolveThread(inbound);
  if (!routed) {
    logger.warn('support_inbound_orphan', {
      messageId: inbound.messageId,
      inReplyTo: inbound.inReplyTo,
      from: inbound.from,
    });
    return;
  }

  // stripReplyQuotes falls back to the raw text when stripping would yield
  // an empty body, so we don't silently drop staff replies that don't match
  // our quote heuristics. Final safety net: if truly empty, skip.
  const stripped = stripReplyQuotes(inbound.textPlain);
  if (!stripped) return;

  const { error: insErr } = await sb.from('support_messages').insert({
    thread_id: routed.thread_id,
    is_user: false,
    body: stripped,
    email_message_id: inbound.messageId,
    in_reply_to: inbound.inReplyTo ?? null,
    attachments: [], // Attachment upload to Storage is out-of-scope for v1.
  });
  if (insErr) {
    logger.error('support_inbound_insert_failed', {
      messageId: inbound.messageId,
      err: insErr.message,
    });
    return;
  }

  const snippet = stripped.length > 80 ? stripped.slice(0, 77) + '...' : stripped;
  await sb.from('notifications').insert({
    user_id: routed.user_id,
    kind: 'support_reply',
    title: 'Support replied',
    body: snippet,
    data: { thread_id: routed.thread_id },
  });

  await sendExpoPush(routed.user_id, 'Support replied', snippet);

  logger.info('support_inbound_routed', {
    threadId: routed.thread_id,
    userId: routed.user_id,
    messageId: inbound.messageId,
  });
}

const LAST_UID_KEY = 'support:lastUid';

export async function handleInboundPoll(): Promise<void> {
  const client = redis();

  // Prefer UID-based cursor so we only fetch mail that arrived since the
  // previous poll. On cold start (no key) we fall back to SINCE <yesterday>
  // to seed the cursor, then UID mode takes over.
  const lastUidRaw = await client.get(LAST_UID_KEY);
  const sinceUid = lastUidRaw ? Number(lastUidRaw) : 0;

  const now = Date.now();
  const fallback = now - MAX_POLL_LOOKBACK_MS;
  const lastPollRaw = await client.get(LAST_POLL_KEY);
  let sinceMs = lastPollRaw ? Number(lastPollRaw) : fallback;
  if (!Number.isFinite(sinceMs) || sinceMs < fallback) sinceMs = fallback;
  const sinceDate = new Date(sinceMs);

  const opts: { sinceUid?: number; sinceDate: Date } = { sinceDate };
  if (Number.isFinite(sinceUid) && sinceUid > 0) opts.sinceUid = sinceUid;

  const { lastUid } = await pollInbox(opts, onInboundMessage);

  // Persist AFTER a successful poll. If the poll threw we'd catch that
  // upstream and re-use the existing cursor on the next tick.
  if (lastUid > sinceUid) {
    await client.set(LAST_UID_KEY, String(lastUid));
  }
  await client.set(LAST_POLL_KEY, String(now));
}
