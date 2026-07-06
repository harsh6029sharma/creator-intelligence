import type { Response } from 'express'
import type { AuthRequest } from '../types/index'
import { ApiError } from '../utils/ApiError'
import { ApiResponse } from '../utils/ApiResponse'
import asyncHandler from '../utils/asyncHandler'
import { getCache, setCache } from '../services/cache.service'
import { prisma } from '../lib/prisma'

export const getChannelStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rawChannelId = req.params.channelId
  const channelId = Array.isArray(rawChannelId) ? rawChannelId[0] : rawChannelId
  const userId = req.user?.userId

  if (!userId) throw new ApiError(401, 'Unauthorized')
  if (!channelId) throw new ApiError(400, 'Channel ID is required')

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId }
  })

  if (!channel) throw new ApiError(404, 'Channel not found')

  // Cache check first
  const cacheKey = `stats:${channelId}`
  const cached = await getCache(cacheKey)
  if (cached) {
    return res.json(new ApiResponse(200, cached, 'Stats fetched (cached)'))
  }

  const [toxic, spam, safe, total] = await Promise.all([
    prisma.comment.count({ where: { channelId, label: 'toxic' } }),
    prisma.comment.count({ where: { channelId, label: 'spam' } }),
    prisma.comment.count({ where: { channelId, label: 'safe' } }),
    prisma.comment.count({ where: { channelId } }),
  ])

  const data = {
    total,
    toxic,
    spam,
    safe,
    toxicPercent: total > 0 ? ((toxic / total) * 100).toFixed(1) : 0,
  }

  // save on cache where ttl is 5 minutes
  await setCache(cacheKey, data, 300)

  return res.json(new ApiResponse(200, data, 'Stats fetched'))
})


// Per video toxicity
export const getVideoStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rawChannelId = req.params.channelId
  const channelId = Array.isArray(rawChannelId) ? rawChannelId[0] : rawChannelId
  const userId = req.user?.userId

  if (!userId) throw new ApiError(401, 'Unauthorized')
  if (!channelId) throw new ApiError(400, 'Channel ID is required')

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId }
  })

  if (!channel) throw new ApiError(404, 'Channel not found')

  // Cache check first
  const cacheKey = `videoStats:${channelId}`
  const cached = await getCache(cacheKey)
  if (cached) {
    return res.json(new ApiResponse(200, cached, 'Stats fetched (cached)'))
  }

  const videoStats = await prisma.comment.groupBy({
    by: ['videoId'],
    where: { channelId },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  })

  const result = await Promise.all(
    videoStats.map(async (v: { videoId: string; _count: { id: number } }) => {
      const toxic = await prisma.comment.count({
        where: { channelId, videoId: v.videoId, label: 'toxic' }
      })
      return {
        videoId: v.videoId,
        total: v._count.id,
        toxic,
        toxicPercent: ((toxic / v._count.id) * 100).toFixed(1)
      }
    })
  )
  // save on cache where ttl is 5 minutes
  await setCache(cacheKey, result, 300)
  return res.json(new ApiResponse(200, result, 'Video stats fetched'))
})


// Pending comments for manual review
export const getPendingComments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rawChannelId = req.params.channelId
  const channelId = Array.isArray(rawChannelId) ? rawChannelId[0] : rawChannelId
  const userId = req.user?.userId

  if (!userId) throw new ApiError(401, 'Unauthorized')
  if (!channelId) throw new ApiError(400, 'Channel ID is required')

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId }
  })

  if (!channel) throw new ApiError(404, 'Channel not found')

  // Cache check first
  const cacheKey = `pending:${channelId}`
  const cached = await getCache(cacheKey)
  if (cached) {
    return res.json(new ApiResponse(200, cached, 'Stats fetched (cached)'))
  }

  const comments = await prisma.comment.findMany({
    where: { channelId, moderationStatus: 'pending' },
    orderBy: { confidence: 'desc' },
    take: 50
  })

  // save on cache where ttl is 1 minutes
  await setCache(cacheKey, comments, 60)

  return res.json(new ApiResponse(200, comments, 'Pending comments fetched'))
})

// Weekly sentiment trend
export const getWeeklyTrend = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rawChannelId = req.params.channelId
  const channelId = Array.isArray(rawChannelId) ? rawChannelId[0] : rawChannelId
  const userId = req.user?.userId

  if (!userId) throw new ApiError(401, 'Unauthorized')
  if (!channelId) throw new ApiError(400, 'Channel ID is required')

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId }
  })

  if (!channel) throw new ApiError(404, 'Channel not found')

  const cacheKey = `weeklyTrend:${channelId}`
  const cached = await getCache(cacheKey)
  if (cached) {
    return res.json(new ApiResponse(200, cached, 'Weekly trend fetched (cached)'))
  }

  // Last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const snapshots = await prisma.sentimentSnapshot.findMany({
    where: {
      channelId,
      date: { gte: sevenDaysAgo }
    },
    orderBy: { date: 'asc' }
  })

  await setCache(cacheKey, snapshots, 300)

  return res.json(new ApiResponse(200, snapshots, 'Weekly trend fetched'))
})