import { Router } from 'express'
import { connectChannel, getChannels } from '../controllers/channel.controller'
import verifyJWT from '../middlewares/auth.middleware'

const router = Router()

router.use(verifyJWT)

router.route("/connect").post(connectChannel)
router.route("/").get(getChannels)

export default router