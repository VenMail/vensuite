<template>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=PT+Serif:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;600;700&family=Raleway:wght@400;600;700&family=Nunito:wght@400;600;700&family=Poppins:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Spectral:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
  
  <div class="flex flex-col h-screen bg-gray-50">
     
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
      :show-version-history="true"
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

     
    <div v-if="accessDenied" class="flex-1 flex items-center justify-center p-8">
      <div class="w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{{$t('Commons.heading.request_access')}}</h2>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
          You don’t have access to this document. Enter your email to request access from the owner.
        </p>
        <div class="space-y-3">
          <div>
            <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input v-model="requestEmail" type="email" class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="you@example.com" />
          </div>
          <div>
            <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">Message (optional)</label>
            <textarea v-model="requestMessage" rows="3" class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="I’d like to view this document."></textarea>
          </div>
          <div>
            <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">{{$t('Commons.label.requested_access')}}</label>
            <select v-model="accessLevel" class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              <option value="v">{{$t('Commons.text.view')}}</option>
              <option value="c">{{$t('Commons.text.comment')}}</option>
              <option value="e">{{$t('Commons.heading.edit')}}</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <button @click="submitAccessRequestDoc" :disabled="requestSubmitting || !requestEmail" class="px-4 py-2 bg-primary-600 text-white rounded-md disabled:opacity-50">
              {{ requestSubmitting ? 'Sending…' : $t('Commons.button.request_access') }}
            </button>
            <a :href="shareLinkDoc" class="text-sm text-blue-600 dark:text-blue-400 underline" target="_blank" rel="noopener">{{$t('Views.DocsEditor.link.open_direct_link')}}</a>
          </div>
          <p v-if="requestSuccess" class="text-sm text-green-600 dark:text-green-400">{{ requestSuccess }}</p>
        </div>
      </div>
    </div>

     
    <DocsToolbar 
      ref="toolbarRef"
      :editor="editor" 
      :page-size="pageSize"
      :page-orientation="pageOrientation"
      :unread-count="unreadCount"
      @update:page-size="handlePageSizeChange"
      @update:page-orientation="pageOrientation = $event"
      @export="handleExport"
      @toggle-comments="isChatOpen = !isChatOpen"
      @toggle-expanded="isToolbarExpanded = $event"
      @update-pagination="updatePaginationSettings"
      @print="handlePrint"
    />
    <div v-if="collaboratorList.length" class="px-6 py-1 flex flex-wrap gap-2 items-center justify-end bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 text-xs">
      <span class="text-gray-500 dark:text-gray-400">{{$t('Commons.text.also_editing')}}</span>
      <button
        v-for="c in collaboratorList"
        :key="c.id"
        type="button"
        class="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 px-2 py-0.5 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
        @click="isChatOpen = true"
        :title="`${c.name} is editing`"
      >
        <span
          class="w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white"
          :style="{ backgroundColor: colorForUser(c.id) }"
        >
          {{ (c.name || '?').charAt(0).toUpperCase() }}
        </span>
        <span class="max-w-[120px] truncate text-gray-700 dark:text-gray-200" :title="c.name">{{ c.name }}</span>
      </button>
    </div>

     
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

     
    <div
      v-if="isTocOpen"
      :class="[
        'print-none fixed left-4 z-40 w-64 max-h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col print-none',
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
          <p>{{$t('Views.DocsEditor.text.no_headings_found')}}</p>
          <p class="mt-1 text-xs">{{$t('Views.DocsEditor.text.add_headings_to_see')}}</p>
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

// Normalize and apply document title from a file name
function setDocumentTitleFromName(name?: string | null) {
  const clean = (name || '').replace(/\.[^/.]+$/, '').trim();
  documentTitle.value = clean || 'Untitled Document';
}
          </button>
        </div>
      </div>
    </div>

     
    <div v-if="!accessDenied" class="flex-1 overflow-auto bg-gray-50 p-6 transition-colors custom-scrollbar print:p-0 print:bg-white">
      <div 
        class="mx-auto bg-white shadow-lg rounded-lg min-h-full transition-all print:shadow-none print:rounded-none"
        :class="{ 'landscape-mode': pageOrientation === 'landscape' }"
        :style="pageStyles"
      >
        <div :style="contentPadding" class="doc-page relative">
          <div
            v-if="showPlaceholderOverlay"
            class="editor-placeholder-overlay"
            @click="focusEditor"
          >
            <div class="editor-placeholder-content">
              <p class="text-lg text-gray-700">Click to start typing...</p>
               
            </div>
          </div>
           
          <BubbleMenu
            v-if="editor"
            ref="bubbleMenuRef"
            :editor="editor"
            :tippy-options="bubbleMenuTippyOptions"
            :should-show="bubbleShouldShow"
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
            class="prose prose-lg max-w-none"
            @focusin="onEditorFocus"
            @focusout="onEditorBlur"
          />
        </div>
      </div>
    </div>

    <!-- Chat Panel -->
    <div
      v-if="isChatOpen"
      class="fixed right-4 bottom-4 w-80 h-96 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl flex flex-col"
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
                <div class="mt-1 text-sm text-gray-800 whitespace-pre-line dark:text-gray-100">
                  {{ message.content.message }}
                </div>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
          <p>{{$t('Views.DocsEditor.text.no_messages_yet')}}</p>
          <p class="mt-2 text-xs">{{$t('Views.DocsEditor.text.start_a_conversation_with')}}</p>
        </div>
      </div>
      <div class="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <form @submit.prevent="sendChatMessage" class="flex flex-col">
          <div class="flex">
            <textarea
              v-model="newChatMessage"
              placeholder="Type a message..."
              class="flex-grow border border-gray-300 dark:border-gray-700 rounded-l-md px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
              :style="{ height: textareaHeight }"
              @input="adjustChatTextareaHeight"
              @keydown.enter.exact.prevent="handleChatEnterKey"
              ref="chatInput"
            ></textarea>
            <button
              type="submit"
              class="bg-primary-600 text-white px-4 py-2 rounded-r-md text-sm hover:bg-primary-700 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              {{$t('Commons.button.send')}}
            </button>
          </div>
        </form>
      </div>
    </div>

    <Dialog v-model:open="shareOpen">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{{$t('Commons.button.share')}}</DialogTitle>
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
          <DialogTitle>{{$t('Commons.heading.replace_image')}}</DialogTitle>
        </DialogHeader>
        <ImagePicker
          :initial-url="imageUrlInput"
          submit-label="Replace"
          @submit="replaceImageUrl"
          @cancel="showImageUrlDialog = false"
        />
      </DialogContent>
    </Dialog>

    <!-- Local vs Online Conflict Dialog -->
    <Dialog v-model:open="conflictDialogOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{$t('Views.DocsEditor.heading.content_versions_differ')}}</DialogTitle>
          <DialogDescription>
            {{ conflictDialogMessage }}
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <div class="space-y-2">
            <p>
              <span class="font-medium">{{$t('Commons.text.local_copy')}}</span>
              {{ conflictLocalLength }} bytes
            </p>
            <details class="rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-200">
              <summary class="cursor-pointer select-none px-3 py-2 font-medium">
                {{$t('Views.DocsEditor.text.preview_local_version')}}
              </summary>
              <div class="border-t border-gray-200 px-3 py-3 dark:border-gray-700">
                {{ conflictLocalPreview ?? $t('Views.DocsEditor.text.preview_unavailable') }}
              </div>
            </details>
          </div>
          <div class="space-y-2">
            <p>
              <span class="font-medium">{{$t('Commons.text.online_copy')}}</span>
              {{ conflictRemoteLength }} bytes
            </p>
            <details class="rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-200">
              <summary class="cursor-pointer select-none px-3 py-2 font-medium">
                {{$t('Views.DocsEditor.text.preview_online_version')}}
              </summary>
              <div class="border-t border-gray-200 px-3 py-3 dark:border-gray-700">
                {{ conflictRemotePreview ?? $t('Views.DocsEditor.text.preview_unavailable') }}
              </div>
            </details>
          </div>
          <p v-if="conflictDeltaLength > 0" class="text-xs text-gray-500 dark:text-gray-400">
            Difference: {{ conflictDeltaLength }} bytes
          </p>
        </div>
        <DialogFooter>
          <Button variant="secondary" @click="keepLocalVersion">{{$t('Views.DocsEditor.button.keep_local_version')}}</Button>
          <Button variant="default" @click="keepRemoteVersion">{{$t('Views.DocsEditor.button.keep_online_version')}}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick, reactive } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { Editor, EditorContent, BubbleMenu } from '@tiptap/vue-3';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogDescription, DialogFooter } from '@/components/ui/dialog';

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
  Trash2,
  CheckCircle2,
  ExternalLink,
  BarChart3,
  AArrowUp,
  Type,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Upload,
  Maximize,
  ArrowDown,
  ArrowRight,
  Combine,
  SplitSquareHorizontal,
} from 'lucide-vue-next';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
// import Placeholder from '@tiptap/extension-placeholder';
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

// Predefined page sizes for PaginationPlus (in pixels at 96 DPI)
const PAGE_SIZES = {
  A4: { width: 794, height: 1123 },
  A3: { width: 1123, height: 1591 },
  A5: { width: 419, height: 794 },
  LETTER: { width: 818, height: 1060 },
  LEGAL: { width: 818, height: 1404 },
  TABLOID: { width: 1060, height: 1635 },
} as const;

// Use PaginationTable extensions for table pagination support
const { TablePlus, TableRowPlus, TableCellPlus, TableHeaderPlus } = PaginationTable;

// Type augmentation for PaginationPlus commands (runtime commands exist but types may be missing)
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paginationPlus: {
      updatePageHeight: (height: number) => ReturnType;
      updatePageWidth: (width: number) => ReturnType;
      updatePageSize: (size: { width: number; height: number }) => ReturnType;
      updateMargins: (margins: { top: number; bottom: number; left: number; right: number }) => ReturnType;
      updateContentMargins: (margins: { top: number; bottom: number }) => ReturnType;
      updateHeaderContent: (left: string, right: string) => ReturnType;
      updateFooterContent: (left: string, right: string) => ReturnType;
      updatePageBreakBackground: (color: string) => ReturnType;
      updatePageGap: (gap: number) => ReturnType;
    };
  }
}
import { useFileStore } from '@/store/files';
import { toast } from 'vue-sonner';
import type { FileData } from '@/types';
import DocsToolbar from '@/components/forms/DocsToolbar.vue';
import DocsTitleBar from '@/components/forms/DocsTitleBar.vue';
import ShareCard from '@/components/ShareCard.vue';
import { parseSharingInfoString, serializeSharingInfoString, labelToShareLevel, type ShareMember, type ShareLevel, type ShareLevelLabel } from '@/utils/sharing';
import ImagePicker from '@/components/ImagePicker.vue';
import { Button } from '@/components/ui/button';
import { useDocumentConflictResolver } from '@/composables/useDocumentConflictResolver';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { applyContentToEditor, guardEditorBeforeSave } from '@/composables/useTiptapContent';
import { saveAs } from 'file-saver';
import { useAuthStore } from '@/store/auth';
import axios from 'axios';
import { NodeSelection } from '@tiptap/pm/state';
import { IWebsocketService, Message, useWebSocket } from '@/lib/wsService';

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
const privacyType = ref<number>(7);
const shareMembers = ref<ShareMember[]>([]);

const guestAccessiblePrivacyTypes = new Set<number>([1, 2, 3, 4]);
// Privacy types that allow editing: 2=everyone_edit, 4=link_edit
const editablePrivacyTypes = new Set<number>([2, 4]);

const canJoinRealtime = computed(() => {
  const docId = route.params.appFileId as string;
  if (!docId || docId === 'new') return false;
  if (authStore.isAuthenticated) return true;
  return guestAccessiblePrivacyTypes.has(privacyType.value);
});

// Determines if the current user can edit the document
const canEditDoc = computed(() => authStore.isAuthenticated || editablePrivacyTypes.has(privacyType.value));

const isEditorFocused = ref(false);
const isEditorEmpty = ref(true);
const hasEnteredContent = ref(false);
const showPlaceholderOverlay = computed(() => !isEditorFocused.value && isEditorEmpty.value && !hasEnteredContent.value);

const collaborators = ref<Record<string, { name: string; ts: number }>>({});
const collaboratorList = computed(() =>
  Object.entries(collaborators.value)
    .filter(([id]) => id !== userId.value)
    .map(([id, info]) => ({ id, name: info.name, ts: info.ts })),
);

let detachEditorListeners: (() => void) | null = null;

// WebSocket collaboration state
const { initializeWebSocket } = useWebSocket();
const wsService = ref<IWebsocketService | null>(null);
const randomUserToken = Math.random().toString(36).substr(2, 9);
const userId = ref(
  authStore.isAuthenticated && authStore.userId
    ? authStore.userId
    : `guest-${randomUserToken}`,
);
const userName = ref(
  authStore.isAuthenticated
    ? ([authStore.firstName, authStore.lastName].filter(Boolean).join(' ') || authStore.email?.split('@')[0] || 'You')
    : `Guest ${Math.floor(Math.random() * 1000)}`,
);
const changesPending = ref(false);
const isJoined = ref(false);
const SOCKET_URI = import.meta.env.VITE_SOCKET_BASE_URL || "wss://w.venmail.io:8443";

// Public access / interstitial state for private docs
const accessDenied = ref(false);
const requestEmail = ref('');
const accessLevel = ref<'v' | 'c' | 'e'>('v');
const requestMessage = ref('');
const requestSubmitting = ref(false);
const requestSuccess = ref<string | null>(null);

async function submitAccessRequestDoc() {
  const idParam = route.params.appFileId as string | undefined;
  if (!idParam) return;
  requestSubmitting.value = true;
  requestSuccess.value = null;
  try {
    const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const res = await fetch(`${API_BASE_URI}/app-files/${idParam}/request-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: requestEmail.value,
        access_level: accessLevel.value,
        message: requestMessage.value || undefined,
      }),
    });
    const payload = await res.json();
    if (res.ok && (payload?.requested || payload?.success)) {
      requestSuccess.value = 'Access request sent. You will receive an email when approved.';
    } else {
      requestSuccess.value = payload?.message || 'Request sent (if the email is valid).';
    }
  } catch (error) {
    requestSuccess.value = 'Request submitted. Please check your email later.';
  } finally {
    requestSubmitting.value = false;
  }
}

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

// function handleEditorContentChange(instance: Editor) {
//   updateEditorEmptyState(instance);

//   if (isJustLoaded.value) {
//     return;
//   }

//   if (!instance.isEmpty) {
//     hasUnsavedChanges.value = true;
//     scheduleSave();
//   }
// }

// function attachEditorEventListeners(instance: Editor) {
//   detachEditorListeners?.();

//   const handleUpdate = () => handleEditorContentChange(instance);
//   const handleSelection = () => {
//     updateEditorEmptyState(instance);
//     syncBubbleLinkFromEditor(instance);
//   };
//   const handleFocus = () => { isEditorFocused.value = true; };
//   const handleBlur = () => { isEditorFocused.value = false; };

//   instance.on('update', handleUpdate);
//   instance.on('selectionUpdate', handleSelection);
//   instance.on('transaction', handleSelection);
//   instance.on('focus', handleFocus);
//   instance.on('blur', handleBlur);

//   detachEditorListeners = () => {
//     instance.off('update', handleUpdate);
//     instance.off('selectionUpdate', handleSelection);
//     instance.off('transaction', handleSelection);
//     instance.off('focus', handleFocus);
//     instance.off('blur', handleBlur);
//     detachEditorListeners = null;
//   };

//   nextTick(() => updateEditorEmptyState(instance));
// }

// WebSocket collaboration functions
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
    try {
      isJoined.value = wsService.value.joinSheet(docId, handleIncomingMessage);
      console.log('Joined document:', docId);
    } catch (error) {
      console.error('Error joining document:', error);
    }
  }
}

function handleIncomingMessage(message: Message) {
  if (!message) return;
  const docId = route.params.appFileId as string;
  if (message.sheetId && docId && message.sheetId !== docId) return;

  if (message.messages) {
    return message.messages.forEach(handleIncomingMessage);
  }

  switch (message.type) {
    case 'chat':
      handleChatMessage(message);
      break;
    case 'change':
      if (message.user?.id === userId.value) break;
      if (message.content?.delta) {
        applyRemoteChange(message.content.delta);
      }
      break;
    case 'cursor': {
      const uid = message.user?.id;
      const name = message.user?.name;
      if (uid && name) {
        collaborators.value[uid] = {
          name,
          ts: Date.now(),
        };
      }
      break;
    }
    case 'title':
      if (message.user?.id !== userId.value && message.content?.title) {
        documentTitle.value = message.content.title;
      }
      break;
  }
}

function applyRemoteChange(delta: any) {
  if (!editor.value || changesPending.value) return;
  try {
    changesPending.value = true;
    // Apply the delta/JSON content from remote
    if (delta && typeof delta === 'object') {
      editor.value.commands.setContent(delta, false);
    }
    setTimeout(() => {
      requestAnimationFrame(() => {
        changesPending.value = false;
      });
    }, 10);
  } catch (error) {
    console.error('Error applying remote change:', error);
    changesPending.value = false;
  }
}

function broadcastChange() {
  if (!editor.value || changesPending.value || !wsService.value) return;
  const docId = route.params.appFileId as string;
  if (!docId || docId === 'new') return;
  
  try {
    const content = editor.value.getJSON();
    wsService.value.sendMessage(docId, 'change', { delta: content }, userId.value, userName.value);
  } catch (error) {
    console.error('Error broadcasting change:', error);
  }
}
// Chat state
const isChatOpen = ref(false);
const chatMessages = ref<Message[]>([]);
const newChatMessage = ref('');
const chatMessagesContainer = ref<HTMLElement | null>(null);
const chatInput = ref<HTMLTextAreaElement | null>(null);
const textareaHeight = ref('40px');
const unreadCount = ref(0);

// Notification sound
const notificationSound = new Audio(new URL('@/assets/bubble.mp3', import.meta.url).href);

function handleChatMessage(messageInfo: Message) {
  chatMessages.value.push(messageInfo);
  scrollChatToBottom();
  // Play notification sound and increment unread count if chat is closed and message is from another user
  if (!isChatOpen.value && messageInfo.user?.id !== userId.value) {
    unreadCount.value++;
    try {
      notificationSound.currentTime = 0;
      notificationSound.play().catch(() => {});
    } catch {}
  }
}

function sendChatMessage() {
  if (!wsService.value) return;
  const docId = route.params.appFileId as string;
  if (!docId || docId === 'new') return;
  const message = newChatMessage.value;
  if (!message.trim()) return;

  try {
    wsService.value.sendMessage(docId, 'chat', { message }, userId.value, userName.value);
    newChatMessage.value = '';
    adjustChatTextareaHeight();
  } catch (error) {
    console.error('Error sending chat message:', error);
  }
}

function handleChatEnterKey(event: KeyboardEvent) {
  event.preventDefault();
  sendChatMessage();
}

function adjustChatTextareaHeight() {
  if (chatInput.value) {
    chatInput.value.style.height = '40px';
    chatInput.value.style.height = `${Math.min(chatInput.value.scrollHeight, 150)}px`;
    textareaHeight.value = chatInput.value.style.height;
  }
}

function scrollChatToBottom() {
  nextTick(() => {
    if (chatMessagesContainer.value) {
      chatMessagesContainer.value.scrollTop = chatMessagesContainer.value.scrollHeight;
    }
  });
}

function formatChatTime(timestamp: number) {
  try {
    return new Date(timestamp).toLocaleTimeString();
  } catch {
    return '';
  }
}

watch(isChatOpen, open => {
  if (open) {
    unreadCount.value = 0;
    nextTick(() => {
      if (chatInput.value) {
        chatInput.value.focus();
      }
      scrollChatToBottom();
    });
  }
});

watch(
  collaborators,
  () => {
    const now = Date.now();
    for (const [id, info] of Object.entries(collaborators.value)) {
      if (now - info.ts > 8000) {
        delete collaborators.value[id];
      }
    }
  },
  { deep: true },
);

function broadcastCursorPresence() {
  if (!editor.value || !wsService.value) return;
  const docId = route.params.appFileId as string;
  if (!docId || docId === 'new') return;

  try {
    wsService.value.sendMessage(docId, 'cursor', {}, userId.value, userName.value);
  } catch (error) {
    console.error('Error broadcasting cursor presence:', error);
  }
}

function colorForUser(uid: string) {
  const palette = ['#2563EB', '#9333EA', '#16A34A', '#DC2626', '#F59E0B', '#0EA5E9', '#7C3AED', '#059669', '#D97706', '#DB2777'];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = ((hash << 5) - hash) + uid.charCodeAt(i);
  const idx = Math.abs(hash) % palette.length;
  return palette[idx];
}

// Update editor editable state when canEditDoc changes (e.g., after privacyType is loaded)
watch(canEditDoc, (canEdit) => {
  if (editor.value) {
    editor.value.setEditable(canEdit);
  }
});

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
// Tracks table focus by click or selection, so UI appears even on click-only
const isTableActiveByClick = ref(false);
const isLinkEditing = computed(() => !!editor.value && editor.value.isActive('link'));
const isChartSelection = computed(() => !!editor.value && editor.value.isActive('chart'));

// Make BubbleMenu appear when a table is clicked (even without a cell selection)
const bubbleShouldShow = () => {
  const instance = editor.value;
  if (!instance) return false;
  if (isImageEditing.value) return false;
  if (!isEditorFocused.value && !isTableActiveByClick.value) return false;

  const hasSelection = !instance.state.selection.empty;
  if (!hasSelection && !isTableSelection.value && !isTableActiveByClick.value) {
    return false;
  }

  return isTextSelection.value || isTableSelection.value || isTableActiveByClick.value;
};

function setTableActiveUI(active: boolean) {
  isTableActiveByClick.value = active;
  const rootEl = editor.value?.view.dom as HTMLElement | undefined;
  if (!rootEl) return;
  if (active) rootEl.classList.add('is-table-active');
  else rootEl.classList.remove('is-table-active');
}

function handleEditorClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null;
  const gapEl = target?.closest('.rm-pagination-gap') as HTMLElement | null;

  if (gapEl) {
    const breakerEl = gapEl.closest('.breaker') as HTMLElement | null;
    if (breakerEl) {
      const isCollapsed = breakerEl.dataset.collapsed === 'true';
      breakerEl.dataset.collapsed = isCollapsed ? 'false' : 'true';
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }

  const isOnTable = !!target?.closest('table');
  setTableActiveUI(isOnTable);
}

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
      icon: ArrowRight,
      handler: () => instance.chain().focus().addColumnAfter().run(),
      tooltip: 'Add column after',
      label: 'Add column after',
    },
    {
      key: 'add-row',
      icon: ArrowDown,
      handler: () => instance.chain().focus().addRowAfter().run(),
      tooltip: 'Add row below',
      label: 'Add row below',
    },
    {
      key: 'merge',
      icon: Combine,
      handler: () => instance.chain().focus().mergeCells().run(),
      tooltip: 'Merge cells',
      label: 'Merge cells',
    },
    {
      key: 'split',
      icon: SplitSquareHorizontal,
      handler: () => instance.chain().focus().splitCell().run(),
      tooltip: 'Split cell',
      label: 'Split cell',
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
    {
      key: 'reset-row-height',
      icon: Maximize,
      handler: () => instance.chain().focus().resetRowHeight().run(),
      tooltip: 'Reset row height',
      label: 'Reset row height',
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
const headingPrimaryKeys = ['h2', 'h3', 'clear', 'text', 'bold', 'italic', 'underline'];
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
const SHARE_BASE_URL = import.meta.env.VITE_SHARE_BASE_URL || window.location.origin;
const shareLinkDoc = computed(() => {
  const idParam = route.params.appFileId;
  if (!idParam) return '';
  const id = String(idParam);
  return `${SHARE_BASE_URL}/share/doc/${id}`;
});

const {
  conflictDialogOpen,
  conflictDialogMessage,
  conflictLocalLength,
  conflictRemoteLength,
  conflictDeltaLength,
  conflictLocalPreview,
  conflictRemotePreview,
  evaluateLoadedDocument,
  checkConflictsAfterReconnect,
  keepLocalVersion,
  keepRemoteVersion,
} = useDocumentConflictResolver({
  fileStore,
  applyLocalVersion: async (localDoc) => {
    if (!currentDoc.value) return null;

    const appliedDoc: FileData = {
      ...currentDoc.value,
      ...localDoc,
      id: currentDoc.value.id,
    } as FileData;

    currentDoc.value = appliedDoc;
    documentTitle.value = appliedDoc.title || 'Untitled Document';
    loadContentIntoEditor(appliedDoc.content || '');
    hasUnsavedChanges.value = true;
    return appliedDoc;
  },
  applyRemoteVersion: async (remoteDoc) => {
    currentDoc.value = { ...remoteDoc } as FileData;
    documentTitle.value = remoteDoc.title || 'Untitled Document';
    loadContentIntoEditor(remoteDoc.content || '');
    hasUnsavedChanges.value = false;
    lastSavedAt.value = remoteDoc.updated_at ? new Date(remoteDoc.updated_at as string) : new Date();
    return remoteDoc;
  },
  notify: {
    info: (message: string) => toast.info(message),
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
  },
});
const tocItems = computed(() => {
  if (!editor.value) return [] as Array<{ level: number; text: string; id: string; pos: number }>;

  const items: Array<{ level: number; text: string; id: string; pos: number }> = [];
  const { state } = editor.value;

  let headingIndex = 0;
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const text = node.textContent || '';
      const id = `heading-${headingIndex++}`;
      items.push({ level: node.attrs.level, text, id, pos });
    }
  });

  return items;
});

function getNearestScrollContainer(element: HTMLElement | null): HTMLElement | null {
  let el: HTMLElement | null = element;
  while (el) {
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

function scrollElementIntoViewWithinContainer(targetEl: HTMLElement) {
  const container = getNearestScrollContainer(targetEl) || document.scrollingElement as HTMLElement | null;
  if (!container) {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();
  const currentScrollTop = container.scrollTop;

  // Offset slightly to avoid sticking under headers/decorations
  const offset = 16; // px
  const deltaTop = targetRect.top - containerRect.top - offset;

  container.scrollTo({ top: currentScrollTop + deltaTop, behavior: 'smooth' });
}

function scrollToHeading(index: number) {
  if (!editor.value) return;
  const item = tocItems.value[index] as { pos: number } | undefined;
  if (!item) return;

  // Set selection at the start of the heading to ensure correct mapping
  editor.value.chain().setTextSelection(item.pos).run();

  // Resolve the DOM node for the heading and perform a container-aware smooth scroll
  requestAnimationFrame(() => {
    let dom = editor.value?.view.nodeDOM(item.pos) as HTMLElement | null | undefined;
    if (dom && dom.nodeType !== 1) {
      dom = (dom as any).parentElement as HTMLElement | null;
    }
    if (dom && dom instanceof HTMLElement) {
      scrollElementIntoViewWithinContainer(dom);
    } else {
      // Fallback to editor built-in scroll if DOM resolution failed
      editor.value?.chain().scrollIntoView().run();
    }
  });
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
let autoSaveIdleDelay = 3000; // 3 seconds idle
let autoSaveMaxWait = 30000; // 30 seconds max

// Track online/offline status
const handleOnline = () => {
  isOffline.value = false;
  if (currentDoc.value?.id) {
    void checkConflictsAfterReconnect(currentDoc.value.id, currentDoc.value.file_type);
  }
};

const handleOffline = () => {
  isOffline.value = true;
};

window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);

// Page dimension configurations (values in millimeters)
const pageDimensions = {
  a4: { width: 210, height: 297 },
  a3: { width: 297, height: 420 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 },
  card: { width: 88.9, height: 50.8 },
} as const;

// Pagination settings state (used by PaginationPlus extension)
const paginationSettings = reactive({
  marginTop: 50,
  marginBottom: 50,
  marginLeft: 50,
  marginRight: 50,
  showPageNumbers: true,
  pageNumberPosition: 'bottom-right' as string,
  printPageNumbers: false,
  headerLeft: '',
  headerRight: '',
  footerLeft: '',
  footerRight: '{page}',
});

const MM_TO_PX = 96 / 25.4;

const contentPadding = computed(() => {
  // Remove outer padding so on-screen pagination matches print exactly.
  // All spacing comes from the pagination plugin margins and content margins.
  return {
    padding: '0',
  };
});

function resolvePageMetrics(sizeKey: keyof typeof pageDimensions, orientation: 'portrait' | 'landscape') {
  const dims = pageDimensions[sizeKey] || pageDimensions.a4;
  const isLandscape = orientation === 'landscape';
  const widthMm = isLandscape ? dims.height : dims.width;
  const heightMm = isLandscape ? dims.width : dims.height;
  const widthPx = Math.round(widthMm * MM_TO_PX);
  const heightPx = Math.round(heightMm * MM_TO_PX);
  return { widthMm, heightMm, widthPx, heightPx };
}

// Computed styles for page dimensions
const pageStyles = computed(() => {
  const metrics = resolvePageMetrics(pageSize.value as keyof typeof pageDimensions, pageOrientation.value);
  const padding = contentPadding.value.padding;

  return {
    maxWidth: `${metrics.widthPx}px`,
    width: '100%',
    '--page-width': `${metrics.widthMm}mm`,
    '--page-height': `${metrics.heightMm}mm`,
    '--page-padding': padding,
  } as Record<string, string>;
});

// Inject print-specific CSS so print preview matches editor pagination
let printStyleElement: HTMLStyleElement | null = null;

function ensurePrintStyleElement(): HTMLStyleElement {
  if (printStyleElement?.isConnected) {
    return printStyleElement;
  }
  const styleEl = document.createElement('style');
  styleEl.id = 'docs-print-pagination-styles';
  document.head.appendChild(styleEl);
  printStyleElement = styleEl;
  return styleEl;
}

function updatePrintStyles() {
  const styleEl = ensurePrintStyleElement();
  
  // Convert px to mm for print (96 DPI = 1 inch = 25.4mm)
  const pxToMm = (px: number) => (px * 25.4) / 96;
  
  const marginTopMm = pxToMm(paginationSettings.marginTop);
  const marginRightMm = pxToMm(paginationSettings.marginRight);
  const marginBottomMm = pxToMm(paginationSettings.marginBottom);
  const marginLeftMm = pxToMm(paginationSettings.marginLeft);
  
  const metrics = resolvePageMetrics(pageSize.value as keyof typeof pageDimensions, pageOrientation.value);
  const pageWidthMm = (metrics.widthPx * 25.4) / 96;
  const pageHeightMm = (metrics.heightPx * 25.4) / 96;
  
  // Set CSS variables for print
  document.documentElement.style.setProperty('--print-margin-top', `${marginTopMm}mm`);
  document.documentElement.style.setProperty('--print-margin-right', `${marginRightMm}mm`);
  document.documentElement.style.setProperty('--print-margin-bottom', `${marginBottomMm}mm`);
  document.documentElement.style.setProperty('--print-margin-left', `${marginLeftMm}mm`);
  document.documentElement.style.setProperty('--page-width', `${pageWidthMm}mm`);
  document.documentElement.style.setProperty('--page-height', `${pageHeightMm}mm`);
  document.documentElement.style.setProperty('--print-padding', `${marginTopMm}mm ${marginRightMm}mm ${marginBottomMm}mm ${marginLeftMm}mm`);
  
  styleEl.textContent = `
  @page {
    margin: 0;
    size: var(--page-width, 210mm) var(--page-height, 297mm);
  }
  @media print {
    html, body { margin: 0 !important; padding: 0 !important; }
    .doc-page,
    .document-container,
    .editor,
    .editor-content,
    .ProseMirror {
      padding: var(--print-padding, 0) !important;
    }
    .rm-page-break { break-after: page; }
    /* Do not force a break before the very first or last page marker; prevents blank pages */
    .rm-page-break:first-child,
    .rm-page-break:last-child { break-after: auto; }
    .rm-page-break .page { break-after: avoid; break-inside: avoid; }
  }`;
}

function scheduleSave() {
  // Clear existing idle timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  // Schedule save after idle delay
  saveTimeout = setTimeout(() => {
    saveDocument(false);
  }, autoSaveIdleDelay);
  
  // Ensure we save within max wait regardless of activity
  if (!maxWaitTimeout) {
    maxWaitTimeout = setTimeout(() => {
      saveDocument(false);
      maxWaitTimeout = null;
    }, autoSaveMaxWait);
  }
}

async function saveDocument(isManual = false) {
  if (!editor.value || !currentDoc.value) return;
  
  // Clear timers when save executes
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (maxWaitTimeout) {
    clearTimeout(maxWaitTimeout);
    maxWaitTimeout = null;
  }

  if (editor.value.isEmpty && !hasEnteredContent.value) {
    if (isManual) {
      toast.info('Add some content before saving.');
    }
    return;
  }

  isSaving.value = true;
  
  try {
    // Guard against embedded stringified JSON before saving
    guardEditorBeforeSave(editor.value);
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
      metadata: {
        ...currentDoc.value?.metadata,
        pagination: {
          orientation: pageOrientation.value,
          pageSize: pageSize.value,
          showPageNumbers: true, // Default from getPaginationConfig
          pageNumberPosition: 'bottom-right', // Default from getPaginationConfig
          printPageNumbers: false, // Default from getPaginationConfig
          marginTop: 50, // Default from getPaginationConfig
          marginBottom: 50, // Default from getPaginationConfig
          marginLeft: 50, // Default from getPaginationConfig
          marginRight: 50, // Default from getPaginationConfig
          pageBorder: true, // Default from getPaginationConfig
          pageShadow: true, // Default from getPaginationConfig
        }
      },
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

// function scheduleSave() {
//   // Clear existing idle timeout
//   if (saveTimeout) {
//     clearTimeout(saveTimeout);
//   }
  
//   // Schedule save after 3 seconds of idle (more responsive)
//   saveTimeout = setTimeout(() => {
//     saveDocument(false);
//   }, 3000);
  
//   // Ensure we save within 30 seconds regardless of activity
//   if (!maxWaitTimeout) {
//     maxWaitTimeout = setTimeout(() => {
//       saveDocument(false);
//       maxWaitTimeout = null;
//     }, 30000); // 30 seconds
//   }
// }

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
    // Broadcast title change to collaborators
    const docId = route.params.appFileId as string;
    if (wsService.value && docId && docId !== 'new') {
      wsService.value.sendMessage(docId, 'title', { title: newTitle }, userId.value, userName.value);
    }
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
        
        // Hydrate privacy type from loaded document
        const priv = Number((doc as any)?.privacy_type ?? (doc as any)?.privacyType);
        if (!Number.isNaN(priv)) {
          privacyType.value = priv;
        }
        // If unauthenticated and not guest-accessible, show access request panel
        if (!authStore.isAuthenticated && !guestAccessiblePrivacyTypes.has(privacyType.value)) {
          accessDenied.value = true;
          try { requestEmail.value = authStore.email || ''; } catch {}
        }
        
        // Hydrate sharing info if present
        try {
          const sharingInfo = (doc as any)?.sharing_info;
          if (sharingInfo) {
            shareMembers.value = parseSharingInfoString(sharingInfo);
          }
        } catch {}
        
        // Restore pagination settings from metadata
        if (doc.metadata?.pagination) {
          const paginationSettings = doc.metadata.pagination;
          if (paginationSettings.orientation) {
            pageOrientation.value = paginationSettings.orientation;
          }
          if (paginationSettings.pageSize) {
            pageSize.value = paginationSettings.pageSize;
          }
        }
        
        // Load content into editor using helper function
        if (doc.content) {
          loadContentIntoEditor(doc.content);
        }
        
        lastSavedAt.value = new Date();

        await evaluateLoadedDocument(doc, 'initial');
        
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

function handleVersionSelect(version: any) {
  // Load the selected version content
  loadVersionContent(version);
}

async function loadVersionContent(version: any) {
  if (!currentDoc.value?.id || !version?.version_number) return;

  try {
    const fileStore = useFileStore();
    const versionData = await fileStore.getVersion(currentDoc.value.id, version.version_number);

    documentTitle.value = currentDoc.value.title;

    if (versionData && typeof versionData.content === 'string') {
      const raw = versionData.content;
      const ed = editor.value;
      if (!ed) return;
      applyContentToEditor(ed, raw);

      // Update the document title if needed
      if (documentTitle.value == 'Untitled Document' && versionData.file_name && versionData.file_name !== documentTitle.value) {
        documentTitle.value = versionData.file_name.replace(/\.[^/.]+$/, '');
      }

      toast.success(`Loaded version ${version.version_number}`);
    } else {
      toast.error('Failed to load version content');
    }
  } catch (error) {
    console.error('Error loading version content:', error);
    toast.error('Failed to load version content');
  }
}

// Pagination settings update - uses PaginationPlus commands
function updatePaginationSettings(settings: any) {
  if (!editor.value) return;

  // Update local pagination settings state
  if (settings.marginTop !== undefined) paginationSettings.marginTop = settings.marginTop;
  if (settings.marginBottom !== undefined) paginationSettings.marginBottom = settings.marginBottom;
  if (settings.marginLeft !== undefined) paginationSettings.marginLeft = settings.marginLeft;
  if (settings.marginRight !== undefined) paginationSettings.marginRight = settings.marginRight;
  if (settings.showPageNumbers !== undefined) paginationSettings.showPageNumbers = settings.showPageNumbers;
  if (settings.pageNumberPosition !== undefined) paginationSettings.pageNumberPosition = settings.pageNumberPosition;
  if (settings.printPageNumbers !== undefined) paginationSettings.printPageNumbers = settings.printPageNumbers;

  // Update footer content based on page number settings
  const isShow = !!settings.showPageNumbers;
  const pos = settings.pageNumberPosition || 'bottom-right';
  
  // Determine footer/header content based on position
  let footerLeft = '';
  let footerRight = '';
  let headerLeft = '';
  let headerRight = '';
  
  if (isShow) {
    if (pos.includes('bottom')) {
      if (pos.includes('left')) footerLeft = '{page}';
      else if (pos.includes('center')) footerLeft = ''; // Center handled differently
      else footerRight = '{page}';
    } else if (pos.includes('top')) {
      if (pos.includes('left')) headerLeft = 'Page {page}';
      else if (pos.includes('center')) headerLeft = ''; // Center handled differently
      else headerRight = 'Page {page}';
    }
  }

  paginationSettings.footerLeft = footerLeft;
  paginationSettings.footerRight = footerRight;
  paginationSettings.headerLeft = headerLeft;
  paginationSettings.headerRight = headerRight;

  // Apply settings via PaginationPlus commands
  editor.value.chain().focus()
    .updateMargins({
      top: paginationSettings.marginTop,
      bottom: paginationSettings.marginBottom,
      left: paginationSettings.marginLeft,
      right: paginationSettings.marginRight,
    })
    .updateHeaderContent(headerLeft, headerRight)
    .updateFooterContent(footerLeft, footerRight)
    .run();

  updatePrintStyles();
}

// Handle page size change via PaginationPlus
function handlePageSizeChange(size: string) {
  pageSize.value = size;
  
  if (!editor.value) return;

  // Map page size to PaginationPlus PAGE_SIZES
  const pageSizeMap: Record<string, typeof PAGE_SIZES[keyof typeof PAGE_SIZES]> = {
    'a4': PAGE_SIZES.A4,
    'a3': PAGE_SIZES.A3,
    'a5': PAGE_SIZES.A5,
    'letter': PAGE_SIZES.LETTER,
    'legal': PAGE_SIZES.LEGAL,
  };

  const selectedPageSize = pageSizeMap[size];
  if (selectedPageSize) {
    editor.value.chain().focus().updatePageSize(selectedPageSize).run();
  } else {
    // For custom sizes like 'card', use manual dimensions
    const metrics = resolvePageMetrics(size as keyof typeof pageDimensions, pageOrientation.value);
    editor.value.chain().focus()
      .updatePageHeight(metrics.heightPx)
      .updatePageWidth(metrics.widthPx)
      .run();
  }

  updatePrintStyles();
}

// Share functions
const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const FILES_ENDPOINT = `${API_BASE_URI}/app-files`;


function copyShareLink() {
  try {
    navigator.clipboard.writeText(shareLinkDoc.value);
    toast.success('Link copied to clipboard');
  } catch {}
}

async function fetchSharingInfo() {
  try {
    const id = route.params.appFileId as string;
    if (!id || id === 'new') return;
    const token = fileStore.getToken?.();
    const res = await axios.get(`${FILES_ENDPOINT}/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const payload = res.data?.data || res.data?.document || {};
    const parsed = parseSharingInfoString(payload.sharing_info);
    shareMembers.value = parsed;
    if (typeof payload.privacy_type === 'number') {
      privacyType.value = Number(payload.privacy_type);
    }
  } catch {}
}

type ShareCardPayload = {
  email: string;
  shareLevel: ShareLevel;
  label: ShareLevelLabel;
  note?: string;
  permission?: 'view' | 'comment' | 'edit' | 'owner';
};

async function handleInviteMember(payload: ShareCardPayload) {
  try {
    const id = route.params.appFileId as string;
    if (!id) return;
    const resolvedLevel = (() => {
      if (payload.shareLevel) return payload.shareLevel;
      if (payload.permission) {
        const mapped = payload.permission === 'owner' ? 'edit' : payload.permission;
        return labelToShareLevel(mapped as ShareLevelLabel);
      }
      return labelToShareLevel(payload.label);
    })();
    const newMembers: ShareMember[] = [
      ...shareMembers.value.filter((member) => member.email !== payload.email),
      { email: payload.email, shareLevel: resolvedLevel },
    ];
    const sharingInfo = serializeSharingInfoString(newMembers);
    await axios.patch(`${FILES_ENDPOINT}/${id}`, { sharing_info: sharingInfo });
    await fetchSharingInfo();
    toast.success('Member invited');
  } catch {}
}

async function handleUpdateMember(payload: ShareCardPayload) {
  return handleInviteMember(payload);
}

async function handleRemoveMember(payload: { email: string }) {
  try {
    const id = route.params.appFileId as string;
    if (!id) return;
    const newMembers: ShareMember[] = shareMembers.value.filter(m => m.email !== payload.email);
    const sharingInfo = serializeSharingInfoString(newMembers);
    await axios.patch(`${FILES_ENDPOINT}/${id}`, { sharing_info: sharingInfo });
    await fetchSharingInfo();
    toast.success('Member removed');
  } catch {}
}

async function updateVisibility(value: number) {
  try {
    const id = route.params.appFileId as string;
    if (!id) return;
    
    await axios.patch(`${FILES_ENDPOINT}/${id}`, { privacy_type: value });
    await fetchSharingInfo();
    toast.success('Visibility updated');
  } catch {}
}

// Helper to get PaginationPlus configuration based on current page settings
function getPaginationPlusConfig() {
  const metrics = resolvePageMetrics(pageSize.value as keyof typeof pageDimensions, pageOrientation.value);
  
  // Determine footer content based on page number position
  const pos = paginationSettings.pageNumberPosition;
  let footerLeft = '';
  let footerRight = '';
  let headerLeft = '';
  let headerRight = '';
  
  if (paginationSettings.showPageNumbers) {
    if (pos.includes('bottom')) {
      if (pos.includes('left')) footerLeft = '{page}';
      else if (pos.includes('center')) {
        footerLeft = '';
        footerRight = '{page}'; // Center approximation
      } else {
        footerRight = '{page}';
      }
    } else if (pos.includes('top')) {
      if (pos.includes('left')) headerLeft = 'Page {page}';
      else if (pos.includes('center')) {
        headerLeft = '';
        headerRight = 'Page {page}'; // Center approximation
      } else {
        headerRight = 'Page {page}';
      }
    }
  }

  return {
    pageHeight: metrics.heightPx,
    pageWidth: metrics.widthPx,
    pageGap: 50,
    pageGapBorderSize: 1,
    pageGapBorderColor: '#e5e5e5',
    pageBreakBackground: '#ffffff',
    marginTop: paginationSettings.marginTop,
    marginBottom: paginationSettings.marginBottom,
    marginLeft: paginationSettings.marginLeft,
    marginRight: paginationSettings.marginRight,
    contentMarginTop: 10,
    contentMarginBottom: 10,
    headerLeft,
    headerRight,
    footerLeft,
    footerRight,
  };
}

// Helper to (re)initialize the editor with pagination settings
function initializeEditor() {
  const existingContent = editor.value ? editor.value.getJSON() : undefined;
  if (editor.value) {
    try {
      detachEditorListeners?.();
      editor.value.destroy();
    } catch {}
  }

  const paginationConfig = getPaginationPlusConfig();

  editor.value = new Editor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        history: { depth: 100 },
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
      // Use PaginationTable extensions for table pagination support
      TablePlus,
      TableRowPlus,
      TableCellPlus,
      TableHeaderPlus,
      ImagePlus.configure({ allowBase64: true }),
      ChartExtension,
      // PaginationPlus extension for document pagination
      PaginationPlus.configure(paginationConfig as any),
    ],
    content: existingContent || '',
    editable: canEditDoc.value,
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

  // Add collaboration update listener
  editor.value.on('update', () => {
    if (!changesPending.value && !isJustLoaded.value) {
      broadcastChange();
      // Trigger auto-save for authenticated users
      if (authStore.isAuthenticated && currentDoc.value) {
        hasUnsavedChanges.value = true;
        scheduleSave();
      }
    }
  });
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  try {
    if (authStore.isAuthenticated && editor.value && currentDoc.value && hasUnsavedChanges.value) {
      saveDocument(false);
      e.preventDefault();
      e.returnValue = '';
    }
  } catch {}
}

onMounted(async () => {
  // Initialize editor with PaginationPlus extension
  initializeEditor();
  updatePrintStyles();

  // Wait for editor to be ready
  await nextTick();

  // Hook editor events for table-active visuals and bubble visibility
  editor.value?.on('selectionUpdate', () => {
    // If selection enters/leaves a table, reflect via class
    const active = !!editor.value?.isActive('table');
    setTableActiveUI(active || isTableActiveByClick.value);
    broadcastCursorPresence();
  });

  // Attach click listener to detect table clicks (no selection change)
  const dom = editor.value?.view.dom as HTMLElement | undefined;
  dom?.addEventListener('click', handleEditorClick, true);

  // Initialize/load document
  await initializeDocument();

  // Initialize WebSocket collaboration after document is loaded
  initializeWebSocketAndJoinDoc();
  
  // Add beforeunload listener for authenticated users
  if (authStore.isAuthenticated) {
    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  // Debug: Log pagination status
  console.log('PaginationPlus initialized with page size:', pageSize.value, 'orientation:', pageOrientation.value);
});

watch([pageSize, pageOrientation], () => {
  if (!editor.value) return;

  // Get new page dimensions
  const metrics = resolvePageMetrics(pageSize.value as keyof typeof pageDimensions, pageOrientation.value);

  // Update pagination via PaginationPlus commands
  editor.value.chain().focus()
    .updatePageHeight(metrics.heightPx)
    .updatePageWidth(metrics.widthPx)
    .run();

  updatePrintStyles();
});

watch(canJoinRealtime, canJoin => {
  if (canJoin) {
    initializeWebSocketAndJoinDoc();
  } else {
    const docId = route.params.appFileId as string;
    if (wsService.value && docId && docId !== 'new' && isJoined.value) {
      wsService.value.leaveSheet(docId);
      isJoined.value = false;
    }
  }
});

onBeforeRouteLeave(async () => {
  try {
    if (authStore.isAuthenticated && editor.value && currentDoc.value && hasUnsavedChanges.value) {
      await saveDocument(false);
    }
  } catch {}
});

onUnmounted(() => {
  // Save before unmounting
  if (editor.value && currentDoc.value) {
    saveDocument();
  }

  // Cleanup WebSocket
  const docId = route.params.appFileId as string;
  if (wsService.value && docId && docId !== 'new') {
    wsService.value.leaveSheet(docId);
  }

  // Cleanup
  if (saveTimeout) clearTimeout(saveTimeout);
  if (maxWaitTimeout) clearTimeout(maxWaitTimeout);
  if (authStore.isAuthenticated) {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  }
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
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

@media print {
  .editor-placeholder-overlay {
    display: none !important;
  }
}

/* PaginationPlus breaker & page gap styling */
:deep(.breaker) {
  /* Ensure the gap wrapper blends with the editor background */
  background-color: transparent;
}

:deep(.rm-pagination-gap) {
  /* Visible but subtle separation between pages */
  background-color: #f3f4f6 !important; /* tailwind gray-100 */
  border-left-color: #e5e7eb !important;  /* gray-200 */
  border-right-color: #e5e7eb !important;
  cursor: ns-resize;
  transition: background-color 0.15s ease, box-shadow 0.15s ease, height 0.15s ease;
}

:deep(.rm-pagination-gap:hover) {
  background-color: #e5e7eb !important; /* gray-200 */
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.4); /* slate-300 */
}

:deep(.rm-page-footer),
:deep(.rm-page-header) {
  background-color: transparent;
}

:deep(.rm-page-number) {
  color: #6b7280; /* gray-600 for page numbers */
}

/* Collapsed page break state (toggled via breaker[data-collapsed]) */
:deep(.breaker[data-collapsed='true'] .rm-page-footer),
:deep(.breaker[data-collapsed='true'] .rm-page-header) {
  display: none !important;
}

:deep(.breaker[data-collapsed='true'] .rm-pagination-gap) {
  height: 8px !important;
  background-color: #e5e7eb !important; /* gray-200 */
  border-left-style: dashed;
  border-right-style: dashed;
  box-shadow: none;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

:deep(.breaker[data-collapsed='true'] .rm-pagination-gap::before) {
  content: 'Page break';
  font-size: 11px;
  line-height: 1;
  color: #6b7280; /* gray-600 */
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Editor Styles */
:deep(.ProseMirror) {
  min-height: 500px;
  outline: none;
}

/* Landscape mode support */
.landscape-mode {
  overflow-x: auto;
  overflow-y: hidden;
}

.landscape-mode .doc-page {
  min-width: fit-content;
  display: inline-block;
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
  .print-none {
    display: none!important;
  }

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

/* Row resize handles - positioned at row boundaries */
:deep(.ProseMirror table) {
  position: relative;
}

:deep(.ProseMirror table tr) {
  position: relative;
}

:deep(.table-row-resize-handle) {
  position: absolute;
  left: 0;
  right: 0;
  height: 6px;
  cursor: row-resize;
  background: transparent;
  border-top: 2px solid transparent;
  pointer-events: auto;
  opacity: 0;
  transition: opacity 0.12s ease, border-color 0.12s ease;
  z-index: 20;
}

:deep(.ProseMirror table:hover .table-row-resize-handle),
:deep(.is-table-active .table-row-resize-handle) {
  opacity: 1;
  border-top-color: rgba(59, 130, 246, 0.3);
}

:deep(.table-row-resize-handle:hover),
:deep(.table-row-resize-handle.is-dragging) {
  border-top-color: rgba(59, 130, 246, 0.8) !important;
  opacity: 1 !important;
}

/* Column resize handles - widget decorations */
:deep(.table-col-resize-handle) {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  background: transparent;
  border-right: 2px solid transparent;
  opacity: 0;
  transition: opacity 0.12s ease, border-color 0.12s ease;
  z-index: 20;
  pointer-events: auto;
}

:deep(.ProseMirror table tr:first-child th:hover + .table-col-resize-handle),
:deep(.ProseMirror table tr:first-child td:hover + .table-col-resize-handle),
:deep(.is-table-active .table-col-resize-handle) {
  opacity: 1;
  border-right-color: rgba(59, 130, 246, 0.4);
}

:deep(.table-col-resize-handle:hover),
:deep(.table-col-resize-handle.is-dragging) {
  border-right-color: rgba(59, 130, 246, 0.8) !important;
  opacity: 1 !important;
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
  width: 6px;
  height: 6px;
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
