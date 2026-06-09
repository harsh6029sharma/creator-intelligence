import { Router } from "express";
import { googleCallback, googleLogin } from "../controllers/auth.controller";

const router = Router()

router.route("/login").get(googleLogin)
router.route("/callback").get(googleCallback)

export default router