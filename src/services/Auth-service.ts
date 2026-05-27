import pool from "../database/start.js";

export const getUserByUsernameService = async (username: string) => {
    const query = "SELECT * FROM users WHERE username = $1;";
    return await pool.query(query, [username]);
};

export const getActiveDepartmentsService = async () => {
    const query = "SELECT id, dept_name FROM departments WHERE is_active = TRUE ORDER BY id ASC;";
    return await pool.query(query);
};

export const createForgotPasswordRecordService = async (params: any[]) => {
    // નોંધ: જો તમે ડેટાબેઝ માઇગ્રેશનમાં 'forgot_requests' ટેબલ ન બનાવ્યું હોય, 
    // તો આ ડેટા 'applications' અથવા 'user_notifications' ટેબલમાં પણ ઇન્સર્ટ કરી શકાય છે.
    const query = `
        INSERT INTO forgot_requests (date, department_id, suid, username, subject, request_text, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'Pending') RETURNING id;
    `;
    return await pool.query(query, params);
};

export const getDepartmentHeadService = async (deptId: number) => {
    const query = `
        SELECT id FROM users 
        WHERE department_id = $1 AND role = 'department main' 
        LIMIT 1;
    `;
    return await pool.query(query, [deptId]);
};

export const createAuthNotificationService = async (userId: number, title: string, message: string) => {
    const query = `
        INSERT INTO user_notifications (user_id, title, message, notification_type) 
        VALUES ($1, $2, $3, 'Request');
    `;
    await pool.query(query, [userId, title, message]);
};