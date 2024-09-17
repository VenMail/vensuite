export interface FileData {
    id?: string
    title: string
    file_name?: string
    file_type?: string | null
    file_size?: string
    file_url?: string
    folder_id?: string | null
    last_viewed?: Date
    created_at?: Date | string
    is_folder?: boolean
    contents?: string
    content?: string
}