import pool from "../database/start.js";

/**
 * રોલ કોડ ડુપ્લીકેટ છે કે નહીં તે ચેક કરવા માટે
 */
export const checkDuplicateRoleCode = async (roleCode: string, excludeId?: string) => {
    if (excludeId) {
        const query = "SELECT id FROM roles WHERE role_code = $1 AND id::text <> $2::text;";
        return await pool.query(query, [roleCode, excludeId]);
    } else {
        const query = "SELECT id FROM roles WHERE role_code = $1;";
        return await pool.query(query, [roleCode]);
    }
};

/**
 * નવો રોલ ડેટાબેઝમાં ક્રિએટ કરવા માટે
 */
export const createRoleService = async (roleName: string, roleCode: string, permissions: string) => {
    const query = `
        INSERT INTO roles (role_name, role_code, permissions)
        VALUES ($1, $2, $3::jsonb)
        RETURNING id, role_name, role_code, permissions, created_at;
    `;
    return await pool.query(query, [roleName, roleCode, permissions]);
};

/**
 * બધા જ રોલ્સનું લિસ્ટ ડેટાબેઝમાંથી મેળવવા માટે
 */
export const getAllRolesService = async () => {
    const query = `
        SELECT id, role_name, role_code, permissions,
               TO_CHAR(created_at, 'DD/MM/YYYY') AS created_date
        FROM roles
        ORDER BY id ASC;
    `;
    return await pool.query(query);
};

/**
 * સિંગલ રોલ આઈડી દ્વારા મેળવવા માટે
 */
export const getRoleByIdService = async (id: string) => {
    const query = `
        SELECT id, role_name, role_code, permissions,
               TO_CHAR(created_at, 'DD/MM/YYYY') as created_date
        FROM roles
        WHERE id = $1;
    `;
    return await pool.query(query, [id]);
};

/**
 * રોલ આઈડી દ્વારા ડેટાબેઝમાંથી ડીલીટ કરવા માટે
 */
export const deleteRoleByIdService = async (id: string) => {
    const query = "DELETE FROM roles WHERE id = $1 RETURNING id;";
    return await pool.query(query, [id]);
};

/**
 * હયાત રોલને ડેટાબેઝમાં અપડેટ કરવા માટે
 */
export const updateRoleService = async (id: string, roleName: string, roleCode: string, permissions: string) => {
    const query = `
        UPDATE roles
        SET role_name = $1,
            role_code = $2,
            permissions = $3::jsonb
        WHERE id = $4
        RETURNING id, role_name, role_code, permissions, created_at;
    `;
    return await pool.query(query, [roleName, roleCode, permissions, id]);
};