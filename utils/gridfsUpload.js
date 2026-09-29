import { Readable } from "stream";
import { getGridFSBucket } from "../config/gridfs.js";


export function uploadToGridFS(file) {

    return new Promise((resolve, reject) => {

        const bucket = getGridFSBucket();

        const uploadStream = bucket.openUploadStream(
            file.originalname,
            {
                metadata: {
                    contentType: file.mimetype
                }
            }
        );

        uploadStream.on("error", reject);

        uploadStream.on("finish", () => {

            resolve(uploadStream.id);

        });

        Readable
            .from(file.buffer)
            .pipe(uploadStream);

    });

}