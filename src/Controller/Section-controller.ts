import { Request, Response } from "express";
import { SectionService } from "../services/Section-service.js";
import pool from "../database/start.js";

export const createSection = async (req: Request, res: Response): Promise<void> => {
    try {
        const { department_id, title, description, section_head_id, users_id } = req.body;

        if (!department_id || !title) {
            res.status(400).json({ message: "Department ID and Title are required." });
            return;
        }
        const finalUsersId = Array.isArray(users_id) ? users_id : [];

        const newSection = await SectionService.createSection(
            Number(department_id),
            title,
            description,
            section_head_id ? Number(section_head_id) : null,
            finalUsersId
        );

        res.status(201).json({ success: true, message: "Section created successfully.", data: newSection });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

export const getSections = async (req: Request, res: Response): Promise<void> => {
    try {
        const { dept_id } = req.query;
        console.log('[getSections] dept_id received:', dept_id);

        if (!dept_id) {
            res.status(400).json({ message: "Department ID (dept_id) query param is required." });
            return;
        }

        const parsedId = Number(dept_id);
        if (isNaN(parsedId)) {
            res.status(400).json({ message: "dept_id must be a valid number." });
            return;
        }

        const sections = await SectionService.getSectionsByDepartment(parsedId);
        res.status(200).json({ success: true, data: sections });
    } catch (error: any) {
        console.error('[getSections] ERROR:', error.message);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

export const updateSectionMembers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { users_id } = req.body;

        if (!Array.isArray(users_id)) {
            res.status(400).json({ message: "users_id must be an array." });
            return;
        }

        const updatedSection = await SectionService.updateSection(Number(id), users_id);
        res.status(200).json({ success: true, data: updatedSection });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getSectionMembersList = async (req: Request, res: Response): Promise<void> => {
    try {
        const { users_id } = req.query;
        const ids = users_id ? String(users_id).split(',').map(Number) : [];

        const members = await SectionService.getSectionMembersDetails(ids);
        res.status(200).json({ success: true, data: members });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const deleteSection = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        if (!id || id === "undefined" || isNaN(Number(id))) {
            res.status(400).json({ success: false, message: "Valid Section ID is required" });
            return;
        }

        const result = await pool.query('DELETE FROM sections WHERE id = $1 RETURNING *', [Number(id)]);

        if (result.rowCount === 0) {
            res.status(404).json({ success: false, message: "Section not found or already deleted." });
            return;
        }

        res.status(200).json({ success: true, message: "Section deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Internal server error while deleting section." });
    }
};