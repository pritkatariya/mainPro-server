import { Request, Response } from "express";
import pool from "../database/start.js";
import { uploadToSupabase } from "../middleware/upload.js";
import * as OverviewSevice from "../services/Overview-Servise.js";

interface OverviewConfig {
    heroImages: string[];
    campusImage: string;
    campusGalleryImages: string[];
    logoImage: string;
    dailyDarshanImages: string[];
}

const defaultConfig: OverviewConfig = {
    heroImages: [],
    campusImage: "",
    campusGalleryImages: [],
    logoImage: "",
    dailyDarshanImages: [],
};

const toStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.filter((item) => typeof item === "string");
    }

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
        } catch {
            return [];
        }
    }

    return [];
};

const rowToConfig = (row: any): OverviewConfig => {
    if (!row) return defaultConfig;

    return {
        heroImages: toStringArray(row.hero_images),
        campusImage: row.campus_image || "",
        campusGalleryImages: toStringArray(row.campus_gallery_images),
        logoImage: row.logo_image || "",
        dailyDarshanImages: toStringArray(row.daily_darshan_images).slice(0, 10),
    };
};

const parseExisting = (bodyValue: unknown, fallback: string[]): string[] => {
    if (!bodyValue) return fallback;

    try {
        const parsed = typeof bodyValue === "string" ? JSON.parse(bodyValue) : bodyValue;
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : fallback;
    } catch {
        return fallback;
    }
};

const safeString = (value: unknown): string => {
    if (typeof value !== "string") return "";
    return value;
};

export const getOverviewConfig = async (_req: Request, res: Response): Promise<Response> => {
    try {
        const result = await OverviewSevice.getOverview();
        return res.status(200).json({
            success: true,
            config: rowToConfig(result.rows[0]),
        });
    } catch (error: any) {
        console.error("Get overview config error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to load overview config",
        });
    }
};

export const updateOverviewConfig = async (req: Request, res: Response): Promise<Response> => {
    try {
        // ૧. જૂનો ડેટા મેળવો
        const currentResult = await OverviewSevice.getOverview();
        const current = rowToConfig(currentResult.rows[0]);
        
        const reqFiles = req.files as Record<string, Express.Multer.File[]> | undefined;

        // ૨. નવી ફાઇલ્સ અપલોડ કરો
        const newHeroUrls = reqFiles?.heroImages 
            ? await Promise.all(reqFiles.heroImages.map(file => uploadToSupabase(file))) 
            : [];

        const newCampusGalleryUrls = reqFiles?.campusGalleryImages 
            ? await Promise.all(reqFiles.campusGalleryImages.map(file => uploadToSupabase(file))) 
            : [];

        const newDailyDarshanUrls = reqFiles?.dailyDarshanImages 
            ? await Promise.all(reqFiles.dailyDarshanImages.slice(0, 10).map(file => uploadToSupabase(file))) 
            : [];

        // ૩. ઈમેજ લોજિક
        let logoImage = reqFiles?.logoImage?.[0] 
            ? await uploadToSupabase(reqFiles.logoImage[0]) 
            : (req.body.logoImage ?? current.logoImage);

        let campusImage = reqFiles?.campusImage?.[0] 
            ? await uploadToSupabase(reqFiles.campusImage[0]) 
            : (req.body.campusImage ?? current.campusImage);

        // ૪. એરે કમ્બાઈન કરો
        const heroImages = [...parseExisting(req.body.existingHeroImages, current.heroImages), ...newHeroUrls];
        const campusGalleryImages = [...parseExisting(req.body.existingCampusGalleryImages, current.campusGalleryImages), ...newCampusGalleryUrls];
        const dailyDarshanImages = [...parseExisting(req.body.existingDailyDarshanImages, current.dailyDarshanImages), ...newDailyDarshanUrls].slice(0, 10);

        // ૫. પેરામીટર્સ તૈયાર કરો
        const queryParams = [
            safeJson(heroImages),
            safeString(campusImage),
            safeJson(campusGalleryImages),
            safeString(logoImage),
            safeJson(dailyDarshanImages)
        ];

        // ૬. સર્વિસ દ્વારા અપડેટ કરો (ફક્ત એક જ ક્વેરી)
        const result = await OverviewSevice.updateOverview(queryParams);

        return res.status(200).json({
            success: true,
            config: rowToConfig(result.rows[0]),
        });

    } catch (error: any) {
        console.error("Overview update error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Overview settings update failed",
        });
    }
};

const safeJson = (data: any): string => {
    return JSON.stringify(Array.isArray(data) ? data : []);
};
