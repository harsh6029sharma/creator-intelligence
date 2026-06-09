import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { fetchComments } from '../services/youtube.service'
import { commentQueue } from '../queues/comment.queue'

export const startFetchJob = () => {
//   fetching the comments for every hours
  cron.schedule('* * * * *', async () => {
    console.log('Fetching comments...')

    try {
      // taking all the comments
      const channels = await prisma.channel.findMany()

      for (const channel of channels) {
        // fetch comment and save on db
        const totalSaved = await fetchComments(channel.id)
        console.log(`Channel ${channel.name}: ${totalSaved} comments saved`)

        // put on queue for classification
        const pendingComments = await prisma.comment.findMany({
          where: {
            channelId: channel.id,
            label: 'pending'
          }
        })

        for (const comment of pendingComments) {
          await commentQueue.add('classify', {
            youtubeCommentId: comment.youtubeCommentId,
            text: comment.text
          })
        }

        console.log(`Channel ${channel.name}: ${pendingComments.length} comments queued`)
      }

    } catch (error) {
      console.error('Fetch job failed:', error)
    }
  })

  console.log('Cron job started')
}