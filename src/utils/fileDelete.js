import { v2 } from "cloudinary";
import { ApiError } from "./ApiError.js";



export const fileDelete = async (filePublicId)=>{
    try {
        if(!filePublicId){
            throw new ApiError(400,"File missing")
        }

        const deletedFile = await v2.uploader.destroy(filePublicId)
        console.log("File Deleted")
    } catch (error) {
        throw new ApiError(400,error?.message||"File Missing")
    }
}