import pool from "../database/start.js";

/**
 * નવી G-Music એડમિટ રિક્વેસ્ટ ડેટાબેઝમાં સ્ટોર કરવા માટે
 */
export const createGMusicRequestService = async (data: {
    name: string;
    suid: string;
    performance: string;
    description: string;
    imageUrl: string | null;
}) => {
    const insertQuery = `
        INSERT INTO admit_requests (name, suid, performance, description, department_id, image_url, status, is_user_created)
        VALUES ($1, $2, $3, $4, 1, $5, 'Pending', false)
        RETURNING id, name, suid, department_id, status;
    `;
    const queryParams = [data.name, data.suid, data.performance, data.description, data.imageUrl];
    const result = await pool.query(insertQuery, queryParams);
    return result.rows[0];
};

/**
 * G-Music ડિપાર્ટમેન્ટ (ID = 1) ની બધી જ એપ્લિકેશન રિક્વેસ્ટ મેળવવા માટે
 */
export const getGMusicRequestsService = async () => {
    const selectQuery = `
        SELECT id, name, suid, performance, description, department_id, image_url, status, is_user_created, created_at
        FROM admit_requests 
        WHERE department_id = 1 
        ORDER BY id DESC;
    `;
    const result = await pool.query(selectQuery);
    return result.rows;
};

/**
 * G-Music ડિપાર્ટમેન્ટમાં ઓનબોર્ડ (Onboard) થયેલા યુઝર્સનું લિસ્ટ જોવા માટે
 */
export const getOnboardedGMusicUsersService = async () => {
    const query = `
        SELECT id, full_name as name, username, suid, profile_image_url as image_url, role, department_id, joined_date 
        FROM users 
        WHERE department_id = 1 
        ORDER BY id DESC;
    `;
    const result = await pool.query(query);
    return result.rows;
};

/**
 * G-Music રિક્વેસ્ટનું સ્ટેટસ અપડેટ કરવા માટે (Approved / Declined)
 */
export const updateGMusicRequestStatusService = async (id: string, status: "Approved" | "Declined") => {
    const updateQuery = `
        UPDATE admit_requests 
        SET status = $1 
        WHERE id = $2 AND department_id = 1 
        RETURNING id, name, status;
    `;
    const result = await pool.query(updateQuery, [status, id]);
    return result.rows[0];
};