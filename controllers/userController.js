import userModel from "../models/userModel.js";

export const getUserData = async(req,res)=>{
    console.log("IN getuserData");
    try{
        
        const {userId} = req.body;
        console.log("uid:"+userId);
        const user= await userModel.findById(userId);

        if(!user){
            res.json({success:false, message:"user not found"});
        }
        res.json({
            success:true,
            userData:{
                name:user.name,
                isAccountVerified:user.isAccountVerified,

            }
        })
    }
    catch(err){
        res.json({success:false, message:err.message});
    }
}