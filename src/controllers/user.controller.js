import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from '../utils/Cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'

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

export {
   registerUser,
   loginUser,
   logoutUser
} 