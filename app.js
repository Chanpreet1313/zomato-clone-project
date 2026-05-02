import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectdb } from "./config/connection.js";
import { authRouter } from "./routes/authRoutes.js";
import { customerRouter } from "./routes/customerRoutes.js";
import { ownerRouter } from "./routes/ownerRoutes.js";
import {homeRouter} from "./routes/homeRoutes.js"
import { delieveryRouter } from "./routes/delieveryRoutes.js";
import { authmiddleware} from "./middlewares/authmiddleware.js"
import session from "express-session";
import MongoStore from "connect-mongo";
dotenv.config();
const app = express();
const PORT = process.env.PORT;
const filename=fileURLToPath(import.meta.url);
const dirname=path.dirname(filename);
app.set("view engine","ejs")
app.set("views",path.join(dirname,"views"))
app.use(express.urlencoded({extended:true}))
app.use(express.json());
app.use(session({
  secret:process.env.SESSION_SECRET,
  resave:false,
  saveUninitialized:false,
  store:
    MongoStore.create({
      mongoUrl:process.env.MONGODB_URL,
      collectionName:"Session",
      ttl: 60 * 60 * 24
    })
  ,
  cookie:{
    httpOnly:true,
    maxAge:1000 * 60 * 60 * 24,
    sameSite:"lax"
  }
}))
app.use(express.static(path.join(dirname,"public")))
app.use("/",homeRouter);
app.use("/auth",authRouter);
app.use("/customer",authmiddleware,customerRouter);
app.use("/owner",authmiddleware,ownerRouter);
app.use("/delievery",authmiddleware,delieveryRouter);



async function createServer(){
try{
  await connectdb(process.env.MONGODB_URL);
  console.log("connected to db successfully")
  app.listen(PORT,()=>{
    console.log(`server is running at port ${PORT}`)
  })
}catch(err){
  console.log(err.message);
  process.exit(1)
};
}
createServer()