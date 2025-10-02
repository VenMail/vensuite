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
import { PaginationPlus } from "tiptap-pagination-plus";
import { PaginationTable } from "tiptap-table-plus";
import { ImagePlus } from "tiptap-image-plus";
import { useFileStore } from "@/store/files";
import { FileData } from "@/types";
import Button from "@/components/ui/button/Button.vue";
import UserProfile from "@/components/layout/UserProfile.vue";
import UnifiedMenubar from "@/components/menu/UnifiedMenubar.vue";
import { createYSocketProvider } from "@/lib/yProviderCustom";
import { useAuthStore } from "@/store/auth";
import VenEditor from "@/components/forms/VenEditor.vue";
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
import ShareCard from '@/components/ShareCard.vue'
import axios from 'axios'

const { TablePlus, TableRowPlus, TableCellPlus, TableHeaderPlus } = PaginationTable;

const route = useRoute();
const router = useRouter();
const fileStore = useFileStore();
const authStore = useAuthStore();

const useVenEditor = computed(() => import.meta.env.VITE_USE_VEN_EDITOR === "true");

const paginationExtensions = [
  TablePlus,
  TableRowPlus,
  TableCellPlus,
  TableHeaderPlus,
  PaginationPlus.configure({
    pageHeight: 842,
    pageGap: 20,
    pageBreakBackground: "#F7F7F8",
    pageHeaderHeight: 24,
    pageFooterHeight: 24,
    footerLeft: "Page {page}",
    marginTop: 30,
    marginBottom: 48,
    contentMarginTop: 24,
    contentMarginBottom: 24,
  }),
  ImagePlus.configure({
    inline: false,
  }),
];

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
// Share members state (can be hydrated from API later)
const shareMembers = ref<Array<{ email: string; name?: string; avatarUrl?: string; permission: 'view' | 'comment' | 'edit' }>>([])
const lastSaveResult = ref<{
  success: boolean;
  offline: boolean;
  error: string | null;
} | null>(null);

type SaveTrigger = "manual" | "auto" | "title" | "external";

type SaveResponse = {
  success: boolean;
  offline: boolean;
  error: string | null;
};

interface UmoSaveRequestDetail {
  id?: string;
  content: string;
  title?: string;
  resolve: (result: SaveResponse) => void;
  claimed?: boolean;
}

const UMO_SAVE_EVENT = "umo-doc-save-request";

let latestSavePromise: Promise<SaveResponse> | null = null;

function completeSave(detail: UmoSaveRequestDetail, response: SaveResponse) {
  try {
    detail.claimed = true;
    detail.resolve(response);
  } catch (err) {
    console.warn("Failed to resolve UMO save request", err);
  }
}

function attachEditorUpdateListener(handler: () => void) {
  try {
    if (!editorRef.value?.on) return;
    if (editorUpdateHandler && typeof editorRef.value?.off === "function") {
      editorRef.value.off("update", editorUpdateHandler);
    }
    editorUpdateHandler = handler;
    editorRef.value.on("update", editorUpdateHandler);
  } catch (err) {
    console.warn("Failed to attach editor listener", err);
  }
}

function detachEditorUpdateListener() {
  try {
    if (editorUpdateHandler && typeof editorRef.value?.off === "function") {
      editorRef.value.off("update", editorUpdateHandler);
    }
  } catch (err) {
    console.warn("Failed to detach editor listener", err);
  } finally {
    editorUpdateHandler = null;
  }
}

function handleUmoSaveEvent(event: Event) {
  const customEvent = event as CustomEvent<UmoSaveRequestDetail>;
  const detail = customEvent.detail;
  if (!detail || detail.claimed) return;

  const docId = (route.params.id as string) || currentDoc.value?.id;
  if (detail.id && docId && detail.id !== docId) {
    return;
  }

  const content = detail.content ?? editorRef.value?.getContent?.() ?? "";
  const titleOverride = detail.title ?? title.value;

  detail.claimed = true;
  hasUnsavedChanges.value = true;

  syncChanges("external", { content, titleOverride })
    .then((result) => {
      completeSave(detail, result);
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Sync failed";
      completeSave(detail, {
        success: false,
        offline: !fileStore.isOnline,
        error: message,
      });
    });
}

function handleManualSave() {
  syncChanges("manual").catch(() => {
    /* result recorded */
  });
}

// Collaboration state (harmonized with RunSheet)
const { initializeWebSocket } = useWebSocket();
const wsService = ref<IWebsocketService | null>(null);
const isConnected = computed(() => WebSocketService?.isConnected.value);
const isJoined = ref(false);
const userId = ref(`user-${Math.random().toString(36).substr(2, 9)}`);
const userName = ref(`User ${Math.floor(Math.random() * 1000)}`);
const chatMessages = ref<Message[]>([]);
const collaborators = ref<Record<string, { name: string; selection: any; ts: number }>>({});

// Filter out stale collaborators (>20s inactivity)
const filteredCollaborators = computed(() => {
  const result: Record<string, { name: string; selection: any; ts: number }> = {};
  const now = Date.now();
  Object.entries(collaborators.value).forEach(([uid, c]) => {
    if (!c?.ts || now - c.ts <= 20000) result[uid] = c;
  });
  return result;
});
const isChatOpen = ref(false);
const newChatMessage = ref("");
const chatInput = ref<HTMLTextAreaElement | null>(null);
const chatMessagesContainer = ref<HTMLElement | null>(null);
const replyingTo = ref<Message | null>(null);
const textareaHeight = ref("40px");

// Layout/formatting toggles (toolbar hooks or keyboard shortcuts)
const showFormattingMarks = ref(false);

// Track last loaded document id to avoid duplicate reloads that may trigger large-file fallback
const lastLoadedId = ref<string | null>(null);

// Large-file handling (docs)
const isLarge = ref(false);
const downloadUrl = ref<string | null>(null);

// Public access / interstitial state
const accessDenied = ref(false);
const requestEmail = ref("");
const accessLevel = ref<'v'|'c'|'e'>("v");
const requestMessage = ref("");
const requestSubmitting = ref(false);
const requestSuccess = ref<string | null>(null);

function goToLogin() {
  router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
}

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

// Request access API call
async function submitAccessRequest() {
  if (!route.params.id) return;
  requestSubmitting.value = true;
  requestSuccess.value = null;
  try {
    const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
    const res = await fetch(`${API_BASE_URI}/app-files/${route.params.id}/request-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: requestEmail.value,
        access_level: accessLevel.value,
        message: requestMessage.value || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok && (data?.requested || data?.success)) {
      requestSuccess.value = 'Access request sent. You will receive an email when approved.';
      toast.success('Access request sent');
    } else {
      requestSuccess.value = data?.message || 'Request sent (if the email is valid).';
      toast.message(requestSuccess.value || '');
    }
  } catch (e) {
    requestSuccess.value = 'Request submitted. Please check your email later.';
    toast.message(requestSuccess.value || '');
  } finally {
    requestSubmitting.value = false;
  }
}

const lastSavedText = computed(() => {
  const d = lastSavedAt.value || (currentDoc.value?.updated_at ? new Date(currentDoc.value.updated_at as any) : null);
  if (!d) return "Never saved";
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
  // Do not initialize collaboration for guests
  if (!authStore.isAuthenticated) return;
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
      } else {
        // When large, skip setting editor content to prevent unnecessary re-render loops
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
    syncChanges("auto").catch(() => {
      /* result already stored */
    });
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
  // v8+ configuration per docs
  // https://dev.umodoc.com/en/docs/next/changelog (v8.0+)
  // https://editor.umodoc.com/en/docs/options (toolbar keys removed/changed)
  extensions: paginationExtensions,
  // Match previous behavior by disabling legacy items formerly in toolbar.disableMenuItems
  disableExtensions: ['chineseDate', 'chinese-date', 'chinese-case', 'break-marks', 'line-breaks', 'page-break'],
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
  // toolbar removed for v8.1.0 compatibility; re-add with supported keys after confirming docs
});

// Formatting marks toggle via editor commands
function toggleFormattingMarks() {
  showFormattingMarks.value = !showFormattingMarks.value;
  try {
    const ed: any = editorRef.value?.editor || editorRef.value;
    if (showFormattingMarks.value) {
      ed?.commands?.showInvisibleCharacters?.();
    } else {
      ed?.commands?.hideInvisibleCharacters?.();
    }
  } catch {}
}

const titleRef = ref<HTMLElement | null>(null);
const editorRef = ref<any>(null);
// Yjs collaboration (optional)
const yProviderRef = ref<any>(null);
const yDocRef = ref<any>(null);
const yTextRef = ref<any>(null);
let isApplyingRemote = false;
let presenceIntervalId: any = null; // reserved if needed later
let pushIntervalId: any = null;
let editorUpdateHandler: ((...args: any[]) => void) | null = null;
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

const defaultEditorUpdateHandler = () => {
  if (isApplyingRemote) return;
  hasUnsavedChanges.value = true;
  pushLocalToY();
  emitPresence();
};

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

      // Large-file handling: respect backend flag but avoid flipping if we already have rendered content
      try {
        const anyDoc: any = doc;
        const reportedLarge = !!anyDoc?.is_large;
        const contentLen = (doc.content?.length || 0);
        // Only treat as large if backend flagged AND there is no real content to render
        // Allow preview when content is present (e.g., after import or cached HTML)
        if (reportedLarge && contentLen < 1024) {
          isLarge.value = true;
          const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
          downloadUrl.value = anyDoc.download_url || (anyDoc.file_url ? `${API_BASE_URI}/app-files/${id}/download` : null);
        } else {
          isLarge.value = false;
        }
      } catch {}

      // Initialize lastSavedAt from server timestamps for existing documents
      try {
        const ts = (doc as any).updated_at || (doc as any).created_at;
        if (ts) lastSavedAt.value = new Date(ts);
      } catch {}

      // Update title references
      title.value = doc.title || "Untitled Document";
      document.title = title.value;

      if (!isLarge.value) {
        // Ensure we have content to display - use default template if empty
        const contentToDisplay = doc.content || DEFAULT_BLANK_DOCUMENT_TEMPLATE;
        console.log(`Setting editor content, length: ${contentToDisplay.length}`);

        // Use safe method to set editor content
        await setEditorContent(contentToDisplay, title.value);
      } else {
        // When large, skip setting editor content to prevent unnecessary re-render loops
      }

      console.log(
        `Document loaded successfully. Title: ${title.value}, Content length: ${doc.content?.length || 0
        }`
      );

      // Update URL if document ID doesn't match route (shouldn't happen with simplified approach)
      if (doc.id !== route.params.id) {
        console.log(`Updating URL to use document ID: ${doc.id}`);
        router.replace(`/docs/${doc.id}`);
      }

      // Permission handling for public shares (view/edit without auth)
      try {
        const priv = Number((doc as any)?.privacy_type ?? (doc as any)?.privacyType);
        const unauth = !authStore.isAuthenticated;
        const canEdit = !unauth || [2,4].includes(priv); // 2=everyone_edit,4=link_edit
        options.value.document.readOnly = !canEdit;
      } catch {}
    } else {
      // If unauthenticated and no document is available, show access request interstitial instead of creating a new doc
      if (!authStore.isAuthenticated) {
        accessDenied.value = true;
        requestEmail.value = authStore.email || "";
        return;
      } else {
        // Authenticated but not found: fall back to new doc flow
        console.log("Document not found, creating new document");
        const newDoc = await fileStore.createNewDocument("docx", "New Document");
        currentDoc.value = newDoc;
        title.value = newDoc.title || "New Document";
        document.title = title.value;
  
        // Set default template in editor using safe method instead of empty string
        await setEditorContent(DEFAULT_BLANK_DOCUMENT_TEMPLATE, title.value);
  
        router.replace(`/docs/${newDoc.id}`);
      }
    }
    hasUnsavedChanges.value = false;
  } catch (error) {
    console.error("Failed to load document:", error);
    toast.error("Failed to load document");
  } finally {
    isLoading.value = false;
  }
}

async function syncChanges(
  _trigger: SaveTrigger = "manual",
  payload: { content?: string; titleOverride?: string } = {}
): Promise<SaveResponse> {
  const failure = (error: string): SaveResponse => {
    const result: SaveResponse = { success: false, offline: !fileStore.isOnline, error };
    lastSaveResult.value = result;
    return result;
  };

  if (options.value.document.readOnly) {
    return failure("Document is read-only");
  }

  if (!currentDoc.value) {
    return failure("Document not loaded");
  }

  if (isSyncing.value && latestSavePromise) {
    return latestSavePromise;
  }

  const performSave = async (): Promise<SaveResponse> => {
    isSyncing.value = true;
    try {
      const requestedTitle = payload.titleOverride ?? title.value ?? "";
      const nextTitle = requestedTitle.trim() || "New Document";

      if (nextTitle !== title.value) {
        title.value = nextTitle;
        editableTitle.value = nextTitle;
        document.title = nextTitle;
        try {
          if (editorRef.value?.setTitle) {
            await editorRef.value.setTitle(nextTitle);
          } else if (editorRef.value?.setDocument) {
            editorRef.value.setDocument({ title: nextTitle });
          }
        } catch (err) {
          console.warn("Failed to update editor title", err);
        }
      }

      const content = payload.content ?? editorRef.value?.getContent?.() ?? "";

      const docToSave = {
        ...currentDoc.value,
        content,
        title: nextTitle,
        file_type: "docx",
        is_folder: false,
        last_viewed: new Date(),
      } as FileData;

      const result = await fileStore.saveDocument(docToSave);

      if (result.shouldRedirect && result.redirectId && result.redirectId !== route.params.id) {
        console.log("Document got new server ID, redirecting to:", result.redirectId);
        await router.replace(`/docs/${result.redirectId}`);
        currentDoc.value = result.document;
      } else {
        currentDoc.value = result.document;
      }

      const response: SaveResponse = {
        success: true,
        offline: !fileStore.isOnline,
        error: null,
      };

      hasUnsavedChanges.value = false;
      lastSaveResult.value = response;
      lastSavedAt.value = new Date();

      return response;
    } catch (error) {
      console.error("Sync error:", error);
      const message = error instanceof Error ? error.message : "Sync failed";
      return failure(message);
    } finally {
      isSyncing.value = false;
      latestSavePromise = null;
    }
  };

  latestSavePromise = performSave();
  return latestSavePromise;
}

function handleSavedEvent(result: any) {
  console.log("result:", result);
  lastSaveResult.value = result;
  console.log("last save result:", lastSaveResult.value);
  lastSavedAt.value = new Date();
}

async function saveTitle() {
  if (options.value.document.readOnly) return;
  const newTitle = editableTitle.value.trim();
  title.value = newTitle || "New Document";
  document.title = title.value;
  isTitleEdit.value = false;
  editorRef.value?.setDocument({ title: title.value });

  if (currentDoc.value) {
    if (options.value.document.readOnly) return;
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
      handleManualSave();
    }
  }

  // Broadcast title change for collaboration
  const id = (route.params.id as string) || currentDoc.value?.id;
  if (id) {
    if (options.value.document.readOnly) return;
    try {
      wsService.value?.sendMessage(id, 'title', { title: title.value }, userId.value, userName.value);
    } catch (e) {
      // non-blocking
    }
  }
}

function startEditing() {
  // Disallow editing title in readOnly
  if (options.value.document.readOnly) return;
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
  window.addEventListener(UMO_SAVE_EVENT, handleUmoSaveEvent as EventListener);

  console.log("RunDoc component mounted, initializing editor");

  // Initialize the editor
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.setLocale("en-US");
      console.log("Editor initialized");
      // Ensure formatting marks are hidden by default via command API
      try {
        const ed: any = editorRef.value?.editor || editorRef.value;
        ed?.commands?.hideInvisibleCharacters?.();
      } catch {}
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
        if (lastLoadedId.value === docId && currentDoc.value) {
          // Already loaded this doc; avoid redundant reload that can flip UI state
          return;
        }
        console.log("Route changed, loading document with ID:", docId);

        try {
          lastLoadedId.value = docId;
          if (isLoading.value) return; // guard against concurrent loads
          await loadData(docId);
        } catch (error) {
          console.error("Failed to load document:", error);
          toast.error("Failed to load document");
          lastLoadedId.value = null; // allow retry
        }

        // Initialize and join collaboration room after data load (authenticated only)
        if (authStore.isAuthenticated && !isLarge.value) {
          initializeWebSocketAndJoinRoom();
        }

        // Custom Yjs transport over uWebSockets: enable only when not large
        try {
          if (isLarge.value) throw new Error('skip-yjs-for-large');
          // @ts-ignore -- dynamic import, types optional
          const Y = await import('yjs');
          yDocRef.value = new Y.Doc();
          yTextRef.value = yDocRef.value.getText(`doc:${docId}`);
          const binaryUrl = `${SOCKET_URI}?sheetId=${docId}&userName=${encodeURIComponent(userName.value)}&userId=${encodeURIComponent(userId.value)}&channel=crdt`;
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
          attachEditorUpdateListener(defaultEditorUpdateHandler);
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

        // Initialize and join collaboration room (authenticated only)
        if (authStore.isAuthenticated) initializeWebSocketAndJoinRoom();
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
      if (!editorUpdateHandler) {
        attachEditorUpdateListener(defaultEditorUpdateHandler);
      }
    }, 100);
  });
}

onUnmounted(() => {
  window.removeEventListener("online", updateOnlineStatus);
  window.removeEventListener("offline", updateOnlineStatus);
  window.removeEventListener(UMO_SAVE_EVENT, handleUmoSaveEvent as EventListener);
  detachEditorUpdateListener();
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
  // Hydrate sharing list from API when opening
  fetchSharingInfo();
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

// --- Sharing API integration ---
const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
const FILES_ENDPOINT = `${API_BASE_URI}/app-files`

const permToApi: Record<'view'|'comment'|'edit', 'v'|'c'|'e'> = { view: 'v', comment: 'c', edit: 'e' }
const apiToPerm: Record<'v'|'c'|'e', 'view'|'comment'|'edit'> = { v: 'view', c: 'comment', e: 'edit' }

function parseSharingInfoString(info?: string | null) {
  const list: Array<{ email: string; permission: 'view'|'comment'|'edit' }> = []
  if (!info || typeof info !== 'string') return list
  info.split(',').map(s => s.trim()).filter(Boolean).forEach(pair => {
    const [email, access] = pair.split(':').map(x => (x || '').trim())
    if (email && (access === 'v' || access === 'c' || access === 'e')) {
      list.push({ email, permission: apiToPerm[access] })
    }
  })
  return list
}

async function fetchSharingInfo() {
  try {
    const id = (route.params.id as string) || currentDoc.value?.id
    if (!id) return
    const token = fileStore.getToken?.()
    const res = await axios.get(`${FILES_ENDPOINT}/${id}` , {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    const data = res.data?.data || {}
    const parsed = parseSharingInfoString(data.sharing_info)
    shareMembers.value = parsed
    if (typeof data.privacy_type === 'number') privacyType.value = Number(data.privacy_type)
  } catch (e) {
    // non-blocking
  }
}

async function handleInviteMember(payload: { email: string; permission: 'view'|'comment'|'edit'|'owner'; note?: string }) {
  try {
    const id = (route.params.id as string) || currentDoc.value?.id
    if (!id) return
    const token = fileStore.getToken?.()
    await axios.post(`${FILES_ENDPOINT}/${id}/share`, {
      email: payload.email,
      access_level: permToApi[payload.permission as 'view'|'comment'|'edit'] || 'e',
      note: payload.note
    }, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    await fetchSharingInfo()
    toast.success('Shared successfully')
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Failed to share')
  }
}

async function handleUpdateMember(payload: { email: string; permission: 'view'|'comment'|'edit'|'owner' }) {
  // Backend share endpoint overwrites the level when called again
  return handleInviteMember(payload as { email: string; permission: 'view'|'comment'|'edit' })
}

async function handleRemoveMember(payload: { email: string }) {
  try {
    const id = (route.params.id as string) || currentDoc.value?.id
    if (!id) return
    const token = fileStore.getToken?.()
    await axios.post(`${FILES_ENDPOINT}/${id}/unshare`, { email: payload.email }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    await fetchSharingInfo()
    toast.success('Removed access')
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Failed to remove access')
  }
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

// Large file download helper (docs)
function downloadFile() {
  if (downloadUrl.value) {
    try {
      window.open(downloadUrl.value, '_blank');
    } catch {}
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
        <Button variant="ghost" size="icon" @click="router.back()">
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
        <span class="text-sm text-gray-600 cursor-pointer" title="Click to save now" @click="handleManualSave">{{ lastSavedText }}</span>
        <Dialog v-model:open="shareOpen">
          <DialogTrigger asChild>
            <Button variant="outline" @click="shareDocument">
              <Share2 class="h-4 w-4 mr-2" />
              Share
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share</DialogTitle>
            </DialogHeader>
            <ShareCard
             @close="shareOpen = false" 
              mode="doc"
              :share-link="shareLinkDoc"
              :privacy-type="privacyType"
              :members="shareMembers"
              :can-edit-privacy="authStore.isAuthenticated"
              @copy-link="copyShareLink"
              @change-privacy="updateVisibility"
              @invite="handleInviteMember"
              @update-member="handleUpdateMember"
              @remove-member="handleRemoveMember"
            />
          </DialogContent>
        </Dialog>
        <UserProfile :isMobile="false" />
      </div>
    </div>
    
    <UnifiedMenubar
      :file-id="route.params.id as string"
      mode="doc"
      :collaborators="filteredCollaborators"
      @toggle-chat="toggleChat"
      @save="handleManualSave"
      @export="handleExport"
      @undo="handleUndo"
      @redo="handleRedo"
      @toggle-formatting-marks="toggleFormattingMarks"
    />
    <!-- Access request interstitial for unauthenticated private docs -->
    <div v-if="accessDenied" class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow p-6">
        <div class="mb-4">
          <h2 class="text-lg font-semibold">Request access to this document</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">This document is private. Enter your email to request access from the owner.</p>
        </div>
        <form @submit.prevent="submitAccessRequest" class="space-y-3">
          <div>
            <label class="block text-sm font-medium mb-1">Email</label>
            <input v-model="requestEmail" type="email" required class="w-full border rounded px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700" placeholder="you@example.com" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Requested access</label>
            <select v-model="accessLevel" class="w-full border rounded px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700">
              <option value="v">View</option>
              <option value="c">Comment</option>
              <option value="e">Edit</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Message (optional)</label>
            <textarea v-model="requestMessage" rows="3" class="w-full border rounded px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700" placeholder="Add a note to the owner"></textarea>
          </div>
          <div class="flex items-center justify-between pt-2">
            <Button type="submit" :disabled="requestSubmitting || !requestEmail" variant="default">
              <span v-if="!requestSubmitting">Request access</span>
              <span v-else>Sending...</span>
            </Button>
            <div class="flex items-center gap-3">
              <span v-if="requestSuccess" class="text-sm text-green-600">{{ requestSuccess }}</span>
              <Button type="button" variant="outline" @click="goToLogin">Sign in</Button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Large file panel -->
    <div v-else-if="isLarge" class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow p-6 text-center">
        <h2 class="text-lg font-semibold mb-2">This document is large</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">The file is too large to preview online. You can download it to view locally.</p>
        <Button variant="default" @click="downloadFile" :disabled="!downloadUrl">Download file</Button>
      </div>
    </div>

    <!-- Editor when access is allowed -->
    <div v-else class="relative w-full h-full">
      <component
        :is="useVenEditor ? VenEditor : 'umo-editor'"
        ref="editorRef"
        v-bind="useVenEditor ? undefined : options"
        v-if="!useVenEditor"
        @saved="handleSavedEvent"
        @created="handleEditorCreated"
      />
      <VenEditor
        v-else
        ref="editorRef"
        :modelValue="currentDoc?.content || DEFAULT_BLANK_DOCUMENT_TEMPLATE"
        :title="title"
        :editable="!options.document.readOnly"
        :pagination="paginationConfig"
        @update:modelValue="handleVenEditorUpdate"
        @update:title="handleVenTitleUpdate"
        @transaction="handleVenTransaction"
        @ready="handleVenReady"
      />
    </div>
    <div v-if="!accessDenied && isChatOpen" class="fixed right-0 bottom-0 w-80 h-96 z-50 bg-white border-l border-t border-gray-200 shadow-lg flex flex-col">
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
/* Page break visuals disabled */
.umo-page-break { display: none !important; }
.umo-page-footer { display: none !important; }

/* Print pagination */
@media print {
  .umo-page-break { display: none !important; }
  .umo-page-footer { display: none !important; }
}
</style>
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
