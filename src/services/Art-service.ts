import pool from "../database/start.js";

/**
 * નવી આર્ટ એડમિટ રિક્વેસ્ટ ડેટાબેઝમાં સેવ કરવા માટે
 */
export const createArtRequestService = async (data: {
    name: string;
    suid: string;
    performance: string;
    description: string;
    imageUrl: string | null;
}) => {
    const insertQuery = `
        INSERT INTO admit_requests (name, suid, performance, description, department_id, image_url, status, is_user_created)
        VALUES ($1, $2, $3, $4, 2, $5, 'Pending', false)
        RETURNING id, name, suid, department_id, status;
    `;
    const queryParams = [data.name, data.suid, data.performance, data.description, data.imageUrl];
    const result = await pool.query(insertQuery, queryParams);
    return result.rows[0];
};

/**
 * આર્ટ ડિપાર્ટમેન્ટ (ID = 2) ની બધી જ રિક્વેસ્ટ મેળવવા માટે
 */
export const getArtRequestsService = async () => {
    const selectQuery = `
        SELECT id, name, suid, performance, description, department_id, image_url, status, is_user_created, created_at
        FROM admit_requests 
        WHERE department_id = 2 
        ORDER BY id DESC;
    `;
    const result = await pool.query(selectQuery);
    return result.rows;
};

/**
 * આર્ટ ડિપાર્ટમેન્ટમાં ઓનબોર્ડ (Onboard) થયેલા યુઝર્સનું લિસ્ટ જોવા માટે
 */
export const getOnboardedArtUsersService = async () => {
    const query = `
        SELECT id, full_name as name, username, suid, profile_image_url as image_url, role, department_id, joined_date 
        FROM users 
        WHERE department_id = 2 
        ORDER BY id DESC;
    `;
    const result = await pool.query(query);
    return result.rows;
};

/**
 * આર્ટ રિક્વેસ્ટનું સ્ટેટસ અપડેટ કરવા માટે (Approve / Decline)
 */
export const updateArtRequestStatusService = async (id: string, status: "Approved" | "Declined") => {
    const updateQuery = `
        UPDATE admit_requests 
        SET status = $1 
        WHERE id = $2 AND department_id = 2 
        RETURNING id, name, status;
    `;
    const result = await pool.query(updateQuery, [status, id]);
    return result.rows[0];
};