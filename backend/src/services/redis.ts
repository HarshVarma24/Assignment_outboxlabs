import Redis from 'ioredis';
import { config } from '../config/env';

export const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
});

redisConnection.on('connect', () => {
  console.log('✅ Connected to Redis successfully');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err);
});
