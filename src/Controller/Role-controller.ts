import { Request, Response } from 'express';
import pool from '../database/db.js';
import neonPool from '../database/neon.js';

export const createRole = async (req: Request, res: Response) => {
    const { roleName, roleCode, permissions } = req.body;

    // વેલિડેશન ચેક
    if (!roleName || !roleCode) {
        return res.status(400).json({ 
            success: false, 
            message: 'Role Name and Role Code are required.' 
        });
    }

    try {
        // ૧. રોલ કોડ ઓલરેડી એક્ઝિસ્ટ છે કે નહીં તે ચેક કરો
        const checkQuery = 'SELECT * FROM roles WHERE role_code = $1';
        let roleExists = false;

        try {
            const checkResult = await pool.query(checkQuery, [roleCode]);
            if (checkResult.rows.length > 0) roleExists = true;
        } catch (err) {
            console.log("⚠️ Local DB Error on check, switching to Neon Cloud...");
            const cloudCheck = await neonPool.query(checkQuery, [roleCode]);
            if (cloudCheck.rows.length > 0) roleExists = true;
        }

        if (roleExists) {
            return res.status(400).json({ success: false, message: 'Role Code is already taken!' });
        }

        // ૨. SQL ઇન્સર્ટ ક્વેરી (પરમિશન ઓબ્જેક્ટને JSON તરીકે સ્ટોર કરીશું)
        const insertQuery = `
            INSERT INTO roles (role_name, role_code, permissions) 
            VALUES ($1, $2, $3) 
            RETURNING id, role_name, role_code, permissions;
        `;

        const permissionsJson = JSON.stringify(permissions);
        let newRole = null;
        let localSuccess = false;
        let cloudSuccess = false;

        // લોકલ પીજીએડમીન માં સેવ કરો
        try {
            const result = await pool.query(insertQuery, [roleName, roleCode, permissionsJson]);
            newRole = result.rows[0];
            localSuccess = true;
            console.log("✅ Role created successfully in Local DB");
        } catch (localErr) {
            console.error("❌ Local DB Role Insert failed:", localErr);
        }

        // નિયોન ક્લાઉડ ડેટાબેઝ માં સેવ કરો
        try {
            const cloudResult = await neonPool.query(insertQuery, [roleName, roleCode, permissionsJson]);
            if (!newRole) {
                newRole = cloudResult.rows[0];
            }
            cloudSuccess = true;
            console.log("✅ Role created successfully in Neon Cloud DB");
        } catch (cloudErr) {
            console.error("❌ Neon Cloud DB Role Insert failed:", cloudErr);
        }

        if (!localSuccess && !cloudSuccess) {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to insert role in both Local and Neon Cloud databases.' 
            });
        }

        return res.status(201).json({
            success: true,
            message: `New Role configured successfully! (Local: ${localSuccess ? 'Saved' : 'Failed'}, Neon: ${cloudSuccess ? 'Saved' : 'Failed'}) 🎉`,
            role: newRole
        });

    } catch (error) {
        console.error("Complete Create Role Error:", error);
        return res.status(500).json({ success: false, message: 'Internal server error while creating role.' });
    }
};

export const RoleAllData = async (req: Request, res: Response) => {
    try {
        const selectQuery = `
            SELECT id, role_name, role_code, permissions,
            TO_CHAR(created_at, 'DD/MM/YYYY') as created_date 
            FROM roles 
            ORDER BY id DESC;
        `;
        
        let rolesList = [];
        
        try {
            const result = await pool.query(selectQuery);
            rolesList = result.rows;
            console.log("✅ Roles fetched from Local DB");
        } catch (localErr) {
            console.log("⚠️ Local DB Fallback: Fetching roles from Neon Cloud...");
            const cloudResult = await neonPool.query(selectQuery);
            rolesList = cloudResult.rows;
            console.log("✅ Roles fetched from Neon Cloud");
        }

        return res.status(200).json({
            success: true,
            count: rolesList.length,
            roles: rolesList
        });

    } catch (err) {
        console.error("Fetch Roles Error:", err);
        return res.status(500).json({ success: false, message: "Error while fetching roles list" });
    }
};