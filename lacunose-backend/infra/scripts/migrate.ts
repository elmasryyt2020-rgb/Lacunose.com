/**
 * Applies supabase/migrations/*.sql in order against the configured Postgres.
 * Run: `npm run migrate`
 * Safe to re-run — every migration is idempotent.
 */
import '../../src/lib/env.js';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';
import { env } from '../../src/lib/env.js';
import { log } from '../../src/lib/logger.js';

const logger = log.child('migrate');

async function main() {
  const dir = join(process.cwd(), 'supabase', 'migrations');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) {
    logger.warn('no-migrations-found', { dir });
    return;
  }

  const client = new pg.Client({ connectionString: env.POSTGRES_URL });
  await client.connect();

  try {
    for (const file of files) {
      const sql = await readFile(join(dir, file), 'utf-8');
      logger.info('applying', { file, bytes: sql.length });
      await client.query(sql);
      logger.info('applied', { file });
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  logger.error('fatal', { err: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
