import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from '../utils/Cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'
import mongoose from "mongoose"

const generateAccessAndRefreshTokens = async(userId)=>{
   try {
      const user = await User.findById(userId)

      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()

      user.refreshToken = refreshToken

      await user.save({validateBeforeSave:false})

      return {accessToken,refreshToken}
      
   } catch (error) {
      throw new ApiError(500,"something went wrong while generating tokens")
   }
}

const registerUser = asyncHandler(async(req,res)=>{
   //get details from frontend 
   //validation 
   //check if user already exist
   //check for images ,check for avatar
   //upload on cloudinary,avatar
   //create user object - create entry object in DB
   //remove password and refresh token field from response
   //check for user creation 
   //return response

   const {fullName,username,password,email} = req.body
//    console.log("Email :",email);

   if (
      [fullName,username,email,password].some((field)=>field?.trim() === "")
   ) {
      throw new ApiError(400,"All field are required")
   }

   const existedUser = await User.findOne(
      {
         $or:[{ username },{ email }]
      }
   )
   if (existedUser) {
      throw new ApiError(400,"Username and email already existed ")
   }

   const avatarLocalpath =   req.files?.avatar[0]?.path ; 
   // const coverImageLocalPath =   req.files?.coverImage[0]?.path ; 
   let coverImageLocalPath ; 
   if (req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage[0] > 0 ) {
      coverImageLocalPath = req.files.coverImage[0].path
   }

   if (!avatarLocalpath) {
      throw new ApiError(400,"Avatar iamge is required")
   }

   const avatar = await uploadOnCloudinary(avatarLocalpath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if (!avatar) {
     throw new ApiError(400,"Avatar file is required") 
   }


   const user = await User.create({
      fullName,
      email,
      password,
      username:username.toLowerCase(),
      avatar : avatar.url,
      coverImage: coverImage?.url || ""
   })

   const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
   )

   if (!createdUser) {
      throw new ApiError(500,"something went wrong while creating a new user")
   }
     

   return res.status(201).json(
      new ApiResponse(200,createdUser,"user created successfully")
   )
})

const loginUser = asyncHandler(async (req,res)=>{
   // take data from frontend 
   //check validate email
   //check in db email is stored or not 
   //if stored then then password 
   //if password is correct  then  send accessToken and refreshToken and login the user 
   //send cookies
     
   const {username,email,password} = req.body

   if (!username && !email) {
      throw new ApiError(400,"username or email should be required")
   }
   //This code only for taken username or email 
   
   // if(!(username || email)){
   //    throw new ApiError(400,"username or email should be required") 
   // }

   const user = await User.findOne({
      $or:[{username},{email}]
   })

   if (!user) {
      throw new ApiError(401,"user does not exist")
   }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
      throw new ApiError(400,"Invalid user credential")
   }

   const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)


   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")


   const options = {
      httpOnly:true,
      secure: true
   }

   return res
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken",refreshToken,options)
   .json(
      new ApiResponse(
         200,
         {
            user:loggedInUser,accessToken,refreshToken
         },
         "User Logged In successfully"
      )
   )


})

const logoutUser = asyncHandler(async(req,res)=>{
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $unset:{
            refreshToken:1 //this remove the field from document
         }
      },
      {
            new:true
      }
   )

   const options = {
      httpOnly:true,
      secure:true
   }

   return res.status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(new ApiResponse(
      200,
      {},
      "User Logged Out Successfully"
   ))

})

const refreshAccessToken = asyncHandler(async(req,res)=>{
   const incomigRefreshToken = req.cookies.refreshToken || req.body.refreshToken

   if (!incomigRefreshToken) {
      throw new ApiError(401,"Unauthorized request")
   }

   try {
      const decodedToken = jwt.verify(incomigRefreshToken,process.env.REFRESH_TOKEN_SECRET)

      const user = await User.findById(decodedToken?._id)

      if (!user) {
         throw new ApiError(401,"Invalid Refresh Token")
      }

      if (incomigRefreshToken !== user?.refreshToken) {
         throw new ApiError(401,"refresh token is expired")
      }

      const options = {
         httpOnly:true,
         secure:true
      }

      const {accessToken,newRefreshToken} = generateAccessAndRefreshTokens(user._id)

      return res
      .status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",newRefreshToken,options)
      .json(new ApiResponse(
         200,
         {accessToken,refreshToken:newRefreshToken},
         "Access token refreshed"
      ))
      
   } catch (error) {
      throw new ApiError(404,error?.message || "refreshToken Expired")
   }

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
   const {oldPassword,newPassword,confpassword} = req.body

   if (!(newPassword === confpassword)) {
      throw new ApiError(400,"please newPassword and confPassword should be same")
   }

   const user = await User.findById(req.user?._id)

   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

   if (!isPasswordCorrect) {
      throw new ApiError(400,"Invalid Old password")
   }

   user.password = newPassword
   await user.save({validateBeforeSave:false})

   return res
   .status(200)
   .json(new ApiResponse(200,{},"Password changed successfully"))

})

const getCurrentUser = asyncHandler(async(req,res)=>{
   return res
   .status(200)
   .json(new ApiResponse(
      200,
       req.user,
       "User Fetched successfully"
      
   ))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
   const {fullName,email} = req.body

   if (!fullName && !email) {
      throw new ApiError(400,"All fields are required")
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            fullName,
            email
         }
      },
      {
         new:true
      }
   ).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(
      200,
      user,
      "Account details updated successfully"
   ))

})

const updateUserAvatar = asyncHandler(async(req,res)=>{
   const avatarLocalpath = req.file?.path

   if (!avatarLocalpath) {
      throw new ApiError(400,"Avatar file is required")
   }

   const avatar = await uploadOnCloudinary(avatarLocalpath)

   if (!avatar.url) {
      throw new ApiError(400,"Error while uploading avatar")
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            avatar:avatar.url
         }
      },
      {new:true}
   ).select("-password")

   //TODO : after that i want to delete old image
    
   return res
   .status(200)
   .json(new ApiResponse(200,user,"Avatar iamge updated successfully"))
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
   const coverImageLocalPath= req.file?.path

   if (!coverImageLocalPath) {
      throw new ApiError(400,"cover image is required")
   }

   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if (!coverImage.url) {
      throw new ApiError(400,"Error while uploading coverImage")
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            coverImage:coverImage.url
         }
      },
      {new:true}
   ).select("-password")

   return res
   .status(200)
   .json(
      new ApiResponse(200,user,"coverImage updated successfully")
   )

})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params

    if (!username?.trim()) {
      throw new ApiError(400,"username is missing")
    }

    const channel = await User.aggregate([
      {
         $match:{
            username:username?.toLowerCase()
         }
      },{
         $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
         }
      },{
         $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
         }
      },{
         $addFields:{
            subscribersCount:{
               $size: "$subscribers"
            },
            channelSubscribedToCount:{
               $size:"$subscribedTo"
            },
            isSubscribed:{
               $cond:{
                  if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                  then:true,
                  else:false
               }
            }
         }
      },{
         $project:{
            fullName:1,
            username:1,
            email:1,
            avatar:1,
            coverImage:1,
            subscribersCount:1,
            channelSubscribedToCount:1,
            isSubscribed:1
         }
      }
    ])

    if (!channel?.length) {
      throw new ApiError(400,"channel does not exist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,channel[0],"User channel fetched successfully"))

})

const getWatchHistory =asyncHandler(async(req,res)=>{
const user  = await User.aggregate([
   {
      $match:{
         _id: new mongoose.Types.ObjectId(req.user._id)
      }
   },{
      $lookup:{
         from:"videos",
         localField:"watchHistory",
         foreignField:"_id",
         as:"watchHistory",
         pipeline:[
            {
               $lookup:{
                  from:"users",
                  localField:"owner",
                  foreignField:"_id",
                  as:"owner",
                  pipeline:[
                     {
                        $project:{
                           fullName:1,
                           username:1,
                           avatar:1
                        }
                     }
                  ]
               }
            },{
               $addFields:{
                  owner:{
                     $first:"$owner"
                  }
               }
            }
         ]
      }
   }
])

return res
.status(200)
.json(new ApiResponse(
   200,
   owner[0].watchHistory,
   "Watch history fetched successfully"
))
})

export {
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   changeCurrentPassword,
   getCurrentUser,
   updateAccountDetails,
   updateUserAvatar,
   updateUserCoverImage,
   getUserChannelProfile,
   getWatchHistory
} 