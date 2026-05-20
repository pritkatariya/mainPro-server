import { Request } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (_req: Request, file: Express.Multer.File) => {
        const isAudio =
            file.mimetype.startsWith("audio/") ||
            file.originalname.toLowerCase().endsWith(".mp3");

        const cleanName = file.originalname
            .split(".")[0]
            .replace(/[^a-zA-Z0-9]/g, "-")
            .toLowerCase();

        return {
            folder: "gurukul_assets",
            resource_type: isAudio ? "video" : "image",
            allowed_formats: [
                "jpg",
                "jpeg",
                "png",
                "webp",
                "avif",
                "gif",
                "mp3",
                "wav",
            ],
            public_id: `${Date.now()}-${cleanName}`,
        } as any;
    },
});

const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    const fileName = file.originalname.toLowerCase();

    const isImage =
        file.mimetype.startsWith("image/") ||
        fileName.endsWith(".jpg") ||
        fileName.endsWith(".jpeg") ||
        fileName.endsWith(".png") ||
        fileName.endsWith(".webp") ||
        fileName.endsWith(".avif") ||
        fileName.endsWith(".gif");

    const isAudio =
        file.mimetype.startsWith("audio/") ||
        fileName.endsWith(".mp3") ||
        fileName.endsWith(".wav");

    if (isImage || isAudio) {
        cb(null, true);
        return;
    }

    cb(new Error("Only image and MP3/WAV audio files are allowed!"));
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024,
        files: 500,
        fields: 500,
        parts: 1000,
    },
});