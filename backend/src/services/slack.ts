import axios from 'axios';
import { WebClient } from '@slack/web-api';
import { prisma } from './prisma';

export async function sendSlackRateLimitAlert(userId: string, senderEmail: string, currentCount: number, limit: number, nextWindowTime: Date) {
  try {
    const slackIntegration = await prisma.slackIntegration.findUnique({
      where: { userId },
    });

    if (!slackIntegration || !slackIntegration.isEnabled) {
      console.log(`ℹ️ Slack notification skipped for user ${userId} (Slack not connected/disabled).`);
      return;
    }

    const formattedTime = nextWindowTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageText = `🚨 *ReachInbox Rate Limit Exceeded Alert*\n` +
      `• *Sender Account:* \`${senderEmail}\`\n` +
      `• *Hourly Limit:* ${currentCount}/${limit} emails sent\n` +
      `• *Action:* Future jobs for this sender have been automatically rescheduled to the next hour window (${formattedTime}).\n` +
      `• *Status:* System preserved job queue without dropping any emails.`;

    // 1. If Webhook URL is provided
    if (slackIntegration.webhookUrl) {
      await axios.post(slackIntegration.webhookUrl, {
        text: messageText,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚨 Sender Rate Limit Threshold Reached',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Sender:* \n${senderEmail}` },
              { type: 'mrkdwn', text: `*Hourly Usage:* \n${currentCount} / ${limit} emails` },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Rescheduled to:* ${nextWindowTime.toISOString()} (${formattedTime})\n_Queue auto-throttled to preserve sender reputation._`,
            },
          },
        ],
      });
      console.log(`✅ Sent Slack alert via Webhook for sender ${senderEmail}`);
      return;
    }

    // 2. If Access Token is provided
    if (slackIntegration.accessToken) {
      const client = new WebClient(slackIntegration.accessToken);
      const channel = slackIntegration.channel || '#general';
      await client.chat.postMessage({
        channel,
        text: messageText,
      });
      console.log(`✅ Sent Slack alert via Slack Web API for sender ${senderEmail} to channel ${channel}`);
    }
  } catch (error: any) {
    console.error(`❌ Failed to send Slack rate limit alert:`, error.message || error);
  }
}
