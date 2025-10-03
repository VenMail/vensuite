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
import type { Editor as TiptapEditor } from "@tiptap/core";
import { useFileStore } from "@/store/files";
import { FileData, EditorSnapshot } from "@/types";
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
import { useDocumentPersistence } from "@/composables/useDocumentPersistence";

const route = useRoute();
const router = useRouter();
const fileStore = useFileStore();
const authStore = useAuthStore();

const paginationDefaults = {
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
};

const paginationConfig = computed(() => ({
  ...paginationDefaults,
}));

const title = ref("New Document");
const editableTitle = ref(title.value);
const isSettingCursor = ref(false);
const isTitleEdit = ref(false);
const titleEditTimeout = ref<NodeJS.Timeout | null>(null);
const isAutoSaving = ref(false);
const isLoading = ref(false);
const isOffline = ref(!navigator.onLine);
const editorReady = ref(false);
const isInitializing = ref(false);
const shareOpen = ref(false);
const isReadOnly = ref(false);

const {
  currentDoc,
  hasUnsavedChanges,
  isSyncing,
  lastSavedAt,
  lastSaveResult,
  markDirty,
  setDocument,
  syncChanges,
} = useDocumentPersistence({
  router,
  readOnly: isReadOnly,
  onAfterSave: (doc) => {
    title.value = doc.title || "New Document";
    editableTitle.value = title.value;
    document.title = title.value;
  },
});

// privacy_type: 1=everyone_view,2=everyone_edit,3=link_view,4=link_edit,5=org_view,6=org_edit,7=explicit
const privacyType = ref<number>(7);
// Share members state (can be hydrated from API later)
const shareMembers = ref<Array<{ email: string; name?: string; avatarUrl?: string; permission: "view" | "comment" | "edit" }>>([]);

let ensureDocPromise: Promise<FileData | null> | null = null;

const ensureCurrentDoc = async (): Promise<FileData | null> => {
  if (currentDoc.value) {
    return currentDoc.value;
  }

  if (!ensureDocPromise) {
    ensureDocPromise = (async () => {
      try {
        const titleSeed = title.value?.trim() || "New Document";
        const created = await fileStore.createNewDocument("docx", titleSeed);
        setDocument(created, { markClean: true });
        currentDoc.value = created;
        return created;
      } catch (error) {
        console.error("Failed to create document before saving", error);
        toast.error("Unable to initialize document. Please try again.");
        return null;
      } finally {
        ensureDocPromise = null;
      }
    })();
  }

  return ensureDocPromise;
};

const updateCurrentDocContent = (content?: string) => {
  if (!currentDoc.value) return;
  currentDoc.value = {
    ...currentDoc.value,
    content,
  } as FileData;
  markDirty();
};

const updateCurrentDocTitle = (nextTitle: string) => {
  if (!currentDoc.value) return;
  currentDoc.value = {
    ...currentDoc.value,
    title: nextTitle,
  } as FileData;
  markDirty();
};

const extractContentPayload = async (snapshot?: EditorSnapshot | null) => {
  const doc = await ensureCurrentDoc();
  if (!doc) {
    return null;
  }

  const html = snapshot?.html ?? venLastTransaction.value?.html ?? venContent.value ?? "";
  const json = snapshot?.json ?? venLastTransaction.value?.json ?? null;

  updateCurrentDocContent(html);
  if (currentDoc.value && json) {
    (currentDoc.value as any).content_json = JSON.stringify(json);
  }

  if (currentDoc.value) {
    currentDoc.value = {
      ...currentDoc.value,
      content: html,
    } as FileData;
  }

  return {
    html,
    json: json ? JSON.stringify(json) : undefined,
  };
};

async function handleEditorSave(snapshot?: EditorSnapshot) {
  if (snapshot) {
    venLastTransaction.value = snapshot;
    venContent.value = snapshot.html;
  }

  const payload = await extractContentPayload(snapshot ?? venLastTransaction.value);
  if (!payload) return;

  try {
    const result = await syncChanges("manual", {
      content: payload.html,
      contentJson: payload.json,
    });

    if (!result.success) {
      const message = result.error || "Save failed";
      toast.error(message);
      return;
    }

    toast.success("Document saved");
  } catch (error) {
    console.error("Toolbar save failed", error);
    toast.error("Save failed");
  }
}

async function handleEditorAutoSave(snapshot: EditorSnapshot) {
  if (isReadOnly.value) return;

  venLastTransaction.value = snapshot;
  venContent.value = snapshot.html;

  const payload = await extractContentPayload(snapshot);
  if (!payload) return;
  isAutoSaving.value = true;

  try {
    const result = await syncChanges("auto", {
      content: payload.html,
      contentJson: payload.json,
    });
    if (!result.success) {
      console.warn("Auto-save failed", result.error);
    }
  } catch (error) {
    console.warn("Auto-save failed", error);
  } finally {
    isAutoSaving.value = false;
  }
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
        venTitle.value = t;
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
  updateCurrentDocTitle(newText);

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

// Formatting marks toggle via editor commands (placeholder until extension support)
function toggleFormattingMarks() {
  showFormattingMarks.value = !showFormattingMarks.value;
  const editor = venEditorInstance.value;
  if (!editor) return;
  // Future: integrate invisible character extension. For now, no-op other than state toggle.
}
const titleRef = ref<HTMLElement | null>(null);
const venEditorInstance = ref<TiptapEditor | null>(null);
const venContent = ref<string>(DEFAULT_BLANK_DOCUMENT_TEMPLATE);
const venTitle = ref<string>("New Document");
const venLastTransaction = ref<EditorSnapshot | null>(null);
const yTextRef = ref<any>(null);
let isApplyingRemote = false;
// Yjs collaboration (optional)
const yProviderRef = ref<any>(null);
const yDocRef = ref<any>(null);

// Debounced presence emitter
const emitPresence = useDebounceFn(() => {
  try {
    const idNow = (route.params.id as string) || currentDoc.value?.id;
    if (!idNow) return;
    wsService.value?.sendMessage(idNow, 'cursor', { selection: null }, userId.value, userName.value);
  } catch {}
}, 200, { maxWait: 1000 });

function handleVenEditorUpdate(value: string) {
  venContent.value = value;
  updateCurrentDocContent(value);
  emitPresence();

  if (yTextRef.value && !isApplyingRemote) {
    try {
      const current = yTextRef.value.toString();
      if (current !== value) {
        yTextRef.value.delete(0, current.length);
        yTextRef.value.insert(0, value);
      }
    } catch {}
  }
}

function handleVenTransaction(payload: EditorSnapshot) {
  venLastTransaction.value = payload;
  updateCurrentDocContent(payload.html);
}

function handleVenTitleUpdate(value: string) {
  venTitle.value = value;
  title.value = value;
  editableTitle.value = value;
  updateCurrentDocTitle(value);
}

function handleVenReady(instance: TiptapEditor) {
  venEditorInstance.value = instance;
  editorReady.value = true;
  try {
    instance.commands?.setContent?.(venContent.value ?? "", false);
    if (isReadOnly.value) instance.setEditable(false);
  } catch (error) {
    console.warn("Failed to initialize VenEditor instance", error);
  }
}
async function setEditorContent(content: string, docTitle: string) {
  venContent.value = content;
  venTitle.value = docTitle;
  document.title = docTitle;
  if (venEditorInstance.value) {
    try {
      // Support both HTML and JSON content
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(content);
          venEditorInstance.value.commands.setContent(parsed, false);
          console.log('Loaded JSON content into editor');
        } catch {
          // If JSON parse fails, treat as HTML
          venEditorInstance.value.commands.setContent(content, false);
        }
      } else {
        venEditorInstance.value.commands.setContent(content, false);
      }
    } catch (error) {
      console.error("Error setting VenEditor content:", error);
    }
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
      // Set document FIRST before any other operations
      setDocument(doc, { markClean: true });
      console.log("currentDoc set:", currentDoc.value?.id);

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
        let contentToDisplay = doc.content || DEFAULT_BLANK_DOCUMENT_TEMPLATE;
        
        // Detect if content is JSON and convert to HTML if needed
        if (contentToDisplay.trim().startsWith('{') || contentToDisplay.trim().startsWith('[')) {
          try {
            // If it's a Tiptap JSON document, the editor will handle it
            console.log('Detected JSON content, will load as Tiptap document');
          } catch {
            // Not valid JSON, treat as HTML
          }
        }
        
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
        isReadOnly.value = !canEdit;
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
        setDocument(newDoc, { markClean: true });
        title.value = newDoc.title || "New Document";
        document.title = title.value;
  
        // Set default template in editor using safe method instead of empty string
        await setEditorContent(DEFAULT_BLANK_DOCUMENT_TEMPLATE, title.value);
  
        router.replace(`/docs/${newDoc.id}`);
      }
    }
    // Remove duplicate setDocument call - already set above
  } catch (error) {
    console.error("Failed to load document:", error);
    toast.error("Failed to load document");
  } finally {
    isLoading.value = false;
  }
}

async function saveTitle() {
  if (isReadOnly.value) return;
  const newTitle = editableTitle.value.trim();
  title.value = newTitle || "New Document";
  document.title = title.value;
  isTitleEdit.value = false;
  venTitle.value = title.value;

  if (currentDoc.value) {
    if (isReadOnly.value) return;
    console.log("current doc:", currentDoc.value);
    // Only mark as having unsaved changes if title actually changed
    if (currentDoc.value.title !== title.value) {
      updateCurrentDocTitle(title.value);
      if (venEditorInstance.value) {
        try { venEditorInstance.value.commands?.setMeta?.('title', title.value); } catch {}
      }

      // Trigger sync to save changes
      handleManualSave();
    }
  }

  // Broadcast title change for collaboration
  const id = (route.params.id as string) || currentDoc.value?.id;
  if (id) {
    if (isReadOnly.value) return;
    try {
      wsService.value?.sendMessage(id, 'title', { title: title.value }, userId.value, userName.value);
    } catch (e) {
      // non-blocking
    }
  }
}

function startEditing() {
  // Disallow editing title in readOnly
  if (isReadOnly.value) return;
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
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);

  console.log("RunDoc component mounted, initializing VenEditor");

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
      setDocument(result.document, { markClean: true });
    } else {
      setDocument(newDoc, { markClean: true });
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

          // Apply remote updates to VenEditor when Y.Text changes
          yTextRef.value.observe(() => {
            if (!venEditorInstance.value) return;
            if (isApplyingRemote) return;
            isApplyingRemote = true;
            try {
              const text = yTextRef.value.toString();
              const current = venContent.value || '';
              if (typeof text === 'string' && text !== current) {
                venEditorInstance.value.commands.setContent(text, false);
                venContent.value = text;
              }
            } finally {
              setTimeout(() => { isApplyingRemote = false; }, 0);
            }
          });
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
        setDocument(newDoc, { markClean: true });
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
  try { venEditorInstance.value?.chain().focus().undo().run(); } catch {}
}

function handleRedo() {
  try { venEditorInstance.value?.chain().focus().redo().run(); } catch {}
}

async function handleExport(format: string) {
  const supportedFormats = ["pdf", "docx", "html", "txt"];
  if (!supportedFormats.includes(format)) {
    toast.error(`Unsupported export format: ${format}`);
    return;
  }

  if (!venEditorInstance.value) {
    toast.error("Editor is not ready yet.");
    return;
  }

  const baseFileName = (title.value || "document").replace(/\s+/g, "_");
  const htmlContent = venEditorInstance.value.getHTML();

  try {
    isSyncing.value = true;

    if (format === "html") {
      const blob = new Blob([htmlContent], { type: "text/html" });
      downloadBlob(blob, `${baseFileName}.html`);
      toast.success("HTML export downloaded");
      return;
    }

    if (format === "txt") {
      const textContent = venEditorInstance.value.getText();
      const blob = new Blob([textContent], { type: "text/plain" });
      downloadBlob(blob, `${baseFileName}.txt`);
      toast.success("Plain text export downloaded");
      return;
    }

    if (format === "pdf") {
      const { transfer2Pdf } = await import("@akira1ce/html2pdf");
      const container = document.createElement("div");
      container.innerHTML = htmlContent;
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "794px"; // ~A4 width
      document.body.appendChild(container);

      await transfer2Pdf(container, ".table-row-unit", "page_wrapper", 20);

      document.body.removeChild(container);
      toast.success("PDF export generated");
      return;
    }

    if (format === "docx") {
      const { Document, Packer, Paragraph } = await import("docx");
      const textContent = venEditorInstance.value.getText();
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: textContent.split("\n").map((line) => new Paragraph(line || " ")),
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, `${baseFileName}.docx`);
      toast.success("DOCX export generated");
      return;
    }
  } catch (error) {
    console.warn("Local export failed", error);

    const fallbackEndpoint = import.meta.env.VITE_DOC_EXPORT_ENDPOINT;
    if (!fallbackEndpoint) {
      toast.error("Export failed locally and no server fallback is configured.");
      return;
    }

    try {
      const token = fileStore.getToken?.();
      const response = await fetch(fallbackEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          format,
          title: title.value ?? "Document",
          html: htmlContent,
          documentId: currentDoc.value?.id ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      downloadBlob(blob, `${baseFileName}.${format}`);
      toast.success(`Exported ${format.toUpperCase()} via server fallback`);
    } catch (fallbackError) {
      console.error("Doc export fallback failed", fallbackError);
      toast.error("Export failed");
    }
  } finally {
    isSyncing.value = false;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
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
        <Button variant="default" @click="downloadFile">Download</Button>
      </div>
    </div>
    <div v-else class="flex-1 flex flex-col overflow-hidden">
      <VenEditor
        :modelValue="venContent"
        :title="title"
        :editable="!isReadOnly"
        :pagination="paginationConfig"
        @update:modelValue="handleVenEditorUpdate"
        @update:title="handleVenTitleUpdate"
        @transaction="handleVenTransaction"
        @ready="handleVenReady"
        @save="handleEditorSave"
        @auto-save="handleEditorAutoSave"
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
