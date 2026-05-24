import { Request, Response } from "express";
import pool from "../database/start.js";

export const createGMusicRequest = async (req: Request, res: Response): Promise<any> => {
    try {
        const { name, suid, performance, description } = req.body;

        if (!name || !suid || !performance) {
            return res.status(400).json({ success: false, message: "બધી વિગતો ભરવી ફરજિયાત છે." });
        }

        let studentImageUrl = null;

        if (req.file) {
            const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
            const host = req.get("host");
            studentImageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
        }

        const insertQuery = `
            INSERT INTO admit_requests (name, suid, performance, description, department_id, image_url, status, is_user_created)
            VALUES ($1, $2, $3, $4, 1, $5, 'Pending', false)
            RETURNING id, name, suid, department_id, status;
        `;

        const queryParams = [name, suid, performance, description || "", studentImageUrl];

        let newRequest = null;
        let localSuccess = false;

        try {
            const result = await pool.query(insertQuery, queryParams);
            newRequest = result.rows[0];
            localSuccess = true;
        } catch (err) {
            console.error(err);
        }

        if (!localSuccess) {
            return res.status(500).json({ success: false, message: "Error submitting G-Music application." });
        }

        return res.status(201).json({
            success: true,
            message: "G-Music એપ્લિકેશન સફળતાપૂર્વક સબમિટ થઈ ગઈ છે! ⏳",
            data: newRequest,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getGMusicRequests = async (_req: Request, res: Response): Promise<any> => {
    try {
        const selectQuery = `
            SELECT id, name, suid, performance, description, department_id, image_url, status, is_user_created, created_at
            FROM admit_requests WHERE department_id = 1 ORDER BY id DESC;
        `;

        let requestsList = [];

        try {
            requestsList = (await pool.query(selectQuery)).rows;
        } catch (err) {
            console.error("Error fetching G-Music requests:", err);
            requestsList = [];
        }

        return res.status(200).json({ success: true, requests: requestsList });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching G-Music requests" });
    }
};

export const getOnboardedGMusicUsers = async (_req: Request, res: Response): Promise<any> => {
    try {
        const query = `
            SELECT id, full_name as name, username, suid, profile_image_url as image_url, role, department_id, joined_date 
            FROM users WHERE department_id = 1 ORDER BY id DESC;
        `;

        let rows = [];

        try {
            rows = (await pool.query(query)).rows;
        } catch (err) {
            console.error("Error fetching onboarded G-Music users:", err);
            rows = [];
        }

        return res.status(200).json({ success: true, users: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const approveGMusicRequest = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const { adminId, userRole, departmentId } = req.body;

        const isSuperAdmin =
            adminId === "123098" ||
            Number(adminId) === 123098 ||
            String(userRole).toUpperCase() === "SUPER_ADMIN";

        const isHead =
            String(userRole).toUpperCase() === "HEAD1029" ||
            String(userRole).toUpperCase() === "DEPARTMENT MAIN";

        if (!isSuperAdmin && (!isHead || Number(departmentId) !== 1)) {
            return res.status(403).json({
                success: false,
                message: "તમારી પાસે આ ડિપાર્ટમેન્ટ એપ્રુવ કરવાની પરમિશન નથી!",
            });
        }

        const updateQuery = `
            UPDATE admit_requests SET status = 'Approved' 
            WHERE id = $1 AND department_id = 1 
            RETURNING id, name, status;
        `;

        let updatedRow = null;

        try {
            updatedRow = (await pool.query(updateQuery, [id])).rows[0];
        } catch (err) {
            console.error("Error updating G-Music request:", err);
            updatedRow = null;
        }

        if (!updatedRow) {
            return res.status(404).json({ success: false, message: "રિક્વેસ્ટ મળી નથી." });
        }

        return res.status(200).json({
            success: true,
            message: "G-Music Request Approved! ✅",
            data: updatedRow,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const declineGMusicRequest = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const { adminId, userRole, departmentId } = req.body;

        const isSuperAdmin =
            adminId === "123098" ||
            Number(adminId) === 123098 ||
            String(userRole).toUpperCase() === "SUPER_ADMIN";

        const isHead =
            String(userRole).toUpperCase() === "HEAD1029" ||
            String(userRole).toUpperCase() === "DEPARTMENT MAIN";

        if (!isSuperAdmin && (!isHead || Number(departmentId) !== 1)) {
            return res.status(403).json({
                success: false,
                message: "તમારી પાસે આ ડિપાર્ટમેન્ટ ડિક્લાઇન કરવાની પરમિશન નથી!",
            });
        }

        const updateQuery = `
            UPDATE admit_requests SET status = 'Declined' 
            WHERE id = $1 AND department_id = 1 
            RETURNING id, name, status;
        `;

        let updatedRow = null;

        try {
            updatedRow = (await pool.query(updateQuery, [id])).rows[0];
        } catch (err) {
            console.error("Error declining G-Music request:", err);
            updatedRow = null;
        }

        if (!updatedRow) {
            return res.status(404).json({ success: false, message: "રિક્વેસ્ટ મળી નથી." });
        }

        return res.status(200).json({
            success: true,
            message: "G-Music Request Declined! ❌",
            data: updatedRow,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};