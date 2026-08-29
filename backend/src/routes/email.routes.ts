import { Router } from 'express';
import { prisma } from '../services/prisma';
import { scheduleEmailJob, emailQueue } from '../services/queue';
import { searchEmails, indexEmailJob } from '../services/elasticsearch';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

const router = Router();

// Middleware to extract user from JWT
function getUserId(req: any): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], config.jwtSecret) as { userId: string };
      return decoded.userId;
    } catch (e) {
      // Fallback
    }
  }
  return req.body.userId || req.query.userId || 'default-user-id';
}

// 1. Schedule Emails API Endpoint
router.post('/schedule', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { recipients, subject, body, startTime, delayMs, hourlyLimit, senderEmail } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Recipients array is required' });
    }
    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required' });
    }

    // Ensure User exists in DB
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: 'demo@reachinbox.ai',
          name: 'ReachInbox Demo User',
        },
      });
    }

    const effectiveSender = senderEmail || user.email || 'sender@reachinbox.ai';
    const baseStartTime = startTime ? new Date(startTime) : new Date();
    const delayBetween = typeof delayMs === 'number' ? delayMs : config.defaultMinDelayMs;
    const limit = typeof hourlyLimit === 'number' ? hourlyLimit : config.maxEmailsPerHour;

    const scheduledJobs = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i].trim();
      if (!recipient) continue;

      // Stagger start time by delayBetween to prevent burst lock
      const jobScheduledAt = new Date(baseStartTime.getTime() + i * delayBetween);

      // Create record in DB
      const dbJob = await prisma.scheduledEmailJob.create({
        data: {
          userId: user.id,
          senderEmail: effectiveSender,
          recipientEmail: recipient,
          subject,
          body,
          status: 'PENDING',
          scheduledAt: jobScheduledAt,
        },
      });

      // Schedule in BullMQ Queue
      await scheduleEmailJob({
        jobId: dbJob.id,
        userId: user.id,
        senderEmail: effectiveSender,
        recipientEmail: recipient,
        subject,
        body,
        scheduledAt: jobScheduledAt.toISOString(),
        delayMs: delayBetween,
        hourlyLimit: limit,
      });

      scheduledJobs.push(dbJob);
    }

    return res.status(201).json({
      message: `Successfully scheduled ${scheduledJobs.length} emails.`,
      scheduledJobsCount: scheduledJobs.length,
      jobs: scheduledJobs,
    });
  } catch (error: any) {
    console.error('Error scheduling emails:', error);
    return res.status(500).json({ error: 'Failed to schedule emails', details: error.message });
  }
});

// 2. Get Scheduled Emails (Searchable via Elasticsearch)
router.get('/scheduled', async (req, res) => {
  try {
    const userId = getUserId(req);
    const search = req.query.search as string;

    const results = await searchEmails(search || '', undefined, userId);
    // Filter to PENDING, PROCESSING, RATE_LIMITED
    const scheduledList = results.filter((item: any) =>
      ['PENDING', 'PROCESSING', 'RATE_LIMITED'].includes(item.status)
    );

    return res.json({ scheduledEmails: scheduledList });
  } catch (error: any) {
    console.error('Error fetching scheduled emails:', error);
    return res.status(500).json({ error: 'Failed to fetch scheduled emails' });
  }
});

// 3. Get Sent Emails (Searchable via Elasticsearch)
router.get('/sent', async (req, res) => {
  try {
    const userId = getUserId(req);
    const search = req.query.search as string;

    const results = await searchEmails(search || '', undefined, userId);
    // Filter to SENT, FAILED
    const sentList = results.filter((item: any) =>
      ['SENT', 'FAILED'].includes(item.status)
    );

    return res.json({ sentEmails: sentList });
  } catch (error: any) {
    console.error('Error fetching sent emails:', error);
    return res.status(500).json({ error: 'Failed to fetch sent emails' });
  }
});

// 4. Cancel Scheduled Email Job
router.delete('/:id', async (req, res) => {
  try {
    const jobId = req.params.id;
    const dbJob = await prisma.scheduledEmailJob.findUnique({ where: { id: jobId } });

    if (!dbJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (dbJob.bullJobId) {
      const bullJob = await emailQueue.getJob(dbJob.bullJobId);
      if (bullJob) {
        await bullJob.remove();
      }
    }

    await prisma.scheduledEmailJob.delete({ where: { id: jobId } });

    return res.json({ message: 'Scheduled email cancelled successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to cancel scheduled email' });
  }
});

export default router;
