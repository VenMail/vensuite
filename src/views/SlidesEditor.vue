<template>
  <div class="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Unified Title Bar -->
    <SlidesTitleBar
      :title="slideStore.deckTitle"
      :is-saving="slideStore.isSaving"
      :has-unsaved-changes="slideStore.hasUnsavedChanges"
      :is-offline="persistence.isOffline"
      :last-saved-at="slideStore.lastSavedAt"
      :share-link="slideStore.shareLink"
      :privacy-type="slideStore.privacyType"
      :share-members="slideStore.shareMembers"
      :current-slide-index="editor.currentSlideIndex"
      :total-slides="editor.slides.length"
      :current-theme="editor.currentTheme"
      :current-layout="editor.currentLayout"
      :duration="presentationDuration"
      :word-count="totalWordCount"
      :can-undo="editor.canUndo"
      :can-redo="editor.canRedo"
      :show-ruler="showRuler"
      :show-thumbnails="showThumbnails"
      :show-properties="showProperties"
      :zoom="editor.zoom"
      :spell-check-enabled="spellCheckEnabled"
      :show-file-menu="true"
      :show-presenter-mode="true"
      :show-extended-info="true"
      @update:title="handleTitleChange"
      @manual-save="handleManualSave"
      @back="goBack"
      @copy-link="copyShareLink"
      @change-privacy="slideStore.updateVisibility"
      @invite="handleInviteMember"
      @update-member="handleUpdateMember"
      @remove-member="handleRemoveMember"
      @start-presentation="presenter.startPresentation"
      @start-presenter-mode="presenter.startPresenterMode"
      @export="handleExport"
      @print="handlePrint"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
      @reset-zoom="handleResetZoom"
    />

    <!-- Main Toolbar -->
    <SlidesToolbar
      :mode="editor.mode"
      :current-slide-index="editor.currentSlideIndex"
      :total-slides="editor.slides.length"
      :current-theme="editor.currentTheme"
      :current-layout="editor.currentLayout"
      @update:mode="editor.mode = $event"
      @update:theme="handleThemeChange"
      @update:layout="handleLayoutChange"
      @previous-slide="editor.previousSlide"
      @next-slide="editor.nextSlide"
      @add-slide="handleAddSlide"
      @add-slide-with-template="handleAddSlideWithTemplate"
      @open-infographics="showInfographics = true"
      @export="handleExport"
      @present="presenter.startPresentation"
    />

    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Slide Thumbnails Sidebar -->
      <SlidesThumbnailSidebar
        :slides="editor.slides"
        :current-slide-index="editor.currentSlideIndex"
        @select-slide="editor.selectSlide"
        @duplicate-slide="handleDuplicateSlide"
        @move-slide="handleMoveSlide"
        @delete-slide="handleDeleteSlide"
        @add-slide="handleAddSlide"
      />

      <!-- Main Editor/Preview Area -->
      <div class="flex-1 flex flex-col bg-gray-100 dark:bg-gray-950 min-h-0">
        <!-- Edit Mode -->
        <template v-if="editor.mode === 'edit'">
          <div class="flex-1 flex overflow-hidden min-h-0">
            <!-- Markdown Editor (Full Height) -->
            <div class="flex-1 min-w-0 h-full">
              <SlidesMarkdownEditor
                ref="markdownEditorRef"
                :content="editor.currentSlideContent"
                :notes="editor.currentSlideNotes"
                @update:content="handleContentChange"
                @update:notes="handleNotesChange"
                @insert-markdown="handleInsertMarkdown"
                @cursor-change="handleCursorChange"
              />
            </div>

            <!-- Properties Panel (Center, Fixed Width) -->
            <DynamicPropertiesPanel
              v-if="!showAnimationPanel"
              :layout="editor.currentLayout"
              :background="editor.slideBackground"
              :transition="editor.slideTransition"
              :selected-element="selectedElement"
              :element-type="selectedElementType"
              :markdown-element="currentMarkdownElement"
              @toggle-panel="() => {}"
              @show-animation-panel="showAnimationPanel = true"
              @update:layout="handleLayoutChange"
              @update:background="handleBackgroundChange"
              @update:transition="handleTransitionChange"
              @apply-template="handleApplyTemplate"
              @update-element-style="handleElementStyleUpdate"
              @update-component-scale="handleComponentScale"
              @clear-selection="handleClearSelection"
              @update-markdown-element="handleMarkdownElementUpdate"
              @clear-markdown-element="handleClearMarkdownElement"
              @update-animation="handleAnimationUpdate"
            />
            
            <!-- Animation Panel (replaces properties panel when shown) -->
            <SlidesAnimationPane
              v-if="showAnimationPanel"
              :selected-element="selectedElement"
              :markdown-element="currentMarkdownElement"
              @back="showAnimationPanel = false"
              @close="showAnimationPanel = false"
              @update-animation="handleAnimationUpdate"
            />

            <!-- Live Preview (Right, Flexible Width) -->
            <div class="flex-1 min-w-0 max-w-[600px]">
              <SlidesPreviewPane
                :rendered-content="editor.renderedContent"
                :layout-class="editor.getLayoutClass(editor.currentLayout)"
                :background="editor.slideBackground"
                :theme-background="editor.currentThemeObj?.colors.background"
                :theme-text="editor.currentThemeObj?.colors.text"
                :theme-style="editor.themeStyleObject as Record<string, string>"
                :animations="elementAnimations"
                :zoom="editor.zoom"
              />
            </div>
          </div>
        </template>

        <!-- Preview Mode (Read-Only) - Full Width -->
        <template v-else-if="editor.mode === 'preview'">
          <div class="flex-1 flex items-center justify-center p-6">
            <SlidesPreviewPane
              :rendered-content="editor.renderedContent"
              :layout-class="editor.getLayoutClass(editor.currentLayout)"
              :background="editor.slideBackground"
              :theme-background="editor.currentThemeObj?.colors.background"
              :theme-text="editor.currentThemeObj?.colors.text"
              :theme-style="editor.themeStyleObject as Record<string, string>"
              :base-width="1200"
              :base-height="900"
              :animations="elementAnimations"
              :zoom="editor.zoom"
              fullscreen
            />
          </div>
        </template>
      </div>
    </div>

    <!-- Collaborator List -->
    <div v-if="collaboratorList.length" class="px-6 py-1 flex flex-wrap gap-2 items-center justify-end bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 text-xs">
      <span class="text-gray-500 dark:text-gray-400">Also editing:</span>
      <button
        v-for="c in collaboratorList"
        :key="c.id"
        type="button"
        class="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 px-2 py-0.5 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
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

    <!-- Enhanced Presenter Mode Overlay -->
    <SlidesPresenter
      :is-presenting="presenter.isPresenting"
      :current-slide-index="editor.currentSlideIndex"
      :total-slides="editor.slides.length"
      :slides="editor.slides"
      :rendered-content="editor.renderedContent"
      :layout-class="editor.getLayoutClass(editor.currentLayout)"
      :slide-background="editor.slideBackground"
      :current-notes="editor.currentSlideNotes"
      :next-slide-content="nextSlidePreviewHtml"
      :formatted-time="presenter.formattedTime"
      :is-paused="presenter.isPaused"
      :is-drawing-mode="presenter.isDrawingMode"
      :is-pointer-mode="presenter.isPointerMode"
      :is-camera-enabled="presenter.isCameraEnabled"
      :camera-stream="presenter.cameraStream"
      :show-overview="presenter.showOverview"
      :slide-width="1200"
      :slide-height="900"
      @exit="presenter.exitPresentation"
      @previous-slide="editor.previousSlide"
      @next-slide="editor.nextSlide"
      @go-to-slide="editor.goToSlide"
      @reset-timer="presenter.resetTimer"
      @toggle-timer="presenter.toggleTimer"
      @toggle-drawing="presenter.toggleDrawing"
      @toggle-pointer="presenter.togglePointer"
      @toggle-camera="presenter.toggleCamera"
      @toggle-overview="presenter.toggleOverview"
      @clear-drawings="presenter.clearCurrentDrawings"
      @add-stroke="presenter.addStroke"
      @update-pointer="presenter.updatePointerPosition"
      @keydown="presenter.handleKeydown"
    />

    <!-- Infographics Dialog -->
    <InfographicsDialog
      :open="showInfographics"
      @update:open="showInfographics = $event"
      @insert="handleInsertInfographic"
    />

    <!-- Import Inputs -->
    <input ref="pptxInput" type="file" accept=".ppt,.pptx" class="hidden" @change="handlePowerPointFile" />
    <input ref="htmlInput" type="file" accept=".html,.htm" class="hidden" @change="handleHtmlFile" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

// Components
import SlidesTitleBar from '@/components/slides/SlidesTitleBar.vue';
import SlidesToolbar from '@/components/slides/SlidesToolbar.vue';
import SlidesThumbnailSidebar from '@/components/slides/SlidesThumbnailSidebar.vue';
import SlidesMarkdownEditor from '@/components/slides/SlidesMarkdownEditor.vue';
import SlidesPreviewPane from '@/components/slides/SlidesPreviewPane.vue';
import DynamicPropertiesPanel from '@/components/slides/DynamicPropertiesPanel.vue';
import SlidesAnimationPane from '@/components/slides/SlidesAnimationPane.vue';
import SlidesPresenter from '@/components/slides/SlidesPresenter.vue';
import InfographicsDialog from '@/components/slides/InfographicsDialog.vue';

// Composables
import { useSlidesStore } from '../store/slides';
import { useAuthStore } from '@/store/auth';
import { IWebsocketService, useWebSocket } from '@/lib/wsService';

// Types
import type { SlideTemplate } from '@/utils/slidevMarkdown';
import type { MarkdownElement } from '@/utils/markdownElementDetector';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// Refs
const markdownEditorRef = ref<InstanceType<typeof SlidesMarkdownEditor> | null>(null);
const pptxInput = ref<HTMLInputElement | null>(null);
const htmlInput = ref<HTMLInputElement | null>(null);

// Expose refs for template
defineExpose({ pptxInput, htmlInput });

// UI State
const showInfographics = ref(false);
const selectedElement = ref<HTMLElement | null>(null);
const selectedElementType = ref('');
const currentMarkdownElement = ref<MarkdownElement | null>(null);

// Title bar state
const showRuler = ref(false);
const showThumbnails = ref(true);
const showProperties = ref(false);
const spellCheckEnabled = ref(true);

// Animation State
const showAnimationPanel = ref(false);
const elementAnimations = ref<Map<string, ElementAnimation>>(new Map());

interface ElementAnimation {
  enabled: boolean;
  type: string;
  duration: number;
  delay: number;
  easing: string;
  trigger: 'onLoad' | 'onClick' | 'onHover' | 'onScroll';
  repeat: boolean;
  repeatCount: number | 'infinite';
}


// Collaboration state
const collaborators = ref<Record<string, { name: string; ts: number }>>({});
const collaboratorList = computed(() =>
  Object.entries(collaborators.value)
    .filter(([id]) => id !== userId.value)
    .map(([id, info]) => ({ id, name: info.name, ts: info.ts })),
);

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
  authStore.isAuthenticated && (authStore as any).user?.name
    ? (authStore as any).user.name
    : `Guest ${randomUserToken.substr(0, 3)}`,
);
const isJoined = ref(false);
const changesPending = ref(false);
const isJustLoaded = ref(false);

const SOCKET_URI = import.meta.env.VITE_SOCKET_URI || 'ws://localhost:6001';

// Privacy types that allow real-time collaboration
const guestAccessiblePrivacyTypes = new Set<number>([1, 2, 3, 4]);
const canJoinRealtime = computed(() => {
  const deckId = route.params.deckId as string;
  if (!deckId || deckId === 'new') return false;
  if (authStore.isAuthenticated) return true;
  return guestAccessiblePrivacyTypes.has(slideStore.privacyType.valueOf());
});

// Initialize composables
const slideStore = useSlidesStore();
const { editor, persistence, presenter } = slideStore;

// Computed
const nextSlidePreviewHtml = computed(() => {
  const nextSlide = editor.nextSlidePreview;
  if (!nextSlide) return '';
  return editor.getSlidePreview(nextSlide);
});

// Enhanced computed properties
const totalWordCount = computed(() => {
  return editor.slides.reduce((total: number, slide: any) => {
    return total + slide.content.split(/\s+/).filter((word: string) => word.length > 0).length;
  }, 0);
});

const presentationDuration = computed(() => {
  // Estimate duration based on word count (200 words per minute)
  const wordsPerMinute = 200;
  const totalWords = totalWordCount.value;
  return Math.ceil(totalWords / wordsPerMinute * 60); // in seconds
});

// Debug editor mode (after editor is initialized)
watch(() => editor.mode, (newVal) => {
  console.log('🎛️ editor.mode changed:', newVal);
});

// Event Handlers - Title Bar
function handleTitleChange(value: string) {
  slideStore.setTitle(value);
}

function handleManualSave() {
  slideStore.saveDeck().catch(() => toast.error('Failed to save'));
}

function goBack() {
  router.back();
}

function copyShareLink() {
  if (!slideStore.shareLink) {
    toast.info('Share link not available yet');
    return;
  }
  navigator.clipboard.writeText(slideStore.shareLink).then(() => toast.success('Link copied'));
}

function handleInviteMember(_payload: any) {
  toast.info('Invite feature coming soon');
}

function handleUpdateMember(_payload: any) {
  toast.info('Update member feature coming soon');
}

function handleRemoveMember(_payload: any) {
  toast.info('Remove member feature coming soon');
}

// Event Handlers - Toolbar
function handleThemeChange(theme: string) {
  slideStore.setTheme(theme);
}

function handleLayoutChange(layout: string) {
  slideStore.setLayout(layout);
}

function handleAddSlide() {
  slideStore.addSlide();
  nextTick(() => markdownEditorRef.value?.focus());
}

function handleAddSlideWithTemplate(template: SlideTemplate) {
  slideStore.addSlide();
  editor.applyTemplate(template);
  nextTick(() => markdownEditorRef.value?.focus());
}

function handleExport(format: 'pdf' | 'pptx') {
  if (format === 'pdf') {
    slideStore.exportToPdf();
  } else {
    slideStore.exportToPptx();
  }
}

// Event Handlers - Thumbnail Sidebar
function handleDuplicateSlide(index: number) {
  slideStore.duplicateSlide(index);
}

function handleMoveSlide(index: number, direction: 'up' | 'down') {
  slideStore.moveSlide(index, direction);
}

function handleDeleteSlide(index: number) {
  slideStore.deleteSlide(index);
}

// Event Handlers - Editor
function handleContentChange(content: string) {
  slideStore.updateSlideContent(content);
}

function handleNotesChange(notes: string) {
  slideStore.updateSlideNotes(notes);
}

function handleInsertMarkdown(_template: string) {
  // Note: insertMarkdown doesn't trigger onSlideChange, so manually mark dirty
  slideStore.markDirty();
}

// Event Handlers - Properties Panel
function handleBackgroundChange(background: string) {
  slideStore.setBackground(background);
}

function handleTransitionChange(transition: string) {
  editor.setTransition(transition);
  // Note: Now handled by onSlideChange callback in editor
}


function handleApplyTemplate(template: any) {
  editor.applyTemplate(template);
  // Note: Now handled by onSlideChange callback in editor
}

// Event Handlers - Dynamic Properties
function handleElementStyleUpdate(property: string, value: string) {
  if (!selectedElement.value) return;
  
  // Apply style to the selected element
  selectedElement.value.style[property as any] = value;
  
  // Note: Direct DOM manipulation doesn't trigger onSlideChange, so manually mark dirty
  slideStore.markDirty();
}


function handleComponentScale(scale: number) {
  if (!selectedElement.value) return;
  
  // Apply scale transform
  selectedElement.value.style.transform = `scale(${scale})`;
  selectedElement.value.style.transformOrigin = 'center';
  
  // For mermaid diagrams, also adjust container
  if (selectedElement.value.classList.contains('mermaid-diagram')) {
    selectedElement.value.style.display = 'flex';
    selectedElement.value.style.justifyContent = 'center';
    selectedElement.value.style.alignItems = 'center';
  }
  
  // Note: Direct DOM manipulation doesn't trigger onSlideChange, so manually mark dirty
  slideStore.markDirty();
}

function handleClearSelection() {
  if (selectedElement.value) {
    selectedElement.value.classList.remove('selected-element');
    selectedElement.value = null;
    selectedElementType.value = '';
  }
}


// Animation handlers
function handleAnimationUpdate(animation: ElementAnimation) {
  const elementId = selectedElement.value?.id || (currentMarkdownElement.value ? `markdown-${currentMarkdownElement.value.startLine}` : 'unknown');
  elementAnimations.value.set(elementId, animation);
  // Note: Animation state doesn't trigger onSlideChange, so manually mark dirty
  slideStore.markDirty();
}

// Element selection handler
function handleElementSelection(element: HTMLElement, elementType: string) {
  selectedElement.value = element;
  selectedElementType.value = elementType;
  currentMarkdownElement.value = null;
  
  // Add visual feedback for selected element
  // Remove previous selection
  document.querySelectorAll('.element-selected')?.forEach(el => {
    el.classList.remove('element-selected');
  });
  
  // Add selection to current element
  element.classList.add('element-selected');
}

// Event Handlers - Markdown Cursor Tracking
function handleCursorChange(element: MarkdownElement | null) {
  console.log('🔍 handleCursorChange called:', {
    element: element ? `${element.type} at line ${element.startLine}` : 'null',
    mode: editor.mode
  });
  
  // Update the current markdown element
  currentMarkdownElement.value = element;
  
  // Clear preview element selection when cursor moves in markdown
  if (selectedElement.value) {
    handleClearSelection();
  }
}

function handleMarkdownElementUpdate(updatedElement: any) {
  if (!currentMarkdownElement.value) return;
  
  const lines = editor.currentSlideContent.split('\n');
  
  // Replace the lines that contain the element
  const startLine = currentMarkdownElement.value.startLine;
  const endLine = currentMarkdownElement.value.endLine;
  
  // Remove old lines and insert new content
  const newLines = [
    ...lines.slice(0, startLine),
    ...updatedElement.content.split('\n'),
    ...lines.slice(endLine + 1)
  ];
  
  const newContent = newLines.join('\n');
  editor.updateSlideContent(newContent);
  // Note: updateSlideContent already triggers onSlideChange, but this is explicit
  slideStore.markDirty();
  
  // Update the current element reference
  currentMarkdownElement.value = updatedElement;
}

function handleClearMarkdownElement() {
  currentMarkdownElement.value = null;
}

// Enhanced UI Handlers
function handlePrint() {
  window.print();
}

// Zoom handlers
function handleZoomIn() {
  editor.zoomIn();
}

function handleZoomOut() {
  editor.zoomOut();
}

function handleResetZoom() {
  editor.resetZoom();
}

// Event Handlers - Infographics
function handleInsertInfographic(markdown: string) {
  const currentContent = editor.currentSlideContent;
  editor.updateSlideContent(currentContent + '\n\n' + markdown);
  // Note: updateSlideContent already triggers onSlideChange, but this is explicit
  slideStore.markDirty();
  toast.success('Infographic inserted');
}

// Event Handlers - Templates
async function handleTemplateRoute(templateSlug: string) {
  // Initialize new deck first
  slideStore.initializeNewDeck();
  
  // Apply template based on slug
  const template = getTemplateBySlug(templateSlug);
  if (template) {
    // Apply template settings and content
    editor.setTheme(template.slug);
    persistence.deckTitle = `${template.name} Presentation`;
    
    // Add template-specific slides
    if (template.slug !== 'blank') {
      await applyTemplateSlides(template);
    }
    
    toast.success(`Created ${template.name} presentation`);
  } else {
    toast.error('Template not found, created blank presentation');
  }
}

function getTemplateBySlug(slug: string) {
  const templates = [
    {
      name: "Default Theme",
      slug: "default",
      slides: [
        { content: "# Welcome\n\nStart creating your presentation", notes: "" },
        { content: "## About\n\nAdd your content here", notes: "" }
      ]
    },
    {
      name: "Seriph Theme", 
      slug: "seriph",
      slides: [
        { content: "# Professional Presentation\n\nUsing serif fonts", notes: "" },
        { content: "## Key Points\n\n- First point\n- Second point\n- Third point", notes: "" }
      ]
    },
    {
      name: "Apple Basic",
      slug: "apple-basic", 
      slides: [
        { content: "# Clean Design\n\nMinimalist approach", notes: "" },
        { content: "## Simple & Elegant\n\nFocus on content", notes: "" }
      ]
    },
    {
      name: "Blank Canvas",
      slug: "blank",
      slides: [
        { content: "# Start Here\n\nBegin your presentation", notes: "" }
      ]
    }
  ];
  
  return templates.find(t => t.slug === slug);
}

async function applyTemplateSlides(template: any) {
  // Clear existing slides by setting empty array
  editor.setSlides([]);
  
  for (const slideData of template.slides) {
    editor.addSlide();
    editor.updateSlideContent(slideData.content);
    if (slideData.notes) {
      editor.updateSlideNotes(slideData.notes);
    }
    // Move to next slide for content
    if (slideData !== template.slides[template.slides.length - 1]) {
      editor.nextSlide();
    }
  }
  
  // Go back to first slide
  editor.selectSlide(0);
  // Note: selectSlide doesn't trigger onSlideChange, so manually mark dirty
  slideStore.markDirty();
}

// Event Handlers - Import
async function handlePowerPointFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) return;
  
  await slideStore.importFromPowerPoint(file);
  input.value = '';
}

async function handleHtmlFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) return;
  
  await slideStore.importFromHtml(file);
  input.value = '';
}

// Initialize WebSocket and set up message handler
function initializeWebSocketAndJoinDoc() {
  if (!canJoinRealtime.value) return;
  const deckId = route.params.deckId as string;
  if (deckId && deckId !== 'new' && !wsService.value) {
    wsService.value = initializeWebSocket(`${SOCKET_URI}?sheetId=${deckId}&userName=${userName.value}&userId=${userId.value}`);
    
    // Set up message handler through joinSheet
    const messageHandler = (message: any) => {
      if (message.type === 'chat' && message.user?.id !== userId.value) {
        // Handle remote content updates with conflict resolution
        handleRemoteContentUpdate(message);
      } else if (message.user?.id !== userId.value) {
        // Handle user presence
        if (message.type === 'join') {
          const uid = message.user?.id;
          const name = message.user?.name;
          if (uid && name) {
            collaborators.value[uid] = {
              name,
              ts: Date.now(),
            };
          }
        } else if (message.type === 'leave') {
          const uid = message.user?.id;
          if (uid) {
            delete collaborators.value[uid];
          }
        }
      }
    };
    
    // Join the sheet with the message handler
    wsService.value.joinSheet(deckId, messageHandler);
    isJoined.value = true;
  }
}

function leaveDoc() {
  if (!isJoined.value) return;
  const deckId = route.params.deckId as string;
  if (wsService.value && deckId && deckId !== 'new') {
    wsService.value.leaveSheet(deckId);
    isJoined.value = false;
  }
}

function broadcastChange() {
  if (!wsService.value || !isJoined.value || changesPending.value) return;
  const deckId = route.params.deckId as string;
  if (deckId && deckId !== 'new') {
    try {
      changesPending.value = true;
      lastLocalVersion.value = Date.now();
      
      wsService.value.sendMessage(deckId, 'chat', {
        content: JSON.stringify(editor.slides.values),
        current_slide: editor.currentSlideIndex.valueOf(),
        last_version: Date.now(),
      }, userId.value, userName.value);
      
      // Reset pending flag after a delay
      setTimeout(() => {
        changesPending.value = false;
      }, 1000);
    } catch (error) {
      console.error('Failed to broadcast change:', error);
      changesPending.value = false;
    }
  }
}

// Helper function to generate consistent colors for users
function colorForUser(userId: string): string {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Conflict resolution state
const lastRemoteVersion = ref(0);
const lastLocalVersion = ref(0);

// Enhanced conflict resolution
function handleRemoteContentUpdate(message: any) {
  if (message.user?.id === userId.value) return;
  
  const remoteVersion = message.timestamp || 0;
  
  // If remote version is newer, accept it
  if (remoteVersion > lastRemoteVersion.value) {
    lastRemoteVersion.value = remoteVersion;
    
    if (message.content) {
      try {
        const remoteSlides = JSON.parse(message.content);
        
        // Simple conflict resolution: if user hasn't made changes recently, accept remote
        const timeSinceLastLocalEdit = Date.now() - lastLocalVersion.value;
        if (timeSinceLastLocalEdit > 5000) { // 5 seconds
          isJustLoaded.value = true;
          editor.setSlides(remoteSlides);
          setTimeout(() => {
            isJustLoaded.value = false;
          }, 100);
          toast.info('Presentation updated by collaborator');
        } else {
          // User is actively editing, show a notification
          toast.info('Collaborator made changes - refresh to see them');
        }
      } catch (error) {
        console.warn('Failed to parse remote content:', error);
      }
    }
  }
}

// Lifecycle
onMounted(async () => {
  persistence.setupNetworkListeners();
  
  const deckIdParam = route.params.deckId as string | undefined;
  const templateParam = route.params.template as string | undefined;
  
  if (templateParam) {
    await handleTemplateRoute(templateParam);
  } else if (deckIdParam) {
    if (deckIdParam === 'new') {
      // Initialize new deck with title guessing
      slideStore.initializeNewDeck();
    } else {
      await slideStore.loadDeck(deckIdParam);
    }
  }

  // Initialize WebSocket collaboration after document is loaded
  initializeWebSocketAndJoinDoc();
  
  // Set up element selection listener after DOM is ready
  await nextTick();
  setTimeout(() => {
    const previewPane = document.querySelector('.slide-preview-content');
    if (previewPane) {
      previewPane.addEventListener('preview-element-selected', (e: any) => {
        const event = e as CustomEvent;
        handleElementSelection(event.detail.element, event.detail.type);
      });
    }
  }, 100);
});

onUnmounted(() => {
  persistence.cleanupNetworkListeners();
  persistence.cancelAutosave();
  
  // Cleanup WebSocket
  const deckId = route.params.deckId as string;
  if (wsService.value && deckId && deckId !== 'new') {
    wsService.value.leaveSheet(deckId);
  }
});

// Watch route changes
watch(() => route.params.deckId, async (newId) => {
  if (newId && typeof newId === 'string') {
    if (newId === 'new') {
      // Initialize new deck with title guessing
      slideStore.initializeNewDeck();
    } else {
      await slideStore.loadDeck(newId);
    }
  }
});

// Watch for collaboration changes
watch(canJoinRealtime, canJoin => {
  if (canJoin) {
    initializeWebSocketAndJoinDoc();
  } else {
    leaveDoc();
  }
});

// Watch for content changes and broadcast
watch(() => editor.slides.values, () => {
  if (!isJustLoaded.value) {
    broadcastChange();
  }
}, { deep: true });

// Clean up collaborators
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
  { deep: true }
);
</script>
