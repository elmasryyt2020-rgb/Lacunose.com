/**
 * Shared ioredis client + BullMQ connection.
 * Single process-wide client; BullMQ needs `maxRetriesPerRequest: null`.
 */
import IORedis, { type Redis } from 'ioredis';
import { env } from './env.js';

let _client: Redis | null = null;
export function redis(): Redis {
  if (!_client) {
    _client = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    _client.on('error', (e) => {
      // eslint-disable-next-line no-console
      console.error('[redis]', e.message);
    });
  }
  return _client;
}

export function bullConnection() {
  return {
    connection: redis(),
  };
}
