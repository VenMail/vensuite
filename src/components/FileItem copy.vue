<template>
  <div
    :id="`fileItem-${file.id}`"
    :class="[fileItemClass, { 'drop-target': isDropTarget }]"
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
    ref="fileItemRef">

    <!-- Grid and Thumbnail Views (DocumentCard Style) -->
    <div v-if="isThumbnailOrGrid" class="document-card group relative">
      <!-- Renaming State -->
      <div v-show="isRenaming" class="absolute inset-0 z-20 bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center">
        <Input v-model="newTitle" @keyup.enter="finishRenaming" @blur="finishRenaming" ref="renameInput"
          class="w-full" />
        <span v-if="!isLoading" class="ml-2 px-2 py-0.5 text-[10px] font-medium rounded border bg-amber-50 text-amber-700 border-amber-200">Renaming…</span>
        <Loader v-if="isLoading" class="h-4 w-4 animate-spin text-gray-600 dark:text-gray-300 ml-2" />
      </div>

      <!-- Selection checkbox (top-left) -->
      <div class="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity" v-show="!isRenaming">
        <input
          type="checkbox"
          :checked="isSelected"
          @click.stop="$emit('select-file', file.id, $event)"
          class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-300 shadow-sm"
        />
      </div>
      
      <!-- Menu button (top-right) -->
      <div class="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity" v-show="!isRenaming">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 shadow-sm"
              @click.stop
            >
              <Settings v-if="!isLoading" class="h-4 w-4" />
              <Loader v-else class="h-4 w-4 animate-spin text-gray-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-48">
            <DropdownMenuItem @click="openFile">
              <FolderOpen class="mr-2 h-4 w-4" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem @click="startRenaming">
              <Edit class="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem @click="deleteFile" class="text-red-600 dark:text-red-400">
              <Trash2 class="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <!-- File Type Ribbon (Top Right) -->
      <div v-if="!file.is_folder && !isRenaming && showFileTypeTags && file.file_type"
        class="absolute top-2 right-2 bg-slate-500 text-white text-xs px-2 py-0.5 rounded-lg shadow z-5">
        {{ file.file_type?.toUpperCase() }}
      </div>
      
      <!-- Document preview/thumbnail -->
      <div class="preview-area h-40 rounded-t-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 relative overflow-hidden">
        <!-- File type icon -->
        <div class="absolute inset-0 flex items-center justify-center">
          <FileIcon
            :fileType="fileType"
            :fileData="file"
            class="h-12 w-12 text-gray-600 dark:text-gray-300 opacity-60"
          />
        </div>
      </div>
      
      <!-- Card content -->
      <div class="p-4">
        <!-- Document title -->
        <h3 class="font-medium text-base mb-2 line-clamp-2 text-gray-900 dark:text-gray-100" :title="file.title">
          {{ file.title || 'Untitled Document' }}
        </h3>
        
        <!-- Metadata -->
        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{{ formattedDate }}</span>
          <span v-if="file.file_size !== undefined">
            {{ formatFileSize(file.file_size) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Tree View and List View -->
    <div v-else class="file-item-other-views">
      <div class="relative flex items-center">
        <FileIcon :fileType="fileType" :fileData="file" class="w-6 h-6 text-gray-500 dark:text-gray-300 mr-4" />
        <div v-if="showCheckbox || isSelected"
          class="absolute bottom-0 right-0 w-4 h-4 bg-white dark:bg-gray-800 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center transition-all duration-200 cursor-pointer"
          @click.stop="$emit('select-file', file.id, $event)">
          <CheckIcon v-if="isSelected" class="w-2.5 h-2.5 text-primary-600" />
        </div>
      </div>
      <div class="flex-grow min-w-0">
        <div v-show="isRenaming" class="w-full flex items-center">
          <Input v-model="newTitle" @keyup.enter="finishRenaming" @blur="finishRenaming" ref="renameInput"
            class="w-full" />
          <span v-if="!isLoading" class="ml-2 px-2 py-0.5 text-[10px] font-medium rounded border bg-amber-50 text-amber-700 border-amber-200">Renaming…</span>
          <Loader v-if="isLoading" class="h-4 w-4 animate-spin text-gray-600 ml-2" />
        </div>
        <template v-if="!isRenaming">
          <h3 class="font-medium text-sm text-gray-800 truncate">{{ file.title }}</h3>
          <p v-if="viewMode !== 'tree'" class="text-xs text-gray-500">{{ formattedDate }}</p>
        </template>
      </div>
      <div v-if="viewMode !== 'tree'" class="flex items-center space-x-2 ml-auto">
        <p v-if="viewMode === 'list'" class="text-sm text-gray-600">{{ formatFileSize(file.file_size) }}</p>
        <Button v-if="!isRenaming" variant="ghost" size="icon">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Settings v-if="!isLoading" class="h-4 w-4 text-gray-600" />
              <Loader v-else class="h-4 w-4 animate-spin text-gray-600" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem @click="openFile">Open</DropdownMenuItem>
              <DropdownMenuItem @click="startRenaming">Rename</DropdownMenuItem>
              <DropdownMenuItem @click="deleteFile">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, PropType, onMounted } from 'vue';
import { Settings, Loader, CheckIcon, FolderOpen, Edit, Trash2 } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import FileIcon from './FileIcon.vue';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useFileStore } from '@/store/files';
import { FileData } from '@/types';

const props = defineProps({
  file: {
    type: Object as PropType<FileData>,
    required: true
  },
  viewMode: {
    type: String as PropType<'list' | 'grid' | 'tree' | 'thumbnail'>,
    required: true
  },
  isSelected: Boolean,
  depth: {
    type: Number,
    default: 0
  },
  showFileTypeTags: {
    type: Boolean,
    default: false
  }
});

const isDropTarget = ref(false);
const showCheckbox = ref(false);

const emit = defineEmits(['select-file', 'open-file', 'update-file', 'delete-file', 'contextmenu-file']);

const fileStore = useFileStore();

const isRenaming = ref(false);
const newTitle = ref(props.file.title);
const isLoading = ref(false);
const fileItemRef = ref<HTMLDivElement | null>(null);
const renameInput = ref<HTMLInputElement | null>(null);

const isThumbnailOrGrid = computed(() => props.viewMode === 'thumbnail' || props.viewMode === 'grid');
const fileType = computed(() => (props.file.is_folder ? 'folder' : (props.file.file_type || '') ));

const fileItemClass = computed(() => {
  const baseClass = 'transition-all duration-200 cursor-pointer';
  const selectedClass = props.isSelected
    ? 'bg-primary-100 dark:bg-primary-900 ring-1 ring-primary-400'
    : 'hover:bg-gray-50 dark:hover:bg-gray-700';
  const dropTargetClass = props.file.is_folder ? 'drop-zone' : '';

  switch (props.viewMode) {
    case 'grid':
    case 'thumbnail':
      return `${baseClass} ${selectedClass} ${dropTargetClass} bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden w-full m-2`;
    case 'tree':
      return `${baseClass} ${selectedClass} ${dropTargetClass} w-full py-1`;
    default:
      return `${baseClass} ${selectedClass} ${dropTargetClass} w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md`;
  }
});

const formattedDate = computed(() => {
  if (!props.file.created_at) return 'N/A';
  try {
    const date = new Date(props.file.created_at as any);
    if (isNaN(date.getTime())) return 'N/A';
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' })
    });
  } catch {
    return 'N/A';
  }
});

function formatFileSize(fileSize?: string | number): string {
  if (fileSize === undefined || fileSize === null) return '';
  let bytes: number;
  if (typeof fileSize === 'string') {
    bytes = parseInt(fileSize, 10);
    if (isNaN(bytes)) return '';
  } else {
    bytes = fileSize;
  }
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 10) / 10} ${sizes[i]}`;
}

const handleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  // If currently renaming, ignore clicks to avoid unintended actions
  if (isRenaming.value) return
  // If clicking on checkbox, toggle selection only
  if (target.closest('.w-5.h-5, .w-4.h-4, input[type="checkbox"]')) {
    emit('select-file', props.file.id, event)
    return
  }
  // Only handle left-clicks; right/middle clicks are ignored here and handled elsewhere
  if (event.button !== 0) return
  // Ignore clicks on buttons/inputs within the item
  if (target.closest('button, input')) return
  // Always perform selection on single click. Parent will manage multi-select via modifiers.
  emit('select-file', props.file.id, event)
};

const handleContextMenu = (event: MouseEvent) => {
  // If currently renaming, suppress context menu to avoid interruptions
  if (isRenaming.value) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  // Emit to parent with coordinates and this file id
  emit('contextmenu-file', { id: props.file.id, x: event.clientX, y: event.clientY });
};

const openFile = () => {
  // Prevent opening while renaming
  if (isRenaming.value) return;
  emit('open-file', props.file.id);
};

const onDragOver = (event: DragEvent) => {
  if (isRenaming.value) return;
  if (props.file.is_folder) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
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

  const droppedFileId = event.dataTransfer!.getData('text/plain');
  if (!droppedFileId || droppedFileId === props.file.id) return;

  isLoading.value = true;
  try {
    if (props.file.id) {
      await fileStore.moveFile(droppedFileId, props.file.id);
      emit('update-file', droppedFileId);
    }
  } catch (error) {
    console.error('Error moving file:', error);
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
        emit('update-file', updatedFile);
      }
    } catch (error) {
      console.error('Error renaming file:', error);
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
    await fileStore.deleteFile(props.file.id);
    emit('delete-file', props.file.id);
  } catch (error) {
    console.error('Error deleting file:', error);
  } finally {
    isLoading.value = false;
  }
};

const onDragStart = (event: DragEvent) => {
  if (isRenaming.value) return;
  if (event.dataTransfer && props.file.id) {
    event.dataTransfer?.setData('text/plain', props.file.id);
    event.dataTransfer.effectAllowed = 'move';
    if (fileItemRef.value) fileItemRef.value.style.opacity = '0.5';
  }
};

const onDragEnd = () => {
  if (isRenaming.value) return;
  if (fileItemRef.value) fileItemRef.value.style.opacity = '1';
};

onMounted(() => {
  if (fileItemRef.value) {
    fileItemRef.value.addEventListener('start-rename', startRenaming);
  }
});
</script>

<style scoped>
.drop-zone {
  position: relative;
}

.drop-zone::after {
  content: '';
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

.document-card {
  min-height: 200px;
}

.preview-area {
  position: relative;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.file-item-other-views {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 1rem;
}

.group:hover .group-hover\:opacity-100 {
  opacity: 1;
}
</style>