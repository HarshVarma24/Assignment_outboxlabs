import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobPayload, emailQueue } from './queue';
import { redisConnection } from './redis';
import { prisma } from './prisma';
import { sendMailViaEthereal } from './mailer';
import { checkAndIncrementRateLimit } from './rateLimiter';
import { sendSlackRateLimitAlert } from './slack';
import { indexEmailJob } from './elasticsearch';
import { config } from '../config/env';

export let emailWorker: Worker<EmailJobPayload>;

export function initEmailWorker() {
  emailWorker = new Worker<EmailJobPayload>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobPayload>) => {
      const { jobId, userId, senderEmail, recipientEmail, subject, body, delayMs, hourlyLimit } = job.data;
      console.log(`⏳ Processing Job ${jobId} for recipient ${recipientEmail} from sender ${senderEmail}`);

      // 1. Idempotency Check: Check current status in DB
      const dbJob = await prisma.scheduledEmailJob.findUnique({
        where: { id: jobId },
      });

      if (!dbJob) {
        console.warn(`⚠️ Job ${jobId} not found in database. Skipping.`);
        return;
      }

      if (dbJob.status === 'SENT') {
        console.log(`ℹ️ Job ${jobId} already SENT. Skipping duplicate execution (Idempotency preserved).`);
        return;
      }

      // 2. Rate Limiting Check
      const rateLimit = await checkAndIncrementRateLimit(senderEmail, hourlyLimit);

      if (!rateLimit.allowed && rateLimit.nextHourStart) {
        console.warn(`🚨 Rate limit exceeded for sender ${senderEmail} (${rateLimit.currentCount}/${rateLimit.maxLimit}). Rescheduling job ${jobId}...`);

        // Send real Slack notification if user has connected Slack
        await sendSlackRateLimitAlert(
          userId,
          senderEmail,
          rateLimit.currentCount,
          rateLimit.maxLimit,
          rateLimit.nextHourStart
        );

        const newDelay = Math.max(0, rateLimit.nextHourStart.getTime() - Date.now());

        // Update DB status to RATE_LIMITED & new scheduledAt time
        const updatedDbJob = await prisma.scheduledEmailJob.update({
          where: { id: jobId },
          data: {
            status: 'RATE_LIMITED',
            scheduledAt: rateLimit.nextHourStart,
          },
        });

        // Re-enqueue job in BullMQ for next hour window
        await emailQueue.add(
          'send_email',
          { ...job.data, scheduledAt: rateLimit.nextHourStart.toISOString() },
          {
            jobId: `${jobId}-rescheduled-${rateLimit.nextHourStart.getTime()}`,
            delay: newDelay,
          }
        );

        // Update Elasticsearch
        await indexEmailJob({
          id: updatedDbJob.id,
          userId: updatedDbJob.userId,
          senderEmail: updatedDbJob.senderEmail,
          recipientEmail: updatedDbJob.recipientEmail,
          subject: updatedDbJob.subject,
          body: updatedDbJob.body,
          status: updatedDbJob.status,
          scheduledAt: updatedDbJob.scheduledAt,
          createdAt: updatedDbJob.createdAt,
        });

        return { rescheduled: true, nextWindow: rateLimit.nextHourStart };
      }

      // 3. Minimum Throttling Delay
      const minDelay = delayMs || config.defaultMinDelayMs;
      if (minDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, minDelay));
      }

      // 4. Send Email via Ethereal SMTP
      try {
        const { messageId, etherealPreviewUrl } = await sendMailViaEthereal({
          fromEmail: senderEmail,
          to: recipientEmail,
          subject,
          body,
        });

        console.log(`✅ Email sent successfully to ${recipientEmail}! Preview URL: ${etherealPreviewUrl}`);

        // Update DB to SENT
        const sentJob = await prisma.scheduledEmailJob.update({
          where: { id: jobId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            etherealPreviewUrl,
          },
        });

        // Update Elasticsearch index
        await indexEmailJob({
          id: sentJob.id,
          userId: sentJob.userId,
          senderEmail: sentJob.senderEmail,
          recipientEmail: sentJob.recipientEmail,
          subject: sentJob.subject,
          body: sentJob.body,
          status: sentJob.status,
          scheduledAt: sentJob.scheduledAt,
          sentAt: sentJob.sentAt,
          etherealPreviewUrl: sentJob.etherealPreviewUrl,
          createdAt: sentJob.createdAt,
        });

        return { sent: true, etherealPreviewUrl };
      } catch (sendError: any) {
        console.error(`❌ Failed to send email for job ${jobId}:`, sendError);

        await prisma.scheduledEmailJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            failedReason: sendError.message || String(sendError),
          },
        });

        throw sendError;
      }
    },
    {
      connection: redisConnection,
      concurrency: config.workerConcurrency,
    }
  );

  console.log(`🚀 BullMQ Worker initialized with concurrency=${config.workerConcurrency}`);
}

/**
 * Ensures system persistence across server restarts.
 * Queries DB for PENDING or RATE_LIMITED jobs and re-enqueues missing BullMQ jobs.
 */
export async function syncPendingJobsOnStartup() {
  console.log('🔄 Checking database for unscheduled or pending jobs to sync after server start...');

  try {
    const pendingJobs = await prisma.scheduledEmailJob.findMany({
      where: {
        status: { in: ['PENDING', 'RATE_LIMITED'] },
      },
    });

    let syncedCount = 0;
    for (const job of pendingJobs) {
      const bullJobId = job.bullJobId || job.id;
      const existingBullJob = await emailQueue.getJob(bullJobId);

      if (!existingBullJob) {
        const delay = Math.max(0, new Date(job.scheduledAt).getTime() - Date.now());
        await emailQueue.add(
          'send_email',
          {
            jobId: job.id,
            userId: job.userId,
            senderEmail: job.senderEmail,
            recipientEmail: job.recipientEmail,
            subject: job.subject,
            body: job.body,
            scheduledAt: job.scheduledAt.toISOString(),
          },
          {
            jobId: bullJobId,
            delay,
          }
        );
        syncedCount++;
      }
    }

    console.log(`✅ Server Restart Persistence Sync Complete: ${syncedCount} pending jobs re-enqueued into BullMQ.`);
  } catch (error) {
    console.error('❌ Error during startup pending jobs sync:', error);
  }
}
