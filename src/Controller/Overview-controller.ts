import { Request, Response } from "express";
import db from "../database/db.js";

interface OverviewConfig {
    heroImages: string[];
    campusImage: string;
    campusGalleryImages: string[];
    logoImage: string;

    stackTitle: string;
    stackSubtitle: string;
    stackImages: string[];
    showStackSection: boolean;

    chromaTitle: string;
    chromaSubtitle: string;
    chromaImages: string[];
    showChromaSection: boolean;
}

const defaultConfig: OverviewConfig = {
    heroImages: [],
    campusImage: "",
    campusGalleryImages: [],
    logoImage: "",

    stackTitle: "Memories in Motion",
    stackSubtitle: "Drag karo, click karo, athva wait karo.",
    stackImages: [],
    showStackSection: true,

    chromaTitle: "Gurukul Highlights",
    chromaSubtitle: "Move cursor over cards to reveal color spotlight.",
    chromaImages: [],
    showChromaSection: true,
};

const getFileUrl = (file?: Express.Multer.File): string => {
    if (!file) return "";
    return file.path;
};

const toBoolean = (value: unknown, fallback: boolean): boolean => {
    if (value === undefined || value === null) return fallback;
    return String(value) === "true";
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

        stackTitle: row.stack_title || defaultConfig.stackTitle,
        stackSubtitle: row.stack_subtitle || defaultConfig.stackSubtitle,
        stackImages: toStringArray(row.stack_images),
        showStackSection:
            row.show_stack_section === undefined || row.show_stack_section === null
                ? defaultConfig.showStackSection
                : Boolean(row.show_stack_section),

        chromaTitle: row.chroma_title || defaultConfig.chromaTitle,
        chromaSubtitle: row.chroma_subtitle || defaultConfig.chromaSubtitle,
        chromaImages: toStringArray(row.chroma_images),
        showChromaSection:
            row.show_chroma_section === undefined || row.show_chroma_section === null
                ? defaultConfig.showChromaSection
                : Boolean(row.show_chroma_section),
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

export const getOverviewConfig = async (_req: Request, res: Response): Promise<Response> => {
    try {
        const result = await db.query("SELECT * FROM overview_config WHERE id = 1");
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
        const currentResult = await db.query("SELECT * FROM overview_config WHERE id = 1");
        const current = rowToConfig(currentResult.rows[0]);
        const reqFiles = req.files as Record<string, Express.Multer.File[]> | undefined;

        const heroImages = [
            ...parseExisting(req.body.existingHeroImages, current.heroImages),
            ...(reqFiles?.heroImages?.map(getFileUrl) || []),
        ];

        const campusGalleryImages = [
            ...parseExisting(req.body.existingCampusGalleryImages, current.campusGalleryImages),
            ...(reqFiles?.campusGalleryImages?.map(getFileUrl) || []),
        ];

        const stackImages = [
            ...parseExisting(req.body.existingStackImages, current.stackImages),
            ...(reqFiles?.stackImages?.map(getFileUrl) || []),
        ];

        const chromaImages = [
            ...parseExisting(req.body.existingChromaImages, current.chromaImages),
            ...(reqFiles?.chromaImages?.map(getFileUrl) || []),
        ];

        const logoImage = reqFiles?.logoImage?.[0]
            ? getFileUrl(reqFiles.logoImage[0])
            : req.body.logoImage ?? current.logoImage;

        const campusImage = reqFiles?.campusImage?.[0]
            ? getFileUrl(reqFiles.campusImage[0])
            : req.body.campusImage ?? current.campusImage;

        const queryText = `
            INSERT INTO overview_config (
                id,
                hero_images,
                campus_image,
                campus_gallery_images,
                logo_image,
                stack_title,
                stack_subtitle,
                stack_images,
                show_stack_section,
                chroma_title,
                chroma_subtitle,
                chroma_images,
                show_chroma_section,
                updated_at
            )
            VALUES (
                1,
                $1::jsonb,
                $2,
                $3::jsonb,
                $4,
                $5,
                $6,
                $7::jsonb,
                $8,
                $9,
                $10,
                $11::jsonb,
                $12,
                NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                hero_images = EXCLUDED.hero_images,
                campus_image = EXCLUDED.campus_image,
                campus_gallery_images = EXCLUDED.campus_gallery_images,
                logo_image = EXCLUDED.logo_image,
                stack_title = EXCLUDED.stack_title,
                stack_subtitle = EXCLUDED.stack_subtitle,
                stack_images = EXCLUDED.stack_images,
                show_stack_section = EXCLUDED.show_stack_section,
                chroma_title = EXCLUDED.chroma_title,
                chroma_subtitle = EXCLUDED.chroma_subtitle,
                chroma_images = EXCLUDED.chroma_images,
                show_chroma_section = EXCLUDED.show_chroma_section,
                updated_at = NOW()
            RETURNING *;
        `;

        const queryParams = [
            JSON.stringify(heroImages),
            logoSafeString(campusImage),
            JSON.stringify(campusGalleryImages),
            logoSafeString(logoImage),
            req.body.stackTitle || current.stackTitle,
            req.body.stackSubtitle || current.stackSubtitle,
            JSON.stringify(stackImages),
            toBoolean(req.body.showStackSection, current.showStackSection),
            req.body.chromaTitle || current.chromaTitle,
            req.body.chromaSubtitle || current.chromaSubtitle,
            JSON.stringify(chromaImages),
            toBoolean(req.body.showChromaSection, current.showChromaSection),
        ];

        const result = await db.query(queryText, queryParams);

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

function logoSafeString(value: unknown): string {
    if (typeof value !== "string") return "";
    return value;
}