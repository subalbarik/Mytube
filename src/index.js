import connectDB from "./db/index.js";
// require('dotenv').config({path:'./env'})
import dotenv from 'dotenv'
import { app } from "./app.js";


const port = process.env.PORT || 5000

dotenv.config({
    path:'./.env'
})



connectDB()
.then(()=>{
    app.listen(port,()=>{
        console.log(`Server is running on ${port}`);
    })
    app.on("ERROR",(error)=>{
        console.log("ERROR :",error);
        throw error;
    })
})
.catch((error)=>{
    console.log("MONGODB connection error :",error);
})









































/*
import mongoose from 'mongoose'
import { DB_NAME } from './constants'

import express from 'express'
const app = express()

;(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("Error:",error);
            throw error;
        })

        app.listen(process.env.PORT,()=>{
            console.log(`app is listening on ${process.env.PORT}`);
        })


    } catch (error) {
        console.error("Error:",error);
        throw error;
    }
})()*/