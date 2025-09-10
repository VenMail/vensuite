<template>
  <div
    :id="`fileItem-${file.id}`"
    :class="[fileItemClass, { 'drop-target': isDropTarget }]"
    @click="handleClick"
    @dblclick="openFile"
    @contextmenu.prevent.stop="handleContextMenu"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @mouseenter="showCheckbox = true"
    @mouseleave="showCheckbox = false"
    ref="fileItemRef">

    <!-- Thumbnail and Grid Views -->
    <div v-if="isThumbnailOrGrid" class="file-item-wrapper">
      <div v-show="isRenaming" class="w-full flex items-center">
        <Input v-model="newTitle" @keyup.enter="finishRenaming" @blur="finishRenaming" ref="renameInput"
          class="w-full" />
        <Loader v-if="isLoading" class="h-4 w-4 animate-spin text-gray-600 dark:text-gray-300 ml-2" />
      </div>

      <div class="flex items-center gap-4" v-show="!isRenaming">
        <!-- File Icon and Title/Date Section -->
        <div v-if="showCheckbox || isSelected"
          class="w-5 h-5 z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-sm flex items-center justify-center transition-all duration-200 cursor-pointer"
          @click.stop="$emit('select-file', file.id, $event)">
          <CheckIcon v-if="isSelected" class="w-3 h-3 text-primary-600" />
        </div>

        <div class="relative">
          <FileIcon :fileType="fileType" :fileData="file" class="w-12 h-12 text-gray-600 dark:text-gray-300" />
        </div>
        <div class="flex flex-col flex-grow">
          <h3 class="text-sm font-medium truncate text-gray-800">{{ file.title }}</h3>
          <p class="text-xs text-gray-500">{{ formattedDate }}</p>
        </div>
      </div>

      <!-- File Type Ribbon (Top Right) -->
      <div v-if="!file.is_folder"
        class="absolute top-2 right-2 bg-slate-500 text-white text-xs px-2 py-0.5 rounded-lg shadow">
        {{ file.file_type?.toUpperCase() }}
      </div>
    </div>

    <!-- Tree View and List View -->
    <div v-else class="file-item-other-views">
      <div class="relative">
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
          <Loader v-if="isLoading" class="h-4 w-4 animate-spin text-gray-600 ml-2" />
        </div>
        <template v-if="!isRenaming">
          <h3 class="font-medium text-sm text-gray-800 truncate">{{ file.title }}</h3>
          <p v-if="viewMode !== 'tree'" class="text-xs text-gray-500">{{ formattedDate }}</p>
        </template>
      </div>
      <div v-if="viewMode !== 'tree'" class="flex items-center space-x-2">
        <p v-if="viewMode === 'list'" class="text-sm text-gray-600">{{ file.file_size }}</p>
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
import { Settings, Loader, CheckIcon } from 'lucide-vue-next';
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
  const baseClass = 'p-1 transition-all duration-200 cursor-pointer';
  const selectedClass = props.isSelected
    ? 'ring-2 ring-primary-400 bg-primary-50 dark:bg-gray-700'
    : 'hover:bg-gray-100 dark:hover:bg-gray-700';
  const dropTargetClass = props.file.is_folder ? 'drop-zone' : '';

  switch (props.viewMode) {
    case 'grid':
      return `${baseClass} ${selectedClass} ${dropTargetClass} w-full rounded-md m-2 flex flex-col`;
    case 'thumbnail':
      return `${baseClass} ${selectedClass} ${dropTargetClass} w-full rounded-md m-2 flex flex-col shadow-sm relative`;
    case 'tree':
      return `${baseClass} ${selectedClass} ${dropTargetClass} w-full py-1`;
    default:
      return `${baseClass} ${selectedClass} ${dropTargetClass} w-full flex items-center justify-between`;
  }
});

const formattedDate = computed(() => (props.file.created_at ? new Date(props.file.created_at as any).toLocaleDateString() : 'N/A'));

const handleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  // If clicking on checkbox, toggle selection only
  if (target.closest('.w-5.h-5, .w-4.h-4')) {
    emit('select-file', props.file.id, event)
    return
  }
  // Ignore right-click here; handled via contextmenu
  if (event.button === 2) return
  // Ignore clicks on buttons/inputs within the item
  if (target.closest('button, input')) return
  // Always perform selection on single click. Parent will manage multi-select via modifiers.
  emit('select-file', props.file.id, event)
};

const handleContextMenu = (event: MouseEvent) => {
  // Emit to parent with coordinates and this file id
  emit('contextmenu-file', { id: props.file.id, x: event.clientX, y: event.clientY });
};

const openFile = () => emit('open-file', props.file.id);

const onDragOver = (event: DragEvent) => {
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
  if (event.dataTransfer && props.file.id) {
    event.dataTransfer?.setData('text/plain', props.file.id);
    event.dataTransfer.effectAllowed = 'move';
    if (fileItemRef.value) fileItemRef.value.style.opacity = '0.5';
  }
};

const onDragEnd = () => {
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

.file-item-other-views {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: 9999px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.hover\:shadow-lg:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
</style>
