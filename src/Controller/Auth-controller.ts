import { Request, Response } from "express";
import bcrypt from "bcrypt";
import pool from "../database/start.js";

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    try {
        // ક્વેરી ક્લીન કરી: સીધું r.role_code = u.role સાથે જોઈન કર્યું કારણ કે તે ફોરેન કી છે
        const queryText = `
            SELECT u.*, r.role_code AS role_code, r.permissions AS role_permissions
            FROM users u
            LEFT JOIN roles r ON u.role = r.role_code
            WHERE u.username = $1
        `;

        const userResult = await pool.query(queryText, [username]);
        const user = userResult.rows[0];

        if (user) {
            const isPasswordMatch =
                password === user.password ||
                (user.password.startsWith("$2b$") && (await bcrypt.compare(password, user.password)));

            if (isPasswordMatch) {
                const roleCode = user.role_code || user.role;
                let permissions = {};

                if (user.role_permissions) {
                    try {
                        permissions =
                            typeof user.role_permissions === "string"
                                ? JSON.parse(user.role_permissions)
                                : user.role_permissions;
                    } catch {
                        permissions = {};
                    }
                }

                const userResponseData = { ...user };
                delete userResponseData.password;
                delete userResponseData.role_permissions;

                return res.json({
                    success: true,
                    message: "Logged in successfully",
                    user: userResponseData,
                    user_role: roleCode,
                    permissions,
                });
            }
        }

        return res.status(401).json({ message: "Invalid username or password" });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Login error, internal server failure" });
    }
};

export const getAllDepartments = async (_req: Request, res: Response): Promise<any> => {
    try {
        const queryText = "SELECT id, dept_name FROM departments WHERE is_active = TRUE ORDER BY id ASC;";
        const result = await pool.query(queryText);

        const formattedDepartments = result.rows.map((dept: any) => ({
            id: dept.id,
            name: dept.dept_name,
        }));

        return res.status(200).json({ success: true, departments: formattedDepartments });
    } catch (error) {
        console.error("Error fetching departments:", error);
        return res.status(500).json({ success: false, message: "Error fetching departments" });
    }
};

export const handleForgotPasswordRequest = async (req: Request, res: Response): Promise<any> => {
    const {
        date,
        department_id,
        suid,
        username,
        subject,
        request_text,
        verifiedUserTargetDept,
        verifiedUserFullName,
    } = req.body;

    try {
        // નવી 'forgot_requests' ટેબલમાં પરફેક્ટ ડેટા ઇન્સર્ટ
        const insertQuery = `
            INSERT INTO forgot_requests (date, department_id, suid, username, subject, request_text, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'Pending') RETURNING id;
        `;
        const params = [date, Number(department_id), suid, username, subject, request_text];
        await pool.query(insertQuery, params);

        const notifTitle = `New Account Request: ${subject}`;
        const notifMessage = `સેવક ${verifiedUserFullName} (SUID: ${suid}) દ્વારા પોતાના ખાતા માટે વિનંતી મોકલવામાં આવી છે.`;

        // ડિપાર્ટમેન્ટ હેડ શોધવાની ક્વેરી
        const findHeadQuery = `
            SELECT id FROM users 
            WHERE department_id = $1 AND role = 'department-main' 
            LIMIT 1;
        `;
        const headResult = await pool.query(findHeadQuery, [verifiedUserTargetDept]);
        const headUser = headResult.rows[0];

        const insertNotifQuery = `
            INSERT INTO user_notifications (user_id, title, message, notification_type) 
            VALUES ($1, $2, $3, 'Request');
        `;

        // ૧. જો ડિપાર્ટમેન્ટ હેડ મળે તો તેને નોટિફિકેશન મોકલો
        if (headUser) {
            await pool.query(insertNotifQuery, [headUser.id, notifTitle, notifMessage]);
        }

        // ૨. સુપર એડમિન (123098) ને માત્ર એક જ વાર ક્લીન નોટિફિકેશન મોકલો (ડુપ્લીકેશન હટાવી દીધું)
        await pool.query(insertNotifQuery, [123098, notifTitle, notifMessage]);

        return res.status(201).json({
            success: true,
            message: "Application submitted and routed to Department Head successfully!",
        });
    } catch (error) {
        console.error("Error routing request:", error);
        return res.status(500).json({
            success: false,
            message: "Error routing verified application request",
        });
    }
};