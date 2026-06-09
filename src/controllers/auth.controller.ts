import { prisma } from '../lib/prisma'
import type { Request, Response } from 'express'
import { google } from 'googleapis'
import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/youtube.force-ssl',
]

// Step 1 — Generate Google login URL
export const googleLogin = (req: Request, res: Response) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })
  res.redirect(url)
}


export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.query

  if (!code) {
    throw new ApiError(400, 'No code provided')
  }

  // now take tokens from google
  const { tokens } = await oauth2Client.getToken(code as string)

  oauth2Client.setCredentials(tokens)

  // now take user info
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })

  const { data: googleUser } = await oauth2.userinfo.get()

  
  if (!googleUser.email) {
    throw new ApiError(400, 'Could not get user info')
  }

  // now create the user or find the exisitng user
  const user = await prisma.user.upsert({
    where: {
      email: googleUser.email
    },
    update: {
      name: googleUser.name ?? '',
      refreshToken: tokens.refresh_token ?? null
    },
    create: {
      email: googleUser.email,
      name: googleUser.name ?? '',
      profileImage: googleUser.picture ?? null,
      refreshToken: tokens.refresh_token ?? null,
    }
  })

  // now make jwt token for my backend not for google
  const jwtToken = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )

  return res.json(new ApiResponse(200, { token: jwtToken }, 'Login successful'))
})
