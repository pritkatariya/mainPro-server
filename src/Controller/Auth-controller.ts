import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../database/db';
import neonPool from '../database/neon';

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        let user = null;
        const queryText = 'SELECT * FROM users WHERE username = $1';

        try {
            const result = await pool.query(queryText, [username]);
            user = result.rows[0];
        } catch (localErr) {
            console.log("⚠️ Local DB ડાઉન છે, Neon Cloud માં ચેક કરીએ છીએ...");
            const cloudResult = await neonPool.query(queryText, [username]);
            user = cloudResult.rows[0];
        }

        if (user) {
            const isPasswordMatch = (password === user.password) || 
                                    (user.password.startsWith('$2b$') && await bcrypt.compare(password, user.password));

            if (isPasswordMatch) {
                const userResponseData = { ...user };

                delete userResponseData.password;

                return res.json({
                    success: true,
                    message: "Logged in successfully",
                    user: userResponseData 
                });
            }
        }
        
        return res.status(401).json({ message: 'Invalid username or password' });
        
    } catch (error) {
        console.error("Database Login Error:", error);
        return res.status(500).json({ message: 'Login error, internal server failure' });
    }
};