import { Request, Response } from 'express';
import pool from "../database/db.js";         // લોકલ pgAdmin પૂલ
import neonPool from "../database/neon.js";   // ઓનલાઈન Neon Cloud પૂલ

export const createUser = async (req: Request, res: Response) => {
    const { fullName, username, std, rollNumber, userRole, department } = req.body;

    // ટેબલ સ્ટ્રક્ચર મુજબ fullName અને username ફરજિયાત છે
    if (!fullName || !username) {
        return res.status(400).json({ 
            success: false, 
            message: 'fullName and username are required.' 
        });
    }

    try {
        // ૧. ડુપ્લિકેટ યુઝરનેમ ચેક કરો (લોકલ ડેટાબેઝમાં)
        const checkUsername = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (checkUsername.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Username is already taken!' });
        }

        // ૨. ડુપ્લિકેટ રોલ નંબર ચેક કરો (જો રોલ નંબર આપ્યો હોય તો જ ચેક કરશે)
        if (rollNumber) {
            const checkDuplicateRoll = await pool.query(
                'SELECT * FROM users WHERE std = $1 AND roll_number = $2 AND department = $3',
                [std || 'Main', rollNumber, department || 'General']
            );
            if (checkDuplicateRoll.rows.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Roll number ${rollNumber} already exists in ${std || 'Main'} (${department || 'General'}).` 
                });
            }
        }

        const defaultPassword = "gurukul123";

        // નવું કસ્ટમ ક્વેરી સ્ટ્રક્ચર (DEFAULT વેલ્યુઝ સાથે)
        const insertQuery = `
            INSERT INTO users (full_name, std, roll_number, department, username, password, role) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING id, full_name, std, roll_number, department, username, role;
        `;
        
        const queryValues = [
            fullName, 
            std || 'Main', 
            rollNumber || null, 
            department || 'General', 
            username, 
            defaultPassword, 
            userRole || 'sevak'
        ];

        // ૩. પેલા લોકલ ડેટાબેઝ (pgAdmin) માં ડેટા ઇન્સર્ટ કરો
        const localResult = await pool.query(insertQuery, queryValues);
        const newCreatedUser = localResult.rows[0]; 
        console.log("💻 Local pgAdmin મા નવો યુઝર સેવ થયો.");

        // ૪. હવે ઓનલાઈન ક્લાઉડ (Neon) માં પણ એ જ ડેટા ઇન્સર્ટ કરો
        await neonPool.query(insertQuery, queryValues);
        console.log("🌐 Neon Cloud મા નવો યુઝર સેવ થયો.");

        return res.status(201).json({
            success: true,
            message: 'New User created successfully in both databases! 🎉',
            user: newCreatedUser
        });

    } catch (error) {
        console.error("Create User Error:", error);
        return res.status(500).json({ success: false, message: 'Internal server error while creating user.' });
    }
};