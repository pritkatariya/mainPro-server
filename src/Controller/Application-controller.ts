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

export const submitApplication = async (req: Request, res: Response): Promise<any> => {
    const { date, department_id, suid, username, subject, message } = req.body;

    try {
        if (!department_id || !suid || !username || !subject || !message) {
            return res.status(400).json({ success: false, message: "⚠️ બધી વિગતો ભરવી અનિવાર્ય છે!" });
        }

        const deptRes = await executeQuery('SELECT id FROM departments WHERE id = $1;', [Number(department_id)]);
        if (deptRes.rowCount === 0) {
            return res.status(404).json({ success: false, message: "⚠️ પસંદ કરેલો ડિપાર્ટમેન્ટ ઉપલબ્ધ નથી!" });
        }

        const insertQuery = `
            INSERT INTO applications 
            (date, department_id, suid, username, subject, message, head_approved, admin_approved, status)
            VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, 'Pending')
            RETURNING *;
        `;
        
        const result = await executeQuery(insertQuery, [
            date || new Date().toISOString().split('T')[0],
            Number(department_id),
            String(suid),
            String(username),
            String(subject),
            String(message)
        ]);

        return res.status(201).json({
            success: true,
            message: "Application Request Verified & Submitted! 🙏",
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
        let timeInterval = "7 days"; 
        if (filterType === 'hour') timeInterval = "1 hour";

        const fetchQuery = `
            SELECT 
                id, 
                NULL::int as user_id, 
                department_id, 
                subject as title, 
                message, 
                false as is_read, 
                head_approved, 
                admin_approved, 
                'password_reset' as notification_type, 
                created_at, 
                username, 
                suid, 
                status 
            FROM applications 
            WHERE created_at >= NOW() - INTERVAL '${timeInterval}'
            
            UNION ALL
            
            SELECT 
                id, 
                user_id, 
                department_id, 
                title, 
                message, 
                is_read, 
                true as head_approved, 
                true as admin_approved, 
                'Welcome' as notification_type, 
                created_at, 
                NULL as username, 
                NULL as suid, 
                'Approved' as status 
            FROM user_notifications
            WHERE created_at >= NOW() - INTERVAL '${timeInterval}'
            
            ORDER BY created_at DESC;
        `;
        
        const result = await executeQuery(fetchQuery, []);
        
        return res.status(200).json({
            success: true,
            count: result.rowCount,
            notifications: result.rows
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Error fetching applications log" });
    }
};

export const updateApplicationStatus = async (req: Request, res: Response): Promise<any> => {
    const idParam = String(req.params.id);
    const { type, action, newPassword } = req.body;

    try {
        const applicationId = parseInt(idParam, 10);
        if (isNaN(applicationId)) return res.status(400).json({ success: false, message: "Invalid Application ID" });

        const appRes = await executeQuery("SELECT * FROM applications WHERE id = $1;", [applicationId]);
        if (appRes.rowCount === 0) return res.status(404).json({ success: false, message: "એપ્લિકેશન પત્ર મળ્યો નથી!" });
        const currentApp = appRes.rows[0];

        if (type === 'head') {
            if (action === 'decline') {
                await executeQuery("DELETE FROM applications WHERE id = $1;", [applicationId]);
                return res.status(200).json({ success: true, message: "ડિપાર્ટમેન્ટ હેડ દ્વારા નકારવામાં આવ્યું! 🗑️" });
            }
            if (action === 'approve') {
                const update = await executeQuery("UPDATE applications SET head_approved = true WHERE id = $1 RETURNING *;", [applicationId]);
                return res.status(200).json({ success: true, message: "ડિપાર્ટમેન્ટ હેડ દ્વારા મંજૂર!", application: update.rows[0] });
            }
        }

        if (type === 'admin') {
            if (currentApp.head_approved !== true) {
                return res.status(400).json({ success: false, message: "પહેલા ડિપાર્ટમેન્ટ હેડનું અપ્રુવલ જરૂરી છે!" });
            }
            if (action === 'decline') {
                await executeQuery("DELETE FROM applications WHERE id = $1;", [applicationId]);
                return res.status(200).json({ success: true, message: "સુપર એડમિન દ્વારા નકારવામાં આવ્યું! 🗑️" });
            }
            if (action === 'approve') {
                const update = await executeQuery("UPDATE applications SET admin_approved = true, status = 'Approved' WHERE id = $1 RETURNING *;", [applicationId]);
                return res.status(200).json({ success: true, message: "Grant Admin Permission Successful! ✅", application: update.rows[0] });
            }
        }

        if (type === 'password_reset') {
            if (currentApp.head_approved !== true || currentApp.admin_approved !== true) {
                return res.status(400).json({ success: false, message: "પરમિશન વગર પાસવર્ડ અપડેટ ન થાય!" });
            }
            if (!newPassword) return res.status(400).json({ success: false, message: "નવો પાસવર્ડ જરૂરી છે!" });

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            const userCheck = await executeQuery("SELECT id FROM users WHERE username = $1 AND suid = $2;", [currentApp.username, currentApp.suid]);
            if (userCheck.rowCount === 0) return res.status(404).json({ success: false, message: "મુખ્ય એકાઉન્ટ મળ્યું નથી!" });
            
            const mainUserId = userCheck.rows[0].id;
            await executeQuery("UPDATE users SET password = $1 WHERE id = $2;", [hashedPassword, mainUserId]);
            await executeQuery("DELETE FROM applications WHERE id = $1;", [applicationId]);

            return res.status(200).json({ success: true, message: "પાસવર્ડ સફળતાપૂર્વક અપડેટ થઈ ગયો છે! 🚀" });
        }

        return res.status(400).json({ success: false, message: "Invalid type" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const deleteApplication = async (req: Request, res: Response): Promise<any> => {
    const idParam = String(req.params.id);
    try {
        const applicationId = parseInt(idParam, 10);
        if (isNaN(applicationId)) return res.status(400).json({ success: false, message: "Invalid ID format" });

        const del1 = await executeQuery("DELETE FROM applications WHERE id = $1;", [applicationId]);
        if (del1.rowCount === 0) {
            await executeQuery("DELETE FROM user_notifications WHERE id = $1;", [applicationId]);
        }
        return res.status(200).json({ success: true, message: "Record removed successfully! 🗑️" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};