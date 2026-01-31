<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Insert Image</DialogTitle>
        <DialogDescription>
          Upload a new image or browse your existing media library to add images to your slide.
        </DialogDescription>
      </DialogHeader>
      
      <div class="flex flex-col gap-3">
        <!-- Tab Navigation -->
        <div class="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            class="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors"
            :class="activeTab === 'upload' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'"
            @click="activeTab = 'upload'"
          >
            <Upload class="w-4 h-4" />
            Upload Image
          </button>
          <button
            class="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors"
            :class="activeTab === 'browse' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'"
            @click="activeTab = 'browse'"
          >
            <FolderOpen class="w-4 h-4" />
            Browse Media
          </button>
        </div>

        <!-- Upload Tab Content -->
        <div v-if="activeTab === 'upload'" class="space-y-4">
          <div
            class="border-2 border-dashed border-muted rounded-xl p-6 text-center transition-all duration-300 cursor-pointer hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/50"
            :class="{ 'border-primary-500 bg-primary-50 dark:bg-primary-950': isDragging }"
            @dragenter.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @dragover.prevent
            @drop.prevent="onDrop"
            @click="selectFile"
          >
            <UploadCloud class="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
            <p class="text-sm text-muted-foreground mb-3">
              Drag and drop an image here, or click to select
            </p>
            <Button variant="outline" size="sm">
              Select Image
            </Button>
            
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onFileInputChange"
            />
          </div>
        </div>

        <!-- Browse Tab Content -->
        <div v-if="activeTab === 'browse'" class="space-y-4">
          <div class="text-center py-8">
            <FolderOpen class="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p class="text-sm text-muted-foreground mb-4">
              Browse your existing media files to select an image
            </p>
            <Button @click="openFilePicker">
              <FolderOpen class="w-4 h-4 mr-2" />
              Open Media Library
            </Button>
          </div>
        </div>
      </div>

      <!-- File Preview -->
      <div v-if="selectedFile" class="mt-4">
        <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <img
              v-if="previewUrl"
              :src="previewUrl"
              class="w-full h-full object-cover rounded-lg"
            />
            <ImageIcon v-else class="w-6 h-6 text-muted-foreground" />
          </div>
          <div class="flex-grow min-w-0">
            <p class="text-sm font-medium truncate">{{ selectedFile.name }}</p>
            <p class="text-xs text-muted-foreground">
              {{ formatFileSize(selectedFile.size) }}
              <span v-if="errorMessage" class="ml-2 text-red-500">{{ errorMessage }}</span>
            </p>
            <!-- Progress Bar -->
            <div v-if="uploadProgress > 0 && uploadProgress < 100" class="w-full bg-muted rounded-full h-1.5 mt-2">
              <div
                class="bg-primary h-1.5 rounded-full transition-all duration-300 ease-in-out"
                :style="{ width: `${uploadProgress}%` }"
              ></div>
            </div>
          </div>
          <Button
            v-if="!isUploading"
            variant="ghost"
            size="sm"
            @click="removeFile"
          >
            <X class="w-4 h-4" />
          </Button>
        </div>
      </div>

      <!-- Alt Text Input -->
      <div v-if="selectedFile && !isUploading" class="mt-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Alt Text (optional)
        </label>
        <Input
          v-model="altText"
          placeholder="Describe the image for accessibility"
          class="w-full"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">
          Cancel
        </Button>
        <Button 
          v-if="activeTab === 'upload'"
          @click="handleUpload" 
          :disabled="!selectedFile || isUploading"
        >
          {{ isUploading ? 'Uploading...' : 'Upload' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadCloud, X, Image as ImageIcon, Upload, FolderOpen } from 'lucide-vue-next';
import { uploadImageToSlidesMedia, generateImageMarkdown } from '@/utils/slidesMediaUpload';
import { toast } from '@/composables/useToast';

interface Props {
  open: boolean;
}

interface Emits {
  'update:open': [value: boolean];
  'insert': [markdown: string];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string>('');
const altText = ref<string>('');
const isDragging = ref(false);
const isUploading = ref(false);
const uploadProgress = ref(0);
const errorMessage = ref('');
const activeTab = ref<'upload' | 'browse'>('upload');

const selectFile = () => {
  if (fileInput.value) {
    fileInput.value.value = '';
    fileInput.value.click();
  }
};

const onFileInputChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    handleFileSelect(file);
  }
};

const onDrop = (e: DragEvent) => {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) {
    handleFileSelect(file);
  } else if (file) {
    errorMessage.value = 'Please select an image file';
  }
};

const handleFileSelect = (file: File) => {
  // Reset error
  errorMessage.value = '';
  
  // Validate file exists and has content
  if (!file || file.size === 0) {
    errorMessage.value = 'File is empty or invalid';
    return;
  }
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    errorMessage.value = 'Please select an image file';
    return;
  }

  // Validate file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    errorMessage.value = 'Image size must be less than 10MB';
    return;
  }

  // Validate file name
  if (!file.name || file.name.trim().length === 0) {
    errorMessage.value = 'File name is invalid';
    return;
  }

  selectedFile.value = file;
  altText.value = file.name.split('.')[0]; // Use filename as default alt text
  
  // Create preview
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  
  try {
    previewUrl.value = URL.createObjectURL(file);
  } catch (error) {
    console.error('Failed to create preview URL:', error);
    errorMessage.value = 'Failed to create image preview';
    // Still allow the file selection even if preview fails
  }
};

const removeFile = () => {
  selectedFile.value = null;
  altText.value = '';
  errorMessage.value = '';
  uploadProgress.value = 0;
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
};

const handleUpload = async () => {
  if (!selectedFile.value) return;

  isUploading.value = true;
  uploadProgress.value = 0;
  errorMessage.value = '';

  try {
    const uploadedFile = await uploadImageToSlidesMedia(
      selectedFile.value,
      (progress) => {
        uploadProgress.value = progress;
      }
    );

    if (uploadedFile) {
      // Generate markdown and emit insert event
      const markdown = generateImageMarkdown(uploadedFile, altText.value);
      emit('insert', markdown);
      
      // Close dialog
      emit('update:open', false);
      
      // Reset state
      removeFile();
      
      toast.success('Image uploaded successfully');
    } else {
      errorMessage.value = 'Failed to upload image';
    }
  } catch (error) {
    console.error('Upload error:', error);
    errorMessage.value = 'Upload failed. Please try again.';
  } finally {
    isUploading.value = false;
  }
};

// Utility function
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Cleanup preview URL on unmount
// Generate unique picker ID for this instance
const pickerId = `slides-image-picker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
let filePickerTimeout: NodeJS.Timeout | null = null;

const openFilePicker = () => {
  // Clear any existing timeout
  if (filePickerTimeout) {
    clearTimeout(filePickerTimeout);
  }
  
  // Open FilePicker in a new window with media filter
  const url = `/file-picker?filter=media&pickerId=${pickerId}`;
  const windowFeatures = 'width=900,height=700,scrollbars=yes,resizable=yes';
  
  try {
    const newWindow = window.open(url, '_blank', windowFeatures);
    
    // Check if window opened successfully (popup blocker might block it)
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      toast.error('Popup blocked. Please allow popups for this site to browse media.');
      return;
    }
    
    // Set a timeout to detect if the FilePicker doesn't respond (e.g., user closes it without selection)
    filePickerTimeout = setTimeout(() => {
      toast.info('Media library selection timed out. You can try again.');
      filePickerTimeout = null;
    }, 300000); // 5 minutes timeout
    
  } catch (error) {
    console.error('Failed to open FilePicker:', error);
    toast.error('Failed to open media library. Please try again.');
  }
};

// Handle message from FilePicker
const handleFilePickerMessage = (event: MessageEvent) => {
  const data = event.data;
  
  // Verify this message is for our picker instance
  if (data.pickerId !== pickerId) return;
  
  // Clear the timeout since we got a response
  if (filePickerTimeout) {
    clearTimeout(filePickerTimeout);
    filePickerTimeout = null;
  }
  
  if (data.type === 'file-selected' && data.files && data.files.length > 0) {
    const selectedFile = data.files[0]; // Take first selected file
    
    // Verify it's an image by checking file_type
    const isImage = selectedFile.file_type?.toLowerCase().startsWith('image/') ||
                   ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(
                     selectedFile.file_type?.toLowerCase() || ''
                   );
    
    if (!isImage) {
      toast.error('Selected file is not a valid image');
      return;
    }
    
    // Verify it has a URL
    if (!selectedFile.file_public_url && !selectedFile.file_url) {
      toast.error('Selected image does not have a valid URL');
      return;
    }
    
    // Generate markdown and emit insert event
    const markdown = generateImageMarkdown(selectedFile, altText.value || selectedFile.title);
    emit('insert', markdown);
    
    // Close dialog
    emit('update:open', false);
    
    // Reset state
    removeFile();
    
    toast.success('Image selected from media library');
  } else if (data.type === 'file-selection-cancelled') {
    // User cancelled selection - no action needed
    console.log('File selection cancelled');
  }
};

onMounted(() => {
  // Add message listener for FilePicker responses
  window.addEventListener('message', handleFilePickerMessage);
});

onUnmounted(() => {
  // Remove message listener to prevent memory leaks
  window.removeEventListener('message', handleFilePickerMessage);
  
  // Clear FilePicker timeout
  if (filePickerTimeout) {
    clearTimeout(filePickerTimeout);
    filePickerTimeout = null;
  }
  
  // Cleanup preview URL to prevent memory leaks
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
  
  // Clear any ongoing upload references
  selectedFile.value = null;
});
</script>
