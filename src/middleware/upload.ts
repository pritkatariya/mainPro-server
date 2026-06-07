import { Request } from "express";
import multer from "multer";
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// 🌐 Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
    api_key: process.env.CLOUDINARY_API_KEY || "",
    api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("Missing Cloudinary credentials in .env file!");
}

// 💾 Multer Memory Storage Config
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
    const isVideo =
        file.mimetype.startsWith("video/") ||
        /\.(mp4|mov|avi|mkv)$/.test(fileName);
    const isPdf =
        file.mimetype === "application/pdf" ||
        /\.pdf$/.test(fileName);

    if (isImage || isAudio || isVideo || isPdf) {
        cb(null, true);
        return;
    }

    cb(new Error("Only image, video, audio, and PDF files are allowed!"));
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 50MB Limit
        files: 20,
    },
});

/**
 * 🚀 Uploads a file buffer directly to Cloudinary
 * @param file - Multer file object containing the buffer
 * @param folder - Cloudinary folder name (defaults to "gurukul_assets")
 * @returns Secure URL string from Cloudinary
 */
export const uploadToCloudinary = async (
    file: Express.Multer.File,
    folder: string = "gurukul_assets"
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const cleanName = file.originalname
            .split(".")[0]
            .replace(/[^a-zA-Z0-9]/g, "-")
            .toLowerCase();
            
        const uniqueFilename = `${Date.now()}-${cleanName}`;

        // 🛠️ upload_stream નો ઉપયોગ બફર ડેટા અપલોડ કરવા માટે
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                public_id: uniqueFilename,
                resource_type: "auto", // ઈમેજ અને ઓડિયો બંને ઓટોમેટિક હેન્ડલ કરશે
            },
            // 🔒 FIXED TYPE: અહીંયા પ્રોપર ક્લાઉડિનરી ટાઇપ્સ ડિફાઇન કરી દીધી છે
            (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
                if (error) {
                    console.error("Cloudinary Upload Error:", error);
                    return reject(new Error(`Cloudinary upload failed: ${error.message}`));
                }
                if (!result) {
                    return reject(new Error("Cloudinary upload failed: No result returned from server."));
                }
                // 🔗 સિક્યોર HTTPS URL પૂર્ણપણે ઉપલબ્ધ ન હોય તો સામાન્ય urlFallback પણ ટ્રાય કરો
                const secureUrl = result.secure_url || result.url || result.location || "";
                if (!secureUrl) {
                    return reject(new Error("Cloudinary upload failed: no public URL found in response."));
                }

                resolve(secureUrl);
            }
        );

        // બફરને સ્ટ્રીમમાં રાઇટ કરીને અપલોડ પ્રોસેસ સ્ટાર્ટ કરવી
        uploadStream.end(file.buffer);
    });
};