import { Request, Response } from "express";
import pool from "../database/db.js";
import neonPool from "../database/neon.js";
import bcrypt from "bcrypt";

const executeQuery = async (text: string, params: any[] = []) => {
    try {
        return await pool.query(text, params);
    } catch {
        return await neonPool.query(text, params);
    }
};

const getParamId = (value: string | string[] | undefined) => {
    const idValue = Array.isArray(value) ? value[0] : value;
    return parseInt(String(idValue || ""), 10);
};

const normalizeRole = (role: unknown) => String(role || "").trim().toLowerCase();

const isSuperAdmin = (role: unknown, userId: number) => {
    const roleCode = normalizeRole(role);
    return (
        userId === 123098 ||
        roleCode === "super_admin" ||
        roleCode === "super-admin" ||
        roleCode === "superadmin"
    );
};

const isDepartmentHead = (role: unknown) => {
    const roleCode = normalizeRole(role);
    return (
        roleCode === "department main" ||
        roleCode === "department_main" ||
        roleCode === "head1029"
    );
};

export const submitApplication = async (req: Request, res: Response): Promise<any> => {
    const {
        date,
        department_id,
        suid,
        username,
        subject,
        message,
        verifiedUserId,
        verifiedUsername
    } = req.body;

    try {
        if (!department_id || !suid || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: "Department, SUID, subject and message are required!"
            });
        }

        const deptRes = await executeQuery("SELECT id FROM departments WHERE id = $1;", [
            Number(department_id)
        ]);

        if (deptRes.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Selected department is not available!"
            });
        }

        const insertQuery = `
            INSERT INTO applications 
            (date, user_id, department_id, suid, username, subject, message, head_approved, admin_approved, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, 'Pending')
            RETURNING *;
        `;

        const result = await executeQuery(insertQuery, [
            date || new Date().toISOString().split("T")[0],
            Number(verifiedUserId),
            Number(department_id),
            String(suid).trim(),
            String(username || verifiedUsername || "").trim(),
            String(subject),
            String(message)
        ]);

        return res.status(201).json({
            success: true,
            message: "Application submitted to Department Head.",
            application: result.rows[0]
        });
    } catch (error) {
        console.error("Submit application error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getAllApplications = async (req: Request, res: Response): Promise<any> => {
    try {
        const filterType = req.query.filterType ? String(req.query.filterType) : "week";
        const userId = req.query.userId ? Number(req.query.userId) : 0;
        const departmentId = req.query.departmentId ? Number(req.query.departmentId) : 0;
        const role = req.query.role ? String(req.query.role) : "USER";

        const timeInterval = filterType === "hour" ? "1 hour" : "7 days";

        let accessWhere = "";
        const params: any[] = [];

        if (isSuperAdmin(role, userId)) {
            accessWhere = `
                AND a.head_approved = true
                AND a.admin_approved IS NULL
            `;
        } else if (isDepartmentHead(role)) {
            params.push(departmentId);
            accessWhere = `
                AND a.department_id = $${params.length}
                AND (
                    a.head_approved IS NULL
                    OR (a.head_approved = true AND a.admin_approved IS NULL)
                    OR (a.head_approved = true AND a.admin_approved = true)
                )
            `;
        } else {
            params.push(userId);
            accessWhere = `AND a.user_id = $${params.length}`;
        }

        const fetchQuery = `
            SELECT 
                a.id,
                a.user_id,
                a.department_id,
                a.subject as title,
                a.subject,
                a.message,
                false as is_read,
                a.head_approved,
                a.admin_approved,
                'password_reset' as notification_type,
                a.created_at,
                a.username,
                a.suid,
                a.status,
                u.full_name as name,
                d.dept_name as department_name
            FROM applications a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE a.created_at >= NOW() - INTERVAL '${timeInterval}'
            ${accessWhere}
            ORDER BY a.created_at DESC;
        `;

        const result = await executeQuery(fetchQuery, params);

        return res.status(200).json({
            success: true,
            count: result.rowCount,
            notifications: result.rows
        });
    } catch (error) {
        console.error("Get applications error:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching applications log"
        });
    }
};

export const updateApplicationStatus = async (req: Request, res: Response): Promise<any> => {
    const applicationId = getParamId(req.params.id);
    const { type, action, newPassword } = req.body;

    try {
        if (isNaN(applicationId)) {
            return res.status(400).json({ success: false, message: "Invalid Application ID" });
        }

        const appRes = await executeQuery("SELECT * FROM applications WHERE id = $1;", [applicationId]);

        if (appRes.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Application not found!" });
        }

        const currentApp = appRes.rows[0];

        if (type === "head") {
            if (action === "decline") {
                await executeQuery("DELETE FROM applications WHERE id = $1;", [applicationId]);

                return res.status(200).json({
                    success: true,
                    message: "Request declined by Department Head."
                });
            }

            if (action === "approve") {
                const update = await executeQuery(
                    `
                    UPDATE applications
                    SET head_approved = true,
                        status = 'Head Approved'
                    WHERE id = $1
                    RETURNING *;
                    `,
                    [applicationId]
                );

                return res.status(200).json({
                    success: true,
                    message: "Approved by Head. Forwarded to Super Admin.",
                    application: update.rows[0]
                });
            }
        }

        if (type === "admin") {
            if (currentApp.head_approved !== true) {
                return res.status(400).json({
                    success: false,
                    message: "Department Head approval is required first!"
                });
            }

            if (action === "decline") {
                await executeQuery("DELETE FROM applications WHERE id = $1;", [applicationId]);

                return res.status(200).json({
                    success: true,
                    message: "Request declined by Super Admin."
                });
            }

            if (action === "approve") {
                const update = await executeQuery(
                    `
                    UPDATE applications
                    SET admin_approved = true,
                        status = 'Admin Approved'
                    WHERE id = $1
                    RETURNING *;
                    `,
                    [applicationId]
                );

                return res.status(200).json({
                    success: true,
                    message: "Super Admin approved. Sent back to Department Head for password reset.",
                    application: update.rows[0]
                });
            }
        }

        if (type === "password_reset") {
            if (currentApp.head_approved !== true || currentApp.admin_approved !== true) {
                return res.status(400).json({
                    success: false,
                    message: "Head and Super Admin approval required before password reset."
                });
            }

            if (!newPassword || !String(newPassword).trim()) {
                return res.status(400).json({
                    success: false,
                    message: "New password is required!"
                });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(String(newPassword).trim(), salt);

            await executeQuery("UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2;", [
                hashedPassword,
                currentApp.user_id
            ]);

            await executeQuery("DELETE FROM applications WHERE id = $1;", [applicationId]);

            return res.status(200).json({
                success: true,
                message: "Password updated successfully!"
            });
        }

        return res.status(400).json({ success: false, message: "Invalid request type" });
    } catch (error) {
        console.error("Update application error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const deleteApplication = async (req: Request, res: Response): Promise<any> => {
    const applicationId = getParamId(req.params.id);

    try {
        if (isNaN(applicationId)) {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }

        await executeQuery("DELETE FROM applications WHERE id = $1;", [applicationId]);

        return res.status(200).json({
            success: true,
            message: "Record removed successfully!"
        });
    } catch (error) {
        console.error("Delete application error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};