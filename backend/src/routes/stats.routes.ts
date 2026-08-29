import { Router } from 'express';
import { prisma } from '../services/prisma';
import { emailQueue } from '../services/queue';
import { getCurrentRateLimitUsage } from '../services/rateLimiter';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

const router = Router();

function getUserId(req: any): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], config.jwtSecret) as { userId: string };
      return decoded.userId;
    } catch (e) {}
  }
  return req.query.userId as string || 'default-user-id';
}

router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);

    const [scheduledCount, sentCount, failedCount, rateLimitedCount] = await Promise.all([
      prisma.scheduledEmailJob.count({ where: { userId, status: 'PENDING' } }),
      prisma.scheduledEmailJob.count({ where: { userId, status: 'SENT' } }),
      prisma.scheduledEmailJob.count({ where: { userId, status: 'FAILED' } }),
      prisma.scheduledEmailJob.count({ where: { userId, status: 'RATE_LIMITED' } }),
    ]);

    // Get Queue status from BullMQ
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
      emailQueue.getDelayedCount(),
    ]);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const senderEmail = user?.email || 'demo@reachinbox.ai';
    const rateLimitUsage = await getCurrentRateLimitUsage(senderEmail);

    return res.json({
      overview: {
        scheduled: scheduledCount + rateLimitedCount,
        sent: sentCount,
        failed: failedCount,
        rateLimited: rateLimitedCount,
        total: scheduledCount + sentCount + failedCount + rateLimitedCount,
      },
      queue: {
        waiting,
        active,
        completed,
        failed,
        delayed,
      },
      rateLimit: {
        senderEmail,
        currentCount: rateLimitUsage.currentCount,
        maxLimit: rateLimitUsage.maxLimit,
      },
    });
  } catch (error: any) {
    console.error('Error getting dashboard stats:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
