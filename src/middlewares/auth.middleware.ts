import type {Response,NextFunction } from "express";
import type {AuthRequest} from "../types/index";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import jwt from 'jsonwebtoken'

const verifyJwt = asyncHandler( async(req:AuthRequest, res:Response, next:NextFunction)=> {
    const token = req.headers.authorization?.replace('Bearer ','')

    if(!token){
        throw new ApiError(401, 'Unauthorized')
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId:string
        email:string
    }

    req.user = decoded
    next()
} )

export default verifyJwt