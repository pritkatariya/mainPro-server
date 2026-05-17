import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../database/db.js';
import neonPool from '../database/neon.js';

/**
 * ૧. નવો યુઝર બનાવવો
 */
export const createUser = async (req: Request, res: Response) => {
    try {
        // ટર્મિનલ પર લોગ ચેક કરવા માટે
        console.log("📥 Incoming fields:", req.body);
        console.log("📷 Uploaded file:", req.file);

        const { fullName, username, password, std, rollNumber, userRole, department } = req.body;

        // ૧. વેલિડેશન
        if (!fullName || !username || !password || !std || !userRole || !department || rollNumber === undefined || rollNumber === null) {
            return res.status(400).json({ 
                success: false,
                message: 'All fields (fullName, username, password, std, rollNumber, userRole, department) are required.' 
            });
        }

        // ૨. રોલ નંબરને સેફલી નંબરમાં બદલવો
        const parsedRollNumber = parseInt(rollNumber as string, 10);
        if (isNaN(parsedRollNumber)) {
            return res.status(400).json({
                success: false,
                message: 'Roll number must be a valid number.'
            });
        }

        const checkQuery = 'SELECT * FROM users WHERE username = $1';
        let userExists = false;

        try {
            const checkResult = await pool.query(checkQuery, [username]);
            if (checkResult.rows.length > 0) userExists = true;
        } catch (err) {
            console.log("⚠️ Local DB Error on check, switching to Neon Cloud...");
            const cloudCheck = await neonPool.query(checkQuery, [username]);
            if (cloudCheck.rows.length > 0) userExists = true;
        }

        if (userExists) {
            return res.status(400).json({ success: false, message: 'Username is already taken!' });
        }

        // ૩. ઈમેજ અપલોડ થઈ હોય તો જ લિંક જનરેટ કરવી (હવે req.file.filename પ્રોપર મળશે)
        let profileImageUrl = null;
        if (req.file) {
            const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
            const host = req.get('host');
            profileImageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
            console.log("🔗 Generated Image URL:", profileImageUrl);
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // ડેટાબેઝ ઇન્સર્ટ ક્વેરી
        const insertQuery = `
            INSERT INTO users (full_name, std, roll_number, department, username, password, role, profile_image_url, joined_date) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE) 
            RETURNING id, full_name, username, role, profile_image_url, joined_date;
        `;

        let newCreatedUser = null;
        let localSuccess = false;
        let cloudSuccess = false;

        // Local DB ઇન્સર્ટ
        try {
            const result = await pool.query(insertQuery, [fullName, std, parsedRollNumber, department, username, hashedPassword, userRole, profileImageUrl]);
            newCreatedUser = result.rows[0];
            localSuccess = true;
            console.log("✅ User created successfully in Local DB");
        } catch (localInsertErr) {
            console.error("❌ Local DB Insert failed ERROR DETAILS:", localInsertErr);
        }

        // Neon Cloud DB ઇન્સર્ટ
        try {
            const cloudResult = await neonPool.query(insertQuery, [fullName, std, parsedRollNumber, department, username, hashedPassword, userRole, profileImageUrl]);
            if (!newCreatedUser) {
                newCreatedUser = cloudResult.rows[0];
            }
            cloudSuccess = true;
            console.log("✅ User created successfully in Neon Cloud DB");
        } catch (cloudInsertErr) {
            console.error("❌ Neon Cloud DB Insert failed ERROR DETAILS:", cloudInsertErr);
        }

        // જો બંને ડેટાબેઝમાં ફેઇલ જાય
        if (!localSuccess && !cloudSuccess) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to insert user in both databases. Check terminal logs for details.' 
            });
        }

        return res.status(201).json({
            success: true,
            message: `New User created! 🎉`,
            user: newCreatedUser
        });

    } catch (error) {
        console.error("💥 Complete Create User Error:", error);
        return res.status(500).json({ success: false, message: 'Internal server error while creating user.' });
    }
};

export const UserAllDataList = async (req: Request, res: Response) => {
    try {
        const selectQuery = `
            SELECT id, full_name, role, department, std, roll_number, username, profile_image_url,
            TO_CHAR(joined_date, 'DD/MM/YYYY') as joined_date 
            FROM users 
            ORDER BY id DESC;
        `;
        
        let usersList = [];
        
        try {
            const result = await pool.query(selectQuery);
            usersList = result.rows;
        } catch (localErr) {
            const cloudResult = await neonPool.query(selectQuery);
            usersList = cloudResult.rows;
        }

        return res.status(200).json({
            success: true,
            count: usersList.length,
            users: usersList
        });

    } catch (err) {
        console.error("Fetch Users Error:", err);
        return res.status(500).json({ success: false, message: "Error while fetching users list" });
    }
};