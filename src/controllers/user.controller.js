import {asyncHandler} from "../utils/asyncHandler.js"


const registerUser = asyncHandler(async(req,res)=>{
    res.status(200).json({
        message:"Chai Aur Code By Hitesh Chaudhary"
    })
})

export {registerUser} 