import { aysncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { fileUpload } from "../utils/FileUpload.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = aysncHandler(async (req,res)=>{
    const {fullName,username,email,password} =req.body;
    
      //  if (
      //    [fullName, email, username, password].some(
      //      (field) => field?.trim() === ""
      //    )
      //  ) {
      //    throw new ApiError(400, "All fields are required");
      //  }
    if (fullName === ""){
        throw new ApiError(400,"fullname required");
    }
    if(email === ""){
        throw new ApiError(400,"email required");
    }
    if (username === "") {
      throw new ApiError(400, "username required");
    }
    if (password === "") {
      throw new ApiError(400, "password required");
    }
    //if want modify the validation code above to a single one using some() and trim()
    //mail a validation to check email formatting
    const existingUser = await User.findOne({
        $or: [{username},{email}]
    })
    if(existingUser){
        throw new ApiError(409,"user already existing")
    }
    const avatarLocalPath = req.files?.avatar[0].path;
    const coverImageLocalPath = req.files?.coverImage[0].path;

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file required")
    }

    const avatar = fileUpload(avatarLocalPath)
    const coverImage = fileUpload(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400,"avatar file required")
    }

     const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url||"",
        email,
        password,
        username: username.toLowerCase()
    })

     const createdUser = await User.findById(user._id).select("-password -refreshToken") 

     if(!createdUser){
        throw new ApiError(500,"Went wrong while registering user")
     }

     return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
     )
})

export {registerUser}