import { Request, Response } from "express";
import pool from "../database/db.js";
import neonPool from "../database/neon.js";

const getDb = () => (process.env.NODE_ENV === "production" ? neonPool : pool);

const parsePermissions = (permissions: any) => {
    if (!permissions) return {};
    if (typeof permissions === "string") {
        try {
            return JSON.parse(permissions);
        } catch {
            return {};
        }
    }
    return permissions;
};

export const createRole = async (req: Request, res: Response): Promise<any> => {
    const { roleName, roleCode, permissions } = req.body;

    if (!roleName || !roleCode) {
        return res.status(400).json({
            success: false,
            message: "Role Name and Role Code are required.",
        });
    }

    try {
        const db = getDb();

        const checkResult = await db.query("SELECT id FROM roles WHERE role_code = $1", [roleCode]);

        if (checkResult.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Role Code is already taken!",
            });
        }

        const insertQuery = `
            INSERT INTO roles (role_name, role_code, permissions)
            VALUES ($1, $2, $3::jsonb)
            RETURNING id, role_name, role_code, permissions, created_at;
        `;

        const result = await db.query(insertQuery, [
            roleName,
            roleCode,
            JSON.stringify(permissions || {}),
        ]);

        return res.status(201).json({
            success: true,
            message: "New Role configured successfully!",
            role: {
                ...result.rows[0],
                permissions: parsePermissions(result.rows[0].permissions),
            },
        });
    } catch (error: any) {
        console.error("Create role error:", error);

        if (error?.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Role Code is already taken!",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error while creating role.",
        });
    }
};

export const RoleAllData = async (_req: Request, res: Response): Promise<any> => {
    try {
        const db = getDb();

        const selectQuery = `
            SELECT id,
                   role_name,
                   role_code,
                   permissions,
                   TO_CHAR(created_at, 'DD/MM/YYYY') AS created_date
            FROM roles
            ORDER BY id ASC;
        `;

        const result = await db.query(selectQuery);

        const roles = result.rows.map((role) => ({
            ...role,
            permissions: parsePermissions(role.permissions),
        }));

        return res.status(200).json({
            success: true,
            roles,
        });
    } catch (error) {
        console.error("Role list error:", error);

        return res.status(500).json({
            success: false,
            message: "Error while fetching roles list",
        });
    }
};

export const GetRoleById = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;

        const query = `
            SELECT id, role_name, role_code, permissions,
            TO_CHAR(created_at, 'DD/MM/YYYY') as created_date
            FROM roles
            WHERE id = $1;
        `;

        const db = process.env.NODE_ENV === "production" ? neonPool : pool;
        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Role not found.",
            });
        }

        const role = result.rows[0];

        return res.status(200).json({
            success: true,
            role: {
                ...role,
                permissions:
                    typeof role.permissions === "string"
                        ? JSON.parse(role.permissions)
                        : role.permissions,
            },
        });
    } catch (error) {
        console.error("GetRoleById error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching role.",
        });
    }
};

export const deleteRoleById = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const db = getDb();

        const result = await db.query("DELETE FROM roles WHERE id = $1 RETURNING id", [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Role not found or already deleted.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Role deleted successfully!",
        });
    } catch (error) {
        console.error("Delete role error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error while deleting role.",
        });
    }
};

export const EditRoleById = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const { roleName, roleCode, permissions } = req.body;

        if (!roleName || !roleCode) {
            return res.status(400).json({
                success: false,
                message: "Role Name and Role Code are required.",
            });
        }

        const db = getDb();

        const duplicateQuery = `
            SELECT id
            FROM roles
            WHERE role_code = $1 AND id::text <> $2::text;
        `;

        const duplicateResult = await db.query(duplicateQuery, [roleCode, id]);

        if (duplicateResult.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Role Code is already taken by another role.",
            });
        }

        const updateQuery = `
            UPDATE roles
            SET role_name = $1,
                role_code = $2,
                permissions = $3::jsonb
            WHERE id = $4
            RETURNING id, role_name, role_code, permissions, created_at;
        `;

        const result = await db.query(updateQuery, [
            roleName,
            roleCode,
            JSON.stringify(permissions || {}),
            id,
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Role not found or update failed.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Role updated successfully!",
            role: {
                ...result.rows[0],
                permissions: parsePermissions(result.rows[0].permissions),
            },
        });
    } catch (error: any) {
        console.error("Edit role error:", error);

        if (error?.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Role Code is already taken by another role.",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error while updating role.",
        });
    }
};