import { Request, Response, NextFunction } from "express";
import pool from "../database/start.js";

const executeQuery = async (text: string, params: any[]) => {
    try {
        return await pool.query(text, params);
    } catch {
        throw new Error("Database query failed");
    }
};

export const verifySuidUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { suid, username, department_id } = req.body;

    if (!suid || !department_id) {
        return res.status(400).json({
            success: false,
            message: "SUID and Department are required!"
        });
    }

    try {
        const params: any[] = [String(suid).trim(), Number(department_id)];

        let query = `
            SELECT id, department_id, full_name, username
            FROM users
            WHERE TRIM(suid) = TRIM($1)
            AND department_id = $2
        `;

        if (username && String(username).trim()) {
            params.push(String(username).trim());
            query += ` AND LOWER(TRIM(username)) = LOWER(TRIM($3))`;
        }

        query += ` LIMIT 1;`;

        const result = await executeQuery(query, params);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Selected department ma aa SUID/Username registered nathi."
            });
        }

        req.body.verifiedUserId = user.id;
        req.body.verifiedUserTargetDept = user.department_id;
        req.body.verifiedUserFullName = user.full_name;
        req.body.verifiedUsername = user.username;

        next();
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Verification server error"
        });
    }
};