import {Router} from "express";
import multer from "multer";
import mongoose from "mongoose";
import { getGridFSBucket } from "../config/gridfs.js";
// import { fileURLToPath } from "url";
// import path from "path";
import { ownerDashboard,createRestaurant,postRestaurant,addMenu,postMenu,getMenu,getEditMenu,postEditMenu,deleteMenu,toggleRestaurant,getOwnerProfile,changePassword,updateProfileInfo, getOrder,updateOrderStatus } from "../controllers/ownercontroller.js";

const upload = multer({
    storage: multer.memoryStorage()
});

const menuUpload = multer({
    storage: multer.memoryStorage()
});



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

ownerRouter.get("/image/:id", async (req, res) => {
    try {
        console.log("IMAGE REQUEST:", req.params.id);

        const fileId = new mongoose.Types.ObjectId(req.params.id);

        const db = mongoose.connection.db;
        const bucket = getGridFSBucket();

        const file = await db
            .collection("uploads.files")
            .findOne({ _id: fileId });

        if (!file) {
            // console.log("FILE NOT FOUND");
            return res.status(404).send("Image not found");
        }

        // console.log("FILE FOUND:", file.filename);

        // Determine content type
        let contentType = file.metadata?.contentType;

        if (!contentType) {
            const extension = file.filename.split(".").pop().toLowerCase();

            const mimeTypes = {
                jpg: "image/jpeg",
                jpeg: "image/jpeg",
                png: "image/png",
                gif: "image/gif",
                webp: "image/webp"
            };

            contentType = mimeTypes[extension] || "application/octet-stream";
        }

        res.setHeader("Content-Type", contentType);

        const downloadStream = bucket.openDownloadStream(fileId);

        downloadStream.on("error", (error) => {
            // console.error("GRIDFS DOWNLOAD ERROR:", error);

            if (!res.headersSent) {
                res.status(500).send("Error loading image");
            }
        });

        downloadStream.pipe(res);

    } catch (error) {
        // console.error("IMAGE RETRIEVAL ERROR:", error);
        res.status(400).send("Invalid image ID");
    }
});