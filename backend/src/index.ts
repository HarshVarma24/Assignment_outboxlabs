import express from 'express';
import cors from 'cors';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { config } from './config/env';
import { emailQueue } from './services/queue';
import { initEmailWorker, syncPendingJobsOnStartup } from './services/worker';
import { initElasticsearch } from './services/elasticsearch';

import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import slackRoutes from './routes/slack.routes';
import statsRoutes from './routes/stats.routes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Set up Bull Board Live Queue Dashboard
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue) as any],
  serverAdapter: serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/stats', statsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ReachInbox Scheduler API Engine',
    timestamp: new Date(),
    redis: 'connected',
    concurrency: config.workerConcurrency,
  });
});

// Start Server & Engine Services
async function bootstrap() {
  try {
    console.log('🚀 Initializing ReachInbox Email Scheduler Core Services...');

    // 1. Elasticsearch initialization
    await initElasticsearch();

    // 2. Initialize BullMQ worker engine
    initEmailWorker();

    // 3. Server restart resilience sync
    await syncPendingJobsOnStartup();

    app.listen(config.port, () => {
      console.log(`\n==================================================`);
      console.log(`🔥 ReachInbox Backend Service is Live!`);
      console.log(`🌐 API Server: http://localhost:${config.port}`);
      console.log(`📊 Live BullMQ Dashboard: http://localhost:${config.port}/admin/queues`);
      console.log(`==================================================\n`);
    });
  } catch (error) {
    console.error('❌ Server Bootstrap Error:', error);
    process.exit(1);
  }
}

bootstrap();
