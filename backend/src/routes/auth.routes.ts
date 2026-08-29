import { Router } from 'express';
import { prisma } from '../services/prisma';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

const router = Router();

// Google Auth / Mock Auth Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, name, avatar, googleId } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
          googleId: googleId || `google-mock-${Date.now()}`,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          avatar: avatar || user.avatar,
        },
      });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, {
      expiresIn: '7d',
    });

    return res.json({
      user,
      token,
    });
  } catch (error: any) {
    console.error('Error in auth login:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { slackIntegration: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
