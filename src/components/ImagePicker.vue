<template>
  <div class="space-y-4">
    <!-- Tabs -->
    <div class="flex gap-2 border-b border-gray-200 dark:border-gray-700">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="activeTab = tab.value"
        :class="[
          'px-4 py-2 text-sm font-medium transition-colors border-b-2',
          activeTab === tab.value
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        ]"
      >
        <component :is="tab.icon" class="h-4 w-4 inline mr-2" />
        {{ tab.label }}
      </button>
    </div>

    <!-- URL Tab -->
    <div v-if="activeTab === 'url'" class="space-y-2">
      <label class="text-sm font-medium text-gray-900 dark:text-gray-100">Image URL</label>
      <input
        v-model="urlInput"
        type="url"
        placeholder="https://example.com/image.jpg"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        @keyup.enter="handleSubmit"
      />
    </div>

    <!-- Upload Tab -->
    <div v-if="activeTab === 'upload'" class="space-y-2">
      <label class="text-sm font-medium text-gray-900 dark:text-gray-100">Upload Image</label>
      <div
        @click="triggerFileInput"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        :class="[
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        ]"
      >
        <Upload class="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Click to upload or drag and drop
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
          PNG, JPG, GIF up to 10MB
        </p>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileSelect"
      />
      <div v-if="uploadPreview" class="mt-4">
        <img :src="uploadPreview" alt="Preview" class="max-h-48 mx-auto rounded-lg border border-gray-300 dark:border-gray-600" />
      </div>
    </div>

    <!-- Library Tab -->
    <div v-if="activeTab === 'library'" class="space-y-2">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-gray-900 dark:text-gray-100">Select from Library</label>
        <button
          v-if="selectedLibraryImage"
          @click="selectedLibraryImage = null"
          class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Clear selection
        </button>
      </div>
      
      <!-- Search -->
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search images..."
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
      />

      <!-- Image Grid -->
      <div class="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
        <div v-if="isLoading" class="text-center py-8 text-gray-500">
          Loading images...
        </div>
        <div v-else-if="filteredImages.length === 0" class="text-center py-8 text-gray-500">
          No images found
        </div>
        <div v-else class="grid grid-cols-3 gap-2">
          <button
            v-for="image in filteredImages"
            :key="image.id"
            @click="selectedLibraryImage = image"
            :class="[
              'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
              selectedLibraryImage?.id === image.id
                ? 'border-blue-500 ring-2 ring-blue-500'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            ]"
          >
            <img
              :src="image.file_url"
              :alt="image.title"
              class="w-full h-full object-cover"
            />
            <div
              v-if="selectedLibraryImage?.id === image.id"
              class="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center"
            >
              <Check class="h-8 w-8 text-white" />
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2 pt-2">
      <button
        @click="$emit('cancel')"
        class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        Cancel
      </button>
      <button
        @click="handleSubmit"
        :disabled="!canSubmit"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        {{ submitLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Link, Upload, ImageIcon, Check } from 'lucide-vue-next';
import { useFileStore } from '@/store/files';
import type { FileData } from '@/types';

const props = defineProps<{
  initialUrl?: string;
  submitLabel?: string;
}>();

const emit = defineEmits<{
  submit: [url: string];
  cancel: [];
}>();

type TabValue = 'url' | 'upload' | 'library';

const tabs = [
  { value: 'url' as TabValue, label: 'URL', icon: Link },
  { value: 'upload' as TabValue, label: 'Upload', icon: Upload },
  { value: 'library' as TabValue, label: 'Library', icon: ImageIcon },
];

const fileStore = useFileStore();

const activeTab = ref<TabValue>('url');
const urlInput = ref(props.initialUrl || '');
const uploadPreview = ref('');
const selectedLibraryImage = ref<FileData | null>(null);
const searchQuery = ref('');
const isDragging = ref(false);
const isLoading = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const libraryImages = computed(() => {
  return fileStore.allFiles.filter(file => {
    if (file.is_folder) return false;
    const type = file.file_type?.toLowerCase() || '';
    return type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(type);
  });
});

const filteredImages = computed(() => {
  if (!searchQuery.value.trim()) return libraryImages.value;
  const query = searchQuery.value.toLowerCase();
  return libraryImages.value.filter(img =>
    img.title?.toLowerCase().includes(query)
  );
});

const canSubmit = computed(() => {
  if (activeTab.value === 'url') return !!urlInput.value.trim();
  if (activeTab.value === 'upload') return !!uploadPreview.value;
  if (activeTab.value === 'library') return !!selectedLibraryImage.value;
  return false;
});

function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFileSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    processFile(file);
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false;
  const file = event.dataTransfer?.files[0];
  if (file && file.type.startsWith('image/')) {
    processFile(file);
  }
}

function processFile(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadPreview.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

function handleSubmit() {
  if (!canSubmit.value) return;

  if (activeTab.value === 'url') {
    emit('submit', urlInput.value.trim());
  } else if (activeTab.value === 'upload') {
    emit('submit', uploadPreview.value);
  } else if (activeTab.value === 'library' && selectedLibraryImage.value) {
    emit('submit', selectedLibraryImage.value.file_url || '');
  }
}

onMounted(async () => {
  isLoading.value = true;
  try {
    await fileStore.loadMediaFiles();
  } catch (error) {
    console.error('Failed to load media files:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>
