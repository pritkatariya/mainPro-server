import { Request, Response } from "express";
import * as GCultureService from "../services/GCulture-service.js";

export const createGCultureRequest = async (req: Request, res: Response): Promise<any> => {
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

        let newRequest = null;
        try {
            newRequest = await GCultureService.createGCultureRequestService({
                name,
                suid,
                performance,
                description: description || "",
                imageUrl: studentImageUrl,
            });
        } catch (err) {
            console.error("Error creating G-Culture request:", err);
        }

        if (!newRequest) {
            return res.status(500).json({ success: false, message: "G-Culture એરેડમિટ રિક્વેસ્ટ સબમિટ કરવામાં નિષ્ફળ રહ્યો." });
        }

        return res.status(201).json({ success: true, message: "G-Culture એપ્લિકેશન સફળતાપૂર્વક સબમિટ થઈ ગઈ છે! ⏳", data: newRequest });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getGCultureRequests = async (_req: Request, res: Response): Promise<any> => {
    try {
        let requestsList = [];
        try {
            requestsList = await GCultureService.getGCultureRequestsService();
        } catch (err) {
            console.error("Error fetching G-Culture requests:", err);
            requestsList = [];
        }
        return res.status(200).json({ success: true, requests: requestsList });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching G-Culture requests" });
    }
};

export const getOnboardedGCultureUsers = async (_req: Request, res: Response): Promise<any> => {
    try {
        let rows = [];
        try {
            rows = await GCultureService.getOnboardedGCultureUsersService();
        } catch (err) {
            console.error("Error fetching onboarded G-Culture users:", err);
            rows = [];
        }
        return res.status(200).json({ success: true, users: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const approveGCultureRequest = async (req: Request, res: Response): Promise<any> => {
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

        if (!isSuperAdmin && (!isHead || Number(departmentId) !== 3)) {
            return res.status(403).json({ success: false, message: "તમારી પાસે આ ડિપાર્ટમેન્ટ એપ્રુવ કરવાની પરમિશન નથી!" });
        }

        let updatedRow = null;
        try {
            updatedRow = await GCultureService.updateGCultureRequestStatusService(String(id), "Approved");
        } catch (err) {
            console.error("Error updating G-Culture request:", err);
            updatedRow = null;
        }

        if (!updatedRow) return res.status(404).json({ success: false, message: "রিক્વેસ્ટ મળી નથી." });

        return res.status(200).json({ success: true, message: "G-Culture Request Approved! ✅", data: updatedRow });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const declineGCultureRequest = async (req: Request, res: Response): Promise<any> => {
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

        if (!isSuperAdmin && (!isHead || Number(departmentId) !== 3)) {
            return res.status(403).json({ success: false, message: "તમારી પાસે આ ડિપાર્ટમેન્ટ ડિક્લાઇન કરવાની પરમિશન નથી!" });
        }

        let updatedRow = null;
        try {
            updatedRow = await GCultureService.updateGCultureRequestStatusService(String(id), "Declined");
        } catch (err) {
            console.error("Error declining G-Culture request:", err);
            updatedRow = null;
        }

        if (!updatedRow) return res.status(404).json({ success: false, message: "રિક્વેસ્ટ મળી નથી." });

        return res.status(200).json({ success: true, message: "G-Culture Request Declined! ❌", data: updatedRow });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
