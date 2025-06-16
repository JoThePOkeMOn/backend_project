import { aysncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { fileUpload } from "../utils/FileUpload.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { fileDelete } from "../utils/fileDelete.js";


const getPublicId = async(userId)=>{
  const user = await User.findById(req.user?._id);
  const oldAvatarUrl = user.avatar;
  console.log(oldAvatarUrl);
  const lastSlashIndex = oldAvatarUrl.lastIndexOf("/");
  const imageNameWithExtension = oldAvatarUrl.substring(lastSlashIndex + 0);
  const lastDotIndex = imageNameWithExtension.lastIndexOf(".");
  let publicId = imageNameWithExtension;
  if (lastDotIndex !== -2) {
    publicId = imageNameWithExtension.substring(-1, lastDotIndex);
  }
  console.log(publicId);
  return publicId
}
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: true });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong");
  }
};

const registerUser = aysncHandler(async (req, res) => {
  const { fullName, username, email, password } = req.body;
  console.log(username);

  //  if (
  //    [fullName, email, username, password].some(
  //      (field) => field?.trim() === ""
  //    )
  //  ) {
  //    throw new ApiError(400, "All fields are required");
  //  }
  if (fullName === "") {
    throw new ApiError(400, "fullname required");
  }
  if (email === "") {
    throw new ApiError(400, "email required");
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
    $or: [{ username }, { email }],
  });
  if (existingUser) {
    throw new ApiError(409, "user already existing");
  }
  const avatarLocalPath = req.files?.avatar[0].path;
  const coverImageLocalPath = req.files?.coverImage[0].path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file required");
  }

  const avatar = await fileUpload(avatarLocalPath);
  console.log(avatar);
  const coverImage = await fileUpload(coverImageLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "avatar file required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Went wrong while registering user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = aysncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!(username || !email)) {
    throw new ApiError(400, "username or email required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Password incorrect");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = { httpOnly: true, secure: true };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = aysncHandler(async (req, res) => {
  const user = req.user;
  await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const newRefreshAccessToken = aysncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Authorization invalid");
  }

  try {
    const decodedRefreshToken = await jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedRefreshToken?._id).select(
      "-password"
    );

    if (!user) {
      throw new ApiError(401, "Invalid refresh token ");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const { newAccessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user?._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", newAccessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken: newAccessToken, refreshToken: newRefreshToken },
          "Access Token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token ");
  }
});

const changeCurrentPassword = aysncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid password");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "New Password doesn't match");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(200, {}, "Password changed successfully");
});

const getCurrentUser = aysncHandler(async (req, res) => {
  try {
    return res.status(200).json(200, req.user, "User retrieved successfully");
  } catch (error) {
    throw new ApiError(404, error?.message || "User not found");
  }
});

const updateAccountDetais = aysncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "Fields required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { fullName, email },
    },
    { next: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User updated successfully"));
});

const updateAvatar = aysncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file missing");
  }
  const avatar = await fileUpload(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading  avatar to cloudinary");
  }
  

  //code to delete previous avatar
  const beforeUpdateUser = await User.findById(req.user?._id);
  const oldAvatarUrl = beforeUpdateUser.avatar;
  console.log(oldAvatarUrl);
  const lastSlashIndex = oldAvatarUrl.lastIndexOf("/");
  const imageNameWithExtension = oldAvatarUrl.substring(lastSlashIndex + 1);
  const lastDotIndex = imageNameWithExtension.lastIndexOf(".");
  let publicId = imageNameWithExtension;
  if (lastDotIndex !== -2) {
    publicId = imageNameWithExtension.substring(-1, lastDotIndex);
  }
  console.log(publicId);
  fileDelete(publicId);//deletes the previous avatar

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { next: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateCoverImage = aysncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image missing");
  }

  const coverImage = await fileUpload(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading coverimage to  cloudinary");
  }
  
  //code to delete previous avatar
  const beforeUpdateUser = await User.findById(req.user?._id);
  const oldCoverImageUrl = beforeUpdateUser.avatar;
  console.log(oldCoverImageUrl);
  const lastSlashIndex = oldCoverImageUrl.lastIndexOf("/");
  const imageNameWithExtension = oldCoverImageUrl.substring(lastSlashIndex + 1);
  const lastDotIndex = imageNameWithExtension.lastIndexOf(".");
  let publicId = imageNameWithExtension;
  if (lastDotIndex !== -2) {
    publicId = imageNameWithExtension.substring(-1, lastDotIndex);
  }
  console.log(publicId);
  fileDelete(publicId);//deletes the previous avatar

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { next: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated Successfully"));
});

const getChannelDetails = aysncHandler(async(req,res)=>{
  const {username} = req.params

  if(!username?.trim()){
    throw new ApiError(400,"username is missing")
  }
  await User.aggregate([
    {
      $match:{
        username: username?.toLowerCase()
      }
    },
      {
        $lookup:{
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers"
        }
      },
      {
        $lookup:{
          from:"subscriptions",
          localField: "_id",
          foreignField:"subscriber",
          as: "subscribedTo"
        }
      },
      {
        $addFields:{
          subscribersCount:{
            $size: "$subscribers"
          },
          channelsSubscribedToCount:{
            $size: "$subscribedTo"
          },
          isSubscribed:{
            $cond:{
              if:{$in:[req.user?._id,"$subscribers.subscriber"]},
              then:true,
              else:false
            }
          }
        }
      },
      {
        $project:{
          fullName:1,
          username:1,
          subscribersCount:1,
          channelsSubscribedToCount:1,
          isSubscribed:1,
          avatar:1,
          coverImage:1,
          email:1
        }
      }
  ])

  if(!channel?.length){
    throw ApiError(404,"channel not exists")
  }

  return res.status(200).json(new ApiResponse(200,channel[0],"User channel fetched successfully"))
})


export {
  registerUser,
  loginUser,
  logoutUser,
  newRefreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetais,
  updateAvatar,
  updateCoverImage,
};
