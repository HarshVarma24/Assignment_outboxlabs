import { Queue } from 'bullmq';
import { redisConnection } from './redis';
import { prisma } from './prisma';
import { indexEmailJob } from './elasticsearch';

export const EMAIL_QUEUE_NAME = 'email_scheduler_queue';

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export interface EmailJobPayload {
  jobId: string;
  userId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string; // ISO string
  delayMs?: number;
  hourlyLimit?: number;
}

export async function scheduleEmailJob(payload: EmailJobPayload) {
  const targetTime = new Date(payload.scheduledAt).getTime();
  const now = Date.now();
  const delay = Math.max(0, targetTime - now);

  const job = await emailQueue.add(
    'send_email',
    payload,
    {
      jobId: payload.jobId,
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  );

  // Update Postgres with bullJobId
  const dbJob = await prisma.scheduledEmailJob.update({
    where: { id: payload.jobId },
    data: {
      bullJobId: job.id,
      status: delay > 0 ? 'PENDING' : 'PROCESSING',
    },
  });

  // Index in Elasticsearch
  await indexEmailJob({
    id: dbJob.id,
    userId: dbJob.userId,
    senderEmail: dbJob.senderEmail,
    recipientEmail: dbJob.recipientEmail,
    subject: dbJob.subject,
    body: dbJob.body,
    status: dbJob.status,
    scheduledAt: dbJob.scheduledAt,
    createdAt: dbJob.createdAt,
  });

  return job;
}
