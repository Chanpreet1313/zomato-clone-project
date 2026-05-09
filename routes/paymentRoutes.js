import express from "express";
import {Router} from "express";
import {getCheckout,createOrder,verifyPayment } from "../controllers/paymentcontroller.js";

export const paymentRouter = Router();
paymentRouter.get("/create-order",getCheckout);
paymentRouter.post("/create-order", createOrder);
paymentRouter.post("/verify-payment",verifyPayment);