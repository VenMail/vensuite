export interface FileData {
    id: string
    title: string
    file_name: string
    file_type?: string
    file_size?: string
    last_viewed?: Date
    created_at?: Date
    contents?: string
    content?: string
}