export interface IAdmitRequest {
    id?: number;
    name: string;
    suid: string;
    performance: string;
    description?: string;
    department_id?: number;
    image_url?: string | null;
    status?: string;
    is_user_created?: boolean;
    created_at?: string;
    updated_at?: string;
}
