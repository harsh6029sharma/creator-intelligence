import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/auth.route'

dotenv.config()

const app = express()

const PORT = process.env.PORT || 3000

app.use(express.json({ strict: true }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use(cookieParser())

// Routes
app.use("/auth", authRoutes)


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
})