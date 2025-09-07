<script setup lang="ts">
import * as defaultIcons from "@iconify-prerendered/vue-file-icons";
import { nextTick, onMounted, ref, watchEffect, computed, onUnmounted, watch } from "vue";

import "@/assets/index.css";
import {
  PencilIcon,
  ArrowLeft,
  Share2,
  Wifi,
  WifiOff,
} from "lucide-vue-next";
import { useDebounceFn, useFavicon } from "@vueuse/core";
import { useRoute, useRouter } from "vue-router";
//@ts-ignore
import { UmoEditor } from "@umoteam/editor";
import { useFileStore } from "@/store/files";
import { FileData } from "@/types";
import Button from "@/components/ui/button/Button.vue";
import UnifiedMenubar from "@/components/menu/UnifiedMenubar.vue";
import { createYSocketProvider } from "@/lib/yProviderCustom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "vue-sonner";
import { RESUME_TEMPLATE, LETTER_TEMPLATE, DEFAULT_BLANK_DOCUMENT_TEMPLATE } from "@/assets/doc-data";
import { IWebsocketService, Message, useWebSocket, WebSocketService } from "@/lib/wsService";

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
const editorReady = ref(false);
const isInitializing = ref(false);
const lastSavedAt = ref<Date | null>(null);
const shareOpen = ref(false);
// privacy_type: 1=everyone_view,2=everyone_edit,3=link_view,4=link_edit,5=org_view,6=org_edit,7=explicit
const privacyType = ref<number>(7);
const lastSaveResult = ref<{
  success: boolean;
  offline: boolean;
  error: string | null;
} | null>(null);

// Collaboration state (harmonized with RunSheet)
const { initializeWebSocket } = useWebSocket();
const wsService = ref<IWebsocketService | null>(null);
const isConnected = computed(() => WebSocketService?.isConnected.value);
const isJoined = ref(false);
const userId = ref(`user-${Math.random().toString(36).substr(2, 9)}`);
const userName = ref(`User ${Math.floor(Math.random() * 1000)}`);
const chatMessages = ref<Message[]>([]);
const collaborators = ref<Record<string, { name: string; selection: any; ts: number }>>({});
const isChatOpen = ref(false);
const newChatMessage = ref("");
const chatInput = ref<HTMLTextAreaElement | null>(null);
const chatMessagesContainer = ref<HTMLElement | null>(null);
const replyingTo = ref<Message | null>(null);
const textareaHeight = ref("40px");

// Computed properties
const syncStatus = computed(() => {
  if (isOffline.value) return "offline";
  if (isSyncing.value) return "syncing";
  if (hasUnsavedChanges.value) return "unsaved";
  return "saved";
});

const syncStatusText = computed(() => {
  if (isInitializing.value) return "Setting up document...";
  if (!editorReady.value) return "Loading editor..."; 
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

// Deterministic color picker for user IDs (shared approach with sheets)
function colorForUser(uid: string) {
  const palette = [
    '#2563EB', '#9333EA', '#16A34A', '#DC2626', '#F59E0B',
    '#0EA5E9', '#7C3AED', '#059669', '#D97706', '#DB2777'
  ]
  let hash = 0
  for (let i = 0; i < uid.length; i++) hash = ((hash << 5) - hash) + uid.charCodeAt(i)
  const idx = Math.abs(hash) % palette.length
  return palette[idx]
}

const lastSavedText = computed(() => {
  if (!lastSavedAt.value) return "Never saved";
  const d = lastSavedAt.value;
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `Last saved at ${hh}:${mm}`;
});

const shareLinkDoc = computed(() => {
  const id = (route.params.id as string) || currentDoc.value?.id;
  if (!id) return "";
  return `${window.location.origin}/docs/${id}`;
});

// Socket base URL (same as RunSheet)
const SOCKET_URI = import.meta.env.SOCKET_BASE_URL || "ws://app.venmail.io:8443";

function initializeWebSocketAndJoinRoom() {
  const id = (route.params.id as string) || currentDoc.value?.id;
  if (id && !wsService.value) {
    wsService.value = initializeWebSocket(`${SOCKET_URI}?sheetId=${id}&userName=${userName.value}&userId=${userId.value}`);
    joinRoom();
  }
}

// Collaboration: handle incoming messages and chat helpers
function handleIncomingMessage(message: Message) {
  const id = (route.params.id as string) || currentDoc.value?.id;
  if (!id || message.sheetId !== id) return;

  if ((message as any).messages) {
    // init bundle
    return (message as any).messages?.forEach(handleIncomingMessage);
  }

  switch (message.type) {
    case 'chat':
      handleChatMessage(message);
      break;
    case 'cursor':
      if (message.user?.id && message.user?.name) {
        collaborators.value[message.user.id] = {
          name: message.user.name,
          selection: (message as any).content?.selection,
          ts: Date.now()
        };
      }
      break;
    case 'title':
      // Ignore echo from self
      if (message.user?.id !== userId.value && typeof (message as any).content?.title === 'string') {
        const t = (message as any).content.title as string;
        title.value = t;
        document.title = t;
        try { editorRef.value?.setDocument?.({ title: t }); } catch {}
      }
      break;
  }
}

// Removed global WebSocketService.messages watcher to avoid duplicate handling; we rely on joinSheet listener.

function sendChatMessage() {
  const id = (route.params.id as string) || currentDoc.value?.id;
  if (!id) return;
  const msg = newChatMessage.value;
  if (msg.trim()) {
    wsService.value?.sendMessage(id, 'chat', { message: msg }, userId.value, userName.value);
    adjustTextareaHeight();
    replyingTo.value = null;
    newChatMessage.value = '';
  }
}

function handleChatMessage(messageInfo: Message) {
  chatMessages.value.push(messageInfo);
  scrollToBottom();
}

function adjustTextareaHeight() {
  if (chatInput.value) {
    chatInput.value.style.height = '40px';
    chatInput.value.style.height = `${Math.min(chatInput.value.scrollHeight, 150)}px`;
    textareaHeight.value = chatInput.value.style.height;
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatMessagesContainer.value) {
      chatMessagesContainer.value.scrollTop = chatMessagesContainer.value.scrollHeight;
    }
  });
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString();
}

function replyToMessage(message: Message) {
  replyingTo.value = message;
  chatInput.value?.focus();
}

function cancelReply() {
  replyingTo.value = null;
}

function getReplyUserName(replyId: string) {
  const replyMessage = chatMessages.value.find(msg => (msg as any).id === replyId) as any;
  return replyMessage ? replyMessage.user.name : 'Unknown User';
}

function getReplyContent(replyId: string) {
  const replyMessage = chatMessages.value.find(msg => (msg as any).id === replyId) as any;
  return replyMessage ? replyMessage.content.message : '';
}

function joinRoom() {
  const id = (route.params.id as string) || currentDoc.value?.id;
  if (isJoined.value || !id) return;
  if (wsService.value) {
    try {
      isJoined.value = wsService.value.joinSheet(id, handleIncomingMessage);
      // console.log('Joined room:', id)
    } catch (error) {
      console.error('Error joining room:', error);
    }
  }
}

// Watch for connection status to re-join if needed
watch(isConnected, (newVal) => {
  if (newVal) {
    joinRoom();
  } else {
    isJoined.value = false;
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

const options = ref({
  document: {
    title: "Untitled Document",
    content: DEFAULT_BLANK_DOCUMENT_TEMPLATE,
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
  translations: {
    base: {
      color: {
        text: "Font Colour",
      },
      bgColor: {
        text: "Font Background",
      },
    },
  },
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
});

const titleRef = ref<HTMLElement | null>(null);
const editorRef = ref<any>(null);
// Yjs collaboration (optional)
const yProviderRef = ref<any>(null);
const yDocRef = ref<any>(null);
const yTextRef = ref<any>(null);
let isApplyingRemote = false;
let presenceIntervalId: any = null; // reserved if needed later
let pushIntervalId: any = null;
let domObserver: MutationObserver | null = null;
let mutationScheduled = false;

// Debounced presence emitter
const emitPresence = useDebounceFn(() => {
  try {
    const idNow = (route.params.id as string) || currentDoc.value?.id;
    if (!idNow) return;
    wsService.value?.sendMessage(idNow, 'cursor', { selection: null }, userId.value, userName.value);
  } catch {}
}, 200, { maxWait: 1000 });

// Hoisted helper: push local editor content into Yjs doc (guarded)
function pushLocalToY() {
  try {
    if (!editorRef.value || !yTextRef.value) return;
    if (isApplyingRemote) return; // avoid echo
    const content = editorRef.value?.getContent?.() || '';
    const cur = yTextRef.value.toString();
    if (content !== cur) {
      yTextRef.value.delete(0, cur.length);
      yTextRef.value.insert(0, content);
    }
  } catch {}
}

function setupDomObserver() {
  try {
    if (domObserver) {
      try { domObserver.disconnect(); } catch {}
      domObserver = null;
    }
    const hostEl: any = editorRef.value?.$el || (document.querySelector('umo-editor') as HTMLElement | null);
    if (!hostEl) return;
    domObserver = new MutationObserver(() => {
      if (mutationScheduled) return;
      mutationScheduled = true;
      setTimeout(() => {
        mutationScheduled = false;
        pushLocalToY();
      }, 200);
    });
    domObserver.observe(hostEl, { childList: true, characterData: true, subtree: true });
  } catch {}
}

// Safe method to set editor content - waits for editor to be ready
async function setEditorContent(content: string, title: string) {
  // Wait for editor to be ready with timeout
  let attempts = 0;
  const maxAttempts = 50; // 2.5 seconds maximum wait
  
  while (!editorReady.value && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 50));
    attempts++;
  }
  
  if (editorRef.value) {
    await nextTick();
    try {
      editorRef.value.setDocument({
        content,
        title,
      });
      editorRef.value.setContent(content);
      console.log("Editor content set safely", {
        contentLength: content.length,
        title,
      });
    } catch (error) {
      console.error("Error setting editor content:", error);
      // Fallback: try again after a delay
      setTimeout(() => {
        try {
          if (editorRef.value) {
            editorRef.value.setDocument({ content, title });
            editorRef.value.setContent(content);
          }
        } catch (retryError) {
          console.error("Retry failed:", retryError);
        }
      }, 500);
    }
  } else {
    console.error("Editor reference not available");
  }
}

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
    const doc = await fileStore.loadDocument(id, "docx");
    console.log("Document loaded:", doc);

    if (doc) {
      // Use the document as-is from the simplified store
      currentDoc.value = doc;

      // Update title references
      title.value = doc.title || "Untitled Document";
      document.title = title.value;

      // Ensure we have content to display - use default template if empty
      const contentToDisplay = doc.content || DEFAULT_BLANK_DOCUMENT_TEMPLATE;
      console.log(`Setting editor content, length: ${contentToDisplay.length}`);

      // Use safe method to set editor content
      await setEditorContent(contentToDisplay, title.value);

      console.log(
        `Document loaded successfully. Title: ${title.value}, Content length: ${doc.content?.length || 0
        }`
      );

      // Update URL if document ID doesn't match route (shouldn't happen with simplified approach)
      if (doc.id !== route.params.id) {
        console.log(`Updating URL to use document ID: ${doc.id}`);
        router.replace(`/docs/${doc.id}`);
      }
    } else {
      console.log(`No document found with ID: ${id}. Creating new document.`);

      // Create new document using the store's method
      const newDoc = await fileStore.createNewDocument("docx", "New Document");
      currentDoc.value = newDoc;
      title.value = newDoc.title || "New Document";
      document.title = title.value;

      // Set default template in editor using safe method instead of empty string
      await setEditorContent(DEFAULT_BLANK_DOCUMENT_TEMPLATE, title.value);

      router.replace(`/docs/${newDoc.id}`);
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

    // Get content from editor and save
    const content = editorRef.value?.getContent() || "";
    const docToSave = {
      ...currentDoc.value,
      content: content,
      title: title.value,
      file_type: "docx", // Explicitly ensure file type is preserved
      is_folder: false, // Explicitly ensure it's not marked as folder
      last_viewed: new Date()
    } as FileData;

    const result = await fileStore.saveDocument(docToSave);

    // Handle redirect for local documents that got server IDs
    if (result.shouldRedirect && result.redirectId && result.redirectId !== route.params.id) {
      console.log("Document got new server ID, redirecting to:", result.redirectId);
      await router.replace(`/docs/${result.redirectId}`);
      // Update current doc reference
      currentDoc.value = result.document;
    } else {
      currentDoc.value = result.document;
    }

    hasUnsavedChanges.value = false;
    lastSaveResult.value = {
      success: true,
      offline: !fileStore.isOnline,
      error: null
    };
    lastSavedAt.value = new Date();
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
  lastSavedAt.value = new Date();
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
      // Update document title with explicit file properties
      currentDoc.value = {
        ...currentDoc.value,
        title: title.value,
        file_type: "docx", // Explicitly ensure file type is preserved
        is_folder: false // Explicitly ensure it's not marked as folder
      };
      hasUnsavedChanges.value = true;

      // Also update the editor's title to stay in sync
      if (editorRef.value?.setTitle) {
        await editorRef.value.setTitle(title.value);
      }

      // Trigger sync to save changes
      syncChanges();
    }
  }

  // Broadcast title change for collaboration
  const id = (route.params.id as string) || currentDoc.value?.id;
  if (id) {
    try {
      wsService.value?.sendMessage(id, 'title', { title: title.value }, userId.value, userName.value);
    } catch (e) {
      // non-blocking
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

// Helper function to get template content
function getTemplateContent(templateName: string): string {
  const name = templateName.toLowerCase();
  if (name.includes('resume')) return RESUME_TEMPLATE;
  if (name.includes('letter')) return LETTER_TEMPLATE;
  return DEFAULT_BLANK_DOCUMENT_TEMPLATE; // Use proper default template instead of empty string
}

// Helper function to get template title
function getTemplateTitle(templateName: string): string {
  const name = templateName.toLowerCase();
  if (name.includes('resume')) return 'Resume';
  if (name.includes('letter')) return 'Letter';
  return 'New Document';
}

onMounted(async () => {
  // Suppress unwanted console messages
  const originalConsoleLog = console.info;
  console.info = (...args) => {
    const message = args.join(' ');
    if (message.includes('Thanks for using Umo Editor') || 
        message.includes('Current version:') || 
        message.includes('More info: ')) {
      return; // Suppress these messages
    }
    originalConsoleLog.apply(console, args);
  };
  
  // Restore original console.info after a delay (after editor initialization)
  setTimeout(() => {
    console.info = originalConsoleLog;
  }, 3000);

  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);

  console.log("RunDoc component mounted, initializing editor");

  // Initialize the editor
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.setLocale("en-US");
      console.log("Editor initialized");
    }
  });

  // Handle template-based new documents first
  if (route.params.template) {
    isInitializing.value = true;
    const templateName = route.params.template as string;
    console.log('Creating new document from template:', templateName);

    const docTitle = getTemplateTitle(templateName);
    const templateContent = getTemplateContent(templateName);

    // Create the document using the store's new method
    const newDoc = await fileStore.createNewDocument('docx', docTitle);

    // Update the document with template content
    if (templateContent) {
      newDoc.content = templateContent;
      // Save the document with template content
      const result = await fileStore.saveDocument(newDoc);
      currentDoc.value = result.document;
    } else {
      currentDoc.value = newDoc;
    }

    title.value = docTitle;
    document.title = docTitle;

    // Use safe method to set editor content
    await setEditorContent(templateContent, docTitle);

    // Navigate to the proper doc URL with the new ID
    await router.replace(`/docs/${newDoc.id}`);
    isInitializing.value = false;
  }
  // Handle existing document with ID or new blank document
  else {
    // Check if document already exists in store and set title immediately
    if (route.params.id) {
      const existingDoc = fileStore.allFiles.find(doc => doc.id === route.params.id);
      if (existingDoc && existingDoc.title) {
        title.value = existingDoc.title;
        document.title = existingDoc.title;
        console.log("Set title from existing store data:", existingDoc.title);
      }
    }

    // Listen to route changes and load document
    watchEffect(async () => {
      // Skip if we're initializing (prevents double execution during template creation)
      if (isInitializing.value) return;
      
      if (route.params.id) {
        const docId = route.params.id as string;
        console.log("Route changed, loading document with ID:", docId);

        try {
          await loadData(docId);
        } catch (error) {
          console.error("Failed to load document:", error);
          toast.error("Failed to load document");
        }

        // Initialize and join collaboration room after data load
        initializeWebSocketAndJoinRoom();

        // Custom Yjs transport over uWebSockets: always enabled for docs
        try {
          // @ts-ignore -- dynamic import, types optional
          const Y = await import('yjs');
          yDocRef.value = new Y.Doc();
          yTextRef.value = yDocRef.value.getText(`doc:${docId}`);
          const binaryUrl = `${SOCKET_URI}?sheetId=${docId}&userName=${encodeURIComponent(userName.value)}&userId=${encodeURIComponent(userId.value)}`;
          yProviderRef.value = createYSocketProvider({ url: binaryUrl, doc: yDocRef.value });

          // Apply remote updates to editor when Y.Text changes
          yTextRef.value.observe(() => {
            if (!editorRef.value) return;
            if (isApplyingRemote) return;
            isApplyingRemote = true;
            try {
              const text = yTextRef.value.toString();
              const current = editorRef.value?.getContent?.() || '';
              if (typeof text === 'string' && text !== current) {
                editorRef.value.setContent(text);
              }
            } finally {
              setTimeout(() => { isApplyingRemote = false; }, 0);
            }
          });

          // Push local edits to Yjs (basic handler)
          try {
            editorRef.value?.on?.('update', pushLocalToY);
            // Also emit lightweight presence on updates (debounced)
            editorRef.value?.on?.('update', () => emitPresence());
          } catch {}
          pushIntervalId = setInterval(pushLocalToY, 1000);
          // DOM observer fallback to detect content changes without using editor APIs
          setupDomObserver();
        } catch (e) {
          console.warn('Custom Yjs transport failed to initialize:', e);
        }

        const iconHTML = iconRef.value?.outerHTML
          .replace(/currentColor/g, "#4d7cfe")
          .replace(/1em/g, "");
        const iconDataURL = `data:image/svg+xml,${encodeURIComponent(iconHTML || "")}`;
        useFavicon(iconDataURL);
      }
      // Handle completely new document without ID (route: /docs)
      else if (route.path === '/docs') {
        console.log('Creating completely new blank document');

        // Create the document using the store's new method
        const newDoc = await fileStore.createNewDocument('docx', 'New Document');
        currentDoc.value = newDoc;
        title.value = 'New Document';
        document.title = title.value;

        // Set default template in editor using safe method instead of empty string
        await setEditorContent(DEFAULT_BLANK_DOCUMENT_TEMPLATE, title.value);

        // Navigate to the proper doc URL with the new ID
        await router.replace(`/docs/${newDoc.id}`);

        // Initialize and join collaboration room
        initializeWebSocketAndJoinRoom();
      }
    });
  }
});

function handleEditorCreated() {
  console.log("Editor component created");
  // Give the editor a moment to fully initialize before marking as ready
  nextTick(() => {
    setTimeout(() => {
      editorReady.value = true;
      console.log("Editor marked as ready");
    }, 100);
  });
}

onUnmounted(() => {
  window.removeEventListener("online", updateOnlineStatus);
  window.removeEventListener("offline", updateOnlineStatus);
  const id = (route.params.id as string) || currentDoc.value?.id;
  if (wsService.value && id) {
    try { wsService.value.leaveSheet(id); } catch {}
  }
  // Yjs cleanup
  try { yProviderRef.value?.destroy?.(); } catch {}
  try { yDocRef.value?.destroy?.(); } catch {}
  if (presenceIntervalId) {
    try { clearInterval(presenceIntervalId); } catch {}
    presenceIntervalId = null;
  }
  if (pushIntervalId) {
    try { clearInterval(pushIntervalId); } catch {}
    pushIntervalId = null;
  }
  if (domObserver) {
    try { domObserver.disconnect(); } catch {}
    domObserver = null;
  }
});

// Removed templates and New Document dialog to unify header

function shareDocument() {
  if (currentDoc.value && typeof currentDoc.value.privacy_type === 'number') {
    privacyType.value = currentDoc.value.privacy_type as number;
  } else {
    privacyType.value = 7;
  }
  shareOpen.value = true;
}

function copyShareLink() {
  const id = (route.params.id as string) || currentDoc.value?.id;
  if (!id) return;
  const url = `${window.location.origin}/docs/${id}`;
  navigator.clipboard.writeText(url).then(() => toast.success("Link copied"));
}

async function updateVisibility(newVis: number) {
  privacyType.value = newVis;
  if (!currentDoc.value) return;
  const updated: FileData = {
    ...currentDoc.value,
    privacy_type: newVis,
    file_type: "docx",
    is_folder: false,
  } as FileData;
  const result = await fileStore.saveDocument(updated);
  currentDoc.value = result.document;
  toast.success("Visibility updated");
}

// Menubar handlers (Docs)
function toggleChat() {
  isChatOpen.value = !isChatOpen.value;
}

function handleUndo() {
  try { editorRef.value?.undo?.() } catch {}
}

function handleRedo() {
  try { editorRef.value?.redo?.() } catch {}
}

async function handleExport(format: string) {
  try {
    // Attempt editor-provided export if available
    if (editorRef.value?.export) {
      await editorRef.value.export({ format });
      return;
    }
    toast.error("Export is not available in this editor");
  } catch (err) {
    console.error("Doc export failed", err);
    toast.error("Export failed");
  }
}
</script>

<template>
  <div id="app" class="h-screen flex flex-col">
    <!-- Loading bar -->
    <div v-if="isLoading" class="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50 overflow-hidden">
      <div class="h-full bg-primary-600 w-1/3 animate-pulse"></div>
    </div>

    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" @click="router.push('/')">
          <ArrowLeft class="h-5 w-5" />
        </Button>
        <router-link to="/">
          <defaultIcons.IconMicrosoftWord ref="iconRef" class="w-[1.5rem] h-[3rem] text-blue-600"
            xmlns="http://www.w3.org/2000/svg" />
        </router-link>
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <div id="docHead" :contenteditable="isTitleEdit" ref="titleRef"
              class="font-bold border-b border-dotted border-gray-300 min-w-[100px] px-2 py-1 relative" :class="{
                'cursor-text': isTitleEdit,
                'hover:bg-gray-100': !isTitleEdit,
              }" @click="startEditing" @input="updateTitle" @blur="saveTitle" @keydown.enter.prevent="saveTitle">
              {{ title }}
            </div>
            <div class="flex items-center gap-2">
              <PencilIcon v-if="!isTitleEdit" @click="startEditing"
                class="h-3 w-3 cursor-pointer hover:text-primary-600" />
              <div class="flex items-center gap-1 text-sm">
                <WifiOff v-if="isOffline" class="h-4 w-4 text-yellow-500" />
                <Wifi v-else class="h-4 w-4 text-green-500" />
                <span :class="{
                  'text-yellow-500': isOffline,
                  'text-green-500': !isOffline && !hasUnsavedChanges,
                  'text-blue-500': isSyncing || hasUnsavedChanges,
                }">{{ syncStatusText }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-600 cursor-pointer" title="Click to save now" @click="syncChanges">{{ lastSavedText }}</span>
        <Dialog v-model:open="shareOpen">
          <DialogTrigger asChild>
            <Button variant="outline" @click="shareDocument">
              <Share2 class="h-4 w-4 mr-2" />
              Share
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share settings</DialogTitle>
            </DialogHeader>
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <button class="px-3 py-1 rounded border" :class="privacyType===7 ? 'bg-gray-100' : ''" @click="updateVisibility(7)">Private</button>
                <button class="px-3 py-1 rounded border" :class="privacyType===3 ? 'bg-gray-100' : ''" @click="updateVisibility(3)">Anyone with link (view)</button>
                <button class="px-3 py-1 rounded border" :class="privacyType===4 ? 'bg-gray-100' : ''" @click="updateVisibility(4)">Anyone with link (edit)</button>
              </div>
              <div class="flex gap-2">
                <input class="flex-1 border rounded px-2 py-1" :value="shareLinkDoc" readonly />
                <Button variant="secondary" @click="copyShareLink">Copy Link</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    
    <UnifiedMenubar
      :file-id="route.params.id as string"
      mode="doc"
      @toggle-chat="toggleChat"
      @save="syncChanges"
      @export="handleExport"
      @undo="handleUndo"
      @redo="handleRedo"
    />
    <!-- Top-right collaborators badges -->
    <div class="fixed top-2 right-2 z-40 flex gap-2">
      <div v-for="(c, uid) in collaborators" :key="uid" class="flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800 rounded-full px-2 py-1 shadow text-xs">
        <div class="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center">
          {{ c.name.charAt(0).toUpperCase() }}
        </div>
        <span class="max-w-[120px] truncate" :title="c.name">{{ c.name }}</span>
      </div>
    </div>
    <div class="relative w-full h-full">
      <!-- Inline collaborator overlays (top-left inside editor) -->
      <div class="absolute top-2 left-2 z-30 flex flex-col gap-1 pointer-events-none">
        <div v-for="(c, uid) in collaborators" :key="uid" class="px-2 py-0.5 rounded-full text-xs text-white font-medium shadow"
             :style="{ backgroundColor: colorForUser(uid) }">
          {{ c.name }}
        </div>
      </div>
      <umo-editor 
        ref="editorRef" 
        v-bind="options" 
        @saved="handleSavedEvent" 
        @created="handleEditorCreated" 
      />
    </div>
    <!-- Collaborators Panel -->
    <div class="fixed bottom-4 left-4 z-40 bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800 rounded shadow px-3 py-2 text-sm">
      <div class="font-semibold mb-1">Collaborators</div>
      <div v-if="Object.keys(collaborators).length === 0" class="text-gray-500">No one else here</div>
      <ul v-else class="space-y-1 max-h-40 overflow-auto">
        <li v-for="(c, uid) in collaborators" :key="uid" class="flex items-center gap-2">
          <div class="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">{{ c.name.charAt(0).toUpperCase() }}</div>
          <span class="truncate max-w-[140px]" :title="c.name">{{ c.name }}</span>
        </li>
      </ul>
    </div>
    <div v-if="isChatOpen" class="fixed right-0 bottom-0 w-80 h-96 z-50 bg-white border-l border-t border-gray-200 shadow-lg flex flex-col">
      <div class="flex justify-between items-center p-3 border-b border-gray-200">
        <h3 class="font-semibold">Chat</h3>
        <button @click="toggleChat" class="p-1 rounded-full hover:bg-gray-200">
          <Share2 class="h-4 w-4 text-gray-600" />
        </button>
      </div>
      <div class="flex-grow overflow-y-auto p-3" ref="chatMessagesContainer">
        <div v-for="message in chatMessages" :key="(message as any).id" class="mb-4">
          <div v-if="(message as any).replyTo" class="ml-4 mb-1 p-2 bg-gray-100 rounded text-sm">
            <span class="font-semibold">{{ getReplyUserName((message as any).replyTo as any) }}:</span>
            {{ getReplyContent((message as any).replyTo as any) }}
          </div>
          <div class="flex items-start">
            <div class="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white font-semibold mr-2">
              {{ (message as any).user.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <div class="flex items-baseline">
                <span class="font-semibold mr-2">{{ (message as any).user.name }}</span>
                <span class="text-xs text-gray-500">{{ formatDate((message as any).timestamp as any) }}</span>
              </div>
              <div class="mt-1">{{ (message as any).content.message }}</div>
              <button @click="replyToMessage(message)" class="text-sm text-blue-500 mt-1">Reply</button>
            </div>
          </div>
        </div>
      </div>
      <div class="p-3 border-t border-gray-200">
        <form @submit.prevent="sendChatMessage" class="flex flex-col">
          <div v-if="replyingTo" class="mb-2 p-2 bg-gray-100 rounded flex justify-between items-start">
            <div class="text-sm">
              <span class="font-semibold">Replying to {{ (replyingTo as any).user.name }}:</span>
              {{ (replyingTo as any).content.message }}
            </div>
            <button @click="cancelReply" class="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
          <div class="flex">
            <textarea
              v-model="newChatMessage"
              placeholder="Type a message..."
              class="flex-grow border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              :style="{ height: textareaHeight }"
              @input="adjustTextareaHeight"
              ref="chatInput"
            ></textarea>
            <button
              type="submit"
              class="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              Send
            </button>
          </div>
        </form>
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

/* Removed @apply rules; using inline classes in template for loading bar */

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
