import type { Response } from 'express'
import { google } from 'googleapis'
import { prisma } from '../lib/prisma'
import asyncHandler from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import { ApiResponse } from '../utils/ApiResponse'
import type { AuthRequest } from '../types/index'

export const connectChannel = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId

  if (!userId) {
    throw new ApiError(401, 'Unauthorized')
  }

  // User refreshToken taken
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user?.refreshToken) {
    throw new ApiError(400, 'No refresh token found. Please login again.')
  }

  // YouTube client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({ refresh_token: user.refreshToken })

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client })

  // Channel info
  const { data } = await youtube.channels.list({
    part: ['snippet'],
    mine: true,
  })

  console.log(data);

  const channelData = data.items?.[0]

  if (!channelData) {
    throw new ApiError(404, 'No YouTube channel found')
  }

  // Channel save karo
  const channel = await prisma.channel.upsert({
    where: { youtubeChannelId: channelData.id! },
    update: { name: channelData.snippet?.title ?? '' },
    create: {
      userId,
      youtubeChannelId: channelData.id!,
      name: channelData.snippet?.title ?? '',
    }
  })

  return res.json(new ApiResponse(200, channel, 'Channel connected successfully'))
})

// get channels based on its userId
export const getChannels = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId

  if (!userId) {
    throw new ApiError(401, 'Unauthorized')
  }

  const channels = await prisma.channel.findMany({
    where: { userId }
  })

  return res.json(new ApiResponse(200, channels, 'Channels fetched successfully'))
})