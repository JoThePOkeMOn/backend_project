import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    index: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    trim: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  avatar:{
    type: String, //url
    // required: true
  },
  coverImage:{
    type : String,
  },
  watchHistory:[{
    type: Schema.Types.ObjectId,
    ref:"Video"
  }],
  password:{
    type: String,
    required : [true,"Password is Required"]
  },
  refreshToken:{
    type: String
  }
},
{
    timestamps: true
});

userSchema.pre("save",async function (next){
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password) {
  bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function (){
    return jwt.sign({
        _id: this._id,
        email:this.email,
        username: this.username,
        firstName: this.firstName
    },
process.env.ACCESS_TOKEN_SECRET,
{
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY
})
}

userSchema.methods.generateRefreshToken = function(){
    try {
      return jwt.sign(
          {
              _id: this._id
          },process.env.REFRESH_TOKEN_SECRET,
          {
              expiresIn: process.env.REFRESH_TOKEN_EXPIRY
          }
      )
    } catch (error) {
       throw new ApiError(500,error?.message||"error generating refresh token")
    }
}

export const User = mongoose.model("User",userSchema)