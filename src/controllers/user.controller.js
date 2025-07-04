import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from '../utils/Cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'

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

export {registerUser} 