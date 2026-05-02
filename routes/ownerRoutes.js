import {Router} from "express";
import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";
import { ownerDashboard,createRestaurant,postRestaurant,addMenu,postMenu,getMenu,getEditMenu,postEditMenu,deleteMenu,toggleRestaurant,getOwnerProfile,changePassword,updateProfileInfo, getOrder,updateOrderStatus } from "../controllers/ownercontroller.js";

const filename=fileURLToPath(import.meta.url);
const dirname=path.dirname(filename);
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(dirname, "../public/restaurant-uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const menuStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(dirname, "../public/menu-uploads")); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const menuUpload = multer({ storage: menuStorage });

export const ownerRouter = Router();
ownerRouter.get("/owner-dashboard",ownerDashboard);
ownerRouter.get("/create-restaurant",createRestaurant);
ownerRouter.post("/create-restaurant",upload.single('logoImage'),postRestaurant);
ownerRouter.get("/add-menu/:id",addMenu);
ownerRouter.post("/add-menu",menuUpload.single("image"), postMenu);
ownerRouter.get("/show-menu/:id",getMenu);
ownerRouter.get("/edit-menu/:id", getEditMenu);
ownerRouter.post("/edit-menu/:id", menuUpload.single("image"), postEditMenu);
ownerRouter.delete("/delete-menu/:id", deleteMenu);
ownerRouter.post("/restaurant/:id/toggle", toggleRestaurant);
ownerRouter.get("/profile",getOwnerProfile);
ownerRouter.post("/profile/change-password",changePassword);
ownerRouter.post("/profile/update-personal",updateProfileInfo);
ownerRouter.get("/orders",getOrder);
ownerRouter.post("/orders/:id/status", updateOrderStatus);