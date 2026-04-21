/**
 * Typed + validated env var access. Fails fast at boot if anything's missing.
 */
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // LLM
  LLM_PROVIDER: z.enum(['anthropic', 'anthropic-allopus', 'deepseek', 'mock']).default('anthropic'),
  ANTHROPIC_OPUS_MODEL: z.string().default('claude-opus-4-7'),
  ANTHROPIC_HAIKU_MODEL: z.string().default('claude-haiku-4-5-20251001'),
  ANTHROPIC_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),
  COHERE_API_KEY: z.string().optional(),
  SEMANTIC_SCHOLAR_API_KEY: z.string().optional(),
  PUBMED_API_KEY: z.string().optional(),
  POLITE_EMAIL: z.string().email().default('hello@lacunose.com'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  SUPABASE_JWT_SECRET: z.string(),
  POSTGRES_URL: z.string(),

  // Queue
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Edge-fn
  EDGE_FN_PORT: z.coerce.number().default(4000),
  EDGE_FN_HOST: z.string().default('0.0.0.0'),

  // PDF parser
  PDF_PARSER: z.enum(['pymupdf', 'grobid']).default('pymupdf'),
  PYMUPDF_PY: z.string().default('/usr/bin/python3'),

  // Zoho
  SUPPORT_FROM_ADDRESS: z.string().email().default('support@lacunose.com'),
  SUPPORT_STAFF_ADDRESS: z.string().email().default('team@lacunose.com'),
  ZOHO_IMAP_HOST: z.string().default('imap.zoho.com'),
  ZOHO_IMAP_PORT: z.coerce.number().default(993),
  ZOHO_SMTP_HOST: z.string().default('smtp.zoho.com'),
  ZOHO_SMTP_PORT: z.coerce.number().default(465),
  ZOHO_USER: z.string().optional(),
  ZOHO_APP_PASSWORD: z.string().optional(),
  SUPPORT_POLL_INTERVAL_MS: z.coerce.number().default(30_000),

  // Billing
  REVENUECAT_SECRET_KEY: z.string().optional(),
  REVENUECAT_WEBHOOK_TOKEN: z.string().optional(),

  // Observability
  SENTRY_DSN_BACKEND: z.string().optional(),
  POSTHOG_HOST: z.string().url().default('https://eu.posthog.com'),
  POSTHOG_KEY_SERVER: z.string().optional(),

  // Push
  EXPO_ACCESS_TOKEN: z.string().optional(),

  // Quotas
  FREE_MONTHLY_ANALYSES: z.coerce.number().default(3),
  PRO_MONTHLY_ANALYSES: z.coerce.number().default(50),
  PREMIUM_MONTHLY_ANALYSES: z.coerce.number().default(150),
  MAX_ANALYSIS_TOKENS: z.coerce.number().default(500_000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Env validation failed:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
export type Env = typeof env;
