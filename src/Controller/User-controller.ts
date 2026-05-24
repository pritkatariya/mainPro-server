import { Request, Response } from "express";
import pool from "../database/start.js";
import bcrypt from "bcrypt";
import { uploadToSupabase } from "../middleware/upload.js";

const executeQuery = async (text: string, params: any[] = []) => {
    try {
        return await pool.query(text, params);
    } catch (error) {
        console.error("Database query error:", error);
        throw error;
    }
};

export const createUser = async (req: Request, res: Response): Promise<any> => {
    let localInsertError: unknown = null;
    let cloudInsertError: unknown = null;

    try {
        const {
            fullName,
            username,
            password,
            std,
            rollNumber,
            suid,
            userRole,
            department,
            existingImageUrl
        } = req.body;

        if (!fullName || !username || !password || !std || !rollNumber || !userRole) {
            return res.status(400).json({
                success: false,
                message: "All fields are required.",
            });
        }

        const finalSuid = (suid || rollNumber.toString()).toString().trim();

        const checkUserQuery = `SELECT id FROM users WHERE LOWER(username) = LOWER($1);`;
        const existingUserRows = (await executeQuery(checkUserQuery, [username])).rows;

        if (existingUserRows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Username already exists. Please choose a different username.",
            });
        }

        const checkSuidQuery = `SELECT id FROM users WHERE TRIM(suid) = TRIM($1);`;
        const existingSuidRows = (await executeQuery(checkSuidQuery, [finalSuid])).rows;

        if (existingSuidRows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "SUID already exists. Please use a different SUID.",
            });
        }

        let profileImageUrl = existingImageUrl || null;

        if (req.file) {
            profileImageUrl = await uploadToSupabase(req.file);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const insertUserQuery = `
            INSERT INTO users (
                full_name,
                username,
                password,
                std,
                roll_number,
                role,
                department_id,
                profile_image_url,
                suid
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, full_name, username, role, department_id, suid, profile_image_url;
        `;

        const userParams = [
            fullName,
            username,
            hashedPassword,
            std,
            Number(rollNumber),
            userRole,
            Number(department) || 0,
            profileImageUrl,
            finalSuid,
        ];

        let localNewUser: any = null;
        let localSuccess = false;

        try {
            const result = await pool.query(insertUserQuery, userParams);
            localNewUser = result.rows[0];
            localSuccess = true;
        } catch (error) {
            localInsertError = error;
            console.error("Local user insert error:", error);
        }

        if (!localSuccess) {
            const localMsg =
                localInsertError instanceof Error ? localInsertError.message : String(localInsertError);

            return res.status(500).json({
                success: false,
                message: "Failed to insert user.",
                detail: localMsg,
            });
        }

        const insertNotifQuery = `
            INSERT INTO user_notifications (user_id, department_id, title, message, notification_type)
            VALUES ($1, $2, $3, $4, 'Welcome');
        `;

        const welcomeSubject = "WELCOME TO GURUKUL SYSTEM!";

        if (localSuccess && localNewUser) {
            const welcomeMessage = `Jai Swaminarayan ${localNewUser.full_name}, your account has been successfully created.`;

            try {
                await pool.query(insertNotifQuery, [
                    localNewUser.id,
                    localNewUser.department_id || 0,
                    welcomeSubject,
                    welcomeMessage,
                ]);
            } catch (error) {
                console.error("Local welcome notification error:", error);
            }
        }

        const adminTargetQuery = `
            SELECT id, department_id FROM users 
            WHERE (
                LOWER(role) IN ('super_admin', 'superadmin', 'department main', 'department_main', 'head1029')
                OR id = 123098
            )
            AND id != $1;
        `;

        const alertSubject = "NEW ACCOUNT CREATED";

        if (localSuccess && localNewUser) {
            const alertMessage = `New ${localNewUser.role} account has been created: ${localNewUser.full_name} (${localNewUser.username})`;

            try {
                const managementResult = await pool.query(adminTargetQuery, [localNewUser.id]);

                for (const manager of managementResult.rows) {
                    try {
                        await pool.query(insertNotifQuery, [
                            manager.id,
                            manager.department_id || 0,
                            alertSubject,
                            alertMessage,
                        ]);
                    } catch (error) {
                        console.error("Local admin notification error:", error);
                    }
                }
            } catch (error) {
                console.error("Local admin query error:", error);
            }
        }

        const deleteRequestQuery = `
            DELETE FROM admit_requests 
            WHERE TRIM(suid) = TRIM($1);
        `;

        try {
            await pool.query(deleteRequestQuery, [finalSuid]);
        } catch { }

        const responseUser = localNewUser;

        return res.status(201).json({
            success: true,
            message: "User created successfully and pending request removed!",
            data: responseUser,
        });
    } catch (error) {
        console.error(error);
        const errMsg = error instanceof Error ? error.message : "Unknown error";

        return res.status(500).json({
            success: false,
            message: "Internal server error processing user creation.",
            detail: errMsg,
        });
    }
};

export const UserAllDataList = async (_req: Request, res: Response): Promise<any> => {
    try {
        const selectQuery = `
            SELECT id, full_name, username, std, roll_number, suid, department_id, role, joined_date, profile_image_url 
            FROM users 
            ORDER BY id DESC;
        `;

        const result = await executeQuery(selectQuery);

        return res.status(200).json({
            success: true,
            users: result.rows,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching users data list",
        });
    }
};

export const deleteRequestBySuid = async (req: Request, res: Response): Promise<any> => {
    try {
        const { suid } = req.params;
        const deleteQuery = `DELETE FROM admit_requests WHERE suid = $1 RETURNING id;`;

        try {
            await pool.query(deleteQuery, [suid]);
        } catch { }

        try {
            await pool.query(deleteQuery, [suid]);
        } catch { }

        return res.status(200).json({ success: true, message: "Purged" });
    } catch {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getUserLiveNotifications = async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId } = req.params;

        const query = `
            SELECT id, title, message, is_read, created_at 
            FROM user_notifications 
            WHERE user_id = $1 
            ORDER BY id DESC;
        `;

        const result = await executeQuery(query, [userId]);

        return res.status(200).json({
            success: true,
            notifications: result.rows,
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

export const updateUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const { fullName, username, password, std, rollNumber, suid, userRole, department } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "User id is required.",
            });
        }

        if (username) {
            const checkUserQuery = `
                SELECT id FROM users 
                WHERE LOWER(username) = LOWER($1) AND id != $2;
            `;

            const existingUserRows = (await executeQuery(checkUserQuery, [username, id])).rows;

            if (existingUserRows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Username already exists. Please choose a different username.",
                });
            }
        }

        let profileImageUrl: string | null = null;

        if (req.file) {
            profileImageUrl = await uploadToSupabase(req.file);
        }

        let hashedPassword = null;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt);
        }

        const updateUserQuery = `
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
                updated_at = NOW()
            WHERE id = $10
            RETURNING id, full_name, username, role, department_id, suid, profile_image_url;
        `;

        const userParams = [
            fullName || null,
            username || null,
            hashedPassword,
            std || null,
            rollNumber ? Number(rollNumber) : null,
            userRole || null,
            department ? Number(department) : null,
            profileImageUrl,
            suid || null,
            id,
        ];

        let updatedUser = null;
        let localSuccess = false;
        let cloudSuccess = false;

        try {
            const result = await pool.query(updateUserQuery, userParams);
            updatedUser = result.rows[0];
            localSuccess = true;
        } catch (error) {
            console.error(error);
        }

        try {
            const cloudResult = await pool.query(updateUserQuery, userParams);
            if (!updatedUser) updatedUser = cloudResult.rows[0];
            cloudSuccess = true;
        } catch (error) {
            console.error(error);
        }

        if (!localSuccess && !cloudSuccess) {
            return res.status(500).json({
                success: false,
                message: "Failed to update user.",
            });
        }

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User updated successfully!",
            data: updatedUser,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error processing user update.",
        });
    }
};

export const deleteUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "User id is required.",
            });
        }

        const deleteNotifQuery = `DELETE FROM user_notifications WHERE user_id = $1;`;
        const deleteUserQuery = `DELETE FROM users WHERE id = $1 RETURNING id;`;

        let deletedUser = null;
        let localSuccess = false;
        let cloudSuccess = false;

        try {
            await pool.query(deleteNotifQuery, [id]);
            const result = await pool.query(deleteUserQuery, [id]);
            deletedUser = result.rows[0];
            localSuccess = true;
        } catch (error) {
            console.error(error);
        }

        try {
            await pool.query(deleteNotifQuery, [id]);
            const cloudResult = await pool.query(deleteUserQuery, [id]);
            if (!deletedUser) deletedUser = cloudResult.rows[0];
            cloudSuccess = true;
        } catch (error) {
            console.error(error);
        }

        if (!localSuccess && !cloudSuccess) {
            return res.status(500).json({
                success: false,
                message: "Failed to delete user.",
            });
        }

        if (!deletedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User deleted successfully!",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error processing user delete.",
        });
    }
};