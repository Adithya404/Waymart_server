import express from "express";
import { getUserData } from "../controllers/userController.js";
import userAuth from "../middleware/userAuth.js";

const userRouter = express.Router();

userRouter.get('/data',userAuth,getUserData);
// userRouter.get('/data',getUserData/userAuth);

export default userRouter;