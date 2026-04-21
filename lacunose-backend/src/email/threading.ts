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
 * Remove quoted-reply cruft from an inbound email body. Covers:
 *   - Gmail:    "On <date>, <person> <email@…> wrote:"
 *   - Apple:    "On <date> at <time>, <person> <<email>> wrote:" (one or two lines)
 *   - Zoho:     "---- On <date> … <email> wrote ----"
 *   - Outlook:  From:/Sent:/To:/Subject: four-line header block
 *   - German:   "Am <date> schrieb <person>:"
 *   - Generic:  "-----Original Message-----" block
 *   - Quoted lines starting with `>` (any depth)
 *   - Signature sentinel `-- ` (RFC 3676)
 *
 * If stripping collapses everything (i.e. the regex matched the whole
 * body), returns the ORIGINAL raw text trimmed instead of an empty string
 * so staff replies never silently disappear.
 */
export function stripReplyQuotes(rawText: string): string {
  if (!rawText) return '';
  const lines = rawText.split(/\r?\n/);
  const out: string[] = [];

  const originalRe = /^[-]{2,}\s*original message\s*[-]{2,}/i;
  const onWroteRe = /^on\s+.{5,}(wrote|schrieb):\s*$/i;
  const gmailRe = /^on\s+.{3,}\s+<[^>]+@[^>]+>\s+wrote:?\s*$/i;
  const appleRe = /^on\s+.{3,}\s+at\s+.{3,}(,|\s).{3,}wrote:?\s*$/i;
  const zohoRe = /^[-]{2,}\s*on\s+.+\swrote\s*[-]{2,}$/i;
  const outlookFromRe = /^from:\s*\S/i;
  const germanAmRe = /^am\s+.{5,}schrieb\s+.+:\s*$/i;
  const frenchLeRe = /^le\s+.{5,}(a écrit|a écrit)\s*:\s*$/i;
  const forwardedRe = /^[-]{2,}\s*forwarded message\s*[-]{2,}/i;

  let prevBlank = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const trimmed = raw.trim();

    // Signature sentinel (with or without trailing space) terminates.
    if (trimmed === '--' || trimmed === '-- ') break;
    if (originalRe.test(trimmed) || forwardedRe.test(trimmed)) break;
    if (onWroteRe.test(trimmed) || gmailRe.test(trimmed) || appleRe.test(trimmed)) break;
    if (zohoRe.test(trimmed)) break;
    if (germanAmRe.test(trimmed) || frenchLeRe.test(trimmed)) break;

    // Outlook desktop: a blank line followed by `From: …` then `Sent:` is
    // the beginning of the quoted block. We look ahead up to 3 lines.
    if (prevBlank && outlookFromRe.test(trimmed)) {
      const ahead = lines.slice(i + 1, i + 4).join('\n').toLowerCase();
      if (/sent:\s/.test(ahead) && /to:\s/.test(ahead)) break;
    }

    // Quoted lines are dropped.
    if (trimmed.startsWith('>')) { prevBlank = false; continue; }

    out.push(raw);
    prevBlank = trimmed === '';
  }

  while (out.length > 0 && out[out.length - 1]!.trim() === '') out.pop();
  while (out.length > 0 && out[0]!.trim() === '') out.shift();

  const stripped = out.join('\n').trim();
  // If stripping collapsed everything (mis-detected signature or quoting),
  // fall back to the raw text. Better to show a noisy reply than nothing.
  if (!stripped) return rawText.trim();
  return stripped;
}
