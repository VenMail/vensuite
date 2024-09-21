<template>
  <Dialog :open="true" @update:open="$emit('close')">
    <DialogContent
      class="sm:max-w-[700px] bg-background/80 backdrop-blur-xl border border-border/50"
    >
      <DialogHeader>
        <DialogTitle class="text-2xl">Upload Files</DialogTitle>
        <DialogDescription>
          Drag and drop files or folders, or click to select
        </DialogDescription>
      </DialogHeader>
      <div
        class="border-2 border-dashed border-muted rounded-xl p-8 text-center mb-6 transition-all duration-300"
        :class="{ 'bg-muted': isDragging }"
        @dragenter.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @dragover.prevent
        @drop.prevent="onDrop"
      >
        <UploadCloud class="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p class="mb-2 text-muted-foreground">
          Drag and drop files or folders here, or
        </p>
        <div class="flex justify-center space-x-4">
          <Button @click="$refs.fileInput.click()">Select Files</Button>
          <Button @click="$refs.folderInput.click()">Select Folder</Button>
        </div>
        <input
          ref="fileInput"
          type="file"
          multiple
          class="hidden"
          @change="onFileChange"
        />
        <input
          ref="folderInput"
          type="file"
          webkitdirectory
          directory
          multiple
          class="hidden"
          @change="onFileChange"
        />
      </div>

      <ScrollArea v-if="files.length > 0" class="h-[300px] rounded-md border">
        <div class="p-4 space-y-4">
          <div
            v-for="file in files"
            :key="file.id"
            class="flex items-center space-x-4"
          >
            <div
              class="w-12 h-12 rounded-lg bg-muted flex items-center justify-center"
            >
              <File
                v-if="!isImageFileData(file)"
                class="w-6 h-6 text-muted-foreground"
              />
              <img
                v-else
                :src="file.preview"
                class="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div class="flex-grow">
              <p class="text-sm font-medium truncate">{{ file.title }}</p>
              <p class="text-xs text-muted-foreground">
                {{ formatBytes(file.file_size || 0) }}
              </p>
              <div class="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  class="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
                  :style="{ width: `${file.progress}%` }"
                ></div>
              </div>
            </div>
            <Button
              v-if="file.progress && file.progress < 100"
              variant="ghost"
              size="icon"
              @click="cancelUpload(file)"
            >
              <X class="w-4 h-4" />
            </Button>
            <CheckCircle2
              v-else-if="file.progress === 100"
              class="w-5 h-5 text-primary"
            />
            <Button
              v-if="file.error"
              variant="ghost"
              size="icon"
              @click="retryUpload(file)"
            >
              <RefreshCw class="w-4 h-4 text-error" />
            </Button>
          </div>
        </div>
      </ScrollArea>

      <div class="mt-4 flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          {{ files.length }}
          {{ files.length === 1 ? "file" : "files" }} selected
        </p>
        <p class="text-sm text-muted-foreground">
          Total size: {{ formatBytes(totalSize) }}
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('close')">Cancel</Button>
        <Button
          @click="uploadFiles"
          :disabled="files.length === 0 || isUploading"
        >
          {{ isUploading ? "Uploading..." : "Upload Files" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadCloud, File, X, CheckCircle2, RefreshCw } from "lucide-vue-next";
import { useFileStore } from "@/store/files";
import { formatBytes } from "@/utils/lib";

interface FileData {
  id: string;
  title: string;
  file_name?: string;
  file_type?: string | null;
  file_size?: number;
  file_url?: string;
  progress: number | undefined;
  preview?: string;
  file: File | undefined;
  error?: boolean;
}

const fileStore = useFileStore();
const emit = defineEmits(["close", "upload"]);

const isDragging = ref(false);
const files = ref<FileData[]>([]);
const isUploading = ref(false);

const onDrop = async (e: DragEvent) => {
  isDragging.value = false;
  const items = Array.from(e.dataTransfer?.items || []);
  const newFiles: File[] = [];

  for (const item of items) {
    if (item.kind === "file") {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        if (entry.isFile) {
          const file = item.getAsFile();
          if (file) newFiles.push(file);
        } else if (entry.isDirectory) {
          const dirFiles = await readDirectory(
            entry as FileSystemDirectoryEntry
          );
          newFiles.push(...dirFiles);
        }
      }
    }
  }

  addFiles(newFiles);
};

const readDirectory = async (
  dirEntry: FileSystemDirectoryEntry
): Promise<File[]> => {
  return new Promise((resolve) => {
    const dirReader = dirEntry.createReader();
    const files: File[] = [];

    const readEntries = () => {
      dirReader.readEntries(async (entries) => {
        if (entries.length === 0) {
          resolve(files);
        } else {
          for (const entry of entries) {
            if (entry.isFile) {
              const fileEntry = entry as FileSystemFileEntry;
              const file = await new Promise<File>((resolve) =>
                fileEntry.file(resolve)
              );
              files.push(file);
            } else if (entry.isDirectory) {
              const dirEntry = entry as FileSystemDirectoryEntry;
              files.push(...(await readDirectory(dirEntry)));
            }
          }
          readEntries();
        }
      });
    };

    readEntries();
  });
};

const onFileChange = (e: Event) => {
  const inputFiles = Array.from((e.target as HTMLInputElement).files || []);
  addFiles(inputFiles);
};

const addFiles = (newFiles: File[]) => {
  const uniqueFiles = newFiles.filter(
    (file) =>
      !files.value.some(
        (existingFile) =>
          existingFile.file_name === file.name &&
          existingFile.file_size === file.size
      )
  );

  files.value.push(
    ...uniqueFiles.map((file) => ({
      id: Math.random()
        .toString(36)
        .substr(2, 9),
      title: file.name,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      progress: 0,
      preview: isImageFile(file) ? URL.createObjectURL(file) : undefined,
      file: file,
      error: false,
    }))
  );
};

// Checks if the raw File object is an image
const isImageFile = (file: File) => {
  return file.type?.startsWith("image/");
};

// Checks if FileData is an image based on file_type (extension)
const isImageFileData = (fileData: FileData) => {
  return ["png", "jpg", "jpeg", "gif", "webp"].includes(
    fileData.file_type || ""
  );
};

const totalSize = computed(() => {
  return files.value.reduce((total, file) => total + (file.file_size || 0), 0);
});

const cancelUpload = (file: FileData) => {
  // Cancel logic for ongoing uploads
  const index = files.value.findIndex((f) => f.id === file.id);
  if (index !== -1) {
    files.value.splice(index, 1);
  }
};

const retryUpload = (file: FileData) => {
  file.error = false;
  uploadFile(file);
};

const uploadFiles = async () => {
  isUploading.value = true;
  const uploadPromises = files.value.map((file) => uploadFile(file));
  await Promise.all(uploadPromises);
  isUploading.value = false;
  emit("upload", files.value);
};

const uploadFile = async (file: FileData) => {
  if (!file.file) return;
  try {
    await fileStore.uploadFile(file.file, (progress: number) => {
      const index = files.value.findIndex((f) => f.id === file.id);
      if (index !== -1) {
        files.value[index].progress = progress;
      }
    });
  } catch (error) {
    console.error(`Error uploading file ${file.title}:`, error);
    file.error = true;
  }
};
</script>
