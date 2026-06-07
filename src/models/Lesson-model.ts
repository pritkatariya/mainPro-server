export interface ILessonCreateBody {
    title: string;
    description?: string;
    lesson_type: string;
    resource_url?: string;
    resource_mime?: string;
    department_id?: number;
    section_id?: number;
    assigned_to_user_id?: number;
    created_by?: number;
}

export interface ILesson {
    id: number;
    title: string;
    description: string;
    lesson_type: string;
    resource_url?: string;
    resource_mime?: string;
    department_id?: number;
    section_id?: number;
    assigned_to_user_id?: number;
    created_by?: number;
    created_at: string;
    updated_at: string;
    department_name?: string;
    section_title?: string;
    assigned_to_name?: string;
    created_by_name?: string;
}
