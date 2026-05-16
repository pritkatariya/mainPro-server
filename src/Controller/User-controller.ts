import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../database/db.js';
import neonPool from '../database/neon.js';

/**
 * ૧. નવો યુઝર બનાવવો (With Joined Date)
 */
export const createUser = async (req: Request, res: Response) => {
    const { fullName, username, password, std, rollNumber, userRole, department } = req.body;

    if (!fullName || !username || !password || !std || rollNumber === undefined || !userRole || !department) {
        return res.status(400).json({ 
            success: false,
            message: 'All fields (fullName, username, password, std, rollNumber, userRole, department) are required.' 
        });
    }

    try {
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

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 💡 joined_date માં CURRENT_DATE પાસ કર્યું છે જેથી આજની તારીખ સ્ટોર થાય
        const insertQuery = `
            INSERT INTO users (full_name, std, roll_number, department, username, password, role, joined_date) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE) 
            RETURNING id, full_name, username, role, joined_date;
        `;

        let newCreatedUser = null;
        let localSuccess = false;
        let cloudSuccess = false;

        try {
            const result = await pool.query(insertQuery, [fullName, std, rollNumber, department, username, hashedPassword, userRole]);
            newCreatedUser = result.rows[0];
            localSuccess = true;
            console.log("✅ User created successfully in Local DB (pgAdmin 4)");
        } catch (localInsertErr) {
            console.error("❌ Local DB Insert failed:", localInsertErr);
        }

        try {
            const cloudResult = await neonPool.query(insertQuery, [fullName, std, rollNumber, department, username, hashedPassword, userRole]);
            
            if (!newCreatedUser) {
                newCreatedUser = cloudResult.rows[0];
            }
            cloudSuccess = true;
            console.log("✅ User created successfully in Neon Cloud DB");
        } catch (cloudInsertErr) {
            console.error("❌ Neon Cloud DB Insert failed:", cloudInsertErr);
        }

        if (!localSuccess && !cloudSuccess) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to insert user in both Local and Neon Cloud databases.' 
            });
        }

        return res.status(201).json({
            success: true,
            message: `New User created! (Local: ${localSuccess ? 'Saved' : 'Failed'}, Neon: ${cloudSuccess ? 'Saved' : 'Failed'}) 🎉`,
            user: newCreatedUser
        });

    } catch (error) {
        console.error("Complete Create User Error:", error);
        return res.status(500).json({ success: false, message: 'Internal server error while creating user.' });
    }
};

/**
 * ૨. બધા યુઝર્સનું લિસ્ટ મેળવવું (With Joined Date Formatting)
 */
export const UserAllDataList = async (req: Request, res: Response) => {
    try {
        // 💡 TO_CHAR ની મદદથી તારીખને DD/MM/YYYY ફોર્મેટમાં કન્વર્ટ કરી છે જેથી ડિરેક્ટરીમાં સરસ દેખાય
        const selectQuery = `
            SELECT id, full_name, role, department, std, roll_number, username,
            TO_CHAR(joined_date, 'DD/MM/YYYY') as joined_date 
            FROM users 
            ORDER BY id DESC;
        `;
        
        let usersList = [];
        
        try {
            // પહેલા લોકલમાંથી ડેટા લાવવાનો ટ્રાય કરો
            const result = await pool.query(selectQuery);
            usersList = result.rows;
            console.log("✅ Users fetched from Local DB");
        } catch (localErr) {
            console.log("⚠️ Local DB Fallback: Fetching from Neon Cloud...");
            // જો લોકલ ડાઉન હોય તો ક્લાઉડમાંથી ડેટા લાવો
            const cloudResult = await neonPool.query(selectQuery);
            usersList = cloudResult.rows;
            console.log("✅ Users fetched from Neon Cloud");
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