import { Request, Response, NextFunction } from 'express';
import pool from '../database/start.js';

export const verifyDepartmentAssignment = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { department_name, suid, username } = req.body;

    try {
        // ૧. બેઝિક વેલિડેશન
        if (!department_name || !suid || !username) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required for validation.' 
            });
        }

        // ૨. ડિપાર્ટમેન્ટ ચેક કરો અને ID મેળવો
        const deptQuery = `SELECT id FROM departments WHERE dept_name = $1;`;
        const deptResult = await pool.query(deptQuery, [department_name]);

        if (deptResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'The selected department is not available in the system!' 
            });
        }
        
        const department_id = deptResult.rows[0].id;

        // ૩. યુઝર ચેક કરો કે તે આ ડિપાર્ટમેન્ટનો જ છે
        const userQuery = `
            SELECT id FROM users 
            WHERE CAST(id AS VARCHAR) = TRIM($1) 
            AND LOWER(username) = LOWER($2) 
            AND department_id = $3;
        `;
        const userResult = await pool.query(userQuery, [suid, username, department_id]);

        if (userResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Warning: Invalid assignment! This SUID/Username is not registered under the selected department.'
            });
        }

        // ૪. નોટિફિકેશન કંટ્રોલર માટે ડેટા req.body માં સેટ કરો
        req.body.validatedUserId = userResult.rows[0].id;
        req.body.validatedDepartmentId = department_id;

        next();
    } catch (error) {
        console.error('Middleware validation error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal validation server error.' 
        });
    }
};