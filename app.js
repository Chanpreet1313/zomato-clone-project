
import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import session from "express-session";
import MongoStore from "connect-mongo";
import { connectdb } from "./config/connection.js";

import { authRouter } from "./routes/authRoutes.js";
import { customerRouter } from "./routes/customerRoutes.js";
import { aiChatRouter } from "./routes/aiChatRoutes.js";
import { ownerRouter } from "./routes/ownerRoutes.js";
import { homeRouter } from "./routes/homeRoutes.js";
import { delieveryRouter } from "./routes/delieveryRoutes.js";
import { paymentRouter } from "./routes/paymentRoutes.js";
import { authmiddleware } from "./middlewares/authmiddleware.js";

dotenv.config();

// Validate the required environment variables
if (!process.env.MONGODB_URL) {
  throw new Error("MONGODB_URL is missing from environment variables");
}

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing from environment variables");
}

// Wait for MongoDB before initializing the Express app
await connectdb(process.env.MONGODB_URL);



const app = express();

// Resolve current directory
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(dirname, "views"));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URL,
      collectionName: "Session",
      ttl: 60 * 60 * 24
    }),

    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: "lax"
    }
  })
);

// Static files
app.use(express.static(path.join(dirname, "public")));

// Routes
app.use("/", homeRouter);
app.use("/auth", authRouter);
app.use("/customer", authmiddleware, customerRouter);
app.use("/customer", authmiddleware, aiChatRouter);
app.use("/owner", authmiddleware, ownerRouter);
app.use("/delievery", authmiddleware, delieveryRouter);
app.use("/payment", authmiddleware, paymentRouter);

// Export Express app
export default app;
