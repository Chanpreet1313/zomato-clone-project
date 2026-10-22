import {Router} from "express";
import {getSignup,getLogin,postSignup,postLogin,handleLogout} from "../controllers/authcontroller.js";
import {authmiddleware,redirectIfAuthenticated} from "../middlewares/authmiddleware.js";

export const authRouter = Router();
authRouter.get("/signup", redirectIfAuthenticated, getSignup);
authRouter.get("/login", redirectIfAuthenticated, getLogin);
authRouter.post("/signup",postSignup);
authRouter.post("/login",postLogin);
authRouter.get("/logout",handleLogout);