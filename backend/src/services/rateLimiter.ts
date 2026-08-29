import { redisConnection } from './redis';
import { config } from '../config/env';

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  maxLimit: number;
  nextHourStart: Date | null;
}

export async function checkAndIncrementRateLimit(senderEmail: string, customLimit?: number): Promise<RateLimitResult> {
  const maxLimit = customLimit && customLimit > 0 ? customLimit : config.maxEmailsPerHour;
  const now = new Date();
  
  // Format YYYY-MM-DD-HH for hour window
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  
  const windowKey = `rate_limit:${senderEmail}:${year}-${month}-${day}-${hour}`;

  // Execute INCR atomically
  const currentCount = await redisConnection.incr(windowKey);
  
  // Set TTL on first count increment in this window (2 hours TTL)
  if (currentCount === 1) {
    await redisConnection.expire(windowKey, 7200);
  }

  // Calculate start of next hour window in UTC
  const nextHourStart = new Date(Date.UTC(year, now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1, 0, 0, 0));

  if (currentCount > maxLimit) {
    return {
      allowed: false,
      currentCount,
      maxLimit,
      nextHourStart,
    };
  }

  return {
    allowed: true,
    currentCount,
    maxLimit,
    nextHourStart: null,
  };
}

export async function getCurrentRateLimitUsage(senderEmail: string, customLimit?: number): Promise<{ currentCount: number; maxLimit: number }> {
  const maxLimit = customLimit && customLimit > 0 ? customLimit : config.maxEmailsPerHour;
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  
  const windowKey = `rate_limit:${senderEmail}:${year}-${month}-${day}-${hour}`;
  const countStr = await redisConnection.get(windowKey);
  const currentCount = countStr ? parseInt(countStr, 10) : 0;

  return { currentCount, maxLimit };
}
