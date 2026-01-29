<template>
  <!-- Render MobileFileItem on mobile devices -->
  <MobileFileItem
    v-if="isTouchDevice"
    :file="file"
    :view-mode="viewMode"
    :is-selected="isSelected"
    :is-touch-device="isTouchDevice"
    @select-file="$emit('select-file', $event)"
    @open-file="$emit('open-file', $event)"
    @update-file="$emit('update-file', $event)"
    @delete-file="$emit('delete-file', $event)"
    @contextmenu-file="$emit('contextmenu-file', $event)"
    @swipe-left="handleSwipeLeft"
    @swipe-right="handleSwipeRight"
  />
  
  <!-- Render desktop FileItem on non-mobile devices -->
  <div
    v-else
    :id="`fileItem-${file.id}`"
    :class="['file-item', fileItemClass, { 'drop-target': isDropTarget }]"
    @click="handleClick"
    @dblclick="openFile"
    @contextmenu.prevent.stop="handleContextMenu"
    :draggable="!isRenaming"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @mouseenter="showCheckbox = true"
    @mouseleave="showCheckbox = false"
    ref="fileItemRef"
  >
    <!-- Thumbnail View -->
    <div v-if="viewMode === 'thumbnail'" class="thumbnail-wrapper">
      <!-- Selection Checkbox -->
      <div
        v-if="showCheckbox || isSelected"
        class="absolute top-3 left-3 z-10 w-6 h-6 rounded-sm border transition-all duration-200 flex items-center justify-center cursor-pointer backdrop-blur-sm"
        :class="[
          isSelected
            ? 'border-primary-500 dark:bg-white'
            : 'bg-white/80 border-gray-300 hover:border-primary-400',
        ]"
        @click.stop="$emit('select-file', file.id, $event)"
      >
        <CheckIcon v-if="isSelected" class="w-4 h-4 text-primary-500" />
      </div>

      <!-- File Type Badge -->
      <div
        v-if="!file.is_folder && file.file_type"
        class="absolute top-3 right-3 z-10 px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm bg-black/20 text-white"
      >
        {{ file.file_type.toUpperCase() }}
      </div>

      <!-- Menu Button (Bottom Right) -->
      <div class="absolute bottom-3 right-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              class="bg-white/90 hover:bg-white text-gray-800 backdrop-blur-sm rounded-sm"
              @click.stop
            >
              <Settings class="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem @click="openFile">{{$t('Commons.button.open')}}</DropdownMenuItem>
            <DropdownMenuItem @click="startRenaming">{{$t('Commons.button.rename')}}</DropdownMenuItem>
            <DropdownMenuItem @click="deleteFile">{{$t('Commons.button.delete')}}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <!-- Thumbnail Preview Area -->
      <div
        class="aspect-[4/3] flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800"
      >
        <!-- Renaming Input -->
        <div v-if="isRenaming" class="absolute inset-4 flex items-center justify-center">
          <Input
            v-model="newTitle"
            @keyup.enter="finishRenaming"
            @blur="finishRenaming"
            class="text-center text-sm"
            ref="renameInput"
            :disabled="isLoading"
          />
        </div>

        <!-- Media Preview or File Icon -->
        <div v-else class="w-full h-full flex items-center justify-center">
          <!-- Image Preview -->
          <img
            v-if="isImageFile && getMediaUrl"
            :src="getMediaUrl"
            :alt="file.title"
            class="w-full h-full object-cover"
            @error="handleImageError"
            @load="console.log('Image loaded:', getMediaUrl)"
          />
          
          <!-- Video Preview -->
          <video
            v-else-if="isVideoFile && getMediaUrl"
            :src="getMediaUrl"
            class="w-full h-full object-cover"
            muted
            preload="metadata"
          >
          </video>

          <!-- File Icon for non-media files or files without URL -->
          <div v-else class="flex flex-col items-center justify-center p-6">
            <FileIcon
              :fileType="fileType"
              :fileData="file"
              class="w-16 h-16 mb-2 text-gray-400 dark:text-gray-500"
            />
            <span
              v-if="formattedFileSize"
              class="text-xs text-gray-500 dark:text-gray-400 font-medium"
            >
              {{ formattedFileSize }}
            </span>
          </div>
        </div>

        <!-- Loading Overlay -->
        <div
          v-if="isLoading"
          class="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center backdrop-blur-sm"
        >
          <Loader class="w-6 h-6 animate-spin text-primary-500" />
        </div>
      </div>

      <!-- File Info Section -->
      <div class="p-4">
        <div v-if="isRenaming" class="flex items-center space-x-2">
          <span
            class="text-xs font-medium text-amber-600 dark:text-amber-400 flex-shrink-0"
          >
            Renaming...
          </span>
          <Loader v-if="isLoading" class="w-3 h-3 animate-spin text-amber-500" />
        </div>

        <div v-else>
          <!-- File Title -->
          <h3
            class="font-semibold text-sm mb-1 line-clamp-2 text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200"
          >
            {{ file.title }}
          </h3>

          <!-- File Metadata -->
          <div
            class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"
          >
            <span v-if="formattedDate">{{ formattedDate }}</span>
            <span v-if="file.is_folder" class="font-medium">{{$t('Commons.text.folder')}}</span>
          </div>
        </div>
      </div>

      <!-- Progress indicator -->
      <div
        v-if="isLoading && !isRenaming"
        class="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 overflow-hidden"
      >
        <div class="h-full bg-primary-500 animate-pulse"></div>
      </div>
    </div>

    <!-- Grid View -->
    <div v-else-if="viewMode === 'grid'" class="file-item-wrapper">
      <div v-show="isRenaming" class="w-full flex items-center">
        <Input
          v-model="newTitle"
          @keyup.enter="finishRenaming"
          @blur="finishRenaming"
          ref="renameInput"
          class="w-full"
        />
        <span
          v-if="!isLoading"
          class="ml-2 px-2 py-0.5 text-[10px] font-medium rounded border bg-amber-50 text-amber-700 border-amber-200"
          >Renaming…</span
        >
        <Loader
          v-if="isLoading"
          class="h-4 w-4 animate-spin text-gray-600 dark:text-gray-300 ml-2"
        />
      </div>

      <div class="flex items-center gap-4" v-show="!isRenaming">
        <!-- File Icon and Title/Date Section -->
        <div
          v-if="showCheckbox || isSelected"
          class="w-5 h-5 z-10 bg-white border border-gray-300 dark:border-primary-400 rounded-sm flex items-center justify-center transition-all duration-200 cursor-pointer"
          @click.stop="$emit('select-file', file.id, $event)"
        >
          <CheckIcon v-if="isSelected" class="w-3 h-3 text-primary-600" />
        </div>

        <div class="relative">
          <FileIcon
            :fileType="fileType"
            :fileData="file"
            class="w-12 h-12 text-gray-600 dark:text-gray-300"
          />
        </div>
        <div class="flex flex-col flex-grow">
          <h3 class="text-sm font-medium truncate text-gray-800">{{ file.title }}</h3>
          <p class="text-xs text-gray-500">{{ formattedDate }}</p>
        </div>
      </div>

      <!-- File Type Ribbon (Top Right) -->
      <div
        v-if="!file.is_folder"
        class="absolute top-2 right-2 bg-slate-500 text-white text-xs px-2 py-0.5 rounded-lg shadow"
      >
        {{ file.file_type?.toUpperCase() }}
      </div>
    </div>

    <!-- List View (Full Width Rectangular Cards) -->
    <div v-else class="list-view-card">
      <!-- Selection Checkbox -->
      <div
        v-if="showCheckbox || isSelected"
        class="w-5 h-5 rounded-sm border flex items-center justify-center transition-all duration-200 cursor-pointer flex-shrink-0"
        :class="[
          isSelected
            ? 'bg-white border-primary-500'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400',
        ]"
        @click.stop="$emit('select-file', file.id, $event)"
      >
        <CheckIcon v-if="isSelected" class="w-3 h-3 text-primary-500" />
      </div>

      <!-- File Icon -->
      <div class="flex-shrink-0">
        <FileIcon
          :fileType="fileType"
          :fileData="file"
          class="w-8 h-8 text-gray-500 dark:text-gray-300"
        />
      </div>

      <!-- File Content Section -->
      <div class="flex-grow min-w-0">
        <div v-show="isRenaming" class="w-full flex items-center">
          <Input
            v-model="newTitle"
            @keyup.enter="finishRenaming"
            @blur="finishRenaming"
            ref="renameInput"
            class="w-full"
          />
          <span
            v-if="!isLoading"
            class="ml-3 px-2 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap"
            >Renaming…</span
          >
          <Loader
            v-if="isLoading"
            class="h-4 w-4 animate-spin text-gray-600 ml-3 flex-shrink-0"
          />
        </div>
        <div v-if="!isRenaming" class="grid grid-cols-12 gap-4 items-center w-full">
          <!-- Title and Date - 5 columns -->
          <div class="col-span-5 min-w-0">
            <h3
              class="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate mb-1"
            >
              {{ file.title }}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ formattedDate }}</p>
          </div>

          <!-- File Type Badge - 2 columns -->
          <div class="col-span-2 flex justify-center">
            <span
              v-if="!file.is_folder && file.file_type"
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
            >
              {{ file.file_type.toUpperCase() }}
            </span>
            <span
              v-else-if="file.is_folder"
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
            >
              FOLDER
            </span>
          </div>

          <!-- File Size - 3 columns -->
          <div class="col-span-3 flex justify-center">
            <span
              v-if="formattedFileSize"
              class="text-sm text-gray-600 dark:text-gray-400 font-medium"
            >
              {{ formattedFileSize }}
            </span>
            <span v-else class="text-sm text-gray-400 dark:text-gray-500"> -- </span>
          </div>

          <!-- Actions - 2 columns -->
          <div class="col-span-2 flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
                  <Settings v-if="!isLoading" class="h-4 w-4 text-gray-600" />
                  <Loader v-else class="h-4 w-4 animate-spin text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem @click="openFile">{{$t('Commons.button.open')}}</DropdownMenuItem>
                <DropdownMenuItem @click="startRenaming">{{$t('Commons.button.rename')}}</DropdownMenuItem>
                <DropdownMenuItem @click="deleteFile">{{$t('Commons.button.delete')}}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, PropType, onMounted } from "vue";
import { Settings, Loader, CheckIcon } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import FileIcon from "./FileIcon.vue";
import MobileFileItem from "./home/MobileFileItem.vue";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useFileStore } from "@/store/files";
import { FileData } from "@/types";

const props = defineProps({
  file: {
    type: Object as PropType<FileData>,
    required: true,
  },
  viewMode: {
    type: String as PropType<"list" | "grid" | "thumbnail">,
    required: true,
  },
  isSelected: Boolean,
  depth: {
    type: Number,
    default: 0,
  },
});

const isDropTarget = ref(false);
const showCheckbox = ref(false);

const emit = defineEmits([
  "select-file",
  "open-file",
  "update-file",
  "delete-file",
  "contextmenu-file",
]);

const fileStore = useFileStore();

const isRenaming = ref(false);
const newTitle = ref(props.file.title);
const isLoading = ref(false);
const fileItemRef = ref<HTMLDivElement | null>(null);
const renameInput = ref<HTMLInputElement | null>(null);

const fileType = computed(() =>
  props.file.is_folder ? "folder" : props.file.file_type || ""
);

// File size formatting
const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  if (i === 0) return `${bytes} B`;
  
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(size < 10 ? 1 : 0)} ${sizes[i]}`;
};

const formattedFileSize = computed(() => {
  // Handle if file_size is already a string (like "2.5MB")
  if (typeof props.file.file_size === 'string') {
    return props.file.file_size;
  }
  // Handle if file_size is a number (bytes)
  if (typeof props.file.file_size === 'number') {
    return formatFileSize(props.file.file_size);
  }
  return null;
});

// Media detection computed properties - using only known FileData properties
const isImageFile = computed(() => {
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const fileExt = props.file.file_type?.toLowerCase();
  
  return imageTypes.includes(fileExt || '');
});

const isVideoFile = computed(() => {
  const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
  const fileExt = props.file.file_type?.toLowerCase();
  
  return videoTypes.includes(fileExt || '');
});

// Get the media URL - use available URL properties in order of preference
const getMediaUrl = computed(() => {
  // Use public URL first, then file URL, then download URL
  return props.file.file_public_url || props.file.file_url || props.file.download_url || null;
});

// Mobile detection - check for touch capability
const isTouchDevice = computed(() => {
  const touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  console.log('FileItem isTouchDevice:', touchDevice, 'file:', props.file.title);
  return touchDevice;
});

const fileItemClass = computed(() => {
  const baseClass = 'transition-all duration-200 cursor-pointer';
  const selectedClass = props.isSelected
    ? "ring-2 ring-primary-400 bg-primary-50 dark:bg-primary-900/20"
    : "hover:bg-gray-50 dark:hover:bg-gray-700";
  const dropTargetClass = props.file.is_folder ? "drop-zone" : "";

  switch (props.viewMode) {
    case "thumbnail":
      return `${baseClass} ${dropTargetClass} relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:scale-105 hover:shadow-xl ${
        props.isSelected
          ? "ring-1 ring-primary-400 shadow-lg scale-105"
          : "hover:shadow-md"
      }`;
    case "grid":
      return `${baseClass} ${selectedClass} ${dropTargetClass} w-full rounded-md m-2 flex flex-col p-1`;
    default:
      // list view
      return `${baseClass} ${selectedClass} ${dropTargetClass} w-full`;
  }
});

const formattedDate = computed(() => {
  if (!props.file.created_at) return "N/A";
  return new Date(props.file.created_at as any).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
});

const handleImageError = (event: Event) => {
  // Hide the image if it fails to load
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
};

const handleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  // If currently renaming, ignore clicks to avoid unintended actions
  if (isRenaming.value) return;
  // If clicking on checkbox, toggle selection only
  if (target.closest(".w-5.h-5, .w-4.h-4, .w-6.h-6")) {
    emit("select-file", props.file.id, event);
    return;
  }
  // Only handle left-clicks; right/middle clicks are ignored here and handled elsewhere
  if (event.button !== 0) return;
  // Ignore clicks on buttons/inputs within the item
  if (target.closest("button, input")) return;
  // Always perform selection on single click. Parent will manage multi-select via modifiers.
  emit("select-file", props.file.id, event);
};

const handleContextMenu = (event: MouseEvent) => {
  console.log('FileItem handleContextMenu called for file:', props.file.title)
  // Emit context menu event with file ID and position
  emit('contextmenu-file', {
    id: props.file.id,
    x: event.clientX,
    y: event.clientY,
  })
  
  // Also select the file if it's not already selected
  if (!props.isSelected) {
    emit('select-file', props.file.id, event)
  }
  
  event.preventDefault()
};

const openFile = () => {
  // Prevent opening while renaming
  if (isRenaming.value) return;
  emit("open-file", props.file.id);
};

const onDragOver = (event: DragEvent) => {
  if (isRenaming.value) return;
  if (props.file.is_folder) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = "move";
    isDropTarget.value = true;
  }
};

const onDragLeave = () => {
  isDropTarget.value = false;
};

const onDrop = async (event: DragEvent) => {
  event.preventDefault();
  isDropTarget.value = false;

  if (isRenaming.value) return;
  if (!props.file.is_folder) return;

  const droppedFileId = event.dataTransfer!.getData("text/plain");
  if (!droppedFileId || droppedFileId === props.file.id) return;

  isLoading.value = true;
  try {
    if (props.file.id) {
      await fileStore.moveFile(droppedFileId, props.file.id);
      emit("update-file", droppedFileId);
    }
  } catch (error) {
    console.error("Error moving file:", error);
  } finally {
    isLoading.value = false;
  }
};

const startRenaming = () => {
  isRenaming.value = true;
  newTitle.value = props.file.title;
  nextTick(() => {
    renameInput.value?.focus?.();
    renameInput.value?.select?.();
  });
};

const finishRenaming = async () => {
  if (newTitle.value && newTitle.value !== props.file.title) {
    isLoading.value = true;
    try {
      if (props.file.id) {
        const updatedFile = await fileStore.renameItem(props.file.id, newTitle.value);
        emit("update-file", updatedFile);
      }
    } catch (error) {
      console.error("Error renaming file:", error);
    } finally {
      isLoading.value = false;
    }
  }
  isRenaming.value = false;
};

const deleteFile = async () => {
  isLoading.value = true;
  try {
    if (!props.file.id) return;
    await fileStore.moveToTrash(props.file.id);
    emit("delete-file", props.file.id);
  } catch (error) {
    console.error("Error deleting file:", error);
  } finally {
    isLoading.value = false;
  }
};

const onDragStart = (event: DragEvent) => {
  if (isRenaming.value) return;
  if (event.dataTransfer && props.file.id) {
    event.dataTransfer?.setData("text/plain", props.file.id);
    event.dataTransfer.effectAllowed = "move";
    if (fileItemRef.value) fileItemRef.value.style.opacity = "0.5";
  }
};

const onDragEnd = () => {
  if (isRenaming.value) return;
  if (fileItemRef.value) fileItemRef.value.style.opacity = "1";
};

// Swipe handlers for mobile touch devices
const handleSwipeLeft = (file: FileData) => {
  console.log('Swipe left detected for file:', file.title);
  // Swipe left typically triggers delete action
  deleteFile();
};

const handleSwipeRight = (file: FileData) => {
  console.log('Swipe right detected for file:', file.title);
  // Swipe right typically triggers open/share action
  openFile();
};

onMounted(() => {
  if (fileItemRef.value) {
    fileItemRef.value.addEventListener("start-rename", startRenaming);
  }
});
</script>

<style scoped>
.drop-zone {
  position: relative;
}

.drop-zone::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(59, 130, 246, 0.1);
  border: 2px dashed #3b82f6;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
}

.drop-target::after {
  opacity: 1;
}

/* Thumbnail View Styles */
.thumbnail-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 0.75rem;
  overflow: hidden;
}

/* Grid View Styles */
.file-item-wrapper {
  position: relative;
  width: 100%;
  padding: 1rem;
  border: 1px solid #d1d5db;
  background-color: white;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

/* List View Styles - Full Width Rectangular Cards */
.list-view-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  width: 100%;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease-in-out;
  margin-bottom: 0.5rem;
}

/* Dark mode styles for list view cards */
.dark .list-view-card {
  background-color: #1f2937;
  border-color: #374151;
}

.list-view-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

/* Utility Classes */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Hover Effects */
.hover\:shadow-lg:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* Custom animations */
@keyframes subtle-bounce {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

.group:hover .thumbnail-wrapper {
  animation: subtle-bounce 0.3s ease-in-out;
}
</style>