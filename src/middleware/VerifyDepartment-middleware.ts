import { Request, Response, NextFunction } from 'express';
import pool from '../database/start.js';

export const verifyDepartmentAssignment = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { department_name, suid, username } = req.body;

    try {
        if (!department_name || !suid || !username) {
            return res.status(400).json({ success: false, message: 'All fields are required for validation.' });
        }

        const deptQuery = `SELECT id FROM departments WHERE dept_name = $1;`;
        let deptRows: any[] = [];
        try {
            deptRows = (await pool.query(deptQuery, [department_name])).rows;
        } catch (e) {
            deptRows = (await pool.query(deptQuery, [department_name])).rows;
        }

        if (deptRows.length === 0) {
            return res.status(404).json({ success: false, message: 'The selected department is not available in the system!' });
        }
        const department_id = deptRows[0].id;

        const userQuery = `
            SELECT id FROM users 
            WHERE CAST(id AS VARCHAR) = TRIM($1) 
            AND LOWER(username) = LOWER($2) 
            AND department_id = $3;
        `;
        let userRows: any[] = [];
        try {
            userRows = (await pool.query(userQuery, [suid, username, department_id])).rows;
        } catch (e) {
            userRows = (await pool.query(userQuery, [suid, username, department_id])).rows;
        }

        if (userRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Warning: Invalid assignment! This SUID/Username is not registered under the selected department.'
            });
        }

        req.body.validatedUserId = userRows[0].id;
        req.body.validatedDepartmentId = department_id;

        next();
    } catch (error) {
        console.error('Middleware validation error:', error);
        return res.status(500).json({ success: false, message: 'Internal validation server error.' });
    }
};