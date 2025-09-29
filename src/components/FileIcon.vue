<script setup lang="ts">
import { computed, defineProps, useAttrs, ref } from 'vue';
import * as defaultIcons from '@iconify-prerendered/vue-file-icons';
import { Folder, Music, Archive, FileAudio } from 'lucide-vue-next';
import type { FileData } from '@/types';

// Props definition
const props = defineProps<{
  fileType?: string | null;
  fileData?: FileData; // Optional: full file data for preview capabilities
}>();

// Attributes from parent component
const attrs = useAttrs();

// State for image loading
const imageLoadError = ref(false);
const imageLoading = ref(false);

// Check if this is an image file that can be previewed
const isImageFile = computed(() => {
  if (!props.fileType) return false;
  const imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];
  return imageTypes.includes(props.fileType.toLowerCase());
});

// Check if this is a video file that might have a thumbnail
const isVideoFile = computed(() => {
  if (!props.fileType) return false;
  const videoTypes = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
  return videoTypes.includes(props.fileType.toLowerCase());
});

// Check if we should show media preview (image or video thumbnail)
const shouldShowMediaPreview = computed(() => {
  return (isImageFile.value || isVideoFile.value) && 
         props.fileData?.file_url && 
         !imageLoadError.value;
});

// Icon component mapping
const iconComponents: Record<string, any> = {
  // Office documents
  'xlsx': defaultIcons.IconMicrosoftExcel,
  'docx': defaultIcons.IconMicrosoftWord,
  'pptx': defaultIcons.IconMicrosoftPowerpoint,
  'pdf': defaultIcons.IconAdobeAcrobat,
  
  // Images
  'png': defaultIcons.IconImage,
  'jpg': defaultIcons.IconImage,
  'jpeg': defaultIcons.IconImage,
  'gif': defaultIcons.IconImage,
  'webp': defaultIcons.IconImage,
  'svg': defaultIcons.IconImage,
  'bmp': defaultIcons.IconImage,
  
  // Videos
  'mp4': defaultIcons.IconVideo,
  'webm': defaultIcons.IconVideo,
  'ogg': defaultIcons.IconVideo,
  'avi': defaultIcons.IconVideo,
  'mov': defaultIcons.IconVideo,
  'wmv': defaultIcons.IconVideo,
  'flv': defaultIcons.IconVideo,
  'mkv': defaultIcons.IconMatroska,
  
  // Audio - use default file icon as fallback
  'mp3': Music,
  'wav': FileAudio,
  'aac': Music,
  'flac': Music,
  'm4a': FileAudio,
  'wma': Music,
  
  // Archives - use default file icon as fallback
  'zip': Archive,
  'rar': Archive,
  '7z': Archive,
  'tar': Archive,
  'gz': Archive,
  
  // Code
  'js': defaultIcons.IconEjs,
  'ts': defaultIcons.IconTypescript,
  'html': defaultIcons.IconFthtml,
  'css': defaultIcons.IconStylable,
  'json': defaultIcons.IconJson1,
  'xml': defaultIcons.IconTxl,
  'txt': defaultIcons.IconLex,
  
  // Special
  'folder': Folder,
  null: Folder,
};

const iconComponent = computed(() => {
  const fileType = props.fileType;
  const icon = iconComponents[fileType || ""] || defaultIcons.IconDefault;
  
  // Debug logging for unexpected file types (only for development)
  if (import.meta.env.DEV && fileType && !iconComponents[fileType] && fileType !== 'folder') {
    console.warn(`FileIcon: Unknown file type "${fileType}"`);
  }
  
  return icon;
});

// Define color using inline styles for all cases
const iconStyle = computed(() => {
  switch (props.fileType) {
    // Office documents
    case "xlsx":
      return { color: '#10b981' }; // Green for Excel
    case "docx":
      return { color: '#3b82f6' }; // Blue for Word
    case "pptx":
      return { color: '#f59e0b' }; // Orange for PowerPoint
    case "pdf":
      return { color: '#ef4444' }; // Red for PDF
    
    // Images
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "svg":
    case "bmp":
      return { color: '#6b7280' }; // Gray for images
    
    // Videos
    case "mp4":
    case "webm":
    case "ogg":
    case "avi":
    case "mov":
    case "wmv":
    case "flv":
    case "mkv":
      return { color: '#8b5cf6' }; // Violet for videos
    
    // Audio
    case "mp3":
    case "wav":
    case "aac":
    case "flac":
    case "m4a":
    case "wma":
      return { color: '#ec4899' }; // Pink for audio
    
    // Archives
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return { color: '#f97316' }; // Orange for archives
    
    // Code files
    case "js":
    case "ts":
    case "html":
    case "css":
    case "json":
    case "xml":
    case "txt":
      return { color: '#14b8a6' }; // Teal for code
    
    // Special
    case "folder":
    case null:
      return { color: '#47484b' }; // Custom color for folders
    
    default:
      return { color: '#64748b' }; // Slate for unknown types
  }
});

// Icon class for size - extract from attrs or use default
const iconClass = computed(() => {
  // Extract size class from attrs if provided, otherwise use default
  const sizeClass = attrs.class as string || 'w-[3rem] h-[3rem]';
  return sizeClass;
});

// Image class for consistent styling
const imageClass = computed(() => {
  return `${iconClass.value} object-cover rounded-md shadow-sm border border-gray-200 hover:border-gray-300 transition-colors`;
});

// Loading overlay class
const loadingOverlayClass = computed(() => {
  return `${iconClass.value} absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md animate-pulse`;
});

// Handle image load error
const handleImageError = () => {
  imageLoadError.value = true;
  imageLoading.value = false;
};

// Handle image load success
const handleImageLoad = () => {
  imageLoading.value = false;
};

// Start loading image
const handleImageStart = () => {
  imageLoading.value = true;
  imageLoadError.value = false;
};
</script>

<template>
  <!-- Media preview for supported image and video files -->
  <div v-if="shouldShowMediaPreview" class="relative inline-block">
    <!-- For images, show the image directly -->
    <img 
      v-if="isImageFile"
      :src="fileData!.file_url" 
      :alt="fileData!.title || 'Image preview'"
      :class="imageClass"
      @error="handleImageError"
      @load="handleImageLoad"
      @loadstart="handleImageStart"
    />
    
    <!-- For videos, show thumbnail with play overlay -->
    <div v-else-if="isVideoFile" class="relative">
      <img 
        :src="fileData!.file_url" 
        :alt="fileData!.title || 'Video thumbnail'"
        :class="imageClass"
        @error="handleImageError"
        @load="handleImageLoad"
        @loadstart="handleImageStart"
      />
      <!-- Video play icon overlay -->
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="bg-black bg-opacity-50 rounded-full p-2">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
          </svg>
        </div>
      </div>
    </div>
    
    <!-- Loading overlay -->
    <div 
      v-if="imageLoading"
      :class="loadingOverlayClass"
    >
      <component 
        :is="isImageFile ? defaultIcons.IconImage : defaultIcons.IconVideo" 
        class="w-6 h-6 text-gray-400" 
      />
    </div>
  </div>

  <!-- Fallback to icon for non-media files or failed media loads -->
  <component 
    v-else
    :is="iconComponent" 
    :class="iconClass" 
    :style="iconStyle" 
    v-bind="attrs" 
  />
</template>

<style scoped>
/* Optional: Additional Apple-inspired typography */
</style>
