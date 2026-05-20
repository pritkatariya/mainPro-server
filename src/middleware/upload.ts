import { Request } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// ૧. Supabase ક્લાયન્ટ કન્ફિગર કરો
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env file!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// ૨. ફાઈલને ટેમ્પરરી રેમ (Memory Buffer) માં રાખવા માટે Multer સેટઅપ
const storage = multer.memoryStorage();

// ૩. ઈમેજ અને ઓડિયો ફાઈલ ફિલ્ટર
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

// ૪. Multer મિડલવેર એક્સપોર્ટ (૫૦ MB ની નવી લિમિટ સાથે)
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB (તમારી 14MB ની એરર કાયમ માટે સોલ્વ)
        files: 50,
    },
});

/**
 * ૫. હેલ્પર ફંક્શન: કંટ્રોલરમાં ફાઈલ અપલોડ કરવા અને પબ્લિક URL મેળવવા માટે
 * @param file - Express.Multer.File ઓબ્જેક્ટ
 * @param bucket - Supabase બકેટનું નામ (Default: gurukul_assets)
 */
export const uploadToSupabase = async (
    file: Express.Multer.File,
    bucket: string = "gurukul_assets"
): Promise<string> => {
    // ફાઈલના નામમાંથી સ્પેશિયલ કેરેક્ટર કાઢીને ક્લીન નામ બનાવવું
    const cleanName = file.originalname
        .split(".")[0]
        .replace(/[^a-zA-Z0-9]/g, "-")
        .toLowerCase();

    const fileExtension = file.originalname.split(".").pop();
    const fileName = `${Date.now()}-${cleanName}.${fileExtension}`;

    // Supabase Storage માં બફર અપલોડ કરો
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
        });

    if (error) {
        console.error("Supabase Upload Error:", error);
        throw new Error(`Supabase upload failed: ${error.message}`);
    }

    // અપલોડ થયેલી ફાઈલની પબ્લિક URL મેળવો
    const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
};