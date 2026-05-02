import {Router} from "express";
import {delieveryDashboard,acceptOrder,rejectOrder,pickupOrder,delieverOrder,getOrderQueue,getProfile } from "../controllers/delieverycontroller.js";

export const delieveryRouter = Router();
delieveryRouter.get("/delievery-dashboard",delieveryDashboard);
delieveryRouter.post("/order/accept/:id",acceptOrder);
delieveryRouter.post("/order/reject/:id",rejectOrder);
delieveryRouter.post('/order/pickup/:id', pickupOrder);
delieveryRouter.post("/order/deliever/:id",delieverOrder);
delieveryRouter.get("/order-queue",getOrderQueue);
delieveryRouter.get("/profile",getProfile);