import {Router} from "express";
import {getSignup,getLogin,postSignup,postLogin,handleLogout} from "../controllers/authcontroller.js";

export const authRouter = Router();
authRouter.get("/signup",getSignup);
authRouter.get("/login",getLogin);
authRouter.post("/signup",postSignup);
authRouter.post("/login",postLogin);
authRouter.get("/logout",handleLogout);