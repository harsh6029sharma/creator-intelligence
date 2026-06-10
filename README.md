# Creator Intelligence

> AI-powered YouTube comment moderation and audience analytics platform built for creators who want to understand audience behavior at scale.

Creator Intelligence helps YouTube creators automatically detect toxic comments, moderate harmful content, and analyze audience sentiment trends across their channel without manually reviewing thousands of comments.

---

## Why I Built This

YouTube Studio provides metrics such as views, watch time, and engagement.

What it doesn't provide is context.

Questions creators frequently struggle to answer:

* Is toxicity increasing on my channel over time?
* Which videos attract the most harmful comments?
* Which comments should be reviewed before they damage community quality?
* How does audience sentiment change week by week?

For small creators, manually reviewing comments is possible.

For channels receiving hundreds or thousands of comments daily, moderation quickly becomes time-consuming and inconsistent.

Creator Intelligence was built to automate that workflow.

---

## What It Does

### Secure YouTube Account Connection

Creators connect their YouTube account using Google OAuth 2.0.

The platform securely stores channel access information and allows comment moderation actions through the YouTube Data API.

### Automated Comment Classification

Every fetched comment is analyzed using Groq's `llama-3.3-70b-versatile` model.

Each comment is classified into one of three categories:

* `toxic`
* `spam`
* `safe`

The model also returns a confidence score used by the moderation pipeline.

### Automatic Moderation

High-confidence toxic comments are automatically hidden through the YouTube API.

```text
confidence ≥ 0.90 + toxic
```

This reduces moderation workload while maintaining strict confidence requirements to avoid false positives.

### Manual Review Queue

Borderline comments are not automatically hidden.

Instead, they are placed into a review queue where creators can make the final decision.

```text
0.70 ≤ confidence < 0.90 + toxic
```

This human-in-the-loop approach balances automation with moderation accuracy.

### Audience Sentiment Analytics

The platform generates analytics beyond what YouTube Studio provides:

* Total comments analyzed
* Toxicity rate
* Spam rate
* Safe comment percentage
* Per-video toxicity breakdown
* Channel-wide sentiment statistics

### Weekly Sentiment Trends

Daily sentiment snapshots are aggregated into trend data that helps creators identify:

* Sudden spikes in toxicity
* Community sentiment shifts
* Video-specific moderation issues

### High-Performance Dashboard

Analytics responses are cached using Redis to reduce database load and improve dashboard response times.

### Scalable Processing Pipeline

Comment fetching and AI classification are completely decoupled using BullMQ.

This ensures:

* API requests remain responsive
* Comment ingestion is never blocked by AI processing
* Classification can scale independently

---

# System Architecture

```text
Creator Login
      │
      ▼
Google OAuth
      │
      ▼
JWT Authentication
      │
      ▼
YouTube Channel Connected
      │
      ▼
Hourly Cron Job
      │
      ▼
Fetch Latest Comments
      │
      ▼
PostgreSQL Storage
      │
      ▼
BullMQ Queue
      │
      ▼
Worker Processes Jobs
      │
      ▼
Groq Classification
      │
      ▼
 ┌───────────────────────────────┐
 │ toxic + confidence ≥ 0.90     │
 └───────────────┬───────────────┘
                 ▼
      Auto Hide via YouTube API

 ┌───────────────────────────────┐
 │ toxic + confidence 0.70-0.90  │
 └───────────────┬───────────────┘
                 ▼
          Manual Review

 ┌───────────────────────────────┐
 │ spam / safe / low confidence  │
 └───────────────┬───────────────┘
                 ▼
             Approved

      Daily Snapshot Cron
                 │
                 ▼
       Sentiment Aggregation
                 │
                 ▼
          Cached Analytics
```

---

# Technology Stack

| Layer          | Technology              |
| -------------- | ----------------------- |
| Runtime        | Node.js 20              |
| Language       | TypeScript              |
| Framework      | Express.js              |
| Database       | PostgreSQL              |
| ORM            | Prisma                  |
| Queue System   | BullMQ                  |
| Cache          | Redis                   |
| AI Provider    | Groq                    |
| Model          | llama-3.3-70b-versatile |
| Authentication | Google OAuth 2.0 + JWT  |
| External APIs  | YouTube Data API v3     |
| Containerization | Docker + Docker Compose |
---

# Infrastructure

The application is fully containerized using Docker and Docker Compose.

Instead of requiring developers to install PostgreSQL and Redis manually, all core services run inside isolated containers.

### Services

| Service | Purpose |
|----------|----------|
| app | Express.js API Server |
| db | PostgreSQL Database |
| redis | Redis Cache & BullMQ Backend |

### Benefits

- Consistent development environment
- Simplified onboarding
- Faster setup process
- Reduced dependency conflicts
- Production-like local environment
- Reproducible builds across machines

The entire system can be started using a single command:

```bash
docker compose up --build
```

# Key Engineering Decisions

### Idempotent Comment Ingestion

A YouTube comment may appear across multiple cron executions.

To prevent duplicate records:

```prisma
youtubeCommentId @unique
```

Every comment is stored exactly once regardless of how many times it is fetched.

---

### Snapshot-Based Analytics

Instead of recalculating historical analytics repeatedly, the system stores daily sentiment summaries.

Benefits:

* Faster dashboard queries
* Reduced database load
* Historical trend preservation

Constraint:

```prisma
@@unique([channelId, date])
```

One sentiment snapshot per channel per day.

---

### Conservative Moderation Thresholds

Automatically hiding legitimate comments can damage creator trust.

For that reason:

```text
≥ 0.90 confidence
```

is required before automatic moderation occurs.

Lower-confidence predictions always require human review.

---

### Queue-Driven Processing

AI classification is intentionally separated from comment collection.

Benefits:

* Better fault tolerance
* Easier horizontal scaling
* Faster API response times
* Reduced risk of timeout failures

---

# API Reference

## Authentication

| Method | Endpoint         | Description                     |
| ------ | ---------------- | ------------------------------- |
| GET    | `/auth/login`    | Redirect user to Google OAuth   |
| GET    | `/auth/callback` | OAuth callback and JWT issuance |

---

## Channels

| Method | Endpoint           | Auth Required |
| ------ | ------------------ | ------------- |
| POST   | `/channel/connect` | Yes           |
| GET    | `/channel`         | Yes           |

---

## Analytics

| Method | Endpoint                             | Description                   |
| ------ | ------------------------------------ | ----------------------------- |
| GET    | `/analytics/:channelId/stats`        | Channel-wide statistics       |
| GET    | `/analytics/:channelId/video-stats`  | Video-level toxicity analysis |
| GET    | `/analytics/:channelId/pending`      | Pending moderation reviews    |
| GET    | `/analytics/:channelId/weekly-trend` | Seven-day sentiment trends    |

---

# Database Design

```text
User
 └── Channel
      ├── Comment
      └── SentimentSnapshot
```

### Optimizations

* Unique constraint on YouTube comments
* Daily snapshot uniqueness
* Indexed analytics fields
* Cascading cleanup when channels are removed

```text
Indexes:
- channelId
- label
- moderationStatus
```

---

# Local Development

## Prerequisites

* Node.js 20+
* PostgreSQL
* Redis

## Installation

```bash
git clone https://github.com/harsh6029sharma/creator-intelligence.git

cd creator-intelligence

npm install
```

---

## Environment Setup

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/creator_intelligence"

REDIS_HOST="localhost"
REDIS_PORT="6379"

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:3000/auth/callback"

GROQ_API_KEY=""

JWT_SECRET=""

PORT="3000"
NODE_ENV="development"
```

---

## Database Migration

```bash
npx prisma migrate dev
```

---

## Start Development Server

```bash
npm run dev
```

---

# Classification Strategy

The model is instructed to classify comments using strict moderation rules.

### Toxic

* Hate speech
* Slurs
* Personal attacks
* Harassment
* Threats

### Spam

* Promotional links
* Repetitive messages
* Bot-like content

### Safe

* Questions
* Feedback
* Normal discussions
* Constructive criticism

---

# Moderation Rules

```text
toxic + confidence ≥ 0.90
→ Auto Hide

toxic + confidence 0.70 - 0.90
→ Manual Review

everything else
→ Approved
```

---

# Future Improvements

* Multi-channel support per creator
* Real-time moderation via webhooks
* Creator-specific moderation policies
* Custom toxicity categories
* Team moderation workflows
* AI-generated moderation explanations

---

# Author

**Harsh Sharma**

B.Tech Graduate (Information Technology)
Information Technology Graduate with a strong interest in backend engineering, distributed systems, and AI-powered applications.

Backend-focused developer interested in distributed systems, AI-powered products, and scalable backend architecture.

GitHub:
https://github.com/harsh6029sharma

LinkedIn:
https://linkedin.com/in/harsh-sharma-a47398254
