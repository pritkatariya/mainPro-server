import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../database/db';
import neonPool from '../database/neon';

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    // ૧. વેલિડેશન ચેક
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        let user = null;
        const queryText = 'SELECT * FROM users WHERE username = $1';

        // 💡 લોકલ ડેટાબેઝ ક્વેરી ટ્રાયલ
        try {
            const result = await pool.query(queryText, [username]);
            user = result.rows[0];
        } catch (localErr) {
            // 💡 જો લોકલ DB બંધ હોય (ECONNREFUSED આવે), તો કંટ્રોલ અહીં આવશે અને ક્રેશ થયા વગર Neon Cloud ઓપન કરશે
            console.log("⚠️ Local DB ડાઉન છે (Connection Refused), Neon Cloud માં ચેક કરીએ છીએ...");
            
            try {
                const cloudResult = await neonPool.query(queryText, [username]);
                user = cloudResult.rows[0];
            } catch (cloudErr) {
                console.error("❌ Neon Cloud Database Error:", cloudErr);
                return res.status(500).json({ message: 'Cloud database connection failed' });
            }
        }

        // ૨. જો યુઝર મળી જાય તો પાસવર્ડ મેચિંગ પ્રોસેસ
        if (user) {
            const isPasswordMatch = (password === user.password) || 
                                    (user.password.startsWith('$2b$') && await bcrypt.compare(password, user.password));

            if (isPasswordMatch) {
                // ૩. ડેટાબેઝની આખી રો (Row) ની કોપી લો
                const userResponseData = { ...user };

                // ૪. સેક્યુરિટી માટે ફ્રન્ટએન્ડ મોકલતા પહેલા પાસવર્ડ ડિલીટ કરો
                delete userResponseData.password;

                return res.json({
                    success: true,
                    message: "Logged in successfully",
                    user: userResponseData // આખો પાસવર્ડ વગરનો ડેટા ફ્રન્ટએન્ડને મળશે
                });
            }
        }
        
        return res.status(401).json({ message: 'Invalid username or password' });
        
    } catch (error) {
        console.error("Database Login Error:", error);
        return res.status(500).json({ message: 'Login error, internal server failure' });
    }
};