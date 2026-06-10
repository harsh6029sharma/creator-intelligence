import { Redis } from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null
})

export const getCache = async (key: string) => {
  const data = await redis.get(key)
  return data ? JSON.parse(data) : null
}

export const setCache = async (key: string, data: unknown, ttl: number = 300) => {
  await redis.setex(key, ttl, JSON.stringify(data))
}

export const deleteCache = async (key: string) => {
  await redis.del(key)
}