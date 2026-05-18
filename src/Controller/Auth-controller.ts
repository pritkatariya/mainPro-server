import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../database/db.js';
import neonPool from '../database/neon.js';

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    try {
        let user = null;
        const queryText = 'SELECT * FROM users WHERE username = $1';
        try { user = (await pool.query(queryText, [username])).rows[0]; } catch (e) {
            user = (await neonPool.query(queryText, [username])).rows[0];
        }
        if (user) {
            const isPasswordMatch = (password === user.password) || 
                                    (user.password.startsWith('$2b$') && await bcrypt.compare(password, user.password));
            if (isPasswordMatch) {
                const userResponseData = { ...user };
                delete userResponseData.password;
                return res.json({ success: true, message: "Logged in successfully", user: userResponseData });
            }
        }
        return res.status(401).json({ message: 'Invalid username or password' });
    } catch (error) {
        return res.status(500).json({ message: 'Login error, internal server failure' });
    }
};

export const getAllDepartments = async (req: Request, res: Response): Promise<any> => {
    try {
        const queryText = 'SELECT id, dept_name FROM departments WHERE is_active = TRUE ORDER BY id ASC;';
        let rows = [];
        try { 
            rows = (await pool.query(queryText)).rows; 
        } catch (e) {
            rows = (await neonPool.query(queryText)).rows;
        }
        const formattedDepartments = rows.map((dept: any) => ({
            id: dept.id,
            name: dept.dept_name
        }));
        return res.status(200).json({ success: true, departments: formattedDepartments });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching departments' });
    }
};

export const handleForgotPasswordRequest = async (req: Request, res: Response): Promise<any> => {
    const { date, department_id, suid, username, subject, request_text, verifiedUserId, verifiedUserTargetDept, verifiedUserFullName } = req.body;

    try {
        const insertQuery = `
            INSERT INTO forgot_requests (date, department_id, suid, username, subject, request_text, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'Pending') RETURNING id;
        `;
        const params = [date, Number(department_id), suid, username, subject, request_text];
        
        try { await pool.query(insertQuery, params); } catch (e) {
            await neonPool.query(insertQuery, params);
        }

        const notifTitle = `New Account Request: ${subject}`;
        const notifMessage = `સેવક ${verifiedUserFullName} (SUID: ${suid}) દ્વારા પોતાના ખાતા માટે વિનંતી મોકલવામાં આવી છે.`;
        
        const findHeadQuery = `SELECT id FROM users WHERE department_id = $1 AND role = 'department main' LIMIT 1;`;
        let headUser = null;
        try { headUser = (await pool.query(findHeadQuery, [verifiedUserTargetDept])).rows[0]; } catch (e) {
            headUser = (await neonPool.query(findHeadQuery, [verifiedUserTargetDept])).rows[0];
        }

        const insertNotifQuery = `INSERT INTO user_notifications (user_id, title, message, notification_type) VALUES ($1, $2, $3, 'Request');`;
        
        if (headUser) {
            try { await pool.query(insertNotifQuery, [headUser.id, notifTitle, notifMessage]); } catch (e) {}
            try { await neonPool.query(insertNotifQuery, [headUser.id, notifTitle, notifMessage]); } catch (e) {}
        }
        
        try { await pool.query(insertNotifQuery, [123098, notifTitle, notifMessage]); } catch (e) {}
        try { await neonPool.query(insertNotifQuery, [123098, notifTitle, notifMessage]); } catch (e) {}

        return res.status(201).json({ success: true, message: 'Application submitted and routed to Department Head successfully!' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error routing verified application request' });
    }
};