/**
 * Pure helpers for RFC-5322 threading + subject lines + reply-quote stripping.
 */
import { randomUUID } from 'node:crypto';

const MAX_SUBJECT_BODY = 60;

/** Generates `<support-{uuid}@lacunose.com>`. */
export function makeMessageId(): string {
  return `<support-${randomUUID()}@lacunose.com>`;
}

/**
 * Build an email subject like `[LNS-0042] First line of message`, truncating
 * to 60 body chars. Uses the first non-empty line of the message body.
 */
export function makeTicketSubject(ticketCode: string, body: string): string {
  const firstLine =
    body
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? '';
  const trimmed = firstLine.length > MAX_SUBJECT_BODY
    ? firstLine.slice(0, MAX_SUBJECT_BODY - 1).trimEnd() + '…'
    : firstLine;
  return `[${ticketCode}] ${trimmed || '(no subject)'}`;
}

/**
 * Remove quoted-reply cruft from an inbound email body:
 *   - Lines starting with `>` (quoted reply lines, any depth)
 *   - `On <date>, <person> wrote:` prologue + everything after
 *   - `--- Original message ---` / `-----Original Message-----` blocks
 *   - Signature sentinel `-- ` (RFC 3676) and everything after
 *
 * Returns the remaining text, trimmed. Preserves internal blank lines.
 */
export function stripReplyQuotes(rawText: string): string {
  if (!rawText) return '';
  const lines = rawText.split(/\r?\n/);
  const out: string[] = [];

  const originalRe = /^[-]{2,}\s*original message\s*[-]{2,}/i;
  const onWroteRe = /^on\s+.{5,}(wrote|schrieb):\s*$/i;
  const gmailRe = /^on\s+.{5,}\s+<.+@.+>\s+wrote:\s*$/i;

  for (const line of lines) {
    const trimmed = line.trim();

    // Signature sentinel terminates the message.
    if (trimmed === '--') break;
    // Original-message block terminates.
    if (originalRe.test(trimmed)) break;
    // "On <date>, <person> wrote:" terminates.
    if (onWroteRe.test(trimmed) || gmailRe.test(trimmed)) break;
    // Quoted lines are dropped.
    if (trimmed.startsWith('>')) continue;

    out.push(line);
  }

  // Collapse trailing blank lines.
  while (out.length > 0 && out[out.length - 1]!.trim() === '') out.pop();
  while (out.length > 0 && out[0]!.trim() === '') out.shift();

  return out.join('\n').trim();
}
