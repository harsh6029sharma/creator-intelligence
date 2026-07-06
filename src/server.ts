import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/auth.route'
import channelRoutes from './routes/channel.route'
import analyticsRoutes from './routes/analytics.route'
import { startFetchJob } from './jobs/fetch.job'
import { startSnapshotJob } from './jobs/snapshot.job'
import cors from 'cors'

dotenv.config()

const app = express()

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

const PORT = process.env.PORT || 3008

app.use(express.json({ strict: false }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use(cookieParser())

// Routes
app.use("/auth", authRoutes)
app.use("/channel", channelRoutes)
app.use("/analytics", analyticsRoutes)


// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
})

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const statusCode = err.statusCode || 500
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Something went wrong'
    })
})

app.listen(PORT, () => {
    console.log(`server is listening on port: ${PORT}`);
    startFetchJob()
    startSnapshotJob()
})