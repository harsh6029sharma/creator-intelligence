import { Queue, Worker } from 'bullmq'
import { Redis } from 'ioredis'
import { prisma } from '../lib/prisma'
import { classifyComment } from '../services/classifier.service'

const connection = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null
})

// Queue
export const commentQueue = new Queue('comment-classification', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 20,
    removeOnFail: 50
  }
})

// Worker for jobs processing
export const commentWorker = new Worker(
  'comment-classification',
  async (job) => {
    const { youtubeCommentId, text } = job.data

    // Classify 
    const result = await classifyComment(text)

    // Moderation status deciding
    let moderationStatus = 'approved'
    if (result.label === 'toxic' && result.confidence >= 0.9) {
      moderationStatus = 'auto_hidden'
    } else if (result.label === 'toxic' && result.confidence >= 0.7) {
      moderationStatus = 'pending'
    } else if (result.label === 'spam') {
      moderationStatus = 'pending'
    }

    // db save
    await prisma.comment.updateMany({
      where: { youtubeCommentId },
      data: {
        label: result.label,
        confidence: result.confidence,
        moderationStatus,
        ...(moderationStatus === 'auto_hidden' && { hiddenAt: new Date() })
      }
    })

    return result
  },
  {
    connection,
    concurrency: 1
  }
)

commentWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message)
})

commentWorker.on('completed', (job) => {
  console.log(`Job ${job?.id} completed — label: ${job?.returnvalue?.label}`)
})