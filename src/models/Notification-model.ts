// 1. Password Reset માટે એપ્લિકેશન ક્રિએટ કરતી વખતે (તમે આપેલું)
export interface INotificationCreateBody {
    validatedUserId: number;
    validatedDepartmentId: number;
    subject: string;
    message: string;
}

// 2. નોટિફિકેશનનું સ્ટેટસ અપડેટ કરતી વખતે (તમે આપેલું)
export interface INotificationStatusUpdateBody {
    type: "head" | "admin" | "password_reset";
    action?: "approve" | "decline";
    newPassword?: string;
}

// 3. નવો Welcome મેસેજ ક્રિએટ કરતી વખતે વપરાતું મોડલ
export interface IWelcomeNotificationBody {
    userId: number;
    departmentId?: number;
    name: string;
}

// 4. ડેટાબેઝમાંથી આવતા Notification નો સંપૂર્ણ ડેટા (GET રિક્વેસ્ટ માટે)
export interface INotification {
    id: number;
    user_id: number;
    department_id?: number | null;
    title: string;
    message: string;
    is_read: boolean;
    head_approved?: boolean | null;
    admin_approved?: boolean | null;
    notification_type: string;
    created_at: Date | string;
    
    // JOIN ક્વેરીમાંથી આવતા વધારાના ફિલ્ડ્સ (જે getFilteredNotifications માં છે)
    subject?: string;
    name?: string;
    username?: string;
    suid?: string;
    department_name?: string;
    status?: string;
}

// 5. GET /get-filtered-notifications API માં આવતી Query Parameters માટે
export interface INotificationFilterQuery {
    filterType?: "hour" | "week";
    userId?: string;
    departmentId?: string;
    role?: string;
}