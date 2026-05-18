import { Request, Response } from 'express';
import pool from '../database/db.js';
import neonPool from '../database/neon.js';
import bcrypt from 'bcrypt';

const executeQuery = async (text: string, params: any[]) => {
    try {
        return await pool.query(text, params);
    } catch (e) {
        return await neonPool.query(text, params);
    }
};

export const createPasswordResetNotification = async (req: Request, res: Response): Promise<any> => {
    const { validatedUserId, validatedDepartmentId, subject, message } = req.body;

    try {
        const insertQuery = `
            INSERT INTO user_notifications 
            (user_id, department_id, title, message, head_approved, admin_approved, notification_type)
            VALUES ($1, $2, $3, $4, NULL, NULL, 'password_reset')
            RETURNING *;
        `;
        const result = await executeQuery(insertQuery, [validatedUserId, validatedDepartmentId, subject, message]);

        return res.status(201).json({
            success: true,
            message: 'Application submitted successfully to your Department Head for verification.',
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Create application error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getFilteredNotifications = async (req: Request, res: Response): Promise<any> => {
    const filterType = req.query.filterType ? String(req.query.filterType) : "week";

    try {
        await executeQuery("DELETE FROM user_notifications WHERE created_at < NOW() - INTERVAL '7 days';", []);

        let timeInterval = "7 days"; 
        if (filterType === 'hour') timeInterval = "1 hour";

        const fetchQuery = `
            SELECT 
                un.id,
                un.user_id,
                un.department_id,
                un.title as subject,
                un.message,
                un.is_read,
                un.head_approved,
                un.admin_approved,
                un.notification_type,
                un.created_at,
                u.username,
                u.suid,
                CASE 
                    WHEN un.head_approved = true AND un.admin_approved = true THEN 'Approved'
                    ELSE 'Pending'
                END as status
            FROM user_notifications un
            LEFT JOIN users u ON un.user_id = u.id
            WHERE un.created_at >= NOW() - INTERVAL '${timeInterval}'
            ORDER BY un.created_at DESC;
        `;
        const { rows } = await executeQuery(fetchQuery, []);
        
        return res.status(200).json({ success: true, count: rows.length, notifications: rows });
    } catch (error) {
        console.error("Fetch notifications error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const updateNotificationStatus = async (req: Request, res: Response): Promise<any> => {
    const idParam = req.params.id as string;
    const { action, type, newPassword } = req.body;

    try {
        const notificationId = parseInt(idParam, 10);
        if (isNaN(notificationId)) return res.status(400).json({ success: false, message: "Invalid Notification ID" });

        const notifRes = await executeQuery("SELECT * FROM user_notifications WHERE id = $1", [notificationId]);
        if (notifRes.rowCount === 0) return res.status(404).json({ success: false, message: "Notification record not found" });
        const currentNotif = notifRes.rows[0];

        if (type === 'head') {
            if (action === 'decline') {
                await executeQuery("DELETE FROM user_notifications WHERE id = $1", [notificationId]);
                return res.status(200).json({ success: true, message: "Declinced and removed by Department Head successfully." });
            }
            if (action === 'approve') {
                const update = await executeQuery("UPDATE user_notifications SET head_approved = true WHERE id = $1 RETURNING *", [notificationId]);
                return res.status(200).json({ success: true, message: "Approved by Head. Forwarded to Super Admin.", data: update.rows[0] });
            }
        }

        if (type === 'admin') {
            if (currentNotif.head_approved !== true) {
                return res.status(400).json({ success: false, message: "Department Head approval is compulsory first." });
            }
            if (action === 'decline') {
                await executeQuery("DELETE FROM user_notifications WHERE id = $1", [notificationId]);
                return res.status(200).json({ success: true, message: "Declined and removed by Super Admin successfully." });
            }
            if (action === 'approve') {
                const update = await executeQuery("UPDATE user_notifications SET admin_approved = true WHERE id = $1 RETURNING *", [notificationId]);
                return res.status(200).json({ success: true, message: "Admin permission granted. Input control activated on Head dashboard.", data: update.rows[0] });
            }
        }

        if (type === 'password_reset') {
            if (currentNotif.head_approved !== true || currentNotif.admin_approved !== true) {
                return res.status(400).json({ success: false, message: "Cannot change password without dual verification." });
            }
            if (!newPassword) return res.status(400).json({ success: false, message: "New password is required." });

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            await executeQuery("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, currentNotif.user_id]);
            await executeQuery("DELETE FROM user_notifications WHERE id = $1", [notificationId]);

            return res.status(200).json({ success: true, message: "Password updated successfully in secure database logs." });
        }

        return res.status(400).json({ success: false, message: "Invalid update parameters" });
    } catch (error) {
        console.error("Update status error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const deleteNotification = async (req: Request, res: Response): Promise<any> => {
    try {
        const idParam = req.params.id as string;
        if (!idParam) return res.status(400).json({ success: false, message: "ID parameter is required" });

        const numericId = parseInt(idParam, 10);
        if (isNaN(numericId)) return res.status(400).json({ success: false, message: "Invalid ID format" });

        await executeQuery("DELETE FROM user_notifications WHERE id = $1", [numericId]);
        return res.status(200).json({ success: true, message: "Notification deleted from database successfully." });
    } catch (error) {
        console.error("Delete notification error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};