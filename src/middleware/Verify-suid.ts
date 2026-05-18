import { Request, Response, NextFunction } from 'express';
import pool from '../database/db.js';
import neonPool from '../database/neon.js';

export const verifySuidUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { suid, username } = req.body;

    if (!suid || !username) {
        return res.status(400).json({ success: false, message: 'SUID and Username are required for verification!' });
    }

    try {
        const checkUserQuery = 'SELECT id, department_id, full_name FROM users WHERE TRIM(username) = TRIM($1) AND TRIM(suid) = TRIM($2);';
        let existingUser = null;

        try {
            existingUser = (await pool.query(checkUserQuery, [username, suid])).rows[0];
        } catch (e) {
            existingUser = (await neonPool.query(checkUserQuery, [username, suid])).rows[0];
        }

        if (!existingUser) {
            return res.status(404).json({ success: false, message: '⚠️ આ SUID અથવા Username વાળો કોઈ સેવક રજિસ્ટર્ડ નથી!' });
        }

        req.body.verifiedUserId = existingUser.id;
        req.body.verifiedUserTargetDept = existingUser.department_id;
        req.body.verifiedUserFullName = existingUser.full_name;

        next();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Middleware verification internal error' });
    }
};