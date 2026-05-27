export interface IMusicUploadBody {
    title: string;
    artist?: string;
}

export interface IMusicRow {
    id: number;
    title: string;
    artist: string;
    audio_url: string;
    thumbnail_url?: string;
    duration?: string;
    category?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}