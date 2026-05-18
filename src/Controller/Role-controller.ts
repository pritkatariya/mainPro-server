import { Request, Response } from 'express';
import pool from '../database/db.js';
import neonPool from '../database/neon.js';

export const createRole = async (req: Request, res: Response): Promise<any> => {
    const { roleName, roleCode, permissions } = req.body;

    if (!roleName || !roleCode) {
        return res.status(400).json({ 
            success: false, 
            message: 'Role Name and Role Code are required.' 
        });
    }

    try {
        const checkQuery = 'SELECT * FROM roles WHERE role_code = $1';
        let roleExists = false;

        try {
            const checkResult = await pool.query(checkQuery, [roleCode]);
            if (checkResult.rows.length > 0) roleExists = true;
        } catch (err) {
            const cloudCheck = await neonPool.query(checkQuery, [roleCode]);
            if (cloudCheck.rows.length > 0) roleExists = true;
        }

        if (roleExists) {
            return res.status(400).json({ success: false, message: 'Role Code is already taken!' });
        }

        const insertQuery = `
            INSERT INTO roles (role_name, role_code, permissions) 
            VALUES ($1, $2, $3) 
            RETURNING id, role_name, role_code, permissions;
        `;

        const permissionsJson = JSON.stringify(permissions || {});
        let newRole = null;
        let localSuccess = false;
        let cloudSuccess = false;

        try {
            const result = await pool.query(insertQuery, [roleName, roleCode, permissionsJson]);
            newRole = result.rows[0];
            localSuccess = true;
        } catch (localErr) {
            console.error(localErr);
        }

        try {
            const cloudResult = await neonPool.query(insertQuery, [roleName, roleCode, permissionsJson]);
            if (!newRole) {
                newRole = cloudResult.rows[0];
            }
            cloudSuccess = true;
        } catch (cloudErr) {
            console.error(cloudErr);
        }

        if (!localSuccess && !cloudSuccess) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to insert role in both Local and Neon Cloud databases.' 
            });
        }

        return res.status(201).json({
            success: true,
            message: 'New Role configured successfully! 🎉',
            role: newRole
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error while creating role.' });
    }
};

export const RoleAllData = async (req: Request, res: Response): Promise<any> => {
    try {
        const selectQuery = `
            SELECT id, role_name, role_code, permissions,
            TO_CHAR(created_at, 'DD/MM/YYYY') as created_date 
            FROM roles 
            ORDER BY id ASC;
        `;
        
        let rolesList = [];
        
        try {
            const result = await pool.query(selectQuery);
            rolesList = result.rows;
        } catch (localErr) {
            const cloudResult = await neonPool.query(selectQuery);
            rolesList = cloudResult.rows;
        }

        return res.status(200).json({
            success: true,
            count: rolesList.length,
            roles: rolesList 
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: "Error while fetching roles list" });
    }
};