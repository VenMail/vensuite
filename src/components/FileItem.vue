<template>
  <div :id="`fileItem-${file.id}`" :class="fileItemClass" @click="selectFile" @dblclick="openFile" draggable="true" @dragstart="onDragStart" @dragend="onDragEnd" ref="fileItemRef">
    <!-- Thumbnail and Grid Views -->
    <div v-if="isThumbnailOrGrid" class="file-item-wrapper">
      <div v-show="isRenaming" class="w-full flex items-center">
        <Input v-model="newTitle" @keyup.enter="finishRenaming" @blur="finishRenaming" ref="renameInput" class="w-full" />
        <Loader v-if="isLoading" class="h-4 w-4 animate-spin text-gray-600 ml-2" />
      </div>

      <!-- File Icon and Title/Date Section -->
      <div class="flex items-center gap-4" v-show="!isRenaming">
        <FileIcon :fileType="fileType" class="w-12 h-12 text-gray-600" />
        <div class="flex flex-col flex-grow">
          <h3 class="text-sm font-medium truncate text-gray-800">{{ file.title }}</h3>
          <p class="text-xs text-gray-500">{{ formattedDate }}</p>
        </div>
      </div>

      <!-- Preview Image (Bottom Right) -->
      <img v-if="isImageFile" :src="file.file_url" :alt="file.title" class="absolute bottom-2 right-2 w-10 h-10 object-cover rounded-md shadow-md" />

      <!-- File Type Ribbon (Top Right) -->
      <div v-if="!file.is_folder" class="absolute top-2 right-2 bg-slate-500 text-white text-xs px-2 py-0.5 rounded-lg shadow">
        {{ file.file_type?.toUpperCase() }}
      </div>
    </div>

    <!-- Tree View and List View -->
    <div v-else class="file-item-other-views">
      <FileIcon :fileType="fileType" class="w-6 h-6 text-gray-500 mr-4" />
      <div class="flex-grow min-w-0">
        <div v-show="isRenaming" class="w-full flex items-center">
          <Input v-model="newTitle" @keyup.enter="finishRenaming" @blur="finishRenaming" ref="renameInput" class="w-full" />
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
import { Settings, Loader } from 'lucide-vue-next';
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

const emit = defineEmits(['select-file', 'open-file', 'update-file', 'delete-file']);

const { id, title, is_folder, file_type, created_at, file_url } = props.file;

const fileStore = useFileStore();

const isRenaming = ref(false);
const newTitle = ref(title);
const isLoading = ref(false);
const fileItemRef = ref<HTMLDivElement | null>(null);
const renameInput = ref<HTMLInputElement | null>(null);

const isThumbnailOrGrid = computed(() => props.viewMode === 'thumbnail' || props.viewMode === 'grid');
const isImageFile = computed(() => file_type && ['jpg', 'png'].includes(file_type) && file_url);
const fileType = computed(() => (is_folder ? 'folder' : file_type));

const fileItemClass = computed(() => {
  const baseClass = 'p-1 transition-all duration-200 cursor-pointer';
  const selectedClass = props.isSelected ? 'ring-2 ring-slate-400 bg-slate-50' : 'hover:bg-gray-100';

  switch (props.viewMode) {
    case 'grid':
      return `${baseClass} ${selectedClass} w-full rounded-md m-2 flex flex-col`;
    case 'thumbnail':
      return `${baseClass} ${selectedClass} w-full rounded-md m-2 flex flex-col shadow-sm relative`;
    case 'tree':
      return `${baseClass} ${selectedClass} w-full py-1`;
    default:
      return `${baseClass} ${selectedClass} w-full flex items-center justify-between`;
  }
});

const formattedDate = computed(() => (created_at ? new Date(created_at).toLocaleDateString() : 'N/A'));

const selectFile = () => emit('select-file', id);
const openFile = () => emit('open-file', id);

const startRenaming = () => {
  isRenaming.value = true;
  newTitle.value = title;
  nextTick(() => {
    renameInput.value?.focus?.();
    renameInput.value?.select?.();
  });
};

const finishRenaming = async () => {
  if (newTitle.value && newTitle.value !== title) {
    isLoading.value = true;
    try {
      const updatedFile = await fileStore.saveDocument({ ...props.file, title: newTitle.value });
      emit('update-file', updatedFile);
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
    if (!id) return;
    await fileStore.deleteFile(id);
    emit('delete-file', id);
  } catch (error) {
    console.error('Error deleting file:', error);
  } finally {
    isLoading.value = false;
  }
};

const onDragStart = (event: DragEvent) => {
  if (event.dataTransfer && id) {
    event.dataTransfer?.setData('text/plain', id);
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
