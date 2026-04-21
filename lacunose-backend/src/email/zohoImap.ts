/**
 * Inbound email polling via Zoho Mail IMAP.
 *
 * We poll every `SUPPORT_POLL_INTERVAL_MS` from the support worker. The worker
 * is responsible for scheduling; this module just knows how to open INBOX,
 * fetch `SINCE <date>`, parse, and callback.
 */
import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';
import { env } from '../lib/env.js';
import { log } from '../lib/logger.js';

const logger = log.child('support');

export interface InboundEmail {
  /** Their RFC-5322 Message-ID. */
  messageId: string;
  /** Parent Message-ID this is replying to (first In-Reply-To header). */
  inReplyTo?: string;
  references: string[];
  subject: string;
  /** mailparser's `text` — plain-text body. */
  textPlain: string;
  /** mailparser's `html` (or `textAsHtml` fallback) when present. */
  textHtml?: string;
  from: string;
  date: Date;
  /** All `X-Lacunose-*` headers, lower-cased keys with the prefix kept. */
  xLacunoseHeaders: Record<string, string>;
  attachments: Array<{ filename: string; content: Buffer; contentType: string }>;
}

function extractXLacunose(parsed: ParsedMail): Record<string, string> {
  const out: Record<string, string> = {};
  // mailparser exposes headers as a Map (preserving case + duplicates).
  const headers = parsed.headers;
  for (const [key, value] of headers) {
    if (!key.toLowerCase().startsWith('x-lacunose-')) continue;
    if (typeof value === 'string') {
      out[key.toLowerCase()] = value;
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      out[key.toLowerCase()] = value[0] as string;
    }
  }
  // Some IMAP servers emit headerLines but not the Map for custom headers —
  // fall back to headerLines parsing.
  if (Object.keys(out).length === 0 && Array.isArray(parsed.headerLines)) {
    for (const h of parsed.headerLines) {
      if (!h.key.toLowerCase().startsWith('x-lacunose-')) continue;
      const [, v] = h.line.split(/:\s*/, 2);
      if (v) out[h.key.toLowerCase()] = v.trim();
    }
  }
  return out;
}

function firstFromAddress(parsed: ParsedMail): string {
  const from = parsed.from;
  if (!from) return '';
  const value = from.value?.[0]?.address;
  return typeof value === 'string' ? value : '';
}

function referenceList(parsed: ParsedMail): string[] {
  const refs = parsed.references;
  if (!refs) return [];
  if (Array.isArray(refs)) return refs.filter((s): s is string => typeof s === 'string');
  if (typeof refs === 'string') return refs.split(/\s+/).filter(Boolean);
  return [];
}

export interface PollOptions {
  /** Process messages with UID > sinceUid. If undefined, falls back to `sinceDate`. */
  sinceUid?: number;
  /** Used only when sinceUid is missing (cold start). IMAP SINCE is date-only. */
  sinceDate: Date;
}

export interface PollResult {
  processed: number;
  /** Highest UID seen this poll, or `sinceUid` if nothing new arrived. */
  lastUid: number;
}

export async function pollInbox(
  opts: PollOptions,
  onMessage: (m: InboundEmail) => Promise<void>
): Promise<PollResult> {
  if (!env.ZOHO_USER || !env.ZOHO_APP_PASSWORD) {
    logger.warn('imap_skipped_no_creds');
    return { processed: 0, lastUid: opts.sinceUid ?? 0 };
  }

  const client = new ImapFlow({
    host: env.ZOHO_IMAP_HOST,
    port: env.ZOHO_IMAP_PORT,
    secure: true,
    auth: {
      user: env.ZOHO_USER,
      pass: env.ZOHO_APP_PASSWORD,
    },
    logger: false,
  });

  let lastUid = opts.sinceUid ?? 0;
  let count = 0;

  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Prefer UID-based iteration (IMAP SINCE is date-granular and re-fetches
      // everything from midnight every poll on a quiet inbox). Cold start
      // (sinceUid = 0) falls back to the date window — one heavier poll, then
      // UID mode takes over.
      const fetchQuery = opts.sinceUid
        ? { uid: `${opts.sinceUid + 1}:*` }
        : { since: opts.sinceDate };

      for await (const msg of client.fetch(
        fetchQuery,
        { envelope: true, source: true, internalDate: true, uid: true }
      )) {
        if (typeof msg.uid === 'number' && msg.uid > lastUid) lastUid = msg.uid;
        if (!msg.source) continue;
        let parsed: ParsedMail;
        try {
          parsed = await simpleParser(msg.source);
        } catch (err) {
          logger.warn('imap_parse_failed', { err: (err as Error).message, uid: msg.uid });
          continue;
        }

        const from = firstFromAddress(parsed);
        // Skip our own outbound (should never land here, but belt-and-suspenders).
        if (from && from.toLowerCase() === env.SUPPORT_FROM_ADDRESS.toLowerCase()) continue;
        if (!parsed.messageId) continue;

        const inbound: InboundEmail = {
          messageId: parsed.messageId,
          ...(parsed.inReplyTo ? { inReplyTo: parsed.inReplyTo } : {}),
          references: referenceList(parsed),
          subject: parsed.subject ?? '',
          textPlain: parsed.text ?? '',
          ...(parsed.html
            ? { textHtml: typeof parsed.html === 'string' ? parsed.html : parsed.textAsHtml ?? '' }
            : parsed.textAsHtml
            ? { textHtml: parsed.textAsHtml }
            : {}),
          from,
          date: parsed.date ?? (msg.internalDate ? new Date(msg.internalDate) : new Date()),
          xLacunoseHeaders: extractXLacunose(parsed),
          attachments: (parsed.attachments ?? []).map((a) => ({
            filename: a.filename ?? 'attachment',
            content: a.content as Buffer,
            contentType: a.contentType ?? 'application/octet-stream',
          })),
        };

        try {
          await onMessage(inbound);
          count++;
        } catch (err) {
          logger.error('imap_on_message_failed', {
            err: (err as Error).message,
            messageId: inbound.messageId,
          });
        }
      }
      logger.info('imap_poll_complete', {
        processed: count,
        lastUid,
        mode: opts.sinceUid ? 'uid' : 'date',
      });
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore logout errors */
    }
  }

  return { processed: count, lastUid };
}
