<template>
  <Dialog :open="true" @update:open="$emit('close')">
    <DialogContent
      class="sm:max-w-[700px] bg-white dark:bg-gray-900 border border-border/50"
    >
      <DialogHeader>
        <DialogTitle class="text-2xl">Upload Files</DialogTitle>
        <DialogDescription>
          {{ getUploadDescription() }}
        </DialogDescription>
      </DialogHeader>
      <div
        class="border-2 border-dashed border-muted rounded-xl p-8 text-center mb-6 transition-all duration-300 cursor-pointer hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/50"
        :class="{ 'border-primary-500 bg-primary-50 dark:bg-primary-950': isDragging }"
        @dragenter.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @dragover.prevent
        @drop.prevent="onDrop"
        @click="handleDropZoneClick"
      >
        <UploadCloud class="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p class="mb-2 text-muted-foreground">
          {{ getUploadInstructions() }}
        </p>
        <div class="flex items-center justify-center space-x-2 text-sm">
          <button
            class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            @click.stop="selectFiles"
          >
            Select Files
          </button>
          <span class="text-muted-foreground">or</span>
          <button
            v-if="isFolderSupported"
            class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            @click.stop="selectFolder"
          >
            Select Folder
          </button>
        </div>

        <input
          ref="fileInput"
          type="file"
          multiple
          :accept="acceptedMimeTypes"
          class="hidden"
          @change="onFileInputChange"
        />

        <input
          v-if="isFolderSupported"
          ref="folderInput"
          type="file"
          webkitdirectory
          multiple
          class="hidden"
          @change="onFolderInputChange"
        />
      </div>

      <div v-if="fileTypeFilter !== 'all'" class="mb-4 p-3 bg-muted/50 rounded-lg">
        <p class="text-sm text-muted-foreground">
          <strong>Allowed file types:</strong> {{ getAllowedExtensions() }}
        </p>
      </div>

      <div
        v-if="rejectedFiles.length > 0"
        class="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
      >
        <p class="text-sm text-destructive mb-2">
          <strong>{{ rejectedFiles.length }} file(s) rejected:</strong>
        </p>
        <ul class="text-xs text-destructive/80 space-y-1">
          <li v-for="rejected in rejectedFiles.slice(0, 3)" :key="rejected.name">
            {{ rejected.name }} - {{ rejected.reason }}
          </li>
          <li v-if="rejectedFiles.length > 3" class="font-medium">
            ...and {{ rejectedFiles.length - 3 }} more
          </li>
        </ul>
      </div>

      <ScrollArea v-if="files.length > 0" class="h-[200px] rounded-md border">
        <div class="p-4 space-y-4">
          <div v-for="file in files" :key="file.id" class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              <File v-if="!isImageFileData(file)" class="w-6 h-6 text-muted-foreground" />
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
            <div class="flex items-center space-x-2">
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
              <Button variant="ghost" size="icon" @click="removeFile(file)">
                <X class="w-4 h-4" />
              </Button>
            </div>
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
        <Button @click="uploadFiles" :disabled="files.length === 0 || isUploading">
          {{ isUploading ? "Uploading..." : "Upload Files" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
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
  folderName?: string;
  relativePath?: string;
}

interface RejectedFile {
  name: string;
  reason: string;
}

type FileTypeFilter = "all" | "documents" | "spreadsheets" | "media";

const isFolderSupported = ref(false);

onMounted(() => {
  const input = document.createElement("input");
  isFolderSupported.value = "webkitdirectory" in input;
});

const FILE_TYPE_CONFIG: Record<
  FileTypeFilter,
  {
    extensions: string[];
    mimeTypes: string[];
    description: string;
    instructions: string;
  }
> = {
  all: {
    extensions: [],
    mimeTypes: [],
    description: "all file types",
    instructions: "Drag and drop files or folders here, or click to browse",
  },
  documents: {
    extensions: ["doc", "docx", "pdf", "txt", "rtf", "odt", "pages"],
    mimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/rtf",
      "application/vnd.oasis.opendocument.text",
      "application/vnd.apple.pages",
    ],
    description: "document files (PDF, Word, Text, etc.)",
    instructions: "Drag and drop document files here, or click to browse",
  },
  spreadsheets: {
    extensions: ["xls", "xlsx", "csv", "ods", "numbers"],
    mimeTypes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/vnd.oasis.opendocument.spreadsheet",
      "application/vnd.apple.numbers",
    ],
    description: "spreadsheet files (Excel, CSV, etc.)",
    instructions: "Drag and drop spreadsheet files here, or click to browse",
  },
  media: {
    extensions: [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "svg",
      "bmp",
      "mp4",
      "avi",
      "mov",
      "wmv",
      "mp3",
      "wav",
      "flac",
      "aac",
    ],
    mimeTypes: ["image/*", "video/*", "audio/*"],
    description: "media files (images, videos, audio)",
    instructions: "Drag and drop media files here, or click to browse",
  },
};

const fileStore = useFileStore();
const emit = defineEmits(["close", "upload"]);
const props = withDefaults(
  defineProps<{
    folderId?: string | null;
    fileTypeFilter?: FileTypeFilter;
  }>(),
  {
    fileTypeFilter: "all",
  }
);

const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const folderInput = ref<HTMLInputElement | null>(null);
const files = ref<FileData[]>([]);
const isUploading = ref(false);
const rejectedFiles = ref<RejectedFile[]>([]);
const lastSelectionType = ref<"files" | "folder">("files");

const currentFilter = computed((): FileTypeFilter => props.fileTypeFilter);

const acceptedMimeTypes = computed(() => {
  const config = FILE_TYPE_CONFIG[currentFilter.value];
  return config.mimeTypes.length > 0 ? config.mimeTypes.join(",") : "";
});

const getUploadDescription = () => {
  const config = FILE_TYPE_CONFIG[currentFilter.value];
  return `Drag and drop ${config.description}, or click to select`;
};

const getUploadInstructions = () => {
  const config = FILE_TYPE_CONFIG[currentFilter.value];
  return config.instructions;
};

const getAllowedExtensions = () => {
  const config = FILE_TYPE_CONFIG[currentFilter.value];
  return config.extensions.join(", ").toUpperCase();
};

const selectFiles = () => {
  lastSelectionType.value = "files";
  if (fileInput.value) {
    fileInput.value.value = "";
    fileInput.value.click();
  }
};

const selectFolder = () => {
  lastSelectionType.value = "folder";
  if (folderInput.value) {
    folderInput.value.value = "";
    folderInput.value.click();
  }
};

const handleDropZoneClick = () => {
  if (lastSelectionType.value === "folder" && isFolderSupported.value) {
    selectFolder();
  } else {
    selectFiles();
  }
};

const onFileInputChange = (e: Event) => {
  rejectedFiles.value = [];
  const inputFiles = Array.from((e.target as HTMLInputElement).files || []);
  addFiles(inputFiles);
};

const onFolderInputChange = (e: Event) => {
  rejectedFiles.value = [];
  const inputFiles = Array.from((e.target as HTMLInputElement).files || []);
  addFiles(inputFiles);
};

const isFileAllowed = (file: File): { allowed: boolean; reason?: string } => {
  if (currentFilter.value === "all") {
    return { allowed: true };
  }
  const config = FILE_TYPE_CONFIG[currentFilter.value];
  const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
  const fileMimeType = file.type || "unknown";

  if (config.extensions.length > 0 && !config.extensions.includes(fileExtension)) {
    return { allowed: false, reason: `File type .${fileExtension} not allowed` };
  }

  if (config.mimeTypes.length > 0) {
    const mimeTypeMatch = config.mimeTypes.some((allowedType) => {
      if (allowedType.endsWith("/*")) {
        const baseType = allowedType.replace("/*", "");
        return fileMimeType.startsWith(baseType);
      }
      return fileMimeType === allowedType;
    });
    if (!mimeTypeMatch) {
      return { allowed: false, reason: `MIME type ${fileMimeType} not allowed` };
    }
  }

  return { allowed: true };
};

const onDrop = async (e: DragEvent) => {
  isDragging.value = false;
  rejectedFiles.value = [];

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
          const dirFiles = await readDirectory(entry as FileSystemDirectoryEntry);
          newFiles.push(...dirFiles);
        }
      }
    }
  }

  addFiles(newFiles);
};

const readDirectory = async (dirEntry: FileSystemDirectoryEntry): Promise<File[]> => {
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
              const file = await new Promise<File>((resolve) => fileEntry.file(resolve));
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

const addFiles = (newFiles: File[]) => {
  const allowedFiles: File[] = [];
  const currentRejected: RejectedFile[] = [];

  let folderName = "";
  if (newFiles.length > 0 && (newFiles[0] as any).webkitRelativePath) {
    const firstPath = (newFiles[0] as any).webkitRelativePath;
    folderName = firstPath.split("/")[0];
  }

  newFiles.forEach((file) => {
    const fileExists = files.value.some(
      (existingFile) =>
        existingFile.file_name === file.name && existingFile.file_size === file.size
    );

    if (fileExists) {
      currentRejected.push({
        name: file.name,
        reason: "File already selected",
      });
      return;
    }

    const { allowed, reason } = isFileAllowed(file);
    if (allowed) {
      allowedFiles.push(file);
    } else {
      currentRejected.push({
        name: file.name,
        reason: reason || "File type not allowed",
      });
    }
  });

  rejectedFiles.value = currentRejected;

  files.value.push(
    ...allowedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      title: file.name,
      file_name: file.name,
      file_type: file.name.split(".").pop()?.toLowerCase(),
      file_size: file.size,
      progress: 0,
      preview: isImageFile(file) ? URL.createObjectURL(file) : undefined,
      file: file,
      error: false,
      folderName: folderName,
      relativePath: (file as any).webkitRelativePath || file.name,
    }))
  );
};

const isImageFile = (file: File) => {
  return file.type?.startsWith("image/");
};

const isImageFileData = (fileData: FileData) => {
  return ["png", "jpg", "jpeg", "gif", "webp"].includes(fileData.file_type || "");
};

const totalSize = computed(() => {
  return files.value.reduce((total, file) => total + (file.file_size || 0), 0);
});

const removeFile = (file: FileData) => {
  const index = files.value.findIndex((f) => f.id === file.id);
  if (index !== -1) {
    files.value.splice(index, 1);
  }
};

const cancelUpload = (file: FileData) => {
  removeFile(file);
};

const retryUpload = (file: FileData) => {
  file.error = false;
  uploadFile(file);
};

const uploadFiles = async () => {
  isUploading.value = true;

  const filesGroupedByFolder: Record<string, FileData[]> = {};
  const standaloneFiles: FileData[] = [];

  files.value.forEach((file) => {
    if (file.folderName) {
      if (!filesGroupedByFolder[file.folderName]) {
        filesGroupedByFolder[file.folderName] = [];
      }
      filesGroupedByFolder[file.folderName].push(file);
    } else {
      standaloneFiles.push(file);
    }
  });

  const uploadedFiles: any[] = [];

  for (const [folderName, folderFiles] of Object.entries(filesGroupedByFolder)) {
    const uploadedFolderFiles = await uploadFolderWithContents(folderName, folderFiles);
    uploadedFiles.push(...uploadedFolderFiles);
  }

  const uploadPromises = standaloneFiles.map((file) => uploadFile(file));
  const results = await Promise.allSettled(uploadPromises);
  const uploadedStandaloneFiles = results
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter(Boolean);
  uploadedFiles.push(...uploadedStandaloneFiles);

  isUploading.value = false;
  emit("upload", uploadedFiles);
};

const uploadFolderWithContents = async (
  folderName: string,
  folderFiles: FileData[]
): Promise<any[]> => {
  try {
    const rootFolder = await fileStore.makeFolder({
      title: folderName,
      file_name: folderName,
      folder_id: props.folderId || null,
      is_folder: true,
    } as any);

    if (!rootFolder || !rootFolder.id) {
      throw new Error("Failed to create root folder");
    }

    const folderMap = new Map<string, string>();
    folderMap.set(folderName, rootFolder.id);

    const uploadedFiles: any[] = [];

    // Sort files by depth to ensure parent folders are created before child folders
    const sortedFiles = [...folderFiles].sort((a, b) => {
      const aDepth = (a.relativePath || "").split("/").length;
      const bDepth = (b.relativePath || "").split("/").length;
      return aDepth - bDepth;
    });

    for (const file of sortedFiles) {
      if (!file.relativePath || !file.file) continue;

      const pathParts = file.relativePath.split("/");
      const fileName = pathParts.pop(); // Remove filename from path

      let parentFolderId = rootFolder.id;

      // Build folder hierarchy
      for (let i = 1; i < pathParts.length; i++) {
        const currentPath = pathParts.slice(0, i + 1).join("/");

        if (!folderMap.has(currentPath)) {
          const subfolder = await fileStore.makeFolder({
            title: pathParts[i],
            file_name: pathParts[i],
            folder_id: parentFolderId,
            is_folder: true,
          } as any);

          if (subfolder && subfolder.id) {
            folderMap.set(currentPath, subfolder.id);
            parentFolderId = subfolder.id;
          } else {
            console.error(`Failed to create subfolder: ${pathParts[i]}`);
            break;
          }
        } else {
          parentFolderId = folderMap.get(currentPath)!;
        }
      }

      // Upload the actual file to its parent folder
      try {
        const uploadedFile = await uploadFile(file, parentFolderId);
        if (uploadedFile) {
          uploadedFiles.push(uploadedFile);
        } else {
          console.error(`Failed to upload file: ${fileName}`);
        }
      } catch (fileError) {
        console.error(`Error uploading file ${fileName}:`, fileError);
        // Continue with other files even if one fails
      }
    }

    return uploadedFiles;
  } catch (error) {
    console.error(`Error uploading folder ${folderName}:`, error);
    return [];
  }
};

const uploadFile = async (
  file: FileData,
  targetFolderId?: string
): Promise<any | null> => {
  if (!file.file) return null;

  try {
    const useChunked = (file.file.size || 0) > 5 * 1024 * 1024;
    const progressCb = (progress: number) => {
      const index = files.value.findIndex((f) => f.id === file.id);
      if (index !== -1) {
        files.value[index].progress = progress;
      }
    };

    const destinationFolderId = targetFolderId || props.folderId || null;

    const uploadedFile = useChunked
      ? await fileStore.uploadChunked(file.file, {
          folderId: destinationFolderId,
          onProgress: progressCb,
        })
      : await fileStore.uploadFile(file.file, progressCb, destinationFolderId);

    if (uploadedFile) {
      const index = files.value.findIndex((f) => f.id === file.id);
      if (index !== -1) {
        files.value[index].progress = 100;
        files.value[index].error = false;
      }

      return uploadedFile;
    }

    return null;
  } catch (error) {
    console.error(`Error uploading file ${file.title}:`, error);
    const index = files.value.findIndex((f) => f.id === file.id);
    if (index !== -1) {
      files.value[index].error = true;
      files.value[index].progress = 0;
    }
    return null;
  }
};
</script>

<style scoped>
.scroll-area {
  max-height: 200px;
  overflow-y: auto;
}

.scroll-area::-webkit-scrollbar {
  width: 8px;
}

.scroll-area::-webkit-scrollbar-track {
  background: transparent;
}

.scroll-area::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.scroll-area::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

.dark .scroll-area::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
}

.dark .scroll-area::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
</style>