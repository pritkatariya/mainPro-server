import pool from "../database/start.js";

export const deleteOldNotificationsService = async () => {
    await pool.query("DELETE FROM user_notifications WHERE created_at < NOW() - INTERVAL '7 days';");
};

export const createNotificationService = async (userId: number, deptId: number, title: string, message: string) => {
    const query = `
        INSERT INTO user_notifications (user_id, department_id, title, message, head_approved, admin_approved, notification_type)
        VALUES ($1, $2, $3, $4, NULL, NULL, 'password_reset') RETURNING *;
    `;
    const result = await pool.query(query, [userId, deptId, title, message]);
    return result.rows[0];
};

export const fetchFilteredNotificationsService = async (timeInterval: string, accessWhere: string, params: any[]) => {
    const query = `
        SELECT un.id, un.user_id, un.department_id, un.title, un.title as subject, un.message, un.is_read, un.head_approved, un.admin_approved, un.notification_type, un.created_at, u.full_name as name, u.username, u.suid, d.name as department_name,
        CASE 
            WHEN un.notification_type = 'password_reset' AND un.head_approved = true AND un.admin_approved = true THEN 'Approved'
            WHEN un.notification_type = 'password_reset' THEN 'Pending'
            ELSE COALESCE(un.notification_type, 'Notification')
        END as status
        FROM user_notifications un
        LEFT JOIN users u ON un.user_id = u.id
        LEFT JOIN departments d ON un.department_id = d.id
        WHERE un.created_at >= NOW() - INTERVAL '${timeInterval}' ${accessWhere}
        ORDER BY un.created_at DESC;
    `;
    return await pool.query(query, params);
};

export const getNotificationByIdService = async (id: number) => {
    const result = await pool.query("SELECT * FROM user_notifications WHERE id = $1", [id]);
    return result.rows[0];
};

export const removeNotificationService = async (id: number) => {
    await pool.query("DELETE FROM user_notifications WHERE id = $1", [id]);
};

export const updateHeadApprovalService = async (id: number) => {
    const result = await pool.query("UPDATE user_notifications SET head_approved = true WHERE id = $1 RETURNING *", [id]);
    return result.rows[0];
};

export const updateAdminApprovalService = async (id: number) => {
    const result = await pool.query("UPDATE user_notifications SET admin_approved = true WHERE id = $1 RETURNING *", [id]);
    return result.rows[0];
};

export const updateUserPasswordService = async (hashedPassword: string, userId: number, notifId: number) => {
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, userId]);
    await pool.query("DELETE FROM user_notifications WHERE id = $1", [notifId]);
};

export const markReadService = async (id: number) => {
    return await pool.query("UPDATE user_notifications SET is_read = true WHERE id = $1 RETURNING *", [id]);
};

export const markAllReadForUserService = async (userId: number) => {
    await pool.query("UPDATE user_notifications SET is_read = true WHERE user_id = $1", [userId]);
};