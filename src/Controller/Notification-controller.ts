import { Request, Response } from "express";
import bcrypt from "bcrypt";
import * as notificationService from "../services/Notification-service.js"; 

const normalizeRole = (role: unknown) => String(role || "").trim().toLowerCase();

const isSuperAdminRole = (role: unknown, userId?: number) => {
    const roleCode = normalizeRole(role);
    return userId === 123098 || roleCode === "super_admin" || roleCode === "super-admin" || roleCode === "superadmin";
};

const isHeadRole = (role: unknown) => {
    const roleCode = normalizeRole(role);
    return roleCode === "department main" || roleCode === "department_main" || roleCode === "head1029";
};

// ૧. Create Password Reset Notification
export const createPasswordResetNotification = async (req: Request, res: Response): Promise<any> => {
    try {
        const { validatedUserId, validatedDepartmentId, subject, message } = req.body;

        if (!validatedUserId || !validatedDepartmentId || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: "User, department, subject and message are required.",
            });
        }

        const newNotification = await notificationService.createNotificationService(
            Number(validatedUserId),
            Number(validatedDepartmentId),
            subject,
            message
        );

        return res.status(201).json({
            success: true,
            message: "Application submitted successfully to your Department Head for verification.",
            data: newNotification,
        });
    } catch (error) {
        console.error("Create application error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ૨. Get Filtered Notifications
export const getFilteredNotifications = async (req: Request, res: Response): Promise<any> => {
    try {
        const rawFilter = req.query.filterType ? String(req.query.filterType) : "week";
        const userId = req.query.userId ? Number(req.query.userId) : 0;
        const departmentId = req.query.departmentId ? Number(req.query.departmentId) : 0;
        const role = req.query.role ? String(req.query.role) : "USER";

        await notificationService.deleteOldNotificationsService();

        // HOURLY / WEEKLY ફિલ્ટરને કેસ-ઇન્સેન્સિટિવ હેન્ડલ કર્યું
        const normalizedFilter = rawFilter.toLowerCase();
        const timeInterval = (normalizedFilter === "hour" || normalizedFilter === "hourly") ? "1 hour" : "7 days";

        const superAdmin = isSuperAdminRole(role, userId);
        const deptHead = isHeadRole(role);

        let accessWhere = "";
        const params: any[] = [];

        if (superAdmin) {
            accessWhere = `
                AND (
                    un.notification_type = 'Welcome'
                    OR un.head_approved = true
                    OR LOWER(un.title) LIKE '%welcome%'
                )
            `;
        } else if (deptHead) {
            params.push(departmentId); // $1
            params.push(userId);       // $2
            accessWhere = `
                AND (
                    un.department_id = $1
                    OR un.user_id = $2
                    OR un.notification_type = 'Welcome'
                    OR LOWER(un.title) LIKE '%welcome%'
                )
            `;
        } else {
            params.push(userId); // $1
            accessWhere = `
                AND (
                    un.user_id = $1
                    OR un.notification_type = 'Welcome'
                    OR LOWER(un.title) LIKE '%welcome%'
                )
            `;
        }

        const result = await notificationService.fetchFilteredNotificationsService(timeInterval, accessWhere, params);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            notifications: result.rows,
        });
    } catch (error) {
        console.error("Fetch notifications error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ૩. Update Notification Status
export const updateNotificationStatus = async (req: Request, res: Response): Promise<any> => {
    try {
        const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const notificationId = parseInt(String(idParam), 10);
        const { action, type, newPassword } = req.body;

        if (isNaN(notificationId)) {
            return res.status(400).json({ success: false, message: "Invalid Notification ID" });
        }

        const currentNotif = await notificationService.getNotificationByIdService(notificationId);

        if (!currentNotif) {
            return res.status(404).json({ success: false, message: "Notification record not found" });
        }

        if (type === "head") {
            if (action === "decline") {
                await notificationService.removeNotificationService(notificationId);
                return res.status(200).json({
                    success: true,
                    message: "Declined and removed by Department Head successfully.",
                });
            }

            if (action === "approve") {
                const updatedData = await notificationService.updateHeadApprovalService(notificationId);
                return res.status(200).json({
                    success: true,
                    message: "Approved by Head. Forwarded to Super Admin.",
                    data: updatedData,
                });
            }
        }

        if (type === "admin") {
            if (currentNotif.head_approved !== true) {
                return res.status(400).json({
                    success: false,
                    message: "Department Head approval is compulsory first.",
                });
            }

            if (action === "decline") {
                await notificationService.removeNotificationService(notificationId);
                return res.status(200).json({
                    success: true,
                    message: "Declined and removed by Super Admin successfully.",
                });
            }

            if (action === "approve") {
                const updatedData = await notificationService.updateAdminApprovalService(notificationId);
                return res.status(200).json({
                    success: true,
                    message: "Admin permission granted. Password input activated for Department Head.",
                    data: updatedData,
                });
            }
        }

        if (type === "password_reset") {
            if (currentNotif.head_approved !== true || currentNotif.admin_approved !== true) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot change password without dual verification.",
                });
            }

            if (!newPassword) {
                return res.status(400).json({ success: false, message: "New password is required." });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            await notificationService.updateUserPasswordService(hashedPassword, currentNotif.user_id, notificationId);

            return res.status(200).json({
                success: true,
                message: "Password updated successfully.",
            });
        }

        return res.status(400).json({ success: false, message: "Invalid update parameters" });
    } catch (error) {
        console.error("Update status error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ૪. Delete Single Notification
export const deleteNotification = async (req: Request, res: Response): Promise<any> => {
    try {
        const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const numericId = parseInt(String(idParam), 10);

        if (isNaN(numericId)) {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }

        await notificationService.removeNotificationService(numericId);

        return res.status(200).json({
            success: true,
            message: "Notification deleted from database successfully.",
        });
    } catch (error) {
        console.error("Delete notification error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ૫. Mark Single Notification as Read
export const markNotificationRead = async (req: Request, res: Response): Promise<any> => {
    try {
        const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const numericId = parseInt(String(idParam), 10);

        if (isNaN(numericId)) {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }

        const updateResult = await notificationService.markReadService(numericId);

        if (updateResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        return res.status(200).json({ success: true, message: "Marked as read", data: updateResult.rows[0] });
    } catch (error) {
        console.error("Mark read error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ૬. Mark All Notifications as Read for User
export const markAllNotificationsReadForUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = req.params.userId ? parseInt(String(req.params.userId), 10) : NaN;
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user id" });
        }

        await notificationService.markAllReadForUserService(userId);

        return res.status(200).json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
        console.error("Mark all read error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ૭. Create Welcome Notification
export const createWelcomeNotification = async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId, departmentId, name } = req.body;

        if (!userId || !name) {
            return res.status(400).json({ success: false, message: "User ID and Name are required" });
        }

        const isExists = await notificationService.checkWelcomeNotificationExistsService(Number(userId));

        if (!isExists) {
            const message = `Jai Swaminarayan ${name}, Gurukul digital system ma tamaru account successfully create thai gayu chhe.`;
            const newWelcomeNotif = await notificationService.createWelcomeNotificationService(
                Number(userId),
                departmentId ? Number(departmentId) : null,
                message
            );

            return res.status(201).json({
                success: true,
                message: "Welcome notification created successfully.",
                data: newWelcomeNotif
            });
        } else {
            return res.status(200).json({
                success: true,
                message: "Welcome notification already exists for this user."
            });
        }
    } catch (error) {
        console.error("Create welcome notification error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}; 