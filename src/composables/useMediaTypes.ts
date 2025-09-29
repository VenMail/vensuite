export interface MediaTypeConfig {
  images: string[]
  videos: string[]
  audio: string[]
  viewable: string[]
}

export const MEDIA_TYPES: MediaTypeConfig = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
  videos: ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'],
  audio: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'],
  viewable: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'mp4', 'webm', 'ogg', 'avi', 'mov', 'mp3', 'wav', 'aac', 'flac', 'm4a']
}

export function useMediaTypes() {
  const isImage = (fileType?: string | null): boolean => {
    if (!fileType) return false
    return MEDIA_TYPES.images.includes(fileType.toLowerCase())
  }

  const isVideo = (fileType?: string | null): boolean => {
    if (!fileType) return false
    return MEDIA_TYPES.videos.includes(fileType.toLowerCase())
  }

  const isAudio = (fileType?: string | null): boolean => {
    if (!fileType) return false
    return MEDIA_TYPES.audio.includes(fileType.toLowerCase())
  }

  const isViewable = (fileType?: string | null): boolean => {
    if (!fileType) return false
    return MEDIA_TYPES.viewable.includes(fileType.toLowerCase())
  }

  const isMediaFile = (fileType?: string | null): boolean => {
    if (!fileType) return false
    const type = fileType.toLowerCase()
    return [...MEDIA_TYPES.images, ...MEDIA_TYPES.videos, ...MEDIA_TYPES.audio].includes(type)
  }

  const getMediaCategory = (fileType?: string | null): 'image' | 'video' | 'audio' | 'other' => {
    if (!fileType) return 'other'
    if (isImage(fileType)) return 'image'
    if (isVideo(fileType)) return 'video'
    if (isAudio(fileType)) return 'audio'
    return 'other'
  }

  const formatFileSize = (bytes: number | string | undefined): string => {
    if (!bytes) return 'Unknown size'
    const size = typeof bytes === 'string' ? parseInt(bytes) : bytes
    if (size === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(size) / Math.log(k))
    return parseFloat((size / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'Unknown date'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateLong = (date: Date | string | undefined): string => {
    if (!date) return 'Unknown date'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return {
    MEDIA_TYPES,
    isImage,
    isVideo,
    isAudio,
    isViewable,
    isMediaFile,
    getMediaCategory,
    formatFileSize,
    formatDate,
    formatDateLong
  }
} 