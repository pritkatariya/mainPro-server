import pool from "../database/start.js";

// ડેટાબેઝ ક્વેરીઝ એક્ઝિક્યુટ કરવાનું કૉમન ફંક્શન
const executeQuery = async (text: string, params: any[] = []) => {
    try {
        return await pool.query(text, params);
    } catch (err) {
        console.error("Database Error:", err);
        throw new Error("Database query failed");
    }
};

export const checkDepartmentExists = async (departmentId: number) => {
    return await executeQuery("SELECT id FROM departments WHERE id = $1;", [departmentId]);
};

export const createApplicationRecord = async (data: {
    date: string;
    userId: number;
    departmentId: number;
    suid: string;
    username: string;
    subject: string;
    message: string;
}) => {
    const insertQuery = `
        INSERT INTO applications 
        (date, user_id, department_id, suid, username, subject, message, head_approved, admin_approved, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, 'Pending')
        RETURNING *;
    `;
    const result = await executeQuery(insertQuery, [
        data.date,
        data.userId,
        data.departmentId,
        data.suid,
        data.username,
        data.subject,
        data.message
    ]);
    return result.rows[0];
};

export const fetchApplicationsQuery = async (timeInterval: string, accessWhere: string, params: any[]) => {
    const fetchQuery = `
        SELECT 
            a.id,
            a.user_id,
            a.department_id,
            a.subject as title,
            a.subject,
            a.message,
            false as is_read,
            a.head_approved,
            a.admin_approved,
            'password_reset' as notification_type,
            a.created_at,
            a.username,
            a.suid,
            a.status,
            u.full_name as name,
            d.dept_name as department_name
        FROM applications a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN departments d ON a.department_id = d.id
        WHERE a.created_at >= NOW() - INTERVAL '${timeInterval}'
        ${accessWhere}
        ORDER BY a.created_at DESC;
    `;
    return await executeQuery(fetchQuery, params);
};

export const findApplicationById = async (id: number) => {
    const result = await executeQuery("SELECT * FROM applications WHERE id = $1;", [id]);
    return result.rows[0];
};

export const removeApplicationRecord = async (id: number) => {
    return await executeQuery("DELETE FROM applications WHERE id = $1;", [id]);
};

export const updateHeadApprovalStatus = async (id: number) => {
    const result = await executeQuery(
        `UPDATE applications SET head_approved = true, status = 'Head Approved' WHERE id = $1 RETURNING *;`,
        [id]
    );
    return result.rows[0];
};

export const updateAdminApprovalStatus = async (id: number) => {
    const result = await executeQuery(
        `UPDATE applications SET admin_approved = true, status = 'Admin Approved' WHERE id = $1 RETURNING *;`,
        [id]
    );
    return result.rows[0];
};

export const updateUserPasswordService = async (hashedPassword: string, userId: number, applicationId: number) => {
    await executeQuery("UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2;", [
        hashedPassword,
        userId
    ]);
    await executeQuery("DELETE FROM applications WHERE id = $1;", [applicationId]);
};