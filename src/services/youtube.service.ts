import { google } from 'googleapis'
import { prisma } from '../lib/prisma'

export const fetchComments = async (channelId: string) => {
  // Channel and user refreshToken
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: { user: true }
  })

  if (!channel?.user.refreshToken) {
    throw new Error('No refresh token found')
  }

  // YouTube client banao
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({ refresh_token: channel.user.refreshToken })

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client })

  // Videos of channel
  const { data: videoData } = await youtube.commentThreads.list({
    // part: ['snippet'],
    // channelId: channel.youtubeChannelId,
    // type: ['video'],
    // maxResults: 10,
    // order: 'date'
    part: ['snippet'],
    videoId: '', //popular video ID
    maxResults: 20,
  })

  const videos = videoData.items ?? []

  let totalSaved = 0

  for (const video of videos) {
    const videoId = video.snippet?.videoId
    if (!videoId) continue

    // top-level Comments
    const { data: commentData } = await youtube.commentThreads.list({
      part: ['snippet'],
      videoId,
      maxResults: 100,
      ...(channel.lastFetchedAt && {
        publishedAfter: channel.lastFetchedAt.toISOString()
      })
    })

    const comments = commentData.items ?? []

    for (const item of comments) {
      const comment = item.snippet?.topLevelComment?.snippet
      if (!comment) continue

      await prisma.comment.upsert({
        where: { youtubeCommentId: item.id! },
        update: {},
        create: {
          channelId: channel.id,
          videoId,
          youtubeCommentId: item.id!,
          text: comment.textDisplay ?? '',
          fetchedAt: new Date(),
          label: 'pending'
        }
      })

      totalSaved++
    }
  }

  // lastFetchedAt updating
  await prisma.channel.update({
    where: { id: channelId },
    data: { lastFetchedAt: new Date() }
  })

  return totalSaved
}