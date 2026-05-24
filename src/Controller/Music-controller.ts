import { Request, Response } from "express";
import pool from "../database/start";

// ક્લાઉડિનરી લિંક મેળવવા માટેનું હેલ્પર
const getFileUrl = (file?: Express.Multer.File) => {
    if (!file) return "";
    return file.path; // Cloudinary આપણને ડાયરેક્ટ secure https:// યુઆરએલ આપે છે
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

        const audioUrl = getFileUrl(audioFile);

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