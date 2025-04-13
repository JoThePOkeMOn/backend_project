import { ApiError } from "../utils/ApiError.js";
import { aysncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";

export const verifyJWT = aysncHandler(async (req,res,next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
        if(!token){
            throw new ApiError(401,"Unauthorized token")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        
        if(!user){
            throw new ApiError(401,"Invalid access token")
        }
    
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid access token")
    }

})