import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import userModel from '../models/userModel.js';

import transporter from '../config/nodemailer.js';

export const register = async(req,res)=>{
    const {name,email,password} = req.body;

    if(!name || !email || !password){
        return res.json({success:false, message:"Missing details"})
    }

    try{
        const existingUser = await userModel.findOne({email});
        if(existingUser){
            return res.json({success:false, message:"User Already Exists"})
        }

        const hashedPassword =await bcrypt.hash(password, 10);

        const user = new userModel({name,email,password:hashedPassword});
        await user.save(); 

        const token = jwt.sign(
            {id:user._id },
            process.env.JWT_SECRET,
            {expiresIn: '7d'}
        );
        res.cookie('token', token, {
            httpOnly:true,
            secure: process.env.NODE_ENV ==='production',
            sameSite: process.env.NODE_ENV  ==='production' ? 'none' : 'strict',
            maxAge: 7*24*60*60*1000
        });

        const mailTemplate=`<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to [Shopping Site]</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 600px;
                    margin: 20px auto;
                    background: #ffffff;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                }
                .header {
                    text-align: center;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #ddd;
                }
                .header h1 {
                    color: #333;
                }
                .content {
                    padding: 20px;
                    text-align: center;
                }
                .button {
                    display: inline-block;
                    padding: 10px 20px;
                    background-color: #28a745;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 5px;
                    margin-top: 20px;
                }
                .footer {
                    text-align: center;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    font-size: 12px;
                    color: #666;
                }
                img{
                    height: 40%;
                    width:80%
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to WayMart!</h1>
                </div>
                <div class="content">
                <img src="https://pouch.jumpshare.com/download/jpiuATMKfjPUVbP7ySls92Kth4DbYMeYQzg85qI20gRN1aBscOMd5Zv1WuwqJxZ66zRVLTCyMmmy_4QNvoCUHg" alt="logo"/>
                    <p>Hi ${name},</p>
                    <p>Thank you for registering at WayMart. We're thrilled to have you on board!</p>
                    <p>Click the button below to verify your email and complete your registration.</p>
                    <a href="[Verification Link]" class="button">Verify Email</a>
                    <p>If you did not sign up for an account, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} WayMart. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>`
        

        //Sending welcome email
        const mailOptions={
            from: process.env.SENDER_EMAIL,
            to: email,
            subject:'Welcome to Waymart',
            text:`Hey ${name}, Welcome to WayMart. Your account has been created. `,
            html: mailTemplate
        }

        await transporter.sendMail(mailOptions);

        return res.json({success:true, message:"Account created successfully"});
        
    }
    catch(err){
        res.json({success:false, message: err.message})
    }
}


// import {serialize} from 'cookie';
export const login = async(req,res)=>{
    const {email,password} = req.body;

    if(!email || !password){
        return res.json({success:false, message:"Email and password are required"})
    }

    try{
        const user  = await userModel.findOne({email});

        if(!user){
            return res.json({success:false, message:'Invalid email'})
        }
        const isMatch = await bcrypt.compare(password,user.password);

        if(!isMatch){
            return res.json({success:false, message:'Invalid password'})
        }

        const token = jwt.sign(
            {id:user._id },
            process.env.JWT_SECRET,
            {expiresIn: '7d'}
        );
        res.cookie('token', token, {
            httpOnly:true,
            secure: process.env.NODE_ENV ==='production',
            // sameSite: process.env.NODE_ENV  ==='production' ? 'none' : 'strict',
            sameSite:'Lax',
            maxAge: 7*24*60*60*1000
        });

        // const cookieOption =serialize("token",token,{
        //     // httpOnly:true,
        //     // secure:process.env.NODE_ENV ==="production",
        //     // secure:process.env.NODE_ENV === "production" ? true : false,
        //     secure:false,
        //     sameSite:process.env.NODE_ENV === "production" ? "None" : "Lax",
        //     path:'/',
        //     maxAge: 7*24*60*60*1000,
        // });
        // res.setHeader("Set-Cookie", cookieOption);
        // console.log("Set-Cookie Header:", res.getHeaders()["set-cookie"]);
        //         return res
        //         .status(200)
        //         .json({message:"Login Successful", token:token,});

        
        return res.json({success:true});
    }
    catch(err){
        console.log("Database Failure", err);
                return res.status(500).json({message:"Internal Server Error"});

        return res.json({success:false, message:err.message});
    }
}

export const logout = async(req,res)=>{
    try{
        res.clearCookie('token',{
            httpOnly:true,
            secure: process.env.NODE_ENV ==='production',
            sameSite: process.env.NODE_ENV  ==='production' ? 'none' : 'strict'
        });

        return res.json({success:true, message:"Logged Out"});
    }
    catch(err){
        return res.json({success:false, message:err.message});
    }
}


export const sendVerifyOtp=async (req,res)=>{
    try{
        const {userId} =req.body;

        const user=await userModel.findById(userId);

        if(user.isAccountverified){
            return res.json({success:false,message:"Account already verified"})
        }

        const otp=String(Math.floor(100000+Math.random()*900000));

        user.verifyOtp=otp;
        user.verifyOtpExpireAt =Date.now() +24*60*60*1000;
        console.log(user.verifyOtpExpireAt);

        await user.save();

        const otpTemplate=`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Verification - [Shopping Site]</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .header {
            padding-bottom: 20px;
            border-bottom: 1px solid #ddd;
        }
        .header h1 {
            color: #333;
        }
        .logo {
            max-width: 150px;
            margin-bottom: 10px;
        }
        .otp-code {
            font-size: 24px;
            font-weight: bold;
            color: #d9534f;
            background: #f8d7da;
            padding: 10px;
            display: inline-block;
            border-radius: 5px;
            margin: 20px 0;
        }
        .content {
            padding: 20px;
        }
        .footer {
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
        }
        img{
            height: 40%;
            width:80%
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://pouch.jumpshare.com/preview/Mt9-OZmAh6cZNEhD0Xly3-qWGR58jzLVno_3ixnl9xDG7KWi4XEBB9hrYTqsbSa9cj-kcE0MAM-I72i7mizJ6hNlIXjFS0eybILXwa5c5f0" alt="logo"/>
            <h1>OTP Verification</h1>
        </div>
        <div class="content">
            <p>Hi ${user.name},</p>
            <p>Use the OTP below to verify your email and complete your registration:</p>
            <p class="otp-code">${otp}</p>
            <p>This OTP is valid for a limited time. Do not share it with anyone.</p>
            <p>If you did not request this, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} WayMart. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

        const mailOptions={
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject:'Account Verification',
            text:`Yor Otp for account verification at WayMart  is `,
            html: otpTemplate
        }

        await transporter.sendMail(mailOptions);

        res.json({success:true, message:"Verifiaction OTP Sent on Email"});
        
    }catch(err){
        res.json({success:false, message:err.message});
    }
}

export const verifyEmail = async(req,res)=>{
    const {userId,otp} = req.body;

    if(!userId || !otp){
        return res.json({success:false, message:"Missing Details"});
    }
    try{
        const user = await userModel.findById(userId);

        if(!user){
            return res.json({success:false, message:'User not found'});
        }
        if(user.verifyOtp === '' || user.verifyOtp!==otp){
            return res.json({success:false,message:"Invalid OTP"});
        }
        if(user.verifyOtpExpireAt < Date.now()){
            return res.json({success:false, message:'OTP Expired'});
        }
        user.isAccountVerified = true;
        user.verifyOtp='';
        user.verifyOtpExpireTime=0;
        await user.save();

        return res.json({success:true, message:'Email verified successfully.'});

    }catch(err){
        res.json({success:false, message: err.message});
    }
}

export const isAuthenticated = async(req,res)=>{
    try{
        return res.json({success:true});
    }catch(err){
        res.json({success:false, message:err.message});
    }
}

export const sendResetOtp = async(req,res)=>{
    const {email} = req.body;
    if(!email){
        return res.json({success:false,message:'Email is required'});
    }
    try{
        const user=await userModel.findOne({email});
        if(!user){
            return res.json({success:false,message:'User not found'});
        }
        const otp=String(Math.floor(100000+Math.random()*900000));

        user.resetOtp=otp;
        user.resetOtpExpireAt =Date.now() +24*60*60*1000;
        console.log(user.resetOtpExpireTime);
        await user.save();

        const otpTemplate=`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - [Shopping Site]</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
        }
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            max-width: 600px;
            width: 100%;
            background: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .header {
            padding-bottom: 20px;
            border-bottom: 1px solid #ddd;
        }
        .logo {
            max-width: 100px;
            height: auto;
            margin-bottom: 10px;
        }
        .otp-code {
            font-size: 24px;
            font-weight: bold;
            color: #d9534f;
            background: #f8d7da;
            padding: 10px;
            display: inline-block;
            border-radius: 5px;
            margin: 20px 0;
        }
        .content {
            padding: 20px;
        }
        .footer {
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
        }
        @media screen and (max-width: 480px) {
            .container {
                padding: 15px;
            }
            .otp-code {
                font-size: 20px;
                padding: 8px;
            }
        }
        img{
            height: 40%;
            width:80%
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://pouch.jumpshare.com/preview/Mt9-OZmAh6cZNEhD0Xly3-qWGR58jzLVno_3ixnl9xDG7KWi4XEBB9hrYTqsbSa9cj-kcE0MAM-I72i7mizJ6hNlIXjFS0eybILXwa5c5f0" alt="Logo" class="logo">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <p>Hi ${user.name},</p>
            <p>We received a request to reset your password. Use the OTP below to proceed:</p>
            <p class="otp-code">${otp}</p>
            <p>This OTP is valid for a limited time. If you didn't request a password reset, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear} WayMart . All rights reserved.</p>
        </div>
    </div>
</body>
</html>`

        const mailOptions={
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject:'Password Reset',
            text:`Yor Otp for account verification at WayMart  is `,
            html: otpTemplate
        }

        await transporter.sendMail(mailOptions);

        return res.json({success:true,message:"OTP sent to your email"});

    }catch(err){
        res.json({success:false, message:err.message});
    }
}

export const resetPassword = async(req,res)=>{
    const {email,otp,newPassword} = req.body;

    if(!email || !otp || !newPassword){
        return res.json({success:false,message:'Email,OTP and new password are required'});
    }
    try{
        const user = await userModel.findOne({email});
        if(!user){
            return res.json({success:false,message:'User not found'});
        }
        if(user.resetOtp ==="" || user.resetOtp !== otp){
            return res.json({success:false,message:"Invalid OTP"});
        }
        if(user.resetOtpExpireAt < Date.now()){
            return res.json({success:false, message:'OTP Expired'});
        }
        const hashedPassword= await bcrypt.hash(newPassword,10);
        user.password=hashedPassword;
        user.resetOtp='';
        user.resetOtpExpireAt=0;

        await user.save();
        return res.json({success:true,message:"Password has been reset successfully"});


    }catch(err){
        res.json({success:false, message:err.message});
    }

}
