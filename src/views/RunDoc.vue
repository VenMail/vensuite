<script setup lang="ts">
import * as defaultIcons from "@iconify-prerendered/vue-file-icons";
import { nextTick, onMounted, ref, watchEffect, computed, onUnmounted } from "vue";
import { v4 as uuidv4 } from "uuid";

import "@/assets/index.css";
import {
  PencilIcon,
  ArrowLeft,
  Plus,
  Share2,
  User,
  Wifi,
  WifiOff,
} from "lucide-vue-next";
import { useDebounceFn, useFavicon } from "@vueuse/core";
import { useRoute, useRouter } from "vue-router";
//@ts-ignore
import { UmoEditor } from "@umoteam/editor";
import { useFileStore } from "@/store/files";
import Button from "@/components/ui/button/Button.vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/composables/useToast";

// Router setup
const route = useRoute();
const router = useRouter();
const fileStore = useFileStore();

// Reactive references
const title = ref("New Document");
const editableTitle = ref(title.value);
const isSettingCursor = ref(false);
const isTitleEdit = ref(false);
const titleEditTimeout = ref<NodeJS.Timeout | null>(null);
const isAutoSaving = ref(false);
const isSyncing = ref(false);
const isLoading = ref(false);
const isOffline = ref(!navigator.onLine);
const hasUnsavedChanges = ref(false);
const currentDoc = ref<any>(null);
const lastSaveResult = ref<{
  success: boolean;
  offline: boolean;
  error: string | null;
} | null>(null);
const translationsLoaded = ref(false);
const editorInitialized = ref(false);

// Computed properties
const syncStatus = computed(() => {
  if (isOffline.value) return "offline";
  if (isSyncing.value) return "syncing";
  if (hasUnsavedChanges.value) return "unsaved";
  return "saved";
});

const syncStatusText = computed(() => {
  if (lastSaveResult.value?.error) return `Error: ${lastSaveResult.value.error}`;
  switch (syncStatus.value) {
    case "offline":
      return "Working Offline";
    case "syncing":
      return "Syncing...";
    case "unsaved":
      return "Saving...";
    case "saved":
      return "All changes saved";
  }
});

// Network status handlers
function updateOnlineStatus() {
  isOffline.value = !navigator.onLine;
  if (navigator.onLine && hasUnsavedChanges.value) {
    syncChanges();
  }
}

function updateTitle(event: Event) {
  if (isSettingCursor.value) return;

  const target = event.target as HTMLElement;
  const newText = target.innerText.trim();

  // Skip if no actual change
  if (editableTitle.value === newText) return;

  editableTitle.value = newText;
  hasUnsavedChanges.value = true;

  // Save cursor position
  const selection = window.getSelection();
  const range = selection?.getRangeAt(0);
  const offset = range?.startOffset;

  // Queue microtask to restore cursor after Vue update
  nextTick(() => {
    isSettingCursor.value = true;
    restoreCursorPosition(target, offset ?? newText.length);
    isSettingCursor.value = false;
  });

  // Clear any existing timeout before setting a new one
  if (titleEditTimeout.value) {
    clearTimeout(titleEditTimeout.value);
  }

  // Debounced save to reduce frequency of title saves
  debouncedSave();
}

function restoreCursorPosition(element: HTMLElement, offset: number) {
  const range = document.createRange();
  const selection = window.getSelection();

  if (element.childNodes[0]) {
    range.setStart(
      element.childNodes[0],
      Math.min(offset, element.textContent?.length ?? 0)
    );
  } else {
    range.selectNodeContents(element);
    range.collapse(false);
  }

  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

const debouncedSave = useDebounceFn(
  async () => {
    if (titleEditTimeout.value) clearTimeout(titleEditTimeout.value);
    isAutoSaving.value = true;
    await saveTitle();
    isAutoSaving.value = false;
  },
  2000,
  { maxWait: 5000 }
);

const options = computed(() => ({
  document: {
    title: "Untitled Document",
    content: "",
    placeholder: {
      en_US: "Write something...",
    },
    enableSpellcheck: true,
    enableMarkdown: true,
    enableBubbleMenu: true,
    enableBlockMenu: true,
    readOnly: false,
    autofocus: true,
    characterLimit: 0,
    typographyRules: {},
    editorProps: {},
    parseOptions: {
      preserveWhitespace: "full",
    },
  },
  locale: "en-US",
  translations: translationsLoaded.value ? {
    base: {
      color: {
        text: "Font Colour",
      },
      bgColor: {
        text: "Font Background",
      },
    },
  } : {},
  welcome: "Careful! Only open dev console if you know what you are doing",
  toolbar: {
    defaultMode: "ribbon",
    enableSourceEditor: true,
    menus: ["base", "table", "tools", "page", "export"],
    disableMenuItems: ["chineseDate", "chineseCase"],
    importWord: {
      enabled: true,
      options: {},
      useCustomMethod: false,
    },
  },
}));

const titleRef = ref<HTMLElement | null>(null);
const editorRef = ref<any>(null);

function editTitle() {
  isTitleEdit.value = true;
  editableTitle.value = title.value;
  nextTick(() => {
    const titleEl = titleRef.value;
    if (titleEl) {
      titleEl.focus();
    }
  });
}

async function loadData(id: string) {
  console.log(`Loading document with ID: ${id}`);
  isLoading.value = true;

  try {
    let serverId = null;
    let localId = id;

    // Check if this is a server ID and we have a local mapping
    if (/^\d+-/.test(id)) {
      serverId = id;
      localId = localStorage.getItem(`server_id_map_${id}`) || id;
      console.log(`Server ID detected (${id}). Mapped local ID: ${localId}`);
    } else {
      // If this is a local ID, check if we have a server ID mapping
      const serverIdMapping = Object.keys(localStorage)
        .filter((key) => key.startsWith("server_id_map_"))
        .find((key) => localStorage.getItem(key) === id);

      if (serverIdMapping) {
        serverId = serverIdMapping.replace("server_id_map_", "");
        console.log(`Local ID detected (${id}). Found server ID mapping: ${serverId}`);
      }
    }

    const doc = await fileStore.loadDocument(id, "docx");
    console.log("Document loaded:", doc);

    if (doc) {
      // Create a clean document object with normalized fields
      currentDoc.value = {
        ...doc,
        content: doc.content || doc.contents, // Normalize to use content field
        contents: undefined, // Remove contents to avoid duplication
      };

      // Update title references
      title.value = doc.title || "Untitled Document";
      document.title = title.value;

      // Ensure we have content to display
      const contentToDisplay = currentDoc.value.content || "";
      console.log(`Setting editor content, length: ${contentToDisplay.length}`);

      // Force editor refresh with a slight delay to ensure it's ready
      nextTick(() => {
        if (editorRef.value) {
          editorRef.value.setDocument({
            content: contentToDisplay,
            title: title.value,
          });

          editorRef.value.setContent(contentToDisplay);

          console.log("Editor content set", {
            contentLength: contentToDisplay.length,
            title: title.value,
          });
        } else {
          console.error("Editor reference not available");
        }
      });

      console.log(
        `Document loaded successfully. Title: ${title.value}, Content length: ${
          currentDoc.value.content?.length || 0
        }`
      );

      // URL handling - prefer server ID in URL
      if (serverId && route.params.id !== serverId) {
        console.log(`Updating URL to use server ID: ${serverId}`);
        router.replace(`/docs/${serverId}`);
      } else if (doc.remote_id && doc.remote_id !== route.params.id) {
        console.log(`Updating URL to use document's server ID: ${doc.remote_id}`);
        router.replace(`/docs/${doc.remote_id}`);
      } else if (!serverId && doc.id !== route.params.id) {
        // No server ID available, fallback to local ID
        console.log(`No server ID available. Using local ID in URL: ${doc.id}`);
        router.replace(`/docs/${doc.id}`);
      }
    } else {
      console.log(`No document found with ID: ${id}. Creating new document.`);
      // Handle new document case
      const newId = uuidv4();
      currentDoc.value = {
        id: newId,
        title: "New Document",
        file_type: "docx",
        isNew: true,
      };
      title.value = "New Document";
      document.title = "New Document";

      // Set empty document in editor
      nextTick(() => {
        if (editorRef.value) {
          editorRef.value.setDocument({
            content: "",
            title: "New Document",
          });
          editorRef.value.setContent("");
        }
      });

      router.replace(`/docs/${newId}`);
    }
    hasUnsavedChanges.value = false;
  } catch (error) {
    console.error("Failed to load document:", error);
    toast.error("Failed to load document");
  } finally {
    isLoading.value = false;
  }
}

async function syncChanges() {
  if (!currentDoc.value || isSyncing.value) return;
  isSyncing.value = true;
  try {
    console.log("Saving content");
    editorRef.value?.saveContent(false);
  } catch (error) {
    console.error("Sync error:", error);
    lastSaveResult.value = {
      success: false,
      offline: !fileStore.isOnline,
      error: "Sync failed",
    };
  } finally {
    isSyncing.value = false;
  }
}

function handleSavedEvent(result: any) {
  console.log("result:", result);
  lastSaveResult.value = result;
  console.log("last save result:", lastSaveResult.value);
}

async function saveTitle() {
  const newTitle = editableTitle.value.trim();
  title.value = newTitle || "New Document";
  document.title = title.value;
  isTitleEdit.value = false;
  editorRef.value?.setDocument({ title: title.value });

  if (currentDoc.value) {
    console.log("current doc:", currentDoc.value);
    // Only mark as having unsaved changes if title actually changed
    if (currentDoc.value.title !== title.value) {
      // Update document title
      currentDoc.value.title = title.value;
      hasUnsavedChanges.value = true;

      // Also update the editor's title to stay in sync
      if (editorRef.value?.setTitle) {
        await editorRef.value.setTitle(title.value);
      }

      // Trigger sync to save changes
      syncChanges();
    }
  }
}

function startEditing() {
  if (!isTitleEdit.value) {
    editTitle();
  }
}

// Icon reference and favicon setup
const iconRef = ref<HTMLElement | null>(null);

onMounted(async () => {
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);

  console.log("RunDoc component mounted, initializing editor");

  // Initialize editor after loading translations
  nextTick(async () => {
    if (editorRef.value) {
      await editorRef.value.setLocale("en-US");
      translationsLoaded.value = true;
      editorInitialized.value = true;
      console.log("Editor initialized with translations");
    }
  });

  // Listen to route changes and load document
  watchEffect(async () => {
    if (route.params.id) {
      const docId = route.params.id as string;
      console.log("Route changed, loading document with ID:", docId);

      try {
        await loadData(docId);
      } catch (error) {
        console.error("Failed to load document:", error);
        toast.error("Failed to load document");
      }

      const iconHTML = iconRef.value?.outerHTML
        .replace(/currentColor/g, "#4d7cfe")
        .replace(/1em/g, "");
      const iconDataURL = `data:image/svg+xml,${encodeURIComponent(iconHTML || "")}`;
      useFavicon(iconDataURL);
    }
  });
});

function handleEditorCreated() {
  console.log("Editor component created");
}

onUnmounted(() => {
  window.removeEventListener("online", updateOnlineStatus);
  window.removeEventListener("offline", updateOnlineStatus);
});

const templates = {
  Documents: [
    { name: "Blank Document", icon: defaultIcons.IconMicrosoftWord },
    { name: "Resume", icon: defaultIcons.IconMicrosoftWord },
    { name: "Letter", icon: defaultIcons.IconMicrosoftWord },
  ],
};

function shareDocument() {
  // Implement share functionality
  console.log("Share document");
}
</script>

<template>
  <div id="app" class="h-screen flex flex-col">
    <!-- Loading bar -->
    <div v-if="isLoading" class="loading-bar">
      <div class="loading-progress"></div>
    </div>

    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
    >
      <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" @click="router.push('/')">
          <ArrowLeft class="h-5 w-5" />
        </Button>
        <router-link to="/">
          <defaultIcons.IconMicrosoftWord
            ref="iconRef"
            class="w-[1.5rem] h-[3rem] text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
          />
        </router-link>
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <div
              id="docHead"
              :contenteditable="isTitleEdit"
              ref="titleRef"
              class="font-bold border-b border-dotted border-gray-300 min-w-[100px] px-2 py-1 relative"
              :class="{
                'cursor-text': isTitleEdit,
                'hover:bg-gray-100': !isTitleEdit,
              }"
              @click="startEditing"
              @input="updateTitle"
              @blur="saveTitle"
              @keydown.enter.prevent="saveTitle"
            >
              {{ title }}
            </div>
            <div class="flex items-center gap-2">
              <PencilIcon
                v-if="!isTitleEdit"
                @click="startEditing"
                class="h-3 w-3 cursor-pointer hover:text-primary-600"
              />
              <div class="flex items-center gap-1 text-sm">
                <WifiOff v-if="isOffline" class="h-4 w-4 text-yellow-500" />
                <Wifi v-else class="h-4 w-4 text-green-500" />
                <span
                  :class="{
                    'text-yellow-500': isOffline,
                    'text-green-500': !isOffline && !hasUnsavedChanges,
                    'text-blue-500': isSyncing || hasUnsavedChanges,
                  }"
                  >{{ syncStatusText }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus class="h-4 w-4 mr-2" />
              New Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Choose a Template</DialogTitle>
            </DialogHeader>
            <div class="grid grid-cols-2 gap-4">
              <button
                v-for="template in templates.Documents"
                :key="template.name"
                class="h-24 flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 hover:border-primary-500 transition-colors"
                @click="
                  router.push(
                    template.name.toLowerCase().includes('blank')
                      ? '/docs'
                      : `/docs/t/${template.name}`
                  )
                "
              >
                <component :is="template.icon" class="w-8 h-8" />
                <span class="mt-2 text-sm">{{ template.name }}</span>
              </button>
            </div>
          </DialogContent>
        </Dialog>
        <Button variant="outline" @click="shareDocument">
          <Share2 class="h-4 w-4 mr-2" />
          Share
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User class="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    <umo-editor
      v-if="editorInitialized && translationsLoaded"
      ref="editorRef"
      v-bind="options"
      @saved="handleSavedEvent"
      @created="handleEditorCreated"
    />
    <div v-else class="flex-1 flex items-center justify-center">
      <div class="animate-pulse text-gray-500">
        Loading editor...
      </div>
    </div>
  </div>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

#doc {
  flex: 1;
}

#docHead {
  outline: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
  -webkit-user-modify: read-write;
  -moz-user-modify: read-write;
  user-modify: read-write;
}

#docHead[contenteditable="true"] {
  outline: 2px solid #4d7cfe;
  border-radius: 4px;
  padding: 2px 6px;
  caret-color: #4d7cfe;
}

/* Prevent unwanted behaviors */
#docHead br {
  display: none;
}

#docHead * {
  display: inline;
  white-space: nowrap;
}

#docHead {
  contain: content;
  white-space: pre-wrap;
}

#docHead:empty::before {
  content: attr(aria-placeholder);
  color: #999;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.sync-status.offline {
  color: #f59e0b;
  background-color: #fef3c7;
}

.sync-status.syncing {
  color: #3b82f6;
  background-color: #eff6ff;
}

.sync-status.saved {
  color: #10b981;
  background-color: #ecfdf5;
}

.loading-bar {
  @apply fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50 overflow-hidden;
}

.loading-progress {
  @apply h-full bg-primary-600;
  width: 30%;
  animation: loading 2s infinite ease-in-out;
}

@keyframes loading {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(300%);
  }
}
</style>
