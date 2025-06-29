              // process-2
const asyncHandler = (requestHandler)=>{
    (req,res,next)=>{
        Promise
        .resolve(requestHandler(req,res,next))
        .reject((error)=>next(error))
    }
}





export {asyncHandler} 


// const asyncHandler = ()=>{}
// const asyncHandler = (fn)=>{()=>{}}               //For understand  only
// const asyncHandler = (fn)=>async()=>{}

                    //process-1
//  const  asyncHandler = (fn)=>async (req,res,next)=>{
// try {
//     await fn(req,res,next)
// } catch (error) {
//     res.status(error.code || 400).json({
//         success:false,
//         message: error.message
//     })
// }    
//  }