export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  googleId?: string;
}

export interface ScheduledEmailJob {
  id: string;
  userId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED';
  scheduledAt: string;
  sentAt?: string;
  failedReason?: string;
  bullJobId?: string;
  etherealPreviewUrl?: string;
  createdAt: string;
}

export interface DashboardStats {
  overview: {
    scheduled: number;
    sent: number;
    failed: number;
    rateLimited: number;
    total: number;
  };
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  rateLimit: {
    senderEmail: string;
    currentCount: number;
    maxLimit: number;
  };
}

export interface SlackIntegration {
  id: string;
  userId: string;
  webhookUrl?: string;
  accessToken?: string;
  channel?: string;
  isEnabled: boolean;
}
