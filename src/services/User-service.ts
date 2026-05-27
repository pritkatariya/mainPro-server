import pool from "../database/start.js";

export const checkExistingUsername = async (username: string, excludeId?: string) => {
    const query = excludeId 
        ? `SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2;`
        : `SELECT id FROM users WHERE LOWER(username) = LOWER($1);`;
    return await pool.query(query, excludeId ? [username, excludeId] : [username]);
};

export const checkExistingSuid = async (suid: string) => {
    const query = `SELECT id FROM users WHERE TRIM(suid) = TRIM($1);`;
    return await pool.query(query, [suid]);
};

export const createUserService = async (params: any[]) => {
    const query = `
        INSERT INTO users (full_name, username, password, std, roll_number, role, department_id, profile_image_url, suid)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, full_name, username, role, department_id, suid, profile_image_url;
    `;
    return await pool.query(query, params);
};

export const createNotificationService = async (userId: number, deptId: number, title: string, message: string, type: string) => {
    const query = `
        INSERT INTO user_notifications (user_id, department_id, title, message, notification_type)
        VALUES ($1, $2, $3, $4, $5);
    `;
    await pool.query(query, [userId, deptId, title, message, type]);
};

export const getManagementUsersService = async (excludeUserId: number) => {
    const query = `
        SELECT id, department_id FROM users 
        WHERE (LOWER(role) IN ('super_admin', 'superadmin', 'department main', 'department_main', 'head1029') OR id = 123098)
        AND id != $1;
    `;
    return await pool.query(query, [excludeUserId]);
};

export const removeAdmitRequestBySuid = async (suid: string) => {
    const query = `DELETE FROM admit_requests WHERE TRIM(suid) = TRIM($1);`;
    await pool.query(query, [suid]);
};

export const getAllUsersDataListService = async () => {
    const query = `
        SELECT id, full_name, username, std, roll_number, suid, department_id, role, joined_date, profile_image_url 
        FROM users ORDER BY id DESC;
    `;
    return await pool.query(query);
};

export const getUserNotificationsService = async (userId: string) => {
    const query = `
        SELECT id, title, message, is_read, created_at 
        FROM user_notifications WHERE user_id = $1 ORDER BY id DESC;
    `;
    return await pool.query(query, [userId]);
};

export const updateUserService = async (params: any[]) => {
    const query = `
        UPDATE users SET
            full_name = COALESCE($1, full_name),
            username = COALESCE($2, username),
            password = COALESCE($3, password),
            std = COALESCE($4, std),
            roll_number = COALESCE($5, roll_number),
            role = COALESCE($6, role),
            department_id = COALESCE($7, department_id),
            profile_image_url = COALESCE($8, profile_image_url),
            suid = COALESCE($9, suid),
            section_id = COALESCE($10, section_id), -- 👈 આ લાઈન નવી ઉમેરી
            updated_at = NOW()
        WHERE id = $11 -- 👈 આ $10 માંથી $11 થઈ ગયું
        RETURNING id, full_name, username, role, department_id, suid, profile_image_url;
    `;
    return await pool.query(query, params);
};

export const deleteUserService = async (id: string) => {
    await pool.query(`DELETE FROM user_notifications WHERE user_id = $1;`, [id]);
    return await pool.query(`DELETE FROM users WHERE id = $1 RETURNING id;`, [id]);
};