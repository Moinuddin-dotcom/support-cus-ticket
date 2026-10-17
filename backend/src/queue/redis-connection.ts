import { ConnectionOptions } from 'bullmq';

/** Converts a redis:// or rediss:// URL (as given by Render / docker-compose) into BullMQ options. */
export function redisConnectionFromUrl(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  const db = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0;
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: Number.isNaN(db) ? 0 : db,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    // Required by BullMQ workers (blocking commands must not time out).
    maxRetriesPerRequest: null,
  };
}
