import v2 from "cloudinary"
import fs from "fs"

 v2.config({
   cloud_name: process.env.CLOUDINARY_CLOUDNAME,
   api_key: process.env.CLOUDINARY_API_KEY,
   api_secret: process.env.CLOUDINARY_API_SECRET,
 });

 const fileUpload = async (LocalPathName)=>{
   try {
    if(!LocalPathName)  return new Error("Path not found")
    const response = await v2.uploader.upload(LocalPathName,{
        resource_type : "auto"
    })
    console.log("File is uploaded",response.url)
    // fs.unlinkSync(LocalPathName)
    return response
   } catch (error) {
     fs.unlinkSync(LocalPathName);
     return null
   }
 }

 export {fileUpload}