// sentiment snapshot

import cron from 'node-cron'
import { prisma } from '../lib/prisma'

export const startSnapshotJob = () => {
// every day at 12am
  cron.schedule('0 0 * * *', async () => {
    console.log('Creating daily snapshot...')

    try {
      const channels = await prisma.channel.findMany()

      for (const channel of channels) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const [toxic, spam, safe] = await Promise.all([
          prisma.comment.count({
            where: {
              channelId: channel.id,
              label: 'toxic',
              createdAt: { gte: today }
            }
          }),
          prisma.comment.count({
            where: {
              channelId: channel.id,
              label: 'spam',
              createdAt: { gte: today }
            }
          }),
          prisma.comment.count({
            where: {
              channelId: channel.id,
              label: 'safe',
              createdAt: { gte: today }
            }
          }),
        ])

        // Average confidence
        const avgResult = await prisma.comment.aggregate({
          where: {
            channelId: channel.id,
            createdAt: { gte: today },
            confidence: { not: null }
          },
          _avg: { confidence: true }
        })

        await prisma.sentimentSnapshot.upsert({
          where: {
            channelId_date: {
              channelId: channel.id,
              date: today
            }
          },
          update: {
            toxicCount: toxic,
            safeCount: safe,
            spamCount: spam,
            avgConfidence: avgResult._avg.confidence ?? 0
          },
          create: {
            channelId: channel.id,
            date: today,
            toxicCount: toxic,
            safeCount: safe,
            spamCount: spam,
            avgConfidence: avgResult._avg.confidence ?? 0
          }
        })

        console.log(`Snapshot created for channel: ${channel.name}`)
      }

    } catch (error) {
      console.error('Snapshot job failed:', error)
    }
  })

  console.log('Snapshot job started')
}