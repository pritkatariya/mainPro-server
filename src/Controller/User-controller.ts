import { Request, Response } from 'express';
import pool from '../database/db.js';
import neonPool from '../database/neon.js';
import bcrypt from 'bcrypt';

export const createUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const { fullName, username, password, std, rollNumber, suid, userRole, department } = req.body;

        if (!fullName || !username || !password || !std || !rollNumber || !userRole) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const checkUserQuery = `SELECT id FROM users WHERE LOWER(username) = LOWER($1);`;
        let existingUserRows: any[] = [];
        
        try {
            const checkRes = await pool.query(checkUserQuery, [username]);
            existingUserRows = checkRes.rows;
        } catch (err) {
            const checkResCloud = await neonPool.query(checkUserQuery, [username]);
            existingUserRows = checkResCloud.rows;
        }

        if (existingUserRows.length > 0) {
            return res.status(400).json({ success: false, message: 'Username already exists. Please choose a different username.' });
        }

        let profileImageUrl = null;
        if (req.file) {
            const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
            const host = req.get('host');
            profileImageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const insertUserQuery = `
            INSERT INTO users (full_name, username, password, std, roll_number, role, department_id, profile_image_url, suid)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, full_name, username, role, department_id, suid;
        `;

        const userParams = [
            fullName, 
            username, 
            hashedPassword, 
            std, 
            Number(rollNumber), 
            userRole, 
            Number(department) || 0, 
            profileImageUrl,
            suid || rollNumber.toString()
        ];

        let newUser = null;
        let localSuccess = false;
        let cloudSuccess = false;

        try {
            const result = await pool.query(insertUserQuery, userParams);
            newUser = result.rows[0];
            localSuccess = true;
        } catch (err) { console.error(err); }

        try {
            const cloudResult = await neonPool.query(insertUserQuery, userParams);
            if (!newUser) newUser = cloudResult.rows[0];
            cloudSuccess = true;
        } catch (err) { console.error(err); }

        if (!localSuccess && !cloudSuccess) {
            return res.status(500).json({ success: false, message: 'Failed to insert user.' });
        }

        const welcomeSubject = `🎉 WELCOME TO GURUKUL SYSTEM!`;
        const welcomeMessage = `Jai Swaminarayan ${newUser.full_name}, your account has been successfully created.`;

        const insertNotifQuery = `
            INSERT INTO user_notifications (user_id, department_id, title, message, notification_type)
            VALUES ($1, $2, $3, $4, 'Welcome');
        `;

        const notifParams = [
            newUser.id,
            newUser.department_id || 0,
            welcomeSubject,
            welcomeMessage
        ];

        try { await pool.query(insertNotifQuery, notifParams); } catch (e) { console.error(e); }
        try { await neonPool.query(insertNotifQuery, notifParams); } catch (e) { console.error(e); }

        const adminTargetQuery = `
            SELECT id, department_id FROM users 
            WHERE (LOWER(role) IN ('super_admin', 'superadmin', 'department main', 'department_main', 'head1029') 
            OR id = 123098)
            AND id != $1;
        `;
        
        let managementRows: any[] = [];
        try {
            const mRes = await pool.query(adminTargetQuery, [newUser.id]);
            managementRows = mRes.rows;
        } catch (err) {
            const mResCloud = await neonPool.query(adminTargetQuery, [newUser.id]);
            managementRows = mResCloud.rows;
        }

        const alertSubject = `🆕 NEW ACCOUNT CREATED`;
        const alertMessage = `New ${newUser.role} account has been created: ${newUser.full_name} (${newUser.username})`;

        for (const manager of managementRows) {
            const insertAlertQuery = `
                INSERT INTO user_notifications (user_id, department_id, title, message, notification_type)
                VALUES ($1, $2, $3, $4, 'Welcome');
            `;
            const alertParams = [
                manager.id,
                manager.department_id || 0,
                alertSubject,
                alertMessage
            ];
            try { await pool.query(insertAlertQuery, alertParams); } catch (e) {}
            try { await neonPool.query(insertAlertQuery, alertParams); } catch (e) {}
        }

        const deleteRequestQuery = `
            DELETE FROM admit_requests 
            WHERE TRIM(suid) = TRIM($1);
        `;
        
        try { await pool.query(deleteRequestQuery, [rollNumber.toString()]); } catch (e) {}
        try { await neonPool.query(deleteRequestQuery, [rollNumber.toString()]); } catch (e) {}

        return res.status(201).json({
            success: true,
            message: 'User created successfully and pending request removed! 🎉',
            data: newUser
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal server error processing user creation.' });
    }
};

export const UserAllDataList = async (req: Request, res: Response): Promise<any> => {
    try {
        const selectQuery = `
            SELECT id, full_name, username, std, roll_number, suid, department_id, role, joined_date, profile_image_url 
            FROM users 
            ORDER BY id DESC;
        `;
        let userList = [];

        try {
            const result = await pool.query(selectQuery);
            userList = result.rows;
        } catch (err) {
            const cloudResult = await neonPool.query(selectQuery);
            userList = cloudResult.rows;
        }

        return res.status(200).json({ success: true, users: userList });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching users data list' });
    }
};

export const deleteRequestBySuid = async (req: Request, res: Response): Promise<any> => {
    try {
        const { suid } = req.params;
        const deleteQuery = `DELETE FROM admit_requests WHERE suid = $1 RETURNING id;`;
        try { await pool.query(deleteQuery, [suid]); } catch (err) {}
        try { await neonPool.query(deleteQuery, [suid]); } catch (err) {}
        return res.status(200).json({ success: true, message: 'Purged' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getUserLiveNotifications = async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId } = req.params;
        const query = `
            SELECT id, title, message, is_read, created_at 
            FROM user_notifications 
            WHERE user_id = $1 
            ORDER BY id DESC;
        `;
        let rows = [];
        try { rows = (await pool.query(query, [userId])).rows; } 
        catch (err) { rows = (await neonPool.query(query, [userId])).rows; }
        return res.status(200).json({ success: true, notifications: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};