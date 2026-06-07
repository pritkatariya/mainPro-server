import { Request, Response } from "express";
import * as LessonService from "../services/Lesson-service.js";
import { uploadToCloudinary } from "../middleware/upload.js";

const parseOptionalNumber = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

export const createLesson = async (req: Request, res: Response): Promise<any> => {
    try {
        const {
            name,
            description,
            department_id,
            section_id,
            assigned_to_user_id,
            media_type,
            thumbnail_url,
        } = req.body;

        if (!name || !department_id) {
            return res.status(400).json({
                success: false,
                message: "Lesson name and department are required.",
            });
        }

        let resourceUrl: string | null = null;
        let resolvedMediaType = media_type || null;

        if (req.file) {
            resourceUrl = await uploadToCloudinary(req.file, "gurukul_lessons");
            resolvedMediaType = req.file.mimetype;
        } else if (req.body.media_url) {
            resourceUrl = String(req.body.media_url);
        }

        const createdLesson = await LessonService.createLesson(
            name,
            description || "",
            String(department_id),
            resourceUrl,
            resolvedMediaType,
            thumbnail_url || null,
            section_id ? String(section_id) : null,
            assigned_to_user_id ? String(assigned_to_user_id) : null
        );

        return res.status(201).json({ success: true, message: "Lesson created successfully.", data: createdLesson });
    } catch (error: any) {
        console.error("[LessonController] createLesson error:", error);
        return res.status(500).json({ success: false, message: "Failed to create lesson.", error: error.message });
    }
};

export const getLessons = async (req: Request, res: Response): Promise<any> => {
    try {
        const departmentId = parseOptionalNumber(req.query.department_id);

    const lessons = departmentId
        ? await LessonService.getLessonsByDept(String(departmentId))
        : await LessonService.getAllLessons();
        return res.status(200).json({ success: true, data: lessons });
    } catch (error: any) {
        console.error("[LessonController] getLessons error:", error);
        return res.status(500).json({ success: false, message: "Unable to fetch lessons.", error: error.message });
    }
};
