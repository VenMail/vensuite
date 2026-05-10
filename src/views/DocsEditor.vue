<template>
  <div class="flex flex-col h-screen" :class="isViewMode ? 'bg-white dark:bg-gray-950' : 'bg-gray-50'">

    <!-- ── Title bar ─────────────────────────────────────────── -->
    <DocsTitleBar
      :title="documentTitle"
      :isSaving="isSaving"
      :has-unsaved-changes="hasUnsavedChanges"
      :is-offline="isOffline"
      :current-file-id="currentDoc?.id"
      :last-saved-at="lastSavedAt"
      :share-link="shareLink"
      :privacy-type="privacyType"
      :share-members="shareMembers"
      :show-version-history="!isViewMode"
      :is-view-mode="isViewMode"
      @update:title="documentTitle = $event"
      @back="goBack"
      @manual-save="() => saveDocument(true)"
      @copy-link="copyShareLink"
      @change-privacy="updateVisibility"
      @invite="handleInviteMember"
      @update-member="handleUpdateMember"
      @remove-member="handleRemoveMember"
      @select-version="handleVersionSelect"
    />

    <!-- ── Access denied panel ───────────────────────────────── -->
    <div v-if="accessDenied" class="flex-1 flex items-center justify-center p-8">
      <div class="w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ $t('Commons.heading.request_access') }}</h2>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">{{ $t('Views.DocsEditor.text.you_dont_have_access') }}</p>
        <div class="space-y-3">
          <div>
            <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input v-model="requestEmail" type="email" class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="you@example.com" />
          </div>
          <div>
            <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">Message (optional)</label>
            <textarea v-model="requestMessage" rows="3" class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="I'd like to view this document." />
          </div>
          <div>
            <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">{{ $t('Commons.label.requested_access') }}</label>
            <select v-model="accessLevel" class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              <option value="v">{{ $t('Commons.text.view') }}</option>
              <option value="c">{{ $t('Commons.text.comment') }}</option>
              <option value="e">{{ $t('Commons.heading.edit') }}</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <button @click="submitAccessRequestDoc" :disabled="requestSubmitting || !requestEmail" class="px-4 py-2 bg-primary-600 text-white rounded-md disabled:opacity-50">
              {{ requestSubmitting ? $t('Commons.button.sending') : $t('Commons.button.request_access') }}
            </button>
            <a :href="shareLinkDoc" class="text-sm text-blue-600 dark:text-blue-400 underline" target="_blank" rel="noopener">{{ $t('Views.DocsEditor.link.open_direct_link') }}</a>
          </div>
          <p v-if="requestSuccess" class="text-sm text-green-600 dark:text-green-400">{{ requestSuccess }}</p>
        </div>
      </div>
    </div>

    <!-- ── Editor area ────────────────────────────────────────── -->
    <template v-if="!accessDenied">

      <!-- Canvas toolbar (hidden in view mode) -->
      <DocsCanvasToolbar
        v-if="!isViewMode"
        :editor-instance="canvasInstance"
        :range-style="rangeStyle"
        :page-size="pageSettings.pageSize"
        :page-orientation="pageSettings.pageOrientation"
        :unread-count="unreadCount"
        @export="handleExport"
        @print="handlePrint"
        @toggle-comments="isChatOpen = !isChatOpen"
        @toggle-find-replace="isFindReplaceOpen = !isFindReplaceOpen"
        @update:page-size="handlePageSizeChange"
        @update:page-orientation="(v) => pageSettings.pageOrientation = v as any"
      />

      <!-- Find / Replace bar -->
      <DocsCanvasFindReplace
        v-if="!isViewMode"
        :editor-instance="canvasInstance"
        :is-open="isFindReplaceOpen"
        @close="isFindReplaceOpen = false"
      />

      <!-- Collaborator presence bar -->
      <div v-if="collaboratorList.length && !isViewMode" class="px-6 py-1 flex flex-wrap gap-2 items-center justify-end bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 text-xs">
        <span class="text-gray-500 dark:text-gray-400">{{ $t('Commons.text.also_editing') }}</span>
        <button
          v-for="c in collaboratorList"
          :key="c.id"
          type="button"
          class="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 px-2 py-0.5 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          @click="isChatOpen = true"
          :title="`${c.name} is editing`"
        >
          <span class="w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white" :style="{ backgroundColor: colorForUser(c.id) }">
            {{ (c.name || '?').charAt(0).toUpperCase() }}
          </span>
          <span class="max-w-[120px] truncate text-gray-700 dark:text-gray-200" :title="c.name">{{ c.name }}</span>
        </button>
      </div>

      <!-- TOC toggle button -->
      <button
        v-if="!isViewMode"
        @click="isTocOpen = !isTocOpen"
        class="toc-toggle fixed left-4 top-[140px] z-40 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
        title="Table of Contents"
      >
        <svg class="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </button>

      <!-- TOC panel -->
      <div v-if="isTocOpen" class="print-none fixed left-4 top-[200px] z-40 w-64 max-h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col">
        <div class="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
          <h3 class="font-semibold text-sm text-gray-900 dark:text-gray-100">Table of Contents</h3>
          <button @click="isTocOpen = false" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg class="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-grow overflow-y-auto p-2 custom-scrollbar">
          <div v-if="!tocItems.length" class="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
            <p>{{ $t('Views.DocsEditor.text.no_headings_found') }}</p>
          </div>
          <div v-else class="space-y-1">
            <button
              v-for="(item, idx) in tocItems"
              :key="idx"
              class="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :style="{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }"
              @click="scrollToTocItem(item)"
            >{{ item.text }}</button>
          </div>
        </div>
      </div>

      <!-- ── Canvas editor scroll wrapper ──────────────────── -->
      <div class="flex-1 overflow-auto custom-scrollbar canvas-scroll-area print:p-0"
           :class="isViewMode ? 'bg-white dark:bg-gray-950' : 'bg-gray-100 dark:bg-gray-800'">
        <div class="canvas-page-wrapper py-6 print:py-0"
             :style="zoomLevel !== 100 ? { transformOrigin: 'top center', transform: `scale(${zoomLevel / 100})` } : {}">
          <CanvasEditorCore
            ref="canvasCoreRef"
            :content="rawDocContent"
            :settings="pageSettings"
            :editable="!isViewMode"
            :zoom="100"
            @ready="onEditorReady"
            @content-change="onContentChange"
            @range-style-change="rangeStyle = $event"
            @page-size-change="pageCount = $event"
            @page-change="currentPage = $event"
            @saved="onEditorSaved"
          />
        </div>

        <!-- Page badge watermark -->
        <PageBadgeOverlay
          :page-gap="30"
          :label="'Made with ❤️ by VenSuite'"
          :href="'https://vensuite.dev'"
        />
      </div>
    </template>

    <!-- ── Chat panel ─────────────────────────────────────────── -->
    <div
      v-if="isChatOpen && !isViewMode"
      class="fixed right-4 bottom-4 w-[calc(100vw-2rem)] max-w-sm h-[70vh] max-h-96 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl flex flex-col"
    >
      <div class="flex justify-between items-center px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 class="font-semibold text-sm text-gray-900 dark:text-gray-100">Comments &amp; Chat</h3>
        <button @click="isChatOpen = false" class="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="h-4 w-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="flex-grow overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-gray-950" ref="chatMessagesContainer">
        <template v-if="chatMessages.length">
          <div v-for="message in chatMessages" :key="message.id" class="mb-3">
            <div class="flex items-start">
              <div class="w-8 h-8 rounded-full bg-primary-600 flex-shrink-0 flex items-center justify-center text-white font-semibold mr-2">
                {{ message.user.name.charAt(0).toUpperCase() }}
              </div>
              <div>
                <div class="flex items-baseline gap-2">
                  <span class="font-semibold text-sm text-gray-900 dark:text-gray-100">{{ message.user.name }}</span>
                  <span class="text-[11px] text-gray-500 dark:text-gray-400">{{ formatChatTime(message.timestamp) }}</span>
                </div>
                <div class="mt-1 text-sm text-gray-800 whitespace-pre-line dark:text-gray-100">{{ message.content.message }}</div>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
          <p>{{ $t('Views.DocsEditor.text.no_messages_yet') }}</p>
        </div>
      </div>
      <div class="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <form @submit.prevent="sendChatMessage" class="flex flex-col">
          <div class="flex">
            <textarea
              v-model="newChatMessage"
              placeholder="Type a message..."
              class="flex-grow border border-gray-300 dark:border-gray-700 rounded-l-md px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none resize-none"
              :style="{ height: textareaHeight }"
              @input="adjustChatTextareaHeight"
              @keydown.enter.exact.prevent="handleChatEnterKey"
              ref="chatInput"
            />
            <button type="submit" class="bg-primary-600 text-white px-4 py-2 rounded-r-md text-sm hover:bg-primary-700">
              {{ $t('Commons.button.send') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ── Share dialog ─────────────────────────────────────── -->
    <Dialog v-model:open="shareOpen">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{{ $t('Commons.button.share') }}</DialogTitle>
        </DialogHeader>
        <ShareCard
          @close="shareOpen = false"
          mode="doc"
          :share-link="shareLinkDoc"
          :privacy-type="Number(privacyType) || 7"
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

    <!-- ── Conflict dialog ──────────────────────────────────── -->
    <Dialog v-model:open="conflictDialogOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ $t('Views.DocsEditor.heading.content_versions_differ') }}</DialogTitle>
          <DialogDescription>{{ conflictDialogMessage }}</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <p><span class="font-medium">{{ $t('Commons.text.local_copy') }}</span> {{ conflictLocalLength }} bytes</p>
          <p><span class="font-medium">{{ $t('Commons.text.online_copy') }}</span> {{ conflictRemoteLength }} bytes</p>
          <p v-if="conflictDeltaLength > 0" class="text-xs text-gray-500">Difference: {{ conflictDeltaLength }} bytes</p>
        </div>
        <DialogFooter>
          <Button variant="secondary" @click="keepLocalVersion">{{ $t('Views.DocsEditor.button.keep_local_version') }}</Button>
          <Button variant="default" @click="keepRemoteVersion">{{ $t('Views.DocsEditor.button.keep_online_version') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- ── Status bar ─────────────────────────────────────────── -->
    <DocsStatusBar
      v-if="!isViewMode && !isMobileViewport"
      :word-count="wordCount"
      :char-count="0"
      :page-count="pageCount"
      :current-page="currentPage"
      :current-heading="''"
      :zoom="zoomLevel"
      :is-saving="isSaving"
      :has-unsaved-changes="hasUnsavedChanges"
      :is-offline="isOffline"
      :editor-mode="editorMode"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @reset-zoom="resetZoom"
    />

    <!-- Mobile read/edit toggle -->
    <button
      v-if="canEditDoc && isMobileViewport && !accessDenied"
      type="button"
      class="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-4 py-2 text-sm font-medium text-gray-700 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200"
      @click="toggleMobileReaderMode"
    >
      <EyeOff v-if="editorMode === 'editing'" class="h-4 w-4" />
      <Eye v-else class="h-4 w-4" />
      <span>{{ editorMode === 'editing' ? 'Read mode' : 'Edit mode' }}</span>
    </button>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { Eye, EyeOff } from 'lucide-vue-next';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'vue-sonner';
import axios from 'axios';

import DocsTitleBar from '@/components/forms/DocsTitleBar.vue';
import ShareCard from '@/components/ShareCard.vue';
import PageBadgeOverlay from '@/components/docs/PageBadgeOverlay.vue';
import DocsStatusBar from '@/components/docs/DocsStatusBar.vue';
import CanvasEditorCore from '@/components/docs/CanvasEditorCore.vue';
import DocsCanvasToolbar from '@/components/docs/DocsCanvasToolbar.vue';
import DocsCanvasFindReplace from '@/components/docs/DocsCanvasFindReplace.vue';

import { useFileStore } from '@/store/files';
import { useAuthStore } from '@/store/auth';
import { useTranslation } from '@/composables/useTranslation';
import { useDocumentConflictResolver } from '@/composables/useDocumentConflictResolver';
import {
  useCanvasDocsEditor,
  serializeCanvasContent,
  parseDocContentForCanvas,
} from '@/composables/useCanvasDocsEditor';
import { IWebsocketService, Message, useWebSocket } from '@/lib/wsService';
import {
  parseSharingInfoString,
  serializeSharingInfoString,
  labelToShareLevel,
  type ShareMember,
  type ShareLevel,
  type ShareLevelLabel,
} from '@/utils/sharing';
import type { FileData } from '@/types';

// ── Stores & router ─────────────────────────────────────────────────────────
const route     = useRoute();
const router    = useRouter();
const { t }     = useTranslation();
const fileStore = useFileStore();
const authStore = useAuthStore();

// ── Canvas editor state ─────────────────────────────────────────────────────
const {
  pageSettings,
  rangeStyle,
  wordCount,
  pageCount,
  currentPage,
  zoomLevel,
  isFindReplaceOpen,
  zoomIn,
  zoomOut,
  resetZoom,
} = useCanvasDocsEditor();

const canvasCoreRef   = ref<InstanceType<typeof CanvasEditorCore> | null>(null);
let   canvasInstance: any = null;

// Raw content passed to CanvasEditorCore on first load
const rawDocContent = ref<any>(null);

function onEditorReady(instance: any) {
  canvasInstance = instance;
  if (import.meta.env.DEV) {
    (window as any).__canvasEditor__ = instance;
  }
}

let tocRefreshTimeout: ReturnType<typeof setTimeout> | null = null;

function onContentChange() {
  if (!isJustLoaded.value && authStore.isAuthenticated && currentDoc.value) {
    hasUnsavedChanges.value = true;
    scheduleSave();
  }
  broadcastChange();
  if (tocRefreshTimeout) clearTimeout(tocRefreshTimeout);
  tocRefreshTimeout = setTimeout(() => void refreshTocFromCatalog(), 300);
}

function onEditorSaved(_value: any) {
  // canvas-editor built-in Ctrl+S fires this — persist immediately
  void saveDocument(false);
}

// ── Document state ──────────────────────────────────────────────────────────
const currentDoc         = ref<FileData | null>(null);
const documentTitle      = ref('Untitled Document');
const isSaving           = ref(false);
const lastSavedAt        = ref<Date | null>(null);
const hasUnsavedChanges  = ref(false);
const isOffline          = ref(!navigator.onLine);
const shareLink          = ref('');
const privacyType        = ref<number>(7);
const shareMembers       = ref<ShareMember[]>([]);
const isJustLoaded       = ref(true);
const isTocOpen          = ref(false);

// TOC derived from canvas-editor catalog
const tocItems = ref<Array<{ level: number; text: string; titleId: string }>>([]);

// Called on content change to keep TOC in sync
async function refreshTocFromCatalog() {
  if (!canvasInstance) return;
  try {
    const catalog = await canvasInstance.command.getCatalog?.();
    if (Array.isArray(catalog)) {
      tocItems.value = catalog.map((item: any) => ({
        level: item.level ?? 1,
        text:  item.name  ?? '',
        titleId: item.id ?? '',
      }));
    }
  } catch {}
}

function scrollToTocItem(item: { titleId: string }) {
  if (!canvasInstance || !item.titleId) return;
  try { canvasInstance.command.executeLocationCatalog(item.titleId); } catch {}
  isTocOpen.value = false;
}

// ── Auth helpers ────────────────────────────────────────────────────────────
function getAuthToken(): string | null {
  try {
    return fileStore.getToken?.() || authStore.getToken?.() || localStorage.getItem('venAuthToken') || null;
  } catch {
    return null;
  }
}

function buildAuthHeaders(extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { ...extra };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// ── Privacy / access ─────────────────────────────────────────────────────────
const guestAccessiblePrivacyTypes = new Set<number>([1, 2, 3, 4]);
const editablePrivacyTypes        = new Set<number>([2, 4]);
const accessDenied    = ref(false);
const requestEmail    = ref('');
const accessLevel     = ref<'v' | 'c' | 'e'>('v');
const requestMessage  = ref('');
const requestSubmitting = ref(false);
const requestSuccess  = ref<string | null>(null);

const canJoinRealtime = computed(() => {
  const docId = route.params.appFileId as string;
  if (!docId || docId === 'new') return false;
  if (authStore.isAuthenticated) return true;
  return guestAccessiblePrivacyTypes.has(privacyType.value);
});

const canEditDoc = computed(() => {
  const explicit = (currentDoc.value as any)?.can_edit;
  if (typeof explicit === 'boolean') return explicit;
  return authStore.isAuthenticated || editablePrivacyTypes.has(privacyType.value);
});

const editorMode = ref<'editing' | 'viewing'>('editing');
const isViewMode = computed(() => !canEditDoc.value || editorMode.value === 'viewing');
const isMobileViewport = ref(false);
const hasUserSelectedMobileMode = ref(false);

async function submitAccessRequestDoc() {
  const idParam = route.params.appFileId as string | undefined;
  if (!idParam) return;
  requestSubmitting.value = true;
  requestSuccess.value = null;
  try {
    const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const res = await fetch(`${API_BASE_URI}/app-files/${idParam}/request-access`, {
      method:  'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body:    JSON.stringify({ email: requestEmail.value, access_level: accessLevel.value, message: requestMessage.value || undefined }),
    });
    const payload = await res.json();
    requestSuccess.value = res.ok && (payload?.requested || payload?.success)
      ? 'Access request sent. You will receive an email when approved.'
      : (payload?.message || 'Request sent (if the email is valid).');
  } catch {
    requestSuccess.value = 'Request submitted. Please check your email later.';
  } finally {
    requestSubmitting.value = false;
  }
}

// ── Viewport / mode helpers ──────────────────────────────────────────────────
function updateViewportState() {
  isMobileViewport.value = window.innerWidth <= 768;
  if (!canEditDoc.value) { editorMode.value = 'viewing'; return; }
  if (!isMobileViewport.value && hasUserSelectedMobileMode.value) {
    hasUserSelectedMobileMode.value = false;
    editorMode.value = 'editing';
    return;
  }
  if (isMobileViewport.value && !hasUserSelectedMobileMode.value) editorMode.value = 'viewing';
  if (!isMobileViewport.value && !hasUserSelectedMobileMode.value) editorMode.value = 'editing';
}

function toggleMobileReaderMode() {
  hasUserSelectedMobileMode.value = true;
  editorMode.value = editorMode.value === 'editing' ? 'viewing' : 'editing';
}

watch(canEditDoc, (canEdit) => {
  if (!canEdit) { editorMode.value = 'viewing'; hasUserSelectedMobileMode.value = false; }
  else updateViewportState();
  syncEditorEditability();
});

watch(isViewMode, syncEditorEditability);

function syncEditorEditability() {
  if (!canvasInstance) return;
  try {
    canvasInstance.command.executeMode(isViewMode.value ? 'ReadOnly' : 'Edit');
  } catch {}
}

// ── WebSocket collaboration ──────────────────────────────────────────────────
const { initializeWebSocket } = useWebSocket();
const wsService   = ref<IWebsocketService | null>(null);
const randomToken = Math.random().toString(36).slice(2, 11);
const userId  = ref(authStore.isAuthenticated && authStore.userId ? authStore.userId : `guest-${randomToken}`);
const userName = ref(
  authStore.isAuthenticated
    ? ([authStore.firstName, authStore.lastName].filter(Boolean).join(' ') || authStore.email?.split('@')[0] || 'You')
    : `Guest ${Math.floor(Math.random() * 1000)}`,
);
const changesPending = ref(false);
const isJoined = ref(false);
const SOCKET_URI = import.meta.env.VITE_SOCKET_BASE_URL || 'wss://w.venmail.io:8443';
const collaborators = ref<Record<string, { name: string; ts: number }>>({});
const collaboratorList = computed(() =>
  Object.entries(collaborators.value)
    .filter(([id]) => id !== userId.value)
    .map(([id, info]) => ({ id, name: info.name, ts: info.ts })),
);

function initializeWebSocketAndJoinDoc() {
  if (!canJoinRealtime.value) return;
  const docId = route.params.appFileId as string;
  if (docId && docId !== 'new' && !wsService.value) {
    wsService.value = initializeWebSocket(`${SOCKET_URI}?sheetId=${docId}&userName=${userName.value}&userId=${userId.value}`);
    joinDoc();
  }
}

function joinDoc() {
  if (isJoined.value || !canJoinRealtime.value) return;
  const docId = route.params.appFileId as string;
  if (wsService.value && docId && docId !== 'new') {
    try { isJoined.value = wsService.value.joinSheet(docId, handleIncomingMessage); } catch {}
  }
}

function handleIncomingMessage(message: Message) {
  if (!message) return;
  const docId = route.params.appFileId as string;
  if (message.sheetId && docId && message.sheetId !== docId) return;
  if (message.messages) { message.messages.forEach(handleIncomingMessage); return; }

  switch (message.type) {
    case 'chat':    handleChatMessage(message); break;
    case 'change':
      if (message.user?.id === userId.value) break;
      if (message.content?.delta) applyRemoteChange(message.content.delta);
      break;
    case 'cursor': {
      const uid = message.user?.id, name = message.user?.name;
      if (uid && name) collaborators.value[uid] = { name, ts: Date.now() };
      break;
    }
    case 'title':
      if (message.user?.id !== userId.value && message.content?.title)
        documentTitle.value = message.content.title;
      break;
  }
}

function applyRemoteChange(delta: any) {
  if (!canvasInstance || changesPending.value) return;
  try {
    changesPending.value = true;
    if (delta?._canvasEditor && delta.data) {
      canvasInstance.command.executeSetValue(delta.data);
    }
  } catch {}
  setTimeout(() => { changesPending.value = false; }, 10);
}

function broadcastChange() {
  if (!canvasInstance || changesPending.value || !wsService.value) return;
  const docId = route.params.appFileId as string;
  if (!docId || docId === 'new') return;
  try {
    const value = canvasInstance.command.getValue();
    wsService.value.sendMessage(docId, 'change', { delta: { ...value, _canvasEditor: true } }, userId.value, userName.value);
  } catch {}
}

function broadcastCursorPresence() {
  if (!wsService.value) return;
  const docId = route.params.appFileId as string;
  if (!docId || docId === 'new') return;
  try { wsService.value.sendMessage(docId, 'cursor', {}, userId.value, userName.value); } catch {}
}

watch(collaborators, () => {
  const now = Date.now();
  for (const [id, info] of Object.entries(collaborators.value))
    if (now - info.ts > 8000) delete collaborators.value[id];
}, { deep: true });

function colorForUser(uid: string) {
  const palette = ['#2563EB', '#9333EA', '#16A34A', '#DC2626', '#F59E0B', '#0EA5E9', '#7C3AED', '#059669', '#D97706', '#DB2777'];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = ((hash << 5) - hash) + uid.charCodeAt(i);
  return palette[Math.abs(hash) % palette.length];
}

watch(canJoinRealtime, (canJoin) => {
  if (canJoin) initializeWebSocketAndJoinDoc();
  else {
    const docId = route.params.appFileId as string;
    if (wsService.value && docId && docId !== 'new' && isJoined.value) {
      wsService.value.leaveSheet(docId); isJoined.value = false;
    }
  }
});

// ── Chat ─────────────────────────────────────────────────────────────────────
const isChatOpen            = ref(false);
const chatMessages          = ref<Message[]>([]);
const newChatMessage        = ref('');
const chatMessagesContainer = ref<HTMLElement | null>(null);
const chatInput             = ref<HTMLTextAreaElement | null>(null);
const textareaHeight        = ref('40px');
const unreadCount           = ref(0);
const notificationSound     = new Audio(new URL('@/assets/bubble.mp3', import.meta.url).href);

function handleChatMessage(msg: Message) {
  chatMessages.value.push(msg);
  scrollChatToBottom();
  if (!isChatOpen.value && msg.user?.id !== userId.value) {
    unreadCount.value++;
    try { notificationSound.currentTime = 0; notificationSound.play().catch(() => {}); } catch {}
  }
}

function sendChatMessage() {
  if (!wsService.value) return;
  const docId = route.params.appFileId as string;
  if (!docId || docId === 'new' || !newChatMessage.value.trim()) return;
  try {
    wsService.value.sendMessage(docId, 'chat', { message: newChatMessage.value }, userId.value, userName.value);
    newChatMessage.value = '';
    adjustChatTextareaHeight();
  } catch {}
}

function handleChatEnterKey(e: KeyboardEvent) { e.preventDefault(); sendChatMessage(); }

function adjustChatTextareaHeight() {
  if (chatInput.value) {
    chatInput.value.style.height = '40px';
    chatInput.value.style.height = `${Math.min(chatInput.value.scrollHeight, 150)}px`;
    textareaHeight.value = chatInput.value.style.height;
  }
}

function scrollChatToBottom() {
  nextTick(() => {
    if (chatMessagesContainer.value)
      chatMessagesContainer.value.scrollTop = chatMessagesContainer.value.scrollHeight;
  });
}

function formatChatTime(ts: number) {
  try { return new Date(ts).toLocaleTimeString(); } catch { return ''; }
}

watch(isChatOpen, (open) => {
  if (open) { unreadCount.value = 0; nextTick(() => { chatInput.value?.focus(); scrollChatToBottom(); }); }
});

// ── Save / auto-save ─────────────────────────────────────────────────────────
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let maxWaitTimeout: ReturnType<typeof setTimeout> | null = null;
const autoSaveIdleDelay = 3000;
const autoSaveMaxWait   = 30000;
let activeSavePromise: Promise<void> | null = null;
let pendingSaveReason: 'manual' | 'auto' | null = null;

function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveDocument(false), autoSaveIdleDelay);
  if (!maxWaitTimeout) {
    maxWaitTimeout = setTimeout(() => { saveDocument(false); maxWaitTimeout = null; }, autoSaveMaxWait);
  }
}

async function saveDocument(isManual = false) {
  if (!currentDoc.value) return;
  if (saveTimeout)    { clearTimeout(saveTimeout);    saveTimeout = null; }
  if (maxWaitTimeout) { clearTimeout(maxWaitTimeout); maxWaitTimeout = null; }

  const promotePending = (manual: boolean) => {
    if (manual) pendingSaveReason = 'manual';
    else if (pendingSaveReason !== 'manual') pendingSaveReason = pendingSaveReason ?? 'auto';
  };

  if (isSaving.value && activeSavePromise) { promotePending(isManual); return activeSavePromise; }

  const runSave = async () => {
    isSaving.value = true;
    try {
      let contentStr = '';
      if (canvasInstance) {
        const value = canvasInstance.command.getValue();
        contentStr  = serializeCanvasContent(value);
      }

      if (!contentStr) {
        if (isManual) toast.info('Add some content before saving.');
        return;
      }

      const updatedDoc: FileData = {
        ...currentDoc.value,
        title:   currentDoc.value?.title || 'Untitled Document',
        content: contentStr,
        metadata: {
          ...currentDoc.value?.metadata,
          pagination: {
            orientation: pageSettings.pageOrientation,
            pageSize:    pageSettings.pageSize,
          },
        },
        last_viewed: new Date(),
      } as FileData;

      const result = await fileStore.saveDocument(updatedDoc);
      if (result.document) {
        currentDoc.value = result.document;
        hasUnsavedChanges.value = false;
        if (result.syncStatus === 'synced') {
          lastSavedAt.value = new Date();
          if (isManual) toast.success('Document saved');
        } else if (isManual) {
          toast.error('Changes saved locally and queued to sync.');
        }
      }
    } catch (err) {
      console.error('[docs] save failed', err);
      toast.error('Failed to save document');
    } finally {
      isSaving.value = false;
      const nextReason = pendingSaveReason;
      pendingSaveReason  = null;
      activeSavePromise  = null;
      if (nextReason) queueMicrotask(() => void saveDocument(nextReason === 'manual'));
    }
  };

  activeSavePromise = runSave();
  return activeSavePromise;
}

// ── Export / Print ────────────────────────────────────────────────────────────
function handlePrint() {
  if (!canvasInstance) return;
  try { canvasInstance.command.executePrint(); } catch { window.print(); }
}

async function handleExport(format: string) {
  if (!canvasInstance) return;
  const title = documentTitle.value || 'document';

  if (format === 'pdf') {
    try {
      toast.info('Generating PDF…');

      // ── Page size map (mm) for html2canvas/print ──────────────────────────
      const PAGE_MM: Record<string, [number, number]> = {
        a4:     [210, 297],
        a3:     [297, 420],
        letter: [215.9, 279.4],
        legal:  [215.9, 355.6],
      };
      const isLandscape = pageSettings.pageOrientation === 'landscape';
      let [pw, ph] = PAGE_MM[pageSettings.pageSize] ?? PAGE_MM.a4;
      if (isLandscape) [pw, ph] = [ph, pw];

      // ── Prefer HTML export → selectable text in PDF ───────────────────────
      const htmlResult = canvasInstance.command.getHTML?.();
      const htmlContent = [htmlResult?.header, htmlResult?.main, htmlResult?.footer]
        .filter(Boolean).join('\n');

      if (htmlContent.trim()) {
        // ── Convert canvas px margins → mm (96 dpi: 1px = 0.2646mm) ─────────
        const PX_TO_MM = 0.26458333;
        const mTop    = (pageSettings.marginTop    * PX_TO_MM).toFixed(2);
        const mRight  = (pageSettings.marginRight  * PX_TO_MM).toFixed(2);
        const mBottom = (pageSettings.marginBottom * PX_TO_MM).toFixed(2);
        const mLeft   = (pageSettings.marginLeft   * PX_TO_MM).toFixed(2);

        // canvas-editor default font: Arial (we override Microsoft YaHei → Arial for print)
        const styledHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  /* ── Page setup ── */
  @page {
    size: ${pw}mm ${ph}mm;
    margin: ${mTop}mm ${mRight}mm ${mBottom}mm ${mLeft}mm;
  }

  /* ── Reset — do NOT set font-size here; spans carry exact inline px values ── */
  *, *::before, *::after { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    /* Default font matches canvas-editor defaultFont option */
    font-family: Arial, 'Microsoft YaHei', sans-serif;
    /* Default line-height matches canvas row margin formula: fontSize + 8px basic margin.
       At 16px default size → (16+8)/16 = 1.5.  Overridden per-element by inline styles. */
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Inline span styles from getHTML() already carry font-family/size/weight/color.
        Only set fallbacks for unstyled text nodes. ── */
  span { display: inline; }

  /* ── Headings: canvas-editor outputs <h1>–<h6> wrapping styled spans.
        Reset UA margins but keep the span's inline font-size intact. ── */
  h1, h2, h3, h4, h5, h6 {
    margin: 0.15em 0;
    font-weight: bold;
    line-height: 1.2;
  }

  /* ── Paragraphs / alignment wrappers ── */
  p { margin: 0; }
  div { margin: 0; }

  /* ── Lists ── */
  ul, ol { margin: 0.3em 0; padding-left: 1.8em; }
  li { margin: 0; }

  /* ── Tables: canvas-editor sets inline width px on <table> and <col> elements.
        table-layout:fixed honours the colgroup widths exactly as canvas renders them. ── */
  table {
    border-collapse: collapse;
    table-layout: fixed;
    overflow: hidden;
  }
  td, th {
    overflow: hidden;
    word-break: break-word;
    vertical-align: top;
    padding: 0;
  }

  /* ── Images: canvas sets absolute px width/height as attributes.
        Scale down if wider than the printable column but never stretch. ── */
  img {
    max-width: 100%;
    height: auto;
    display: block;
  }

  /* ── Hyperlinks ── */
  a { color: #0000FF; text-decoration: underline; }

  /* ── Page breaks: canvas-editor outputs <div style="break-after:page"> ── */
  [style*="break-after"] { break-after: page; }

  /* ── Separators ── */
  hr { border: none; border-top: 1px solid #000; margin: 0.5em 0; }

  /* ── Print: strip backgrounds unless explicitly coloured by inline styles ── */
  @media print {
    body { background: #fff; }
  }
</style>
</head>
<body>${htmlContent}</body>
</html>`;

        // ── Render in a sized iframe so layout is complete before print fires ──
        // Page pixel widths match canvas-editor PAGE_DIM_PX (portrait w / landscape h)
        const PAGE_PX_W: Record<string, number> = { a4: 794, a3: 1123, letter: 816, legal: 816 };
        const PAGE_PX_H: Record<string, number> = { a4: 1123, a3: 1587, letter: 1056, legal: 1344 };
        const canvasWidthPx = isLandscape
          ? (PAGE_PX_H[pageSettings.pageSize] ?? 1123)
          : (PAGE_PX_W[pageSettings.pageSize] ?? 794);
        const iframe = document.createElement('iframe');
        // Give the iframe the same pixel width as the canvas page so element widths resolve correctly
        iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${canvasWidthPx}px;height:1200px;visibility:hidden;`;
        document.body.appendChild(iframe);
        iframe.contentDocument!.open();
        iframe.contentDocument!.write(styledHtml);
        iframe.contentDocument!.close();

        // Wait for fonts + images to load
        await new Promise<void>(resolve => {
          if (iframe.contentDocument!.readyState === 'complete') { resolve(); return; }
          iframe.contentWindow!.addEventListener('load', () => resolve(), { once: true });
          setTimeout(resolve, 800); // hard cap
        });

        // Trigger browser's native print dialog (produces selectable-text PDF on "Save as PDF")
        iframe.contentWindow!.focus();
        iframe.contentWindow!.print();

        // Clean up after the dialog closes (browsers keep it open during print)
        setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 3000);
        toast.success('Print dialog opened — choose "Save as PDF" to download');

      } else {
        // ── Fallback: image-based PDF (no text selection but always works) ──
        const PAGE_PT: Record<string, [number, number]> = {
          a4:     [595.28, 841.89],
          a3:     [841.89, 1190.55],
          letter: [612,    792],
          legal:  [612,    1008],
        };
        let [ptw, pth] = PAGE_PT[pageSettings.pageSize] ?? PAGE_PT.a4;
        if (isLandscape) [ptw, pth] = [pth, ptw];

        const images: string[] = await canvasInstance.command.getImage({ pixelRatio: 1.5 });
        if (!images?.length) { toast.error('No content to export'); return; }

        const JsPDF = (await import('jspdf')).default;
        const pdf = new JsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'pt', format: [ptw, pth], compress: true });
        images.forEach((b64, i) => {
          if (i > 0) pdf.addPage();
          pdf.addImage(b64, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
        });
        pdf.save(`${title}.pdf`);
        toast.success('PDF exported');
      }
    } catch (err) {
      console.error('[docs] PDF export error', err);
      toast.error('Failed to export PDF');
    }
    return;
  }

  if (format === 'docx') {
    try {
      toast.info('Exporting...');
      const html = canvasInstance.command.getHTML?.()?.main ?? '';
      const blob = new Blob([`<!DOCTYPE html><html><body>${html}</body></html>`], { type: 'text/html' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href = url; a.download = `${title}.html`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported as HTML (open in Word to convert to DOCX)');
    } catch { toast.error('Export failed'); }
    return;
  }

  if (format === 'html') {
    try {
      const html = canvasInstance.command.getHTML?.()?.main ?? '';
      const blob = new Blob([`<!DOCTYPE html><html><body>${html}</body></html>`], { type: 'text/html' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href = url; a.download = `${title}.html`; a.click();
      URL.revokeObjectURL(url);
      toast.success('HTML exported');
    } catch { toast.error('Export failed'); }
  }
}

// ── Page size change ──────────────────────────────────────────────────────────
function handlePageSizeChange(size: string) {
  pageSettings.pageSize = size as 'a4' | 'a3' | 'letter' | 'legal';
}

// ── Document loading ──────────────────────────────────────────────────────────
async function loadContentIntoCanvas(content: any) {
  if (!canvasInstance) {
    // Store for CanvasEditorCore to pick up on mount
    rawDocContent.value = content;
    return;
  }

  const parsed = parseDocContentForCanvas(content);

  if (parsed.mode === 'value' && parsed.payload?.data) {
    try { canvasInstance.command.executeSetValue(parsed.payload.data); return; } catch {}
  }

  // HTML bridge path (old Tiptap HTML or raw HTML)
  if (parsed.mode === 'html' && parsed.payload) {
    try { canvasInstance.command.executeSetHTML({ main: parsed.payload }); return; } catch {}
  }

  // Tiptap JSON — convert via Editor to HTML first using the old instance
  if (typeof content === 'string') {
    const trimmed = content.trim();
    try {
      const parsed2 = JSON.parse(trimmed);
      if (parsed2?.type === 'doc' || parsed2?.content) {
        // Try to extract text/html representation from Tiptap JSON
        // Best we can do: stringify the text content as paragraphs
        const htmlFallback = tiptapJsonToHtmlFallback(parsed2);
        try { canvasInstance.command.executeSetHTML({ main: htmlFallback }); return; } catch {}
      }
    } catch {}
    if (trimmed.startsWith('<')) {
      try { canvasInstance.command.executeSetHTML({ main: trimmed }); return; } catch {}
    }
  }
}

/** Very lightweight Tiptap JSON → HTML converter for bridge loading */
function tiptapJsonToHtmlFallback(doc: any): string {
  if (!doc) return '<p></p>';
  const processNode = (node: any): string => {
    if (!node) return '';
    if (node.type === 'text') {
      let text = (node.text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const marks: any[] = node.marks ?? [];
      for (const mark of marks) {
        if (mark.type === 'bold')      text = `<strong>${text}</strong>`;
        if (mark.type === 'italic')    text = `<em>${text}</em>`;
        if (mark.type === 'underline') text = `<u>${text}</u>`;
        if (mark.type === 'strike')    text = `<s>${text}</s>`;
        if (mark.type === 'link')      text = `<a href="${mark.attrs?.href ?? '#'}">${text}</a>`;
      }
      return text;
    }
    const children = (node.content ?? []).map(processNode).join('');
    switch (node.type) {
      case 'paragraph':    return `<p>${children || '&nbsp;'}</p>`;
      case 'heading':      return `<h${node.attrs?.level ?? 1}>${children}</h${node.attrs?.level ?? 1}>`;
      case 'bulletList':   return `<ul>${children}</ul>`;
      case 'orderedList':  return `<ol>${children}</ol>`;
      case 'listItem':     return `<li>${children}</li>`;
      case 'blockquote':   return `<blockquote>${children}</blockquote>`;
      case 'codeBlock':    return `<pre><code>${children}</code></pre>`;
      case 'hardBreak':    return '<br/>';
      case 'horizontalRule': return '<hr/>';
      case 'doc':          return children;
      default:             return children;
    }
  };
  return processNode(doc) || '<p></p>';
}

async function initializeDocument() {
  const docId   = route.params.appFileId as string | undefined;
  const template = route.params.template as string | undefined;
  isJustLoaded.value = true;

  if (template) {
    try {
      const newDoc = await fileStore.createNewDocument('docx', 'Untitled Document');
      currentDoc.value    = newDoc;
      documentTitle.value = newDoc.title || 'Untitled Document';
      document.title      = documentTitle.value;
      await router.replace(`/docs/${newDoc.id}`);
      toast.success('Document created');
    } catch { toast.error('Failed to create document'); }
    setTimeout(() => { isJustLoaded.value = false; }, 500);
    return;
  }

  if (docId && docId !== 'new') {
    try {
      const doc = await fileStore.loadDocument(docId, 'docx');
      if (doc) {
        currentDoc.value    = doc;
        documentTitle.value = doc.title || 'Untitled Document';
        document.title      = documentTitle.value;

        const priv = Number((doc as any)?.privacy_type ?? (doc as any)?.privacyType);
        if (!Number.isNaN(priv)) privacyType.value = priv;

        if (!authStore.isAuthenticated && !guestAccessiblePrivacyTypes.has(privacyType.value)) {
          accessDenied.value = true;
          try { requestEmail.value = authStore.email || ''; } catch {}
        }

        try {
          const si = (doc as any)?.sharing_info;
          if (si) shareMembers.value = parseSharingInfoString(si);
        } catch {}

        if (doc.metadata?.pagination) {
          const p = doc.metadata.pagination;
          if (p.orientation) pageSettings.pageOrientation = p.orientation;
          if (p.pageSize)    pageSettings.pageSize = p.pageSize as 'a4' | 'a3' | 'letter' | 'legal';
        }

        // Check for inline JSON stash (e.g. after upload)
        let loadedFromInline = false;
        try {
          const inlineKey = doc.id ? `DOC_INLINE_JSON_${doc.id}` : '';
          if (inlineKey) {
            const inline = localStorage.getItem(inlineKey);
            if (inline?.trim()) {
              rawDocContent.value = inline;
              loadedFromInline = true;
              localStorage.removeItem(inlineKey);
            }
          }
        } catch {}

        if (!loadedFromInline && doc.content) {
          rawDocContent.value = doc.content;
        }

        lastSavedAt.value = new Date();
        await evaluateLoadedDocument(doc, 'initial');
        setTimeout(() => { isJustLoaded.value = false; }, 500);
      }
    } catch (err) {
      console.error('[docs] load failed', err);
      toast.error('Failed to load document');
    }
  } else {
    try {
      const newDoc = await fileStore.createNewDocument('docx', 'Untitled Document');
      currentDoc.value    = newDoc;
      documentTitle.value = newDoc.title || 'Untitled Document';
      document.title      = documentTitle.value;
      await router.replace(`/docs/${newDoc.id}`);
      setTimeout(() => { isJustLoaded.value = false; }, 500);
    } catch { toast.error('Failed to create document'); }
  }
}

// After CanvasEditorCore reports ready, apply any buffered content
watch(
  () => canvasCoreRef.value,
  (core) => {
    if (core && rawDocContent.value && canvasInstance) {
      loadContentIntoCanvas(rawDocContent.value);
    }
  },
);

// Also load when rawDocContent changes after instance is ready
watch(rawDocContent, (content) => {
  if (content && canvasInstance) loadContentIntoCanvas(content);
});

// ── Title watch ────────────────────────────────────────────────────────────
watch(documentTitle, (newTitle) => {
  document.title = newTitle || 'Untitled Document';
  if (!isJustLoaded.value) {
    hasUnsavedChanges.value = true;
    const docId = route.params.appFileId as string;
    if (wsService.value && docId && docId !== 'new')
      wsService.value.sendMessage(docId, 'title', { title: newTitle }, userId.value, userName.value);
  }
  if (currentDoc.value) currentDoc.value.title = newTitle;
});

// ── Conflict resolver ──────────────────────────────────────────────────────
const {
  conflictDialogOpen,
  conflictDialogMessage,
  conflictLocalLength,
  conflictRemoteLength,
  conflictDeltaLength,
  evaluateLoadedDocument,
  checkConflictsAfterReconnect,
  keepLocalVersion,
  keepRemoteVersion,
} = useDocumentConflictResolver({
  fileStore,
  applyLocalVersion: async (localDoc) => {
    if (!currentDoc.value) return null;
    const appliedDoc = { ...currentDoc.value, ...localDoc, id: currentDoc.value.id } as FileData;
    currentDoc.value    = appliedDoc;
    documentTitle.value = appliedDoc.title || 'Untitled Document';
    rawDocContent.value = appliedDoc.content || '';
    hasUnsavedChanges.value = true;
    return appliedDoc;
  },
  applyRemoteVersion: async (remoteDoc) => {
    currentDoc.value    = { ...remoteDoc } as FileData;
    documentTitle.value = remoteDoc.title || 'Untitled Document';
    rawDocContent.value = remoteDoc.content || '';
    hasUnsavedChanges.value = false;
    lastSavedAt.value = remoteDoc.updated_at ? new Date(remoteDoc.updated_at as string) : new Date();
    return remoteDoc;
  },
  notify: {
    info:    (msg: string) => toast.info(msg),
    success: (msg: string) => toast.success(msg),
    error:   (msg: string) => toast.error(msg),
  },
});

// ── Online / offline ────────────────────────────────────────────────────────
const handleOnline  = () => { isOffline.value = false; if (currentDoc.value?.id) void checkConflictsAfterReconnect(currentDoc.value.id, currentDoc.value.file_type); };
const handleOffline = () => { isOffline.value = true; };
window.addEventListener('online',  handleOnline);
window.addEventListener('offline', handleOffline);

// ── Share helpers ───────────────────────────────────────────────────────────
const API_BASE_URI  = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const FILES_ENDPOINT = `${API_BASE_URI}/app-files`;
const SHARE_BASE_URL = import.meta.env.VITE_SHARE_BASE_URL || window.location.origin;
const shareOpen     = ref(false);

const shareLinkDoc = computed(() => {
  const id = route.params.appFileId;
  return id ? `${SHARE_BASE_URL}/share/doc/${id}` : '';
});

function copyShareLink() {
  try { navigator.clipboard.writeText(shareLinkDoc.value); toast.success('Link copied'); } catch {}
}

async function fetchSharingInfo() {
  try {
    const id  = route.params.appFileId as string;
    if (!id || id === 'new') return;
    const res = await axios.get(`${FILES_ENDPOINT}/${id}`, { headers: buildAuthHeaders() });
    const payload = res.data?.data || res.data?.document || {};
    shareMembers.value = parseSharingInfoString(payload.sharing_info);
    if (typeof payload.privacy_type === 'number') privacyType.value = Number(payload.privacy_type);
  } catch {}
}

type ShareCardPayload = { email: string; shareLevel: ShareLevel; label: ShareLevelLabel; note?: string; permission?: 'view' | 'comment' | 'edit' | 'owner' };

async function handleInviteMember(payload: ShareCardPayload) {
  try {
    const id = route.params.appFileId as string;
    if (!id) return;
    const resolvedLevel = (() => {
      if (payload.shareLevel) return payload.shareLevel;
      if (payload.permission) return labelToShareLevel(payload.permission === 'owner' ? 'edit' : payload.permission as ShareLevelLabel);
      return labelToShareLevel(payload.label);
    })();
    const newMembers: ShareMember[] = [
      ...shareMembers.value.filter((m) => m.email !== payload.email),
      { email: payload.email, shareLevel: resolvedLevel },
    ];
    await axios.patch(`${FILES_ENDPOINT}/${id}`, { sharing_info: serializeSharingInfoString(newMembers) }, { headers: buildAuthHeaders({ 'Content-Type': 'application/json' }) });
    await fetchSharingInfo();
    toast.success('Member invited');
  } catch {}
}

async function handleUpdateMember(payload: ShareCardPayload) { return handleInviteMember(payload); }

async function handleRemoveMember(payload: { email: string }) {
  try {
    const id = route.params.appFileId as string;
    if (!id) return;
    const newMembers = shareMembers.value.filter((m) => m.email !== payload.email);
    await axios.patch(`${FILES_ENDPOINT}/${id}`, { sharing_info: serializeSharingInfoString(newMembers) }, { headers: buildAuthHeaders({ 'Content-Type': 'application/json' }) });
    await fetchSharingInfo();
    toast.success('Member removed');
  } catch {}
}

async function updateVisibility(value: number) {
  try {
    const id = route.params.appFileId as string;
    if (!id) return;
    await axios.patch(`${FILES_ENDPOINT}/${id}`, { privacy_type: value }, { headers: buildAuthHeaders({ 'Content-Type': 'application/json' }) });
    await fetchSharingInfo();
    toast.success(t('Commons.toast.visibility_updated'));
  } catch {}
}

// ── Version history ─────────────────────────────────────────────────────────
function handleVersionSelect(version: any) { loadVersionContent(version); }

async function loadVersionContent(version: any) {
  if (!currentDoc.value?.id || !version?.version_number) return;
  try {
    const versionData = await fileStore.getVersion(currentDoc.value.id, version.version_number);
    if (versionData && typeof versionData.content === 'string') {
      rawDocContent.value = versionData.content;
      toast.success(`Loaded version ${version.version_number}`);
    } else {
      toast.error('Failed to load version content');
    }
  } catch { toast.error('Failed to load version content'); }
}

// ── Navigation ──────────────────────────────────────────────────────────────
function goBack() {
  const canGoBack = !!(window.history.state && (window.history.state as any).back);
  if (canGoBack) { router.back(); return; }
  router.push({ name: 'docs-view' });
}

// ── Keyboard shortcuts ───────────────────────────────────────────────────────
function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); isFindReplaceOpen.value = true; }
  if ((e.ctrlKey || e.metaKey) && e.key === 'h') { e.preventDefault(); isFindReplaceOpen.value = true; }
  if (e.key === 'Escape' && isFindReplaceOpen.value) { isFindReplaceOpen.value = false; return; }
  if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); zoomIn(); }
  if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); zoomOut(); }
  if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); resetZoom(); }
}

// ── Lifecycle ────────────────────────────────────────────────────────────────
function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (authStore.isAuthenticated && currentDoc.value && hasUnsavedChanges.value) {
    saveDocument(false);
    e.preventDefault();
    e.returnValue = '';
  }
}

let presenceInterval: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  updateViewportState();
  await nextTick();
  await initializeDocument();
  initializeWebSocketAndJoinDoc();
  presenceInterval = setInterval(broadcastCursorPresence, 5000);
  if (authStore.isAuthenticated) window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('keydown', handleGlobalKeydown);
  window.addEventListener('resize',  updateViewportState);
});

onBeforeRouteLeave(async () => {
  try {
    if (authStore.isAuthenticated && currentDoc.value && hasUnsavedChanges.value)
      await saveDocument(false);
  } catch {}
});

onUnmounted(() => {
  if (currentDoc.value && hasUnsavedChanges.value) saveDocument();
  const docId = route.params.appFileId as string;
  if (wsService.value && docId && docId !== 'new') wsService.value.leaveSheet(docId);
  if (saveTimeout)      clearTimeout(saveTimeout);
  if (maxWaitTimeout)   clearTimeout(maxWaitTimeout);
  if (tocRefreshTimeout) clearTimeout(tocRefreshTimeout);
  if (presenceInterval) clearInterval(presenceInterval);
  if (authStore.isAuthenticated) window.removeEventListener('beforeunload', handleBeforeUnload);
  window.removeEventListener('online',   handleOnline);
  window.removeEventListener('offline',  handleOffline);
  window.removeEventListener('keydown',  handleGlobalKeydown);
  window.removeEventListener('resize',   updateViewportState);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

.canvas-page-wrapper {
  display: flex;
  justify-content: center;
  min-height: 100%;
}

.canvas-scroll-area {
  position: relative;
}

.toc-toggle {
  print-color-adjust: exact;
}

@media print {
  .toc-toggle { display: none !important; }
}
</style>
