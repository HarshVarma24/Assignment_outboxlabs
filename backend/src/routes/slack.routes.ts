import { Router } from 'express';
import { prisma } from '../services/prisma';
import { sendSlackRateLimitAlert } from '../services/slack';
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
  return req.body.userId || 'default-user-id';
}

// Connect Slack (Webhook or Access Token)
router.post('/connect', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { webhookUrl, accessToken, channel } = req.body;

    if (!webhookUrl && !accessToken) {
      return res.status(400).json({ error: 'Either webhookUrl or accessToken must be provided' });
    }

    // Ensure User exists
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: { id: userId, email: 'demo@reachinbox.ai', name: 'ReachInbox Demo User' },
      });
    }

    const slack = await prisma.slackIntegration.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        webhookUrl: webhookUrl || null,
        accessToken: accessToken || null,
        channel: channel || '#general',
        isEnabled: true,
      },
      update: {
        webhookUrl: webhookUrl || null,
        accessToken: accessToken || null,
        channel: channel || '#general',
        isEnabled: true,
      },
    });

    return res.json({ message: 'Slack connected successfully', slack });
  } catch (error: any) {
    console.error('Error connecting Slack:', error);
    return res.status(500).json({ error: 'Failed to connect Slack' });
  }
});

// Get Slack Connection Status
router.get('/status', async (req, res) => {
  try {
    const userId = getUserId(req);
    const slack = await prisma.slackIntegration.findUnique({ where: { userId } });

    return res.json({
      connected: !!slack && slack.isEnabled,
      slack: slack || null,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get Slack status' });
  }
});

// Disconnect Slack
router.post('/disconnect', async (req, res) => {
  try {
    const userId = getUserId(req);
    await prisma.slackIntegration.delete({ where: { userId } }).catch(() => {});
    return res.json({ message: 'Slack disconnected successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to disconnect Slack' });
  }
});

// Send Test Slack Notification
router.post('/test', async (req, res) => {
  try {
    const userId = getUserId(req);
    await sendSlackRateLimitAlert(
      userId,
      'test-sender@reachinbox.ai',
      100,
      100,
      new Date(Date.now() + 3600000)
    );
    return res.json({ message: 'Test Slack alert triggered successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to send test Slack alert', details: error.message });
  }
});

export default router;
