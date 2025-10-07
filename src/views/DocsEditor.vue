<template>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=PT+Serif:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;600;700&family=Raleway:wght@400;600;700&family=Nunito:wght@400;600;700&family=Poppins:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Spectral:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
  
  <div class="flex flex-col h-screen bg-gray-50">
    <!-- Docs Title Bar -->
    <DocsTitleBar
      :title="documentTitle"
      :isSaving="isSaving"
      :has-unsaved-changes="hasUnsavedChanges"
      :is-offline="isOffline"
      :last-saved-at="lastSavedAt"
      :share-link="shareLink"
      :privacy-type="privacyType"
      :share-members="shareMembers"
      @update:title="documentTitle = $event"
      @back="goBack"
      @manual-save="() => saveDocument(true)"
      @copy-link="copyShareLink"
      @change-privacy="updateVisibility"
      @invite="handleInviteMember"
      @update-member="handleUpdateMember"
      @remove-member="handleRemoveMember"
    />

    <!-- Docs Menu Bar -->
    <DocsToolbar 
      ref="toolbarRef"
      :editor="editor" 
      :page-size="pageSize"
      :page-orientation="pageOrientation"
      @update:page-size="pageSize = $event"
      @update:page-orientation="pageOrientation = $event"
      @export="handleExport"
      @toggle-comments="isChatOpen = !isChatOpen"
      @toggle-expanded="isToolbarExpanded = $event"
      @update-pagination="updatePaginationSettings"
      @print="handlePrint"
    />

    <!-- Table of Contents Toggle (Floating Left) -->
    <button
      @click="isTocOpen = !isTocOpen"
      :class=" [
        'toc-toggle fixed left-4 z-40 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105',
        isToolbarExpanded ? 'top-[190px]' : 'top-[140px]'
      ]"
      title="Table of Contents"
    >
      <svg class="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    </button>

    <!-- Floating Table of Contents Panel -->
    <div
      v-if="isTocOpen"
      :class="[
        'fixed left-4 z-40 w-64 max-h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col',
        isToolbarExpanded ? 'top-[250px]' : 'top-[200px]'
      ]"
    >
      <div class="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 class="font-semibold text-sm text-gray-900 dark:text-gray-100">Table of Contents</h3>
        <button @click="isTocOpen = false" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <svg class="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="flex-grow overflow-y-auto p-2 custom-scrollbar">
        <div v-if="tocItems.length === 0" class="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
          <p>No headings found</p>
          <p class="mt-1 text-xs">Add headings to see outline</p>
        </div>
        <div v-else class="space-y-1">
          <button
            v-for="(item, index) in tocItems"
            :key="index"
            class="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            :style="{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }"
            :class="{
              'font-semibold text-gray-900 dark:text-gray-100': item.level === 1,
              'font-medium text-gray-800 dark:text-gray-200': item.level === 2,
              'text-gray-700 dark:text-gray-300': item.level >= 3
            }"
            @click="scrollToHeading(index)"
          >
            {{ item.text }}
          </button>
        </div>
      </div>
    </div>

    <!-- Editor Content -->
    <div class="flex-1 overflow-auto bg-gray-50 dark:bg-gray-800 p-6 transition-colors custom-scrollbar print:p-0 print:bg-white">
      <div 
        class="mx-auto bg-white dark:bg-gray-900 shadow-lg rounded-lg min-h-full transition-all print:shadow-none print:rounded-none"
        :style="pageStyles"
      >
        <div :style="contentPadding" class="doc-page relative print:!p-0">
          <div
            v-if="showPlaceholderOverlay"
            class="editor-placeholder-overlay"
            @click="focusEditor"
          >
            <div class="editor-placeholder-content">
              <p class="text-lg font-semibold text-gray-700">Click to start typing</p>
              <!-- <p class="text-sm text-gray-500 mt-2">Click on text to apply formatting.</p> -->
            </div>
          </div>
          <!-- Contextual Bubble Menu -->
          <BubbleMenu
            v-if="editor"
            ref="bubbleMenuRef"
            :editor="editor"
            :tippy-options="bubbleMenuTippyOptions"
          >
            <div :class="[bubbleShellClass, 'bubble-shell']">
              <div :class="bubbleGridClass">
                <button
                  v-for="action in primaryActions"
                  :key="action.key"
                  type="button"
                  :class="[
                    bubbleButtonBase,
                    action.isActive && bubbleButtonActive,
                    action.className
                  ]"
                  :title="action.tooltip"
                  :disabled="action.disabled"
                  :style="action.style"
                  @click="executeAction(action)"
                >
                  <component :is="action.icon" class="h-4 w-4" />
                </button>
                <span v-if="overflowActions.length" class="relative inline-flex">
                  <button
                    type="button"
                    :class="[bubbleButtonBase, isOverflowOpen && bubbleButtonActive]"
                    title="More"
                    @click.stop="toggleOverflow"
                  >
                    <MoreHorizontal class="h-4 w-4" />
                  </button>
                  <transition name="fade">
                    <div
                      v-if="isOverflowOpen"
                      class="absolute right-0 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
                      @mouseenter="suspendOverflowClose"
                      @mouseleave="resumeOverflowClose"
                    >
                      <button
                        v-for="action in overflowActions"
                        :key="action.key"
                        type="button"
                        :class="[
                          bubbleOverflowButtonClass,
                          action.isActive && 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200'
                        ]"
                        :title="action.tooltip"
                        :disabled="action.disabled"
                        :style="action.style"
                        @click="executeAction(action, true)"
                      >
                        <component :is="action.icon" class="h-4 w-4" />
                        <span class="ml-2 text-xs font-medium">{{ action.label }}</span>
                      </button>
                    </div>
                  </transition>
                </span>
              </div>
              
              <!-- Color Pickers -->
              <template v-if="showTextColorPicker">
                <div :class="bubbleInlineFormClass">
                  <label class="flex items-center gap-2">
                    <span class="text-xs text-gray-600 dark:text-gray-400">Text:</span>
                    <input
                      type="color"
                      :value="bubbleTextColor"
                      @input="onBubbleTextColorChange"
                      class="h-8 w-16 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                  </label>
                  <button
                    type="button"
                    :class="[bubbleButtonBase, 'text-gray-500 dark:text-gray-400']"
                    title="Remove color"
                    @click="editor?.chain().focus().unsetColor().run(); showTextColorPicker = false"
                  >
                    <Eraser class="h-4 w-4" />
                  </button>
                </div>
              </template>
              
              <template v-if="showBgColorPicker">
                <div :class="bubbleInlineFormClass">
                  <label class="flex items-center gap-2">
                    <span class="text-xs text-gray-600 dark:text-gray-400">Background:</span>
                    <input
                      type="color"
                      :value="bubbleBgColor"
                      @input="onBubbleBgColorChange"
                      class="h-8 w-16 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                  </label>
                  <button
                    type="button"
                    :class="[bubbleButtonBase, 'text-gray-500 dark:text-gray-400']"
                    title="Remove highlight"
                    @click="editor?.chain().focus().unsetHighlight().run(); showBgColorPicker = false"
                  >
                    <Eraser class="h-4 w-4" />
                  </button>
                </div>
              </template>
              
              <template v-if="isLinkEditing">
                <div :class="bubbleInlineFormClass">
                  <input
                    v-model="bubbleLinkUrl"
                    type="url"
                    placeholder="https://example.com"
                    :class="bubbleInlineInputClass"
                    :title="linkCtrlClickTooltip"
                    @keydown.enter.prevent="applyBubbleLink"
                  />
                  <button
                    type="button"
                    :class="[bubbleButtonBase, bubbleButtonSuccess]"
                    title="Apply link"
                    @click="applyBubbleLink"
                  >
                    <CheckCircle2 class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    :class="[bubbleButtonBase, 'text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200']"
                    :title="openLinkButtonTooltip"
                    :disabled="!bubbleLinkUrl"
                    @click="visitBubbleLink"
                  >
                    <ExternalLink class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    :class="[bubbleButtonBase, bubbleButtonDanger]"
                    title="Remove link"
                    @click="removeBubbleLink"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </template>
              <template v-if="showChartTitleEdit">
                <div :class="bubbleInlineFormClass">
                  <input
                    v-model="chartTitleInput"
                    type="text"
                    placeholder="Chart title (optional)"
                    :class="bubbleInlineInputClass"
                    @keydown.enter.prevent="applyChartTitle"
                  />
                  <button
                    type="button"
                    :class="[bubbleButtonBase, bubbleButtonSuccess]"
                    title="Apply title"
                    @click="applyChartTitle"
                  >
                    <CheckCircle2 class="h-4 w-4" />
                  </button>
                </div>
              </template>
              
              <template v-if="showChartFontSizeEdit">
                <div :class="bubbleInlineFormClass">
                  <label class="flex items-center gap-2">
                    <span class="text-xs text-gray-600 dark:text-gray-400">Size:</span>
                    <input
                      v-model.number="chartFontSizeInput"
                      type="number"
                      min="8"
                      max="24"
                      class="h-8 w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-xs text-center"
                      @keydown.enter.prevent="applyChartFontSize"
                    />
                  </label>
                  <button
                    type="button"
                    :class="[bubbleButtonBase, bubbleButtonSuccess]"
                    title="Apply font size"
                    @click="applyChartFontSize"
                  >
                    <CheckCircle2 class="h-4 w-4" />
                  </button>
                </div>
              </template>
            </div>
          </BubbleMenu>

          <EditorContent
            v-if="editor"
            :editor="editor"
            class="prose prose-lg dark:prose-invert max-w-none"
            @focusin="onEditorFocus"
            @focusout="onEditorBlur"
          />
        </div>
      </div>
    </div>

    <!-- Chat Panel -->
    <div
      v-if="isChatOpen"
      class="fixed right-0 bottom-0 w-80 h-96 z-50 bg-white dark:bg-gray-900 border-l border-t border-gray-200 dark:border-gray-700 shadow-lg flex flex-col"
    >
      <div class="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 class="font-semibold text-gray-900 dark:text-gray-100">Comments & Chat</h3>
        <button @click="isChatOpen = false" class="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800">
          <svg class="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="flex-grow overflow-y-auto p-3">
        <div class="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
          <p>Chat feature coming soon!</p>
          <p class="mt-2 text-xs">Collaborate with your team in real-time</p>
        </div>
      </div>
      <div class="p-3 border-t border-gray-200 dark:border-gray-700">
        <div class="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            class="flex-grow border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled
          />
          <button
            type="button"
            class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            disabled
          >
            Send
          </button>
        </div>
      </div>
    </div>

    <!-- Share Dialog -->
    <Dialog v-model:open="shareOpen">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
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

    <!-- Image Picker Dialog -->
    <Dialog v-model:open="showImageUrlDialog">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Replace Image</DialogTitle>
        </DialogHeader>
        <ImagePicker
          :initial-url="imageUrlInput"
          submit-label="Replace"
          @submit="replaceImageUrl"
          @cancel="showImageUrlDialog = false"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Editor, EditorContent, BubbleMenu } from '@tiptap/vue-3';
import type { Component } from 'vue';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  Text,
  Link as LinkIcon,
  List as BulletListIcon,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Highlighter,
  Eraser,
  MoreHorizontal,
  Columns,
  Rows3,
  Trash2,
  GitMerge,
  GitFork,
  CheckCircle2,
  ExternalLink,
  BarChart3,
  AArrowUp,
  Type,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Upload,
} from 'lucide-vue-next';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { ImagePlus } from 'tiptap-image-plus';
import { PaginationPlus } from 'tiptap-pagination-plus';
import { PaginationTable } from 'tiptap-table-plus';
import { FontSize } from '@/extensions/font-size';
import { LineHeight } from '@/extensions/line-height';
import { ParagraphSpacing } from '@/extensions/paragraph-spacing';
import { ChartExtension } from '@/extensions/chart';
import type { ChartAttrs } from '@/extensions/chart';

const {
  TablePlus, TableRowPlus, TableCellPlus, TableHeaderPlus
} = PaginationTable;
import { useFileStore } from '@/store/files';
import { toast } from 'vue-sonner';
import type { FileData } from '@/types';
import DocsToolbar from '@/components/forms/DocsToolbar.vue';
import DocsTitleBar from '@/components/forms/DocsTitleBar.vue';
import ShareCard from '@/components/ShareCard.vue';
import ImagePicker from '@/components/ImagePicker.vue';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { useAuthStore } from '@/store/auth';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NodeSelection } from '@tiptap/pm/state';

const route = useRoute();
const router = useRouter();
const fileStore = useFileStore();
const authStore = useAuthStore();

const editor = ref<Editor>();
const toolbarRef = ref<InstanceType<typeof DocsToolbar> | null>(null);
const currentDoc = ref<FileData | null>(null);
const documentTitle = ref('Untitled Document');
const isSaving = ref(false);
const lastSavedAt = ref<Date | null>(null);
const pageSize = ref('a4');
const pageOrientation = ref<'portrait' | 'landscape'>('portrait');
const hasUnsavedChanges = ref(false);
const isOffline = ref(!navigator.onLine);
const shareLink = ref('');
const privacyType = ref('private');
const shareMembers = ref<any[]>([]);

const isEditorFocused = ref(false);
const isEditorEmpty = ref(true);
const hasEnteredContent = ref(false);
const showPlaceholderOverlay = computed(() => !isEditorFocused.value && isEditorEmpty.value && !hasEnteredContent.value);

let detachEditorListeners: (() => void) | null = null;

function focusEditor() {
  if (!editor.value) return;
  editor.value.chain().focus().run();
  isEditorFocused.value = true;
}

function onEditorFocus() {
  isEditorFocused.value = true;
}

function onEditorBlur() {
  // Delay to allow focus transitions to related controls (e.g., bubble menu)
  requestAnimationFrame(() => {
    if (!editor.value?.isFocused) {
      isEditorFocused.value = false;
    }
  });
}

function updateEditorEmptyState(instance?: Editor) {
  const activeEditor = instance ?? editor.value;
  if (!activeEditor) return;

  const empty = activeEditor.isEmpty;
  isEditorEmpty.value = empty;
  if (!empty) {
    hasEnteredContent.value = true;
  }
}

function handleEditorContentChange(instance: Editor) {
  updateEditorEmptyState(instance);

  if (isJustLoaded.value) {
    return;
  }

  if (!instance.isEmpty) {
    hasUnsavedChanges.value = true;
    scheduleSave();
  }
}

function attachEditorEventListeners(instance: Editor) {
  detachEditorListeners?.();

  const handleUpdate = () => handleEditorContentChange(instance);
  const handleSelection = () => {
    updateEditorEmptyState(instance);
    syncBubbleLinkFromEditor(instance);
  };
  const handleFocus = () => { isEditorFocused.value = true; };
  const handleBlur = () => { isEditorFocused.value = false; };

  instance.on('update', handleUpdate);
  instance.on('selectionUpdate', handleSelection);
  instance.on('transaction', handleSelection);
  instance.on('focus', handleFocus);
  instance.on('blur', handleBlur);

  detachEditorListeners = () => {
    instance.off('update', handleUpdate);
    instance.off('selectionUpdate', handleSelection);
    instance.off('transaction', handleSelection);
    instance.off('focus', handleFocus);
    instance.off('blur', handleBlur);
    detachEditorListeners = null;
  };

  nextTick(() => updateEditorEmptyState(instance));
}

// Chat state
const isChatOpen = ref(false);

// Table of Contents state
const isTocOpen = ref(false);
const isToolbarExpanded = ref(false);

// Bubble menu state (quick link/image editors)
const bubbleShellClass = 'flex w-full max-w-[340px] flex-col gap-1 rounded-xl border border-gray-200 bg-white/95 px-2 py-1 text-gray-700 shadow-xl print:hidden dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200';
const bubbleGridClass = 'flex flex-wrap items-center gap-1';
const bubbleButtonBase = 'inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-transparent text-gray-600 transition-colors duration-150 hover:bg-gray-100 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-40';
const bubbleButtonActive = 'border-blue-500 bg-blue-100 text-blue-700 shadow-sm hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-900/60 dark:text-blue-200';
const bubbleButtonSuccess = 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/60';
const bubbleButtonDanger = 'text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/60';
const bubbleOverflowButtonClass = 'flex w-full items-center rounded-md px-2 py-1 text-left text-xs text-gray-600 transition-colors duration-150 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-200 dark:hover:bg-gray-800';
const bubbleInlineFormClass = 'flex flex-wrap items-center gap-1 pt-1';
const bubbleInlineInputClass = 'h-8 w-36 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';

const isMacLike = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test((navigator.platform || ''));
const linkCtrlClickTooltip = computed(() => isMacLike ? 'Tip: Hold ⌘ and click to open the link.' : 'Tip: Hold Ctrl and click to open the link.');
const openLinkButtonTooltip = computed(() => isMacLike ? 'Open link in new tab (⌘+Click)' : 'Open link in new tab (Ctrl+Click)');

const bubbleLinkUrl = ref('');
function openBubbleLink() {
  if (!editor.value) return;
  syncBubbleLinkFromEditor(editor.value);
  if (!editor.value.isActive('link')) {
    editor.value.chain().focus().setLink({ href: bubbleLinkUrl.value || 'https://' }).run();
    syncBubbleLinkFromEditor(editor.value);
  }
}
function normalizeHref(rawHref: string) {
  if (!rawHref) return '';
  return /^(https?:|mailto:|tel:|ftp:)/i.test(rawHref) ? rawHref : `https://${rawHref}`;
}
function openHrefInNewTab(rawHref: string) {
  const trimmed = (rawHref || '').trim();
  if (!trimmed) return;
  const urlToOpen = normalizeHref(trimmed);
  window.open(urlToOpen, '_blank', 'noopener,noreferrer');
}

function applyBubbleLink() {
  if (!editor.value) return;
  const href = (bubbleLinkUrl.value || '').trim();
  if (!href) {
    editor.value.chain().focus().unsetLink().run();
    bubbleLinkUrl.value = '';
  } else {
    const normalized = normalizeHref(href);
    editor.value.chain().focus().setLink({ href: normalized, target: '_blank', rel: 'noopener noreferrer' }).run();
    bubbleLinkUrl.value = normalized;
  }
  isOverflowOpen.value = false;
}
function visitBubbleLink() {
  openHrefInNewTab(bubbleLinkUrl.value || '');
}
function removeBubbleLink() {
  editor.value?.chain().focus().unsetLink().run();
  bubbleLinkUrl.value = '';
  isOverflowOpen.value = false;
}

const bubbleImageUrl = ref('');
const bubbleImageAlt = ref('');

const isOverflowOpen = ref(false);
let overflowTimer: ReturnType<typeof setTimeout> | null = null;

function toggleOverflow() {
  if (!overflowActions.value.length) return;
  isOverflowOpen.value = !isOverflowOpen.value;
  clearOverflowTimer();
}

function suspendOverflowClose() {
  clearOverflowTimer();
}

function resumeOverflowClose() {
  clearOverflowTimer();
  overflowTimer = setTimeout(() => (isOverflowOpen.value = false), 1200);
}

function clearOverflowTimer() {
  if (overflowTimer) {
    clearTimeout(overflowTimer);
    overflowTimer = null;
  }
}

const isImageEditing = computed(() => {
  if (!editor.value) return false;
  // Check for both 'image' and 'imagePlus' node types
  return editor.value.isActive('image') || editor.value.isActive('imagePlus');
});

const isTextSelection = computed(() => !!editor.value && !isImageEditing.value && !editor.value.isActive('table') && !editor.value.isActive('chart'));
const isTableSelection = computed(() => !!editor.value && editor.value.isActive('table'));
const isLinkEditing = computed(() => !!editor.value && editor.value.isActive('link'));
const isChartSelection = computed(() => !!editor.value && editor.value.isActive('chart'));

function syncBubbleLinkFromEditor(activeEditor?: Editor) {
  const instance = activeEditor ?? editor.value;
  if (!instance) return;
  if (instance.isActive('link')) {
    const attrs = instance.getAttributes('link') as any;
    bubbleLinkUrl.value = attrs?.href || '';
  } else {
    bubbleLinkUrl.value = '';
  }
}

function handleLinkCtrlClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const linkEl = target?.closest('a[href]');
  if (!linkEl) {
    return false;
  }
  const href = linkEl.getAttribute('href') || '';
  if (!href) {
    return false;
  }
  event.preventDefault();
  openHrefInNewTab(href);
  return true;
}

const activeTextColor = computed(() => editor.value?.getAttributes('textStyle')?.color as string | undefined);
const activeHighlightColor = computed(() => editor.value?.getAttributes('highlight')?.color as string | undefined);

const docsTemplateCache = new Map<string, string>();
const docsTemplateLoaders = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/docs/templates/*.html', { as: 'raw' }))
    .map(([path, loader]) => {
      const fileName = path.split('/').pop() ?? '';
      const templateKey = fileName.replace(/\.html$/, '');
      return [templateKey, loader as () => Promise<string>];
    })
) as Record<string, () => Promise<string>>;

type BubbleAction = {
  key: string;
  icon: Component;
  handler: () => void;
  tooltip: string;
  label: string;
  disabled?: boolean;
  isActive?: boolean;
  className?: string;
  style?: Partial<Record<string, string>>;
};

const allTextActions = computed<BubbleAction[]>(() => {
  if (!editor.value) return [];
  const instance = editor.value;
  const highlightStyle = activeHighlightColor.value
    ? { backgroundColor: String(activeHighlightColor.value), color: '#111827' }
    : undefined;

  return [
    {
      key: 'bold',
      icon: Bold,
      handler: () => instance.chain().focus().toggleBold().run(),
      tooltip: 'Bold (Ctrl+B)',
      label: 'Bold',
      isActive: instance.isActive('bold'),
    },
    {
      key: 'italic',
      icon: Italic,
      handler: () => instance.chain().focus().toggleItalic().run(),
      tooltip: 'Italic (Ctrl+I)',
      label: 'Italic',
      isActive: instance.isActive('italic'),
    },
    {
      key: 'underline',
      icon: UnderlineIcon,
      handler: () => instance.chain().focus().toggleUnderline().run(),
      tooltip: 'Underline (Ctrl+U)',
      label: 'Underline',
      isActive: instance.isActive('underline'),
    },
    {
      key: 'strike',
      icon: Strikethrough,
      handler: () => instance.chain().focus().toggleStrike().run(),
      tooltip: 'Strikethrough',
      label: 'Strikethrough',
      isActive: instance.isActive('strike'),
      className: 'text-gray-500 dark:text-gray-400',
    },
    {
      key: 'text',
      icon: Text,
      handler: () => instance.chain().focus().setParagraph().run(),
      tooltip: 'Normal text',
      label: 'Paragraph',
      isActive: instance.isActive('paragraph'),
    },
    {
      key: 'h2',
      icon: Heading2,
      handler: () => instance.chain().focus().toggleHeading({ level: 2 }).run(),
      tooltip: 'Heading 2',
      label: 'Heading 2',
      isActive: instance.isActive('heading', { level: 2 }),
    },
    {
      key: 'h3',
      icon: Heading3,
      handler: () => instance.chain().focus().toggleHeading({ level: 3 }).run(),
      tooltip: 'Heading 3',
      label: 'Heading 3',
      isActive: instance.isActive('heading', { level: 3 }),
    },
    {
      key: 'color',
      icon: Palette,
      handler: () => {
        const current = instance.getAttributes('textStyle')?.color;
        if (current && current.toLowerCase() === '#2563eb') {
          instance.chain().focus().unsetColor().run();
        } else {
          instance.chain().focus().setColor('#2563eb').run();
        }
      },
      tooltip: 'Brand foreground color',
      label: 'Text color',
      isActive: (instance.getAttributes('textStyle')?.color || '').toLowerCase() === '#2563eb',
      style: activeTextColor.value ? { color: String(activeTextColor.value) } : undefined,
    },
    {
      key: 'highlight',
      icon: Highlighter,
      handler: () => {
        // This will be intercepted by executeAction to show color picker
      },
      tooltip: 'Background color',
      label: 'Background color',
      isActive: instance.isActive('highlight'),
      style: highlightStyle,
    },
    {
      key: 'clear',
      icon: Eraser,
      handler: () => {
        instance.chain().focus().unsetHighlight().unsetAllMarks().clearNodes().run();
      },
      tooltip: 'Clear formatting',
      label: 'Clear formatting',
      className: 'text-gray-500 dark:text-gray-400',
    },
    {
      key: 'bullet-list',
      icon: BulletListIcon,
      handler: () => instance.chain().focus().toggleBulletList().run(),
      tooltip: 'Bulleted list',
      label: 'Bulleted list',
      isActive: instance.isActive('bulletList'),
    },
    {
      key: 'ordered-list',
      icon: ListOrdered,
      handler: () => instance.chain().focus().toggleOrderedList().run(),
      tooltip: 'Numbered list',
      label: 'Numbered list',
      isActive: instance.isActive('orderedList'),
    },
    {
      key: 'align-left',
      icon: AlignLeft,
      handler: () => instance.chain().focus().setTextAlign('left').run(),
      tooltip: 'Align left',
      label: 'Align left',
      isActive: instance.isActive({ textAlign: 'left' }),
    },
    {
      key: 'align-center',
      icon: AlignCenter,
      handler: () => instance.chain().focus().setTextAlign('center').run(),
      tooltip: 'Align center',
      label: 'Align center',
      isActive: instance.isActive({ textAlign: 'center' }),
    },
    {
      key: 'align-right',
      icon: AlignRight,
      handler: () => instance.chain().focus().setTextAlign('right').run(),
      tooltip: 'Align right',
      label: 'Align right',
      isActive: instance.isActive({ textAlign: 'right' }),
    },
    {
      key: 'align-justify',
      icon: AlignJustify,
      handler: () => instance.chain().focus().setTextAlign('justify').run(),
      tooltip: 'Align justify',
      label: 'Align justify',
      isActive: instance.isActive({ textAlign: 'justify' }),
    },
    {
      key: 'link',
      icon: LinkIcon,
      handler: () => openBubbleLink(),
      tooltip: 'Insert link (Ctrl+K)',
      label: 'Link',
      disabled: !instance.can().setLink({ href: '' }),
      isActive: instance.isActive('link'),
    },
  ];
});

const tableActions = computed<BubbleAction[]>(() => {
  if (!editor.value) return [];
  const instance = editor.value;

  return [
    {
      key: 'add-col',
      icon: Columns,
      handler: () => instance.chain().focus().addColumnAfter().run(),
      tooltip: 'Add column',
      label: 'Add column',
    },
    {
      key: 'add-row',
      icon: Rows3,
      handler: () => instance.chain().focus().addRowAfter().run(),
      tooltip: 'Add row',
      label: 'Add row',
    },
    {
      key: 'merge',
      icon: GitMerge,
      handler: () => instance.chain().focus().mergeCells().run(),
      tooltip: 'Merge cells',
      label: 'Merge cells',
    },
    {
      key: 'split',
      icon: GitFork,
      handler: () => instance.chain().focus().splitCell().run(),
      tooltip: 'Split cells',
      label: 'Split cells',
    },
    {
      key: 'align-left-table',
      icon: AlignLeft,
      handler: () => instance.chain().focus().setCellAttribute('alignment', 'left').run(),
      tooltip: 'Align left',
      label: 'Align left',
    },
    {
      key: 'align-center-table',
      icon: AlignCenter,
      handler: () => instance.chain().focus().setCellAttribute('alignment', 'center').run(),
      tooltip: 'Align center',
      label: 'Align center',
    },
    {
      key: 'align-right-table',
      icon: AlignRight,
      handler: () => instance.chain().focus().setCellAttribute('alignment', 'right').run(),
      tooltip: 'Align right',
      label: 'Align right',
    },
    {
      key: 'del-col',
      icon: Trash2,
      handler: () => instance.chain().focus().deleteColumn().run(),
      tooltip: 'Delete column',
      label: 'Delete column',
      className: 'text-red-500 dark:text-red-400',
    },
    {
      key: 'del-row',
      icon: Trash2,
      handler: () => instance.chain().focus().deleteRow().run(),
      tooltip: 'Delete row',
      label: 'Delete row',
      className: 'text-red-500 dark:text-red-400',
    },
  ];
});

// Image replacement state
const showImageUrlDialog = ref(false);
const imageUrlInput = ref('');

function openImageUrlDialog() {
  let attrs = editor.value?.getAttributes('image');
  if (!attrs?.src) {
    attrs = editor.value?.getAttributes('imagePlus');
  }
  imageUrlInput.value = attrs?.src || '';
  closeTiptapBubbleMenu();
  showImageUrlDialog.value = true;
  isOverflowOpen.value = false;
}

function replaceImageUrl(url: string) {
  if (!editor.value || !url) return;
  
  // Try to update both node types
  const chain = editor.value.chain().focus();
  
  if (editor.value.isActive('image')) {
    chain.updateAttributes('image', { src: url }).run();
  } else if (editor.value.isActive('imagePlus')) {
    chain.updateAttributes('imagePlus', { src: url }).run();
  }
  
  showImageUrlDialog.value = false;
  imageUrlInput.value = '';
}

function openImageUpload() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !editor.value) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (src && editor.value) {
        const chain = editor.value.chain().focus();
        
        if (editor.value.isActive('image')) {
          chain.updateAttributes('image', { src }).run();
        } else if (editor.value.isActive('imagePlus')) {
          chain.updateAttributes('imagePlus', { src }).run();
        }
      }
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

const imageActions = computed<BubbleAction[]>(() => {
  if (!editor.value) return [];
  const instance = editor.value;
  return [
    {
      key: 'replace-url',
      icon: ImageIcon,
      handler: openImageUrlDialog,
      tooltip: 'Replace Image',
      label: 'Replace Image',
    },
    {
      key: 'upload-image',
      icon: Upload,
      handler: openImageUpload,
      tooltip: 'Upload new image',
      label: 'Upload',
    },
    {
      key: 'image-align-left',
      icon: AlignLeft,
      handler: () => instance.chain().focus().setTextAlign('left').run(),
      tooltip: 'Align left',
      label: 'Align left',
      isActive: instance.isActive({ textAlign: 'left' }),
    },
    {
      key: 'image-align-center',
      icon: AlignCenter,
      handler: () => instance.chain().focus().setTextAlign('center').run(),
      tooltip: 'Center image',
      label: 'Center image',
      isActive: instance.isActive({ textAlign: 'center' }),
    },
    {
      key: 'image-align-right',
      icon: AlignRight,
      handler: () => instance.chain().focus().setTextAlign('right').run(),
      tooltip: 'Align right',
      label: 'Align right',
      isActive: instance.isActive({ textAlign: 'right' }),
    },
    {
      key: 'delete-image',
      icon: Trash2,
      handler: () => instance.chain().focus().deleteSelection().run(),
      tooltip: 'Delete image',
      label: 'Delete',
      className: 'text-red-500 dark:text-red-400',
    },
  ];
});

const chartActions = computed<BubbleAction[]>(() => {
  if (!editor.value) return [];
  const attrs = getSelectedChartAttrs();
  const showLegend = attrs?.showLegend ?? true;
  
  return [
    {
      key: 'edit-chart',
      icon: BarChart3,
      handler: openChartConfiguratorFromBubble,
      tooltip: 'Configure chart data',
      label: 'Configure data',
    },
    {
      key: 'chart-title',
      icon: Type,
      handler: () => toggleChartTitleEdit(),
      tooltip: 'Edit chart title',
      label: 'Title',
      isActive: showChartTitleEdit.value,
    },
    {
      key: 'toggle-legend',
      icon: showLegend ? Eye : EyeOff,
      handler: () => toggleChartLegend(),
      tooltip: showLegend ? 'Hide legend' : 'Show legend',
      label: showLegend ? 'Hide legend' : 'Show legend',
      isActive: showLegend,
    },
    {
      key: 'chart-fontsize',
      icon: AArrowUp,
      handler: () => toggleChartFontSizeEdit(),
      tooltip: 'Adjust font size',
      label: 'Font size',
      isActive: showChartFontSizeEdit.value,
    },
  ];
});


function getSelectedChartAttrs(): ChartAttrs | null {
  if (!editor.value) return null;
  const { state } = editor.value;
  const { selection } = state;

  if (selection instanceof NodeSelection && selection.node.type.name === 'chart') {
    return { ...(selection.node.attrs as ChartAttrs) };
  }

  let attrs: ChartAttrs | null = null;
  state.doc.nodesBetween(selection.from, selection.to, node => {
    if (!attrs && node.type.name === 'chart') {
      attrs = { ...(node.attrs as ChartAttrs) };
      return false;
    }
    return undefined;
  });
  return attrs;
}

const bubbleMenuRef = ref<any>(null);

function closeTiptapBubbleMenu(): void {
  // Query all Tippy root containers (used by Tiptap BubbleMenu)
  const tippies = document.querySelectorAll<HTMLElement>('[data-tippy-root]');

  tippies.forEach((tippy) => {
    const box = tippy.querySelector<HTMLElement>('.tippy-box');
    if (!box) return;

    // Hide visually and disable interaction
    tippy.style.visibility = 'hidden';
    tippy.style.opacity = '0';
    tippy.style.pointerEvents = 'none';

    // Try to call the Tippy instance hide method if available
    const anyTippy = tippy as any;
    if (anyTippy._tippy && typeof anyTippy._tippy.hide === 'function') {
      try {
        anyTippy._tippy.hide();
      } catch {
        // Silently ignore in case Tippy instance is already destroyed
      }
    }
  });
}

function openChartConfiguratorFromBubble() {
  const attrs = getSelectedChartAttrs();
  if (!attrs) return;
  // Close bubble menu overflow if open
  isOverflowOpen.value = false;
  showChartTitleEdit.value = false;
  showChartFontSizeEdit.value = false;
  // Hide the bubble menu
  closeTiptapBubbleMenu();

  toolbarRef.value?.openChartConfigurator(attrs);
}

// Chart quick edit state
const showChartTitleEdit = ref(false);
const chartTitleInput = ref('');
const showChartFontSizeEdit = ref(false);
const chartFontSizeInput = ref(12);

function toggleChartTitleEdit() {
  const attrs = getSelectedChartAttrs();
  if (!attrs) return;
  showChartTitleEdit.value = !showChartTitleEdit.value;
  showChartFontSizeEdit.value = false;
  if (showChartTitleEdit.value) {
    chartTitleInput.value = attrs.title || '';
  }
}

function toggleChartFontSizeEdit() {
  const attrs = getSelectedChartAttrs();
  if (!attrs) return;
  showChartFontSizeEdit.value = !showChartFontSizeEdit.value;
  showChartTitleEdit.value = false;
  if (showChartFontSizeEdit.value) {
    chartFontSizeInput.value = attrs.fontSize ?? 12;
  }
}

function applyChartTitle() {
  if (!editor.value) return;
  const { state } = editor.value;
  const { selection } = state;
  
  if (selection instanceof NodeSelection && selection.node.type.name === 'chart') {
    const pos = selection.from;
    editor.value.chain().focus().setNodeSelection(pos).updateAttributes('chart', {
      title: chartTitleInput.value.trim(),
    }).run();
  }
  showChartTitleEdit.value = false;
}

function applyChartFontSize() {
  if (!editor.value) return;
  const { state } = editor.value;
  const { selection } = state;
  
  if (selection instanceof NodeSelection && selection.node.type.name === 'chart') {
    const pos = selection.from;
    editor.value.chain().focus().setNodeSelection(pos).updateAttributes('chart', {
      fontSize: chartFontSizeInput.value,
    }).run();
  }
  showChartFontSizeEdit.value = false;
}

function toggleChartLegend() {
  if (!editor.value) return;
  const attrs = getSelectedChartAttrs();
  if (!attrs) return;
  
  const { state } = editor.value;
  const { selection } = state;
  
  if (selection instanceof NodeSelection && selection.node.type.name === 'chart') {
    const pos = selection.from;
    editor.value.chain().focus().setNodeSelection(pos).updateAttributes('chart', {
      showLegend: !attrs.showLegend,
    }).run();
  }
}

// Bubble menu state for color pickers
const showTextColorPicker = ref(false);
const showBgColorPicker = ref(false);
const bubbleTextColor = ref('#000000');
const bubbleBgColor = ref('#ffff00');

function resetBubbleColorPickers() {
  showTextColorPicker.value = false;
  showBgColorPicker.value = false;
  showChartTitleEdit.value = false;
  showChartFontSizeEdit.value = false;
}

const bubbleMenuTippyOptions: Record<string, any> = {
  duration: 100,
  placement: 'top',
  maxWidth: 400,
  onHide: () => {
    resetBubbleColorPickers();
  },
};

// Computed for current colors
const currentBubbleTextColor = computed(() => {
  if (!editor.value) return '#000000';
  const color = editor.value.getAttributes('textStyle')?.color;
  return color || '#000000';
});

const currentBubbleBgColor = computed(() => {
  if (!editor.value) return '#ffff00';
  const color = editor.value.getAttributes('highlight')?.color;
  return color || '#ffff00';
});

// Priority keys for different contexts
const textPrimaryKeys = ['bold', 'italic', 'underline', 'color', 'highlight', 'link', 'clear'];
const textOverflowKeys = ['strike', 'bullet-list', 'ordered-list', 'align-left', 'align-center', 'align-right', 'text', 'h2', 'h3'];
const headingPrimaryKeys = ['h2', 'h3', 'text', 'bold', 'italic', 'underline', 'clear'];
const headingOverflowKeys = ['strike', 'color', 'highlight', 'link', 'bullet-list', 'ordered-list', 'align-left', 'align-center', 'align-right'];
const tablePrimaryKeys = ['add-col', 'add-row', 'merge', 'split', 'align-left-table', 'align-center-table', 'align-right-table'];
const tableOverflowKeys = ['del-col', 'del-row'];
const imagePrimaryKeys = ['replace-url', 'upload-image', 'image-align-left', 'image-align-center', 'image-align-right', 'delete-image'];
const chartPrimaryKeys = ['edit-chart', 'chart-title', 'toggle-legend', 'chart-fontsize'];

function splitActions(
  actions: BubbleAction[],
  primaryOrder: string[],
  overflowOrder: string[],
  excludeKeys: string[] = []
) {
  const map = new Map(actions.map((action) => [action.key, action]));
  const primary: BubbleAction[] = [];
  const MAX_PRIMARY = 8; // Reserve 1 slot for "more" button (max 9 total)
  
  primaryOrder.forEach((key) => {
    if (excludeKeys.includes(key)) return;
    if (primary.length >= MAX_PRIMARY) return;
    const action = map.get(key);
    if (action) {
      primary.push(action);
    }
  });
  
  const used = new Set(primary.map((action) => action.key));
  const overflow: BubbleAction[] = [];
  
  overflowOrder.forEach((key) => {
    if (excludeKeys.includes(key) || used.has(key)) return;
    const action = map.get(key);
    if (action) {
      overflow.push(action);
    }
  });
  
  actions.forEach((action) => {
    if (excludeKeys.includes(action.key)) return;
    if (!used.has(action.key) && !overflow.find((item) => item.key === action.key)) {
      overflow.push(action);
    }
  });
  
  return { primary, overflow };
}

const actionSets = computed(() => {
  if (isImageEditing.value) {
    return splitActions(imageActions.value, imagePrimaryKeys, []);
  }
  if (isTableSelection.value) {
    return splitActions(tableActions.value, tablePrimaryKeys, tableOverflowKeys);
  }
  if (isChartSelection.value) {
    return splitActions(chartActions.value, chartPrimaryKeys, []);
  }
  if (isTextSelection.value) {
    // Check if selection is a heading
    const isHeading = editor.value?.isActive('heading');
    const primaryKeys = isHeading ? headingPrimaryKeys : textPrimaryKeys;
    const overflowKeys = isHeading ? headingOverflowKeys : textOverflowKeys;
    
    return splitActions(
      allTextActions.value,
      primaryKeys,
      overflowKeys,
      isLinkEditing.value ? ['link'] : []
    );
  }
  return { primary: [] as BubbleAction[], overflow: [] as BubbleAction[] };
});

const primaryActions = computed(() => actionSets.value.primary);
const overflowActions = computed(() => actionSets.value.overflow);

function executeAction(action: BubbleAction, closeOverflow = false) {
  if (action.disabled) return;
  
  // Handle color picker actions
  if (action.key === 'color') {
    const shouldShow = !showTextColorPicker.value;
    resetBubbleColorPickers();
    showTextColorPicker.value = shouldShow;
    if (shouldShow) {
      bubbleTextColor.value = currentBubbleTextColor.value;
    }
    return;
  }

  if (action.key === 'highlight') {
    const shouldShow = !showBgColorPicker.value;
    resetBubbleColorPickers();
    showBgColorPicker.value = shouldShow;
    if (shouldShow) {
      bubbleBgColor.value = currentBubbleBgColor.value;
    }
    return;
  }
  
  action.handler();
  if (closeOverflow) {
    isOverflowOpen.value = false;
  }
}

function onBubbleTextColorChange(event: Event) {
  if (!editor.value) return;
  const target = event.target as HTMLInputElement;
  const color = target.value;
  editor.value.chain().focus().setColor(color).run();
  bubbleTextColor.value = color;
}

function onBubbleBgColorChange(event: Event) {
  if (!editor.value) return;
  const target = event.target as HTMLInputElement;
  const color = target.value;
  editor.value.chain().focus().setHighlight({ color }).run();
  bubbleBgColor.value = color;
}

watch([isTextSelection, isTableSelection, isImageEditing, isChartSelection], () => {
  isOverflowOpen.value = false;
  resetBubbleColorPickers();
  clearOverflowTimer();
});

watch(isLinkEditing, (active) => {
  if (active) {
    syncBubbleLinkFromEditor(editor.value);
  } else {
    bubbleLinkUrl.value = '';
  }
});

watch(isImageEditing, (active) => {
  if (active && editor.value) {
    // Try both node types
    let attrs = editor.value.getAttributes('image') as any;
    if (!attrs?.src) {
      attrs = editor.value.getAttributes('imagePlus') as any;
    }
    bubbleImageUrl.value = attrs?.src || '';
    bubbleImageAlt.value = attrs?.alt || '';
  }
});

onUnmounted(() => clearOverflowTimer());

// Share dialog state
const shareOpen = ref(false);
const shareLinkDoc = computed(() => {
  const idParam = route.params.appFileId;
  if (!idParam) return '';
  const id = String(idParam);
  return `${window.location.origin}/docs/${id}`;
});
const tocItems = computed(() => {
  if (!editor.value) return [];
  
  const headings: Array<{ level: number; text: string; id: string }> = [];
  const json = editor.value.getJSON();
  
  const extractHeadings = (node: any, index = 0) => {
    if (node.type === 'heading' && node.content) {
      const text = node.content.map((c: any) => c.text || '').join('');
      const id = `heading-${index}`;
      headings.push({ level: node.attrs.level, text, id });
    }
    if (node.content) {
      node.content.forEach((child: any, i: number) => extractHeadings(child, headings.length + i));
    }
  };
  
  if (json.content) {
    json.content.forEach((node: any, i: number) => extractHeadings(node, i));
  }
  
  return headings;
});

function scrollToHeading(index: number) {
  if (!editor.value) return;
  const { state } = editor.value;
  let headingCount = 0;
  let targetPos = 0;
  
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      if (headingCount === index) {
        targetPos = pos;
        return false; // Stop iteration
      }
      headingCount++;
    }
  });
  
  if (targetPos > 0) {
    editor.value.chain().setTextSelection(targetPos).scrollIntoView().run();
  }
}

// Helper function to detect content type and load appropriately
function loadContentIntoEditor(content: string) {
  if (!editor.value || !content) return;

  try {
    const trimmedContent = content.trim();
    
    // Check if it's HTML (starts with < and contains HTML tags)
    const isHTML = trimmedContent.startsWith('<') && (
      trimmedContent.includes('</') || 
      trimmedContent.match(/<[a-z][\s\S]*>/i)
    );
    
    if (isHTML) {
      // Load as HTML - Tiptap will parse it
      editor.value.commands.setContent(trimmedContent, false);
      hasEnteredContent.value = true;
      updateEditorEmptyState(editor.value);
      console.log('✓ Loaded HTML content');
      return;
    }
    
    // Try to parse as Tiptap JSON
    try {
      const parsed = JSON.parse(trimmedContent);
      
      // Validate it's a Tiptap document structure
      if (parsed && typeof parsed === 'object' && (parsed.type === 'doc' || parsed.content)) {
        editor.value.commands.setContent(parsed, false);
        hasEnteredContent.value = true;
        updateEditorEmptyState(editor.value);
        console.log('✓ Loaded Tiptap JSON content');
        return;
      }
    } catch (jsonError) {
      // Not valid JSON, continue to fallback
    }
    
    // Fallback: treat as plain text wrapped in paragraph
    editor.value.commands.setContent(`<p>${trimmedContent}</p>`, false);
    hasEnteredContent.value = true;
    updateEditorEmptyState(editor.value);
    console.log('✓ Loaded as plain text');

  } catch (error) {
    console.error('Error loading content:', error);
    editor.value?.commands.setContent('<p>Error loading content. Please try again.</p>', false);
    updateEditorEmptyState(editor.value);
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let maxWaitTimeout: ReturnType<typeof setTimeout> | null = null;

// Track online/offline status
window.addEventListener('online', () => isOffline.value = false);
window.addEventListener('offline', () => isOffline.value = true);

// Page dimension configurations
const pageDimensions = {
  a4: { width: 210, height: 297 }, // mm
  a3: { width: 297, height: 420 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 },
  card: { width: 88.9, height: 50.8 },
};

// Computed styles for page dimensions
const pageStyles = computed(() => {
  const size = pageSize.value as keyof typeof pageDimensions;
  const dims = pageDimensions[size] || pageDimensions.a4;
  
  const isLandscape = pageOrientation.value === 'landscape';
  const width = isLandscape ? dims.height : dims.width;
  const height = isLandscape ? dims.width : dims.height;
  
  // Convert mm to pixels (96 DPI: 1mm = 3.7795px)
  const widthPx = Math.round(width * 3.7795);
  
  return {
    maxWidth: `${widthPx}px`,
    width: '100%',
    '--page-width': `${width}mm`,
    '--page-height': `${height}mm`,
  } as Record<string, string>;
});

const contentPadding = computed(() => {
  // Standard document margins (screen only, removed in print)
  return {
    padding: '48px 64px', // ~1 inch margins
  };
});

async function saveDocument(isManual = false) {
  if (!editor.value || !currentDoc.value) return;

  if (editor.value.isEmpty && !hasEnteredContent.value) {
    if (isManual) {
      toast.info('Add some content before saving.');
    }
    return;
  }

  isSaving.value = true;
  
  try {
    const json = editor.value.getJSON();
    const hasMeaningfulContent = Array.isArray(json.content)
      ? json.content.some((node: any) => {
          if (!node) return false;
          if (node.type === 'paragraph') {
            const text = (node.content || [])
              .map((child: any) => child?.text || '')
              .join('')
              .trim();
            return text.length > 0;
          }
          return node.type && node.type !== 'paragraph';
        })
      : false;

    if (!hasMeaningfulContent) {
      if (isManual) {
        toast.info('Your document is still empty. Add content before saving.');
      }
      return;
    }

    // Save JSON as string in content field
    const updatedDoc: FileData = {
      ...currentDoc.value,
      content: JSON.stringify(json),
      last_viewed: new Date(),
    };
    
    const result = await fileStore.saveDocument(updatedDoc);
    if (result.document) {
      currentDoc.value = result.document;
      lastSavedAt.value = new Date();
      hasUnsavedChanges.value = false;
      // Only show toast for manual saves
      if (isManual) {
        toast.success('Document saved');
      }
    }
  } catch (error) {
    console.error('Failed to save document:', error);
    // Always show error toasts
    toast.error('Failed to save document');
  } finally {
    isSaving.value = false;
  }
}

function scheduleSave() {
  // Clear existing idle timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  // Schedule save after 3 seconds of idle (more responsive)
  saveTimeout = setTimeout(() => {
    saveDocument(false);
  }, 3000);
  
  // Ensure we save within 30 seconds regardless of activity
  if (!maxWaitTimeout) {
    maxWaitTimeout = setTimeout(() => {
      saveDocument(false);
      maxWaitTimeout = null;
    }, 30000); // 30 seconds
  }
}

function handlePrint() {
  window.print();
}

function handleExport(format: string) {
  if (!editor.value) return;
  
  if (format === 'html') {
    printAsHtml();
  } else if (format === 'pdf') {
    exportToPDF();
  } else if (format === 'docx') {
    exportToDocx();
  }
}

function printAsHtml() {
  if (!editor.value) return;
  
  const html = editor.value.getHTML();
  const title = documentTitle.value || 'document';
  
  // Create a complete HTML document with proper styling
  const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #ffffff;
      padding: 2rem;
    }
    
    .document-container {
      max-width: ${pageOrientation.value === 'landscape' ? '1122px' : '794px'};
      margin: 0 auto;
      padding: 48px 64px;
      background: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    h1, h2, h3, h4, h5, h6 {
      /* Neutralize default margins to let paragraphSpacing extension control spacing */
      margin-top: 0;
      margin-bottom: 0;
      font-weight: 600;
      line-height: 1.3;
    }
    
    h1 { font-size: 2.25em; }
    h2 { font-size: 1.875em; }
    h3 { font-size: 1.5em; }
    h4 { font-size: 1.25em; }
    h5 { font-size: 1.125em; }
    h6 { font-size: 1em; }
    
    p {
      /* Neutralize default margins to let paragraphSpacing extension control spacing */
      margin-top: 0;
      margin-bottom: 0;
    }
    
    ul, ol {
      margin-left: 1.5em;
      margin-bottom: 1em;
    }
    
    li {
      margin-bottom: 0.25em;
    }
    
    blockquote {
      border-left: 4px solid #e5e7eb;
      padding-left: 1em;
      margin: 1em 0;
      color: #6b7280;
      font-style: italic;
    }
    
    code {
      background: #f3f4f6;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    
    pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 1em;
      border-radius: 6px;
      overflow-x: auto;
      margin: 1em 0;
    }
    
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
    }
    
    th, td {
      border: 1px solid #e5e7eb;
      padding: 0.5em;
      text-align: left;
    }
    
    th {
      background: #f9fafb;
      font-weight: 600;
    }
    
    a {
      color: #2563eb;
      text-decoration: underline;
    }
    
    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 2em 0;
    }
    
    @media print {
    }
  </style>
</head>
<body>
  <div class="document-container">
    ${html}
  </div>
</body>
</html>`;
  
  const blob = new Blob([fullHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.html`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('HTML exported successfully');
}

async function exportToPDF() {
  if (!editor.value) return;
  
  try {
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      orientation: pageOrientation.value === 'landscape' ? 'landscape' : 'portrait',
      unit: 'mm',
      format: pageSize.value === 'letter' ? 'letter' : 'a4',
    });
    
    const html = editor.value.getHTML();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    tempDiv.style.padding = '20px';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '12pt';
    tempDiv.style.lineHeight = '1.6';
    
    pdf.html(tempDiv, {
      callback: (doc) => {
        doc.save(`${documentTitle.value || 'document'}.pdf`);
      },
      x: 10,
      y: 10,
      width: pageOrientation.value === 'landscape' ? 277 : 190,
      windowWidth: 800,
    });
    
    toast.success('PDF export started');
  } catch (error) {
    console.error('PDF export error:', error);
    toast.error('Failed to export PDF');
  }
}

async function exportToDocx() {
  if (!editor.value) return;
  
  try {
    const html = editor.value.getHTML();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const paragraphs: Paragraph[] = [];
    
    // Simple HTML to DOCX conversion
    const textContent = tempDiv.textContent || '';
    const lines = textContent.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(line.trim())],
        })
      );
    }
    
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: {
              orientation: pageOrientation.value === 'landscape' ? 'landscape' as any : 'portrait' as any,
            },
          },
        },
        children: paragraphs,
      }],
    });
    
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${documentTitle.value || 'document'}.docx`);
    toast.success('DOCX exported successfully');
  } catch (error) {
    console.error('DOCX export error:', error);
    toast.error('Failed to export DOCX');
  }
}

// Track if document is just loaded to prevent false unsaved changes
const isJustLoaded = ref(true);

// Watch for title changes and update page title
watch(documentTitle, (newTitle) => {
  document.title = newTitle || 'Untitled Document';
  if (!isJustLoaded.value) {
    hasUnsavedChanges.value = true;
  }
  if (currentDoc.value) {
    currentDoc.value.title = newTitle;
  }
});

async function loadTemplateContent(templateName: string): Promise<string> {
  if (docsTemplateCache.has(templateName)) {
    return docsTemplateCache.get(templateName)!;
  }

  try {
    const loader = docsTemplateLoaders[templateName];
    if (!loader) {
      console.error(`Template not found: ${templateName}`);
      return '<p></p>';
    }

    const content = await loader();
    docsTemplateCache.set(templateName, content);
    return content;
  } catch (error) {
    console.error(`Failed to load template: ${templateName}`, error);
    return '<p></p>'; // Fallback to blank
  }
}

async function initializeDocument() {
  const docId = route.params.appFileId as string | undefined;
  const template = route.params.template as string | undefined;
  
  isJustLoaded.value = true; // Mark as just loaded
  
  // Check if loading from template
  if (template) {
    const templateContent = await loadTemplateContent(template);
    const templateTitle = `${template.charAt(0).toUpperCase() + template.slice(1)} Document`;
    
    // Load template content into editor
    loadContentIntoEditor(templateContent);
    
    // Create new document with template
    try {
      const newDoc = await fileStore.createNewDocument('docx', templateTitle);
      currentDoc.value = newDoc;
      documentTitle.value = newDoc.title || templateTitle;
      document.title = documentTitle.value;
      
      // Update URL to edit mode
      await router.replace(`/docs/${newDoc.id}`);
      
      toast.success('Document created from template');
      
      setTimeout(() => {
        isJustLoaded.value = false;
      }, 500);
    } catch (error) {
      console.error('Failed to create document from template:', error);
      toast.error('Failed to create document');
    }
    return;
  }
  
  if (docId && docId !== 'new') {
    // Load existing document
    try {
      const doc = await fileStore.loadDocument(docId, 'docx');
      if (doc) {
        currentDoc.value = doc;
        documentTitle.value = doc.title || 'Untitled Document';
        document.title = documentTitle.value; // Set page title
        
        // Load content into editor using helper function
        if (doc.content) {
          loadContentIntoEditor(doc.content);
        }
        
        lastSavedAt.value = new Date();
        
        // Clear just loaded flag after a short delay
        setTimeout(() => {
          isJustLoaded.value = false;
        }, 500);
      }
    } catch (error) {
      console.error('Failed to load document:', error);
      toast.error('Failed to load document');
    }
  } else {
    // Create new document
    try {
      const newDoc = await fileStore.createNewDocument('docx', 'Untitled Document');
      currentDoc.value = newDoc;
      documentTitle.value = newDoc.title || 'Untitled Document';
      document.title = documentTitle.value; // Set page title
      
      // Update URL with the new document ID
      await router.replace(`/docs/${newDoc.id}`);
      
      // Clear just loaded flag after a short delay
      setTimeout(() => {
        isJustLoaded.value = false;
      }, 500);
    } catch (error) {
      console.error('Failed to create document:', error);
      toast.error('Failed to create document');
    }
  }
}

function goBack() {
  router.push('/');
}

// Pagination settings update
function updatePaginationSettings(settings: { showPageNumbers: boolean; pageNumberPosition: string; footerHeight: number }) {
  // Update pagination extension configuration
  if (editor.value) {
    const footerLeft = settings.showPageNumbers && settings.pageNumberPosition === 'left' ? '{page}' : '';
    const footerRight = settings.showPageNumbers && settings.pageNumberPosition === 'right' ? '{page}' : '';
    
    // Recreate editor with new settings
    editor.value.destroy();
    initializeEditor(settings.footerHeight, footerLeft, footerRight);
  }
}

// Share functions
const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const FILES_ENDPOINT = `${API_BASE_URI}/app-files`;

const permToApi: Record<'view'|'comment'|'edit', 'v'|'c'|'e'> = { view: 'v', comment: 'c', edit: 'e' };
const apiToPerm: Record<'v'|'c'|'e', 'view'|'comment'|'edit'> = { v: 'view', c: 'comment', e: 'edit' };

function parseSharingInfoString(info?: string | null) {
  const list: Array<{ email: string; permission: 'view'|'comment'|'edit' }> = [];
  if (!info || typeof info !== 'string') return list;
  info.split(',').map(s => s.trim()).filter(Boolean).forEach(pair => {
    const [email, access] = pair.split(':').map(x => (x || '').trim());
    if (email && access && access in apiToPerm) {
      list.push({ email, permission: apiToPerm[access as 'v'|'c'|'e'] });
    }
  });
  return list;
}

function serializeSharingInfoString(members: Array<{ email: string; permission: 'view'|'comment'|'edit' }>): string {
  return members.map(m => `${m.email}:${permToApi[m.permission]}`).join(',');
}

function copyShareLink() {
  try {
    navigator.clipboard.writeText(shareLinkDoc.value);
    toast.success('Link copied to clipboard');
  } catch {}
}

async function handleInviteMember(payload: { email: string; permission: 'view'|'comment'|'edit'|'owner'; note?: string }) {
  try {
    const id = route.params.appFileId as string;
    if (!id) return;
    
    const newMembers = [...shareMembers.value, { email: payload.email, permission: payload.permission as any }];
    const sharingInfo = serializeSharingInfoString(newMembers as any);
    
    const response = await axios.patch(`${FILES_ENDPOINT}/${id}`, { sharing_info: sharingInfo });
    if (response.data?.document) {
      shareMembers.value = parseSharingInfoString(response.data.document.sharing_info) as any;
      toast.success('Member invited');
    }
  } catch {}
}

async function handleUpdateMember(payload: { email: string; permission: 'view'|'comment'|'edit'|'owner' }) {
  return handleInviteMember(payload);
}

async function handleRemoveMember(payload: { email: string }) {
  try {
    const id = route.params.appFileId as string;
    if (!id) return;
    
    const newMembers = shareMembers.value.filter(m => m.email !== payload.email);
    const sharingInfo = serializeSharingInfoString(newMembers as any);
    
    const response = await axios.patch(`${FILES_ENDPOINT}/${id}`, { sharing_info: sharingInfo });
    if (response.data?.document) {
      shareMembers.value = parseSharingInfoString(response.data.document.sharing_info) as any;
      toast.success('Member removed');
    }
  } catch {}
}

async function updateVisibility(value: number) {
  try {
    const id = route.params.appFileId as string;
    if (!id) return;
    
    const response = await axios.patch(`${FILES_ENDPOINT}/${id}`, { privacy_type: value });
    if (response.data?.document) {
      privacyType.value = response.data.document.privacy_type;
      toast.success('Visibility updated');
    }
  } catch {}
}

// Helper to (re)initialize the editor with pagination settings
function initializeEditor(
  footerHeight: number = 30,
  footerLeft: string = '',
  footerRight: string = '{page}'
) {
  const existingContent = editor.value ? editor.value.getJSON() : undefined;
  if (editor.value) {
    try {
      detachEditorListeners?.();
      editor.value.destroy();
    } catch {}
  }

  editor.value = new Editor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        history: { depth: 100  },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      UnderlineExtension,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      FontSize,
      LineHeight,
      ParagraphSpacing,
      FontFamily.configure({ types: ['textStyle'] }),
      Color.configure({ types: ['textStyle'] }),
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TablePlus.configure({ resizable: true }),
      TableRowPlus,
      TableCellPlus,
      TableHeaderPlus,
      ImagePlus.configure({ allowBase64: true }),
      Placeholder.configure({
        placeholder: 'Click to start typing…',
        includeChildren: true,
        emptyEditorClass: 'is-editor-empty',
      }),
      ChartExtension,
      PaginationPlus.configure({
        pageHeight: 842,
        pageGap: 2,
        pageGapBorderSize: 1,
        pageBreakBackground: '#F7F7F8',
        pageHeaderHeight: 0,
        pageFooterHeight: footerHeight,
        footerLeft,
        footerRight,
        headerLeft: '',
        headerRight: '',
        // Keep plugin margins minimal – main layout already adds paddings
        marginTop: 10,
        marginBottom: 10,
        marginLeft: 10,
        marginRight: 10,
        contentMarginTop: 30,
        contentMarginBottom: 40,
      }),
    ],
    content: existingContent || '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[500px] print:min-h-0 print:overflow-visible'
      },
      handleClick: (_view, _pos, event) => {
        if (event instanceof MouseEvent) {
          return handleLinkCtrlClick(event);
        }
        return false;
      }
    }
  });

  attachEditorEventListeners(editor.value);
  updateEditorEmptyState(editor.value);
}

onMounted(async () => {
  // Initialize editor with default pagination matching current standard
  initializeEditor(30, '', '{page}');
  // Initialize/load document
  await initializeDocument();
});

onUnmounted(() => {
  // Save before unmounting
  if (editor.value && currentDoc.value) {
    saveDocument();
  }
  
  // Cleanup
  if (saveTimeout) clearTimeout(saveTimeout);
  if (maxWaitTimeout) clearTimeout(maxWaitTimeout);
  editor.value?.destroy();
});
</script>

<style scoped>
/* Neutralize Tailwind Typography defaults so paragraphSpacing controls spacing */
:deep(.prose :where(p):not(:where([class~="not-prose"],[class~="not-prose"] *))),
:deep(.prose-lg :where(p):not(:where([class~="not-prose"],[class~="not-prose"] *))) {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

:deep(.prose :where(h1,h2,h3,h4,h5,h6):not(:where([class~="not-prose"],[class~="not-prose"] *))),
:deep(.prose-lg :where(h1,h2,h3,h4,h5,h6):not(:where([class~="not-prose"],[class~="not-prose"] *))) {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

/* Neutralize ProseMirror defaults to allow paragraphSpacing to apply via inline style */
:deep(.ProseMirror p),
:deep(.ProseMirror h1),
:deep(.ProseMirror h2),
:deep(.ProseMirror h3),
:deep(.ProseMirror h4),
:deep(.ProseMirror h5),
:deep(.ProseMirror h6) {
  margin-top: 0;
  margin-bottom: 0;
}

.editor-placeholder-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: start;
  justify-content: start;
  background: transparent;
  border-radius: inherit;
  text-align: left;
  padding: 3rem 1.5rem;
  cursor: text;
}

.editor-placeholder-content {
  margin-top: 4rem;
  margin-left: 2rem;
  opacity: 0.8;
}

/* Editor Styles */
:deep(.ProseMirror) {
  min-height: 500px;
  outline: none;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}

:deep(.ProseMirror h1) {
  font-size: 2em;
  font-weight: bold;
  margin-top: 0.67em;
  margin-bottom: 0.67em;
}

:deep(.ProseMirror h2) {
  font-size: 1.5em;
  font-weight: bold;
  margin-top: 0.83em;
  margin-bottom: 0.83em;
}

:deep(.ProseMirror blockquote) {
  border-left: 3px solid #e5e7eb;
  padding-left: 1rem;
  margin-left: 0;
  color: #6b7280;
}

:deep(.ProseMirror code) {
  background-color: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

:deep(.ProseMirror pre) {
  background-color: #1f2937;
  color: #f9fafb;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
}

:deep(.ProseMirror pre code) {
  background: none;
  color: inherit;
  padding: 0;
}

/* Tables */
:deep(.ProseMirror table) {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 1rem 0;
  overflow: hidden;
}

:deep(.ProseMirror td),
:deep(.ProseMirror th) {
  min-width: 80px;
  min-height: 32px;
  border: 1px solid #d1d5db;
  padding: 0.375rem 0.5rem;
  vertical-align: top;
  box-sizing: border-box;
  position: relative;
}

:deep(.dark .ProseMirror td),
:deep(.dark .ProseMirror th) {
  border-color: #4b5563;
}

:deep(.ProseMirror th) {
  font-weight: 600;
  text-align: left;
  background-color: #f3f4f6;
  padding: 0.5rem 0.5rem;
}

:deep(.ProseMirror td p) {
  margin: 0;
}

:deep(.ProseMirror th p) {
  margin: 0;
}

:deep(.dark .ProseMirror th) {
  background-color: #374151;
}

/* Table Templates */
:deep(.ProseMirror table.table-striped tbody tr:nth-child(even)) {
  background-color: #f9fafb;
}

:deep(.dark .ProseMirror table.table-striped tbody tr:nth-child(even)) {
  background-color: #1f2937;
}

:deep(.ProseMirror table.table-bordered td),
:deep(.ProseMirror table.table-bordered th) {
  border: 2px solid #374151;
}

:deep(.ProseMirror table.table-minimal) {
  border: none;
}

:deep(.ProseMirror table.table-minimal td),
:deep(.ProseMirror table.table-minimal th) {
  border: none;
  border-bottom: 1px solid #e5e7eb;
}

:deep(.dark .ProseMirror table.table-minimal td),
:deep(.dark .ProseMirror table.table-minimal th) {
  border-bottom-color: #374151;
}

:deep(.ProseMirror table.table-minimal th) {
  background: transparent;
  border-bottom: 2px solid #374151;
}

:deep(.ProseMirror .selectedCell:after) {
  z-index: 2;
  position: absolute;
  content: "";
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(200, 200, 255, 0.4);
  pointer-events: none;
}

/* Task Lists */
:deep(.ProseMirror ul[data-type="taskList"]) {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}

:deep(.ProseMirror ul[data-type="taskList"] li) {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  padding: 0.25rem 0;
  line-height: 1.6;
}

:deep(.ProseMirror ul[data-type="taskList"] li > label) {
  flex: 0 0 auto;
  margin-right: 0.5rem;
  user-select: none;
  display: flex;
  align-items: center;
  height: 1.6em;
}

:deep(.ProseMirror ul[data-type="taskList"] li > div) {
  flex: 1 1 auto;
}

:deep(.ProseMirror ul[data-type="taskList"] input[type="checkbox"]) {
  cursor: pointer;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 0.25rem;
  border: 2px solid #d1d5db;
  appearance: none;
  background-color: white;
  transition: all 0.15s ease;
}

:deep(.ProseMirror ul[data-type="taskList"] input[type="checkbox"]:hover) {
  border-color: #2563eb;
}

:deep(.ProseMirror ul[data-type="taskList"] input[type="checkbox"]:checked) {
  background-color: #2563eb;
  border-color: #2563eb;
  background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
}

:deep(.ProseMirror ul[data-type="taskList"] input[type="checkbox"]:focus) {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}

/* Dark mode task list */
:deep(.dark .ProseMirror ul[data-type="taskList"] input[type="checkbox"]) {
  background-color: #374151;
  border-color: #4b5563;
}

:deep(.dark .ProseMirror ul[data-type="taskList"] input[type="checkbox"]:hover) {
  border-color: #60a5fa;
}

:deep(.dark .ProseMirror ul[data-type="taskList"] input[type="checkbox"]:checked) {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

/* Print styles for task lists */
@media print {
  :deep(.ProseMirror ul[data-type="taskList"]) {
    list-style: none;
    padding-left: 0;
    margin: 0.5rem 0;
  }
  
  :deep(.ProseMirror ul[data-type="taskList"] li) {
    display: flex;
    align-items: flex-start;
    margin-bottom: 0.25rem;
    padding: 0.125rem 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  :deep(.ProseMirror ul[data-type="taskList"] li > label) {
    flex: 0 0 auto;
    margin-right: 0.5rem;
    display: inline-flex;
    align-items: center;
    height: auto;
    min-width: 1.125rem;
  }
  
  :deep(.ProseMirror ul[data-type="taskList"] li > div) {
    flex: 1 1 auto;
    min-width: 0;
  }
  
  :deep(.ProseMirror ul[data-type="taskList"] input[type="checkbox"]) {
    width: 1rem;
    height: 1rem;
    min-width: 1rem;
    min-height: 1rem;
    flex-shrink: 0;
    margin: 0;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  
  :deep(.ProseMirror ul[data-type="taskList"] input[type="checkbox"]:checked) {
    background-color: #2563eb !important;
    border-color: #2563eb !important;
  }
}

/* Images (ImagePlus) */
:deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 1rem 0;
  display: block;
}

:deep(.ProseMirror img.ProseMirror-selectednode) {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}

:deep(.ProseMirror .image-plus-container) {
  margin: 1rem 0;
}

:deep(.ProseMirror .image-plus-container img) {
  border-radius: 0.5rem;
}

/* Links */
:deep(.ProseMirror a) {
  color: #2563eb;
  text-decoration: underline;
  cursor: pointer;
}

:deep(.ProseMirror a:hover) {
  color: #1d4ed8;
}

/* List Styles */
:deep(.ProseMirror ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin: 1rem 0;
}

:deep(.ProseMirror ul ul) {
  list-style-type: circle;
}

:deep(.ProseMirror ul ul ul) {
  list-style-type: square;
}

:deep(.ProseMirror ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin: 1rem 0;
}

:deep(.ProseMirror ol ol) {
  list-style-type: lower-alpha;
}

:deep(.ProseMirror ol ol ol) {
  list-style-type: lower-roman;
}

:deep(.ProseMirror li) {
  margin-bottom: 0.25rem;
}

:deep(.ProseMirror li p) {
  margin: 0;
}

/* Prevent table resize handles from splitting across pages */
:deep(.tiptap table) {
  position: relative;
}

:deep(.tiptap .handle) {
  position: absolute !important;
  left: 0;
  bottom: 0;
  transform: translate(-50%, 50%);
  z-index: 40!important;
}

/* Keep handle container with table */
:deep(.tiptap [style*="--cell-count"] > div[style*="position: relative"]) {
  page-break-inside: avoid;
  break-inside: avoid;
}

/* Horizontal Rule */
:deep(.ProseMirror hr) {
  border: none;
  border-top: 2px solid #e5e7eb;
  margin: 2rem 0;
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
  transition: background 0.2s;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

@media (prefers-color-scheme: dark) {
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #4b5563;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }
}

/* Firefox scrollbar */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;
}

@media (prefers-color-scheme: dark) {
  .custom-scrollbar {
    scrollbar-color: #4b5563 transparent;
  }
}


/* Bubble menu helpers */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 120ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}


@media print {
  .tiptap-toolbar {
    display: none!important;
  }
}

</style>
