import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/reachinbox_db?schema=public',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  elasticsearchNode: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  defaultMinDelayMs: parseInt(process.env.DEFAULT_MIN_DELAY_MS || '2000', 10),
  maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || '100', 10),
  jwtSecret: process.env.JWT_SECRET || 'super-secret-reachinbox-key-2026',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};
