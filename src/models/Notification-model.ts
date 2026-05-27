export interface INotificationCreateBody {
    validatedUserId: number;
    validatedDepartmentId: number;
    subject: string;
    message: string;
}

export interface INotificationStatusUpdateBody {
    type: "head" | "admin" | "password_reset";
    action?: "approve" | "decline";
    newPassword?: string;
}