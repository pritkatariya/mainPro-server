import { Request, Response } from "express";
import db from "../database/db.js";
import { uploadToSupabase } from "../middleware/upload.js";
import neonPool from "../database/neon.js";

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
        const result = await db.query(`
            SELECT 
                hero_images,
                campus_image,
                campus_gallery_images,
                logo_image,
                daily_darshan_images
            FROM overview_config 
            WHERE id = 1
        `);

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
        const currentResult = await db.query(`
            SELECT
                hero_images,
                campus_image,
                campus_gallery_images,
                logo_image,
                daily_darshan_images
            FROM overview_config 
            WHERE id = 1
        `);


        const current = rowToConfig(currentResult.rows[0]);
        const reqFiles = req.files as Record<string, Express.Multer.File[]> | undefined;

        const newHeroUrls: string[] = [];
        if (reqFiles?.heroImages) {
            for (const file of reqFiles.heroImages) {
                const url = await uploadToSupabase(file);
                newHeroUrls.push(url);
            }
        }

        const newCampusGalleryUrls: string[] = [];
        if (reqFiles?.campusGalleryImages) {
            for (const file of reqFiles.campusGalleryImages) {
                const url = await uploadToSupabase(file);
                newCampusGalleryUrls.push(url);
            }
        }

        const newDailyDarshanUrls: string[] = [];
        if (reqFiles?.dailyDarshanImages) {
            for (const file of reqFiles.dailyDarshanImages.slice(0, 10)) {
                const url = await uploadToSupabase(file);
                newDailyDarshanUrls.push(url);
            }
        }

        let logoImage = req.body.logoImage ?? current.logoImage;
        if (reqFiles?.logoImage?.[0]) {
            logoImage = await uploadToSupabase(reqFiles.logoImage[0]);
        }

        let campusImage = req.body.campusImage ?? current.campusImage;
        if (reqFiles?.campusImage?.[0]) {
            campusImage = await uploadToSupabase(reqFiles.campusImage[0]);
        }

        const heroImages = [
            ...parseExisting(req.body.existingHeroImages, current.heroImages),
            ...newHeroUrls,
        ];

        const campusGalleryImages = [
            ...parseExisting(req.body.existingCampusGalleryImages, current.campusGalleryImages),
            ...newCampusGalleryUrls,
        ];

        const dailyDarshanImages = [
            ...parseExisting(req.body.existingDailyDarshanImages, current.dailyDarshanImages),
            ...newDailyDarshanUrls,
        ].slice(0, 10);

        const queryText = `
            INSERT INTO overview_config (
                id,
                hero_images,
                campus_image,
                campus_gallery_images,
                logo_image,
                daily_darshan_images,
                updated_at
            )
            VALUES (
                1,
                $1::jsonb,
                $2,
                $3::jsonb,
                $4,
                $5::jsonb,
                NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                hero_images = EXCLUDED.hero_images,
                campus_image = EXCLUDED.campus_image,
                campus_gallery_images = EXCLUDED.campus_gallery_images,
                logo_image = EXCLUDED.logo_image,
                daily_darshan_images = EXCLUDED.daily_darshan_images,
                updated_at = NOW()
            RETURNING 
                hero_images,
                campus_image,
                campus_gallery_images,
                logo_image,
                daily_darshan_images;
        `;

        const queryParams = [
            JSON.stringify(heroImages),
            safeString(campusImage),
            JSON.stringify(campusGalleryImages),
            safeString(logoImage),
            JSON.stringify(dailyDarshanImages),
        ];

        const result = await db.query(queryText, queryParams);
        const neonResult = await neonPool.query(queryText, queryParams);

        return res.status(200).json({
            success: true,
            config: rowToConfig(result.rows[0]),
        });
    } catch (error: any) {
        console.error("Overview update database error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Overview settings update failed",
        });
    }
};