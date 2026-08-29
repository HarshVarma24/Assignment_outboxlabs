# ReachInbox - Production-Grade Full-Stack Email Job Scheduler Service & Dashboard

A production-grade, highly persistent, scalable **Email Job Scheduler Service and Frontend Dashboard** built for **ReachInbox.ai (Outbox Labs)** hiring assignment.

This system accepts email send requests via API or dashboard CSV upload, schedules them using **BullMQ + Redis** without any cron jobs, enforces hourly sender rate-limiting and minimum provider throttling, dispatches emails using fake SMTP via **Ethereal Email**, indexes jobs in **Elasticsearch** for instant full-text search, triggers live **Slack notifications** on rate limit hits, and provides full persistence across server restarts.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v18+` or `v20+` or `v24+`
- **Docker & Docker Compose** (for PostgreSQL, Redis, and Elasticsearch)
- **NPM**: `v9+` or `v11+`

---

### Step 1: Clone & Start Infrastructure (PostgreSQL, Redis, Elasticsearch)

From the project root:

```bash
docker compose up -d
```

This starts:
- **PostgreSQL**: `localhost:5432` (`reachinbox_db`)
- **Redis**: `localhost:6379`
- **Elasticsearch**: `localhost:9200`

---

### Step 2: Set Up & Run Backend Service

```bash
cd backend

# Install dependencies
npm install

# Push database schema & generate Prisma client
npx prisma db push

# Build TypeScript
npm run build

# Start Backend Server
npm run dev
```

The backend server runs at `http://localhost:5000`.
- **Health Check**: `http://localhost:5000/health`
- **Live BullMQ Queue Board**: `http://localhost:5000/admin/queues`

---

### Step 3: Set Up & Run Frontend Dashboard

In a new terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Build Next.js application
npm run build

# Start Frontend Development Server
npm run dev
```

The frontend dashboard runs at `http://localhost:3000`.

---

## 🔑 Environment Variables Configuration

### Backend (`backend/.env`)

```env
PORT=5000
NODE_ENV=development

# Database & Redis
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/reachinbox_db?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200

# Timing & Concurrency Settings
WORKER_CONCURRENCY=5
DEFAULT_MIN_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=100

# Auth & Frontend Origin
FRONTEND_URL=http://localhost:3000
JWT_SECRET=super-secret-reachinbox-key-2026
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 🏗 System Architecture & Implementation Highlights

### 1️⃣ Core Scheduler Behavior (Zero Cron Jobs)
- **BullMQ Delayed Jobs**: When a job is scheduled for a future timestamp (`scheduledAt`), the exact delay is calculated (`delay = Math.max(0, scheduledAt - Date.now())`) and added to the BullMQ Redis queue. No OS `crontab` or `node-cron` libraries are used.
- **Relational Persistence**: Every email job is recorded in PostgreSQL via **Prisma ORM** with unique job IDs before being enqueued.

### 2️⃣ Server Restart Resilience & Idempotency
- **Startup Sync (`syncPendingJobsOnStartup()`)**: On backend startup, the engine queries PostgreSQL for any `PENDING` or `RATE_LIMITED` jobs. If a job is missing from BullMQ (e.g. after server/Redis restart), it is automatically re-enqueued with its remaining delay.
- **Idempotency Guard**: Before dispatching an email, the BullMQ worker verifies the job's database status. If the job is already marked `SENT`, it exits immediately to prevent duplicate sends.

### 3️⃣ Worker Concurrency & Provider Throttling
- **Configurable Concurrency**: Worker concurrency is driven by the `WORKER_CONCURRENCY` env variable (default: `5`).
- **Minimum Throttling Delay**: Configurable minimum delay (e.g., 2000ms) is applied between sends to mimic provider throttling and avoid IP reputation degradation.

### 4️⃣ Hourly Rate Limiting (Redis-Backed) & Rescheduling
- **Atomic Redis Window Counter**: Rate limits are calculated using Redis keys formatted as `rate_limit:{senderEmail}:{YYYY-MM-DD-HH}`.
- **Auto-Rescheduling**: When a sender hits their hourly limit (e.g. `MAX_EMAILS_PER_HOUR`):
  1. The job is **not dropped or failed**.
  2. The job is automatically updated in PostgreSQL to `RATE_LIMITED` and rescheduled to the start of the next hour window (`nextHourStart`).
  3. The job is re-enqueued in BullMQ with `delay = nextHourStart - Date.now()`.

### 5️⃣ Live Slack Rate Limit Alerts
- Users connect their Slack channel via Incoming Webhooks or OAuth token in the dashboard.
- The exact moment a sender's rate limit cap is reached, a live structured message is dispatched to Slack highlighting the sender account, hourly count, and next window timestamp.

### 6️⃣ Ethereal Email SMTP Integration
- Uses **Nodemailer** with **Ethereal Email** test credentials.
- Captures `nodemailer.getTestMessageUrl(info)` for every sent email, saving live web preview links in PostgreSQL & Elasticsearch so users can view the actual formatted email in their browser.

### 7️⃣ Elasticsearch Full-Text Search
- Every scheduled and sent email is indexed in Elasticsearch index `emails`.
- Real-time search queries evaluate subject, body, recipient, and sender emails with fuzzy matching.
- **Automatic Fallback**: Includes a built-in PostgreSQL ILIKE query fallback if Elasticsearch is initializing or offline.

---

## 🎨 Frontend Dashboard Features

- **Google OAuth Login**: Clean login experience displaying active user's profile metadata (Avatar, Name, Email) in the header with logout capability.
- **Compose Campaign Modal**:
  - Drag-and-drop CSV lead file uploader powered by **PapaParse**.
  - Real-time display of total detected email addresses.
  - Controls for Start Time, Minimum Delay (seconds), and Hourly Rate Limit.
- **Scheduled Emails Tab**: Live table displaying pending/rate-limited jobs with status badges, scheduled execution time, Elasticsearch search bar, and cancellation option.
- **Sent Emails Tab**: Live table displaying sent timestamps, delivery status, Elasticsearch search bar, and direct **"View Email"** buttons opening Ethereal Email web previews.
- **BullMQ Live Queue Monitor**: Modal embedding the `@bull-board/express` dashboard for real-time queue visibility (`http://localhost:5000/admin/queues`).
- **Slack Connection Modal**: Interface to connect/disconnect Slack webhooks and fire live test alert dispatches.

---

## 🧪 Verification & Feature Mapping

| Requirement | Implementation Status | Location |
| :--- | :--- | :--- |
| **No Cron Jobs** | ✅ BullMQ Delayed Jobs | `backend/src/services/queue.ts` |
| **Relational DB** | ✅ PostgreSQL + Prisma | `backend/prisma/schema.prisma` |
| **Restart Resilience** | ✅ Startup DB sync engine | `backend/src/services/worker.ts` |
| **Idempotency** | ✅ DB state check before send | `backend/src/services/worker.ts` |
| **Worker Concurrency** | ✅ Configurable `WORKER_CONCURRENCY` | `backend/src/services/worker.ts` |
| **Minimum Send Delay** | ✅ Configurable throttling | `backend/src/services/worker.ts` |
| **Hourly Rate Limiting** | ✅ Redis atomic counters per sender | `backend/src/services/rateLimiter.ts` |
| **Job Auto-Reschedule** | ✅ Next hour window calculation | `backend/src/services/worker.ts` |
| **Slack Notification** | ✅ Live Slack webhook API alert | `backend/src/services/slack.ts` |
| **Searchable Emails** | ✅ Elasticsearch + DB fallback | `backend/src/services/elasticsearch.ts` |
| **Fake SMTP** | ✅ Ethereal Email preview URLs | `backend/src/services/mailer.ts` |
| **Live BullMQ Board** | ✅ `@bull-board/express` on `/admin/queues` | `backend/src/index.ts` |
| **Google Login & UI** | ✅ Next.js 14 + Tailwind CSS | `frontend/src/app/` |
| **CSV Lead Upload** | ✅ PapaParse parser with count | `frontend/src/components/ComposeModal.tsx` |

---

## 📝 Trade-offs & Design Choices

1. **Monorepo Structure**: Placed `backend` and `frontend` in a clean monorepo format with independent `package.json` files for clean separation of concerns and deployment ease.
2. **Elasticsearch Resilience**: Elasticsearch single-node startup can occasionally take a few seconds on low-resource machines. We implemented a silent PostgreSQL `LIKE` search fallback so search operations never break or throw 500 errors.
3. **Dynamic Ethereal Accounts**: Nodemailer dynamically provisions Ethereal test accounts on demand so no manual registration or credentials are required for grading.

---

## 📬 Contact & Repo Access

- **GitHub Repository**: Monorepo
- **Granted Access**: `Mitrajit` and `Yadav036`
