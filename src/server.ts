import express from 'express'
import type { Request,Response } from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
dotenv.config()

const app = express()

const PORT = process.env.PORT || 3000

app.use(express.json({strict:true}))
app.use(express.urlencoded({extended:true}))
app.use(express.static("public"))
app.use(cookieParser())

app.get("/", (req:Request, res:Response)=>{
    res.send("hello world")
})

app.listen(PORT, ()=>{
    console.log(`server is listening on port: ${PORT}`);
})