import { Client } from '@elastic/elasticsearch';
import { config } from '../config/env';
import { prisma } from './prisma';

export const esClient = new Client({
  node: config.elasticsearchNode,
  requestTimeout: 5000,
  maxRetries: 2,
});

const INDEX_NAME = 'emails';

export async function initElasticsearch() {
  try {
    const exists = await esClient.indices.exists({ index: INDEX_NAME });
    if (!exists) {
      await esClient.indices.create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            senderEmail: { type: 'keyword' },
            recipientEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            etherealPreviewUrl: { type: 'keyword' },
            createdAt: { type: 'date' },
          },
        },
      });
      console.log(`✅ Elasticsearch index '${INDEX_NAME}' created successfully.`);
    } else {
      console.log(`✅ Elasticsearch index '${INDEX_NAME}' already exists.`);
    }
  } catch (error: any) {
    console.warn('⚠️ Elasticsearch initialization notice (falling back to database search):', error.message || error);
  }
}

export async function indexEmailJob(job: {
  id: string;
  userId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  etherealPreviewUrl?: string | null;
  createdAt: Date;
}) {
  try {
    await esClient.index({
      index: INDEX_NAME,
      id: job.id,
      document: {
        id: job.id,
        userId: job.userId,
        senderEmail: job.senderEmail,
        recipientEmail: job.recipientEmail,
        subject: job.subject,
        body: job.body,
        status: job.status,
        scheduledAt: job.scheduledAt.toISOString(),
        sentAt: job.sentAt ? job.sentAt.toISOString() : null,
        etherealPreviewUrl: job.etherealPreviewUrl || null,
        createdAt: job.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.warn(`⚠️ Failed to index job ${job.id} in Elasticsearch:`, error.message || error);
  }
}

export async function searchEmails(query: string, statusFilter?: string, userId?: string) {
  try {
    const mustConditions: any[] = [];
    if (userId) {
      mustConditions.push({ term: { userId } });
    }
    if (statusFilter) {
      mustConditions.push({ term: { status: statusFilter } });
    }

    if (query && query.trim() !== '') {
      mustConditions.push({
        multi_match: {
          query: query.trim(),
          fields: ['subject^3', 'body^2', 'recipientEmail^4', 'senderEmail^2'],
          fuzziness: 'AUTO',
        },
      });
    }

    const searchResponse = await esClient.search({
      index: INDEX_NAME,
      query: mustConditions.length > 0 ? { bool: { must: mustConditions } } : { match_all: {} },
      sort: [{ createdAt: { order: 'desc' } }],
      size: 100,
    });

    const hits = searchResponse.hits.hits.map((hit: any) => hit._source);
    return hits;
  } catch (error: any) {
    // Database Fallback Search
    const where: any = {};
    if (userId) where.userId = userId;
    if (statusFilter) where.status = statusFilter;

    if (query && query.trim() !== '') {
      where.OR = [
        { recipientEmail: { contains: query, mode: 'insensitive' } },
        { subject: { contains: query, mode: 'insensitive' } },
        { body: { contains: query, mode: 'insensitive' } },
        { senderEmail: { contains: query, mode: 'insensitive' } },
      ];
    }

    const dbResults = await prisma.scheduledEmailJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return dbResults;
  }
}
