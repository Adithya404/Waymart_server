import jwt from "jsonwebtoken";

const userAuth =async (req,res,next)=>{
    const {token} = req.cookies;


    if(!token){
        console.log("Secret key not found.")
        return res.json({success:false, message:"Not Authorized. Login Again"});
    }

    try{
        console.log("Secret key found")

        const tokenDecode=jwt.verify(token,process.env.JWT_SECRET);
        console.log(tokenDecode);

        if(tokenDecode.id){
            req.body.userId = tokenDecode.id
        }
        else{
            return res.json({success:false,message:'Not Authorized'})
        }

       next();

    }catch(err){
        res.json({success:false, message: err.message});
    }

}
export default userAuth;