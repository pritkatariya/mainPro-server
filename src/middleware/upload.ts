import { Request } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
    console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env file!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const storage = multer.memoryStorage();

const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    const fileName = file.originalname.toLowerCase();

    const isImage =
        file.mimetype.startsWith("image/") ||
        /\.(jpg|jpeg|png|webp|avif|gif)$/.test(fileName);

    const isAudio =
        file.mimetype.startsWith("audio/") ||
        /\.(mp3|wav)$/.test(fileName);

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
        files: 20,
    },
});

export const uploadToSupabase = async (
    file: Express.Multer.File,
    bucket: string = "gurukul_assets"
): Promise<string> => {
    const cleanName = file.originalname
        .split(".")[0]
        .replace(/[^a-zA-Z0-9]/g, "-")
        .toLowerCase();

    const fileExtension = file.originalname.split(".").pop();
    const fileName = `${Date.now()}-${cleanName}.${fileExtension}`;

    const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
        });

    if (error) {
        console.error("Supabase Upload Error:", error);
        throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
};