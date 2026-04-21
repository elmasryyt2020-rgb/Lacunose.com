/**
 * Minimal structured logger.
 * Outputs single-line JSON in production (ingested by PM2 → PostHog log handler),
 * human-readable lines in dev.
 */
import { env } from './env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN: Level = env.NODE_ENV === 'production' ? 'info' : 'debug';

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (ORDER[level] < ORDER[MIN]) return;
  const record = { level, time: new Date().toISOString(), msg, ...meta };
  const line = env.NODE_ENV === 'production'
    ? JSON.stringify(record)
    : `[${level.toUpperCase()}] ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit('debug', msg, meta),
  info:  (msg: string, meta?: Record<string, unknown>) => emit('info',  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => emit('warn',  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
  child: (scope: string) => ({
    debug: (msg: string, meta?: Record<string, unknown>) => emit('debug', `[${scope}] ${msg}`, meta),
    info:  (msg: string, meta?: Record<string, unknown>) => emit('info',  `[${scope}] ${msg}`, meta),
    warn:  (msg: string, meta?: Record<string, unknown>) => emit('warn',  `[${scope}] ${msg}`, meta),
    error: (msg: string, meta?: Record<string, unknown>) => emit('error', `[${scope}] ${msg}`, meta),
  }),
};
