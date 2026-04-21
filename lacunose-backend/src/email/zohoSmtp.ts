/**
 * Outbound email via Zoho Mail SMTP (TLS 465). Used only by the support bridge.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../lib/env.js';
import { log } from '../lib/logger.js';

const logger = log.child('support');

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Our generated RFC-5322 Message-ID, e.g. <support-{uuid}@lacunose.com>. */
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  /** Extra headers, typically `X-Lacunose-*`. */
  headers?: Record<string, string>;
}

let _transporter: Transporter | null = null;

function transporter(): Transporter {
  if (_transporter) return _transporter;
  if (!env.ZOHO_USER || !env.ZOHO_APP_PASSWORD) {
    throw new Error('zoho_credentials_missing');
  }
  _transporter = nodemailer.createTransport({
    host: env.ZOHO_SMTP_HOST,
    port: env.ZOHO_SMTP_PORT,
    secure: true,
    auth: {
      user: env.ZOHO_USER,
      pass: env.ZOHO_APP_PASSWORD,
    },
  });
  return _transporter;
}

export async function sendViaZoho(email: OutboundEmail): Promise<void> {
  const headers: Record<string, string> = {
    ...(email.headers ?? {}),
  };

  const options: Parameters<Transporter['sendMail']>[0] = {
    from: env.SUPPORT_FROM_ADDRESS,
    to: email.to,
    subject: email.subject,
    text: email.text,
    messageId: email.messageId,
    headers,
  };
  if (email.html) options.html = email.html;
  if (email.inReplyTo) options.inReplyTo = email.inReplyTo;
  if (email.references && email.references.length > 0) options.references = email.references;

  try {
    const info = await transporter().sendMail(options);
    logger.info('smtp_sent', {
      to: email.to,
      messageId: email.messageId,
      accepted: info.accepted?.length ?? 0,
      rejected: info.rejected?.length ?? 0,
    });
  } catch (err) {
    logger.error('smtp_send_failed', {
      to: email.to,
      messageId: email.messageId,
      err: (err as Error).message,
    });
    throw err;
  }
}
