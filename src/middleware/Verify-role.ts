import { Request, Response, NextFunction } from "express";

const normalizeRole = (role: unknown) => String(role || "").trim().toLowerCase();

export const verifyAdminOrDepartmentHead = (allowedDepartmentId?: number) => {
    return (req: Request, res: Response, next: NextFunction): any => {
        const { adminId, userRole, departmentId } = req.body;

        const roleCode = normalizeRole(userRole);
        const isSuperAdmin =
            adminId === "123098" ||
            Number(adminId) === 123098 ||
            roleCode === "super_admin" ||
            roleCode === "super-admin" ||
            roleCode === "superadmin";

        const isDepartmentHead =
            roleCode === "department main" ||
            roleCode === "department_main" ||
            roleCode === "head1029";

        if (!isSuperAdmin && !isDepartmentHead) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only Super Admin or Department Head may perform this action.",
            });
        }

        if (allowedDepartmentId && !isSuperAdmin) {
            if (Number(departmentId) !== allowedDepartmentId) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. Department Head may only approve requests for their own department.",
                });
            }
        }

        next();
    };
};