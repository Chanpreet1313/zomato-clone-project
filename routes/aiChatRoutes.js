
import { Router } from "express";
import { sendMessage } from "../controllers/aiChatController.js";

export const aiChatRouter = Router();

aiChatRouter.post("/chatbot", sendMessage);
