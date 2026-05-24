import { Request, Response } from "express";
import pool from "../database/start.js";
import { uploadToSupabase } from "../middleware/upload.js";

// Helper to obtain a usable file URL from different upload adapters (multer disk, cloudinary, S3, etc.)
const getFileUrl = (file?: Express.Multer.File) => {
    if (!file) return "";
    // Different upload middlewares/providers put the final URL in different props.
    // Try common ones in order of preference and fall back to `path` or empty string.
    const f: any = file as any;
    return (
        f.secure_url || // Cloudinary
        f.location ||   // multer-s3 / S3
        f.url ||
        f.path ||
        ""
    );
};

// 1. GET: Fetch All Active Songs
export const getAllSongs = async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            "SELECT id, title, artist, audio_url FROM gurukul_songs WHERE is_active = true ORDER BY id DESC"
        );
        return res.status(200).json({ success: true, songs: result.rows });
    } catch (error) {
        console.error("Get songs error:", error);
        return res.status(500).json({ success: false, message: "Failed to load music track list" });
    }
};

// 2. POST: Upload Track to Cloud Storage & Database
export const uploadSong = async (req: Request, res: Response) => {
    try {
        let audioFile = req.file; 
        
        if (!audioFile && (req.files as any)?.audio) {
            audioFile = (req.files as any).audio[0];
        }
        
        if (!audioFile) {
            return res.status(400).json({ 
                success: false, 
                message: "MP3 audio file is required or upload failed. Please choose a valid file." 
            });
        }

        const { title, artist } = req.body;
        if (!title || String(title).trim() === "") {
            return res.status(400).json({ success: false, message: "Song title/naam is required" });
        }

        let audioUrl = getFileUrl(audioFile);

        // If multer is using memoryStorage (we have buffer), upload to Supabase storage and get a public URL
        if ((!audioUrl || audioUrl === "") && (audioFile as any)?.buffer) {
            try {
                audioUrl = await uploadToSupabase(audioFile as Express.Multer.File, "gurukul_assets");
            } catch (err) {
                console.error("Supabase upload failed:", err);
                return res.status(500).json({ success: false, message: "Failed to store uploaded file in cloud storage" });
            }
        }

        if (!audioUrl) {
            console.error("Upload completed but no audio URL was derived from the uploaded file:", audioFile);
            return res.status(500).json({ success: false, message: "Upload succeeded but no file URL returned by storage provider" });
        }

        const result = await pool.query(
            `INSERT INTO gurukul_songs (title, artist, audio_url, is_active) 
             VALUES ($1, $2, $3, true) 
             RETURNING id, title, artist, audio_url`,
            [title.trim(), artist ? artist.trim() : "Gurukul Sevak", audioUrl]
        );

        return res.status(200).json({
            success: true,
            message: "Song track uploaded successfully! 🎵",
            song: result.rows[0],
        });
    } catch (error: any) {
        console.log("🔴 MUSIC UPLOAD CONTROLLER CRITICAL ERROR DETAIL:");
        console.error(error); 
        
        // 🎯 ક્લાઉડિનરી ક્રેડિટલ્સ ખૂટે છે કે કેમ તે પકડવા માટે
        const errorMessage = error?.message || "Unknown Cloudinary/Database error";
        
        return res.status(500).json({ 
            success: false, 
            message: "Backend cloud upload failed. Please check credentials or file format.",
            error: errorMessage
        });
    }
};

// 3. DELETE: Remove Track
export const deleteSong = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query("DELETE FROM gurukul_songs WHERE id = $1 RETURNING id", [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Track not found" });
        }
        return res.status(200).json({ success: true, message: "Track removed successfully" });
    } catch (error) {
        console.error("Delete song error:", error);
        return res.status(500).json({ success: false, message: "Could not complete delete action" });
    }
};