import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";

let gridFSBucket;

export function getGridFSBucket() {

    if (!gridFSBucket) {

        const db = mongoose.connection.db;

        gridFSBucket = new GridFSBucket(db, {
            bucketName: "uploads"
        });

    }

    return gridFSBucket;
}