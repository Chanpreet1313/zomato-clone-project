import {Router} from "express";
import {getHome} from "../controllers/homecontroller.js";

export const homeRouter = Router();
homeRouter.get("/",getHome);