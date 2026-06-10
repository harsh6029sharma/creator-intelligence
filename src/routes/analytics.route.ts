import { Router } from 'express'
import { getChannelStats, getVideoStats, getPendingComments, getWeeklyTrend } from '../controllers/analytics.controller'
import verifyJWT from '../middlewares/auth.middleware'

const router = Router()

router.use(verifyJWT)

router.get('/:channelId/stats', getChannelStats)
router.get('/:channelId/video-stats', getVideoStats)
router.get('/:channelId/pending', getPendingComments)
router.get('/:channelId/weekly-trend', getWeeklyTrend)

export default router