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
      :arrange-mode="arrangeMode"
      :current-slide-index="editor.currentSlideIndex"
      :total-slides="editor.slides.length"
      :current-theme="editor.currentTheme"
      :current-layout="editor.currentLayout"
      @update:mode="editor.mode = $event"
      @update:theme="handleThemeChange"
      @update:layout="handleLayoutChange"
      @enter-arrange="arrangeMode = true"
      @finish-arrange="handleFinishArrange"
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
            <!-- Markdown Editor: full when not arrange; collapsed or toggled when arrange -->
            <div
              class="h-full flex flex-col transition-[flex] duration-200 min-w-0 relative"
              :class="arrangeMode ? (showMarkdownInArrange ? 'flex-1 max-w-[400px]' : 'w-0 overflow-hidden flex-shrink-0') : 'flex-1'"
            >
              <div v-if="arrangeMode && !showMarkdownInArrange" class="absolute left-2 top-2 z-10 flex items-center gap-2">
                <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Arrange mode — select in preview, or show Markdown.</span>
                <button
                  type="button"
                  class="p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow hover:bg-gray-50 dark:hover:bg-gray-700"
                  title="Show Markdown"
                  @click="showMarkdownInArrange = true"
                >
                  <FileCode class="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              <SlidesMarkdownEditor
                v-show="!arrangeMode || showMarkdownInArrange"
                ref="markdownEditorRef"
                :content="editor.currentSlideContent"
                :notes="editor.currentSlideNotes"
                @update:content="handleContentChange"
                @update:notes="handleNotesChange"
                @insert-markdown="handleInsertMarkdown"
                @cursor-change="handleCursorChange"
                @enter-arrange="handleEnterArrangeFromEditor"
              />
            </div>

            <!-- Properties Panel (Center, Fixed Width) -->
            <div class="w-80 max-w-80 min-w-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
              <!-- Tab bar: Layout / Blocks / Animation -->
              <div class="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button
                  @click="showAnimationPanel = false; propertiesTab = 'layout'"
                  class="flex-1 px-2 py-2 text-xs font-medium transition-colors border-b-2"
                  :class="!showAnimationPanel && propertiesTab === 'layout'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
                >
                  Layout
                </button>
                <button
                  @click="showAnimationPanel = false; propertiesTab = 'blocks'"
                  class="flex-1 px-2 py-2 text-xs font-medium transition-colors border-b-2"
                  :class="!showAnimationPanel && propertiesTab === 'blocks'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
                >
                  Blocks
                  <span v-if="hasBlocks" class="ml-1 px-1 py-0.5 text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded">{{ blockInstances.length }}</span>
                </button>
                <button
                  @click="showAnimationPanel = true"
                  class="flex-1 px-2 py-2 text-xs font-medium transition-colors border-b-2"
                  :class="showAnimationPanel
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
                >
                  Motion
                </button>
              </div>

              <!-- Layout & Style Panel -->
              <ImprovedPropertiesPanel
                v-if="!showAnimationPanel && propertiesTab === 'layout'"
                :layout="editor.currentLayout"
                :background="editor.slideBackground"
                :transition="editor.slideTransition"
                :current-theme="editor.currentTheme"
                :current-layout="editor.currentLayout"
                @toggle-panel="() => {}"
                @update:layout="handleLayoutChange"
                @update:background="handleBackgroundChange"
                @update:transition="handleTransitionChange"
                @update:theme="handleThemeChange"
                @apply-template="handleApplyTemplate"
              />

              <!-- Block Properties Panel -->
              <BlockPropertiesPanel
                v-if="!showAnimationPanel && propertiesTab === 'blocks'"
                :active-block="activeBlock"
                :markdown-content="editor.currentSlideContent"
                @update-prop="handleBlockPropUpdate"
                @insert-block="handleInsertBlock"
                @close="activeBlock = null"
              />

              <!-- Animation Panel -->
              <SlidesAnimationPane
                v-if="showAnimationPanel"
                :selected-element="selectedElement"
                :markdown-element="currentMarkdownElement"
                :motion-config="editor.getMotionConfig()"
                @back="showAnimationPanel = false"
                @close="showAnimationPanel = false"
                @update-motion-config="handleMotionConfigUpdate"
              />
            </div>

            <!-- Live Preview: flexible width; expands when arrange mode -->
            <div class="flex-1 min-w-0 h-full" :class="{ 'max-w-[600px]': !arrangeMode }">
              <div v-if="arrangeMode" class="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                Select elements to move. Click <strong>Finish</strong> when done.
              </div>
              <SlidesPreviewPane
                :rendered-content="editor.renderedContent"
                :layout-class="editor.getLayoutClass(editor.currentLayout)"
                :layout="editor.currentLayout"
                :background="editor.slideBackground"
                :theme-background="editor.currentThemeObj?.colors.background"
                :theme-text="editor.currentThemeObj?.colors.text"
                :theme-style="editor.themeStyleObject as Record<string, string>"
                :theme="editor.currentTheme"
                :animations="animationConfig"
                :custom-class="editor.slideClass"
                :arrange-mode="arrangeMode"
                :focus-line-range="focusLineRange"
                :selected-line-range="currentMarkdownElement ? { start: currentMarkdownElement.startLine, end: currentMarkdownElement.endLine } : null"
                :slide-variant="resolvedSlideVariant"
                :slide-phase="slidePhase"
                :slide-direction="slideDirection"
                :content-variant="currentContentVariant"
                :content-phase="contentPhase"
                @update-element-position="handleUpdateElementPosition"
                @update-element-size="handleUpdateElementSize"
                @element-selected="handleElementSelection"
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
              :layout="editor.currentLayout"
              :background="editor.slideBackground"
              :theme-background="editor.currentThemeObj?.colors.background"
              :theme-text="editor.currentThemeObj?.colors.text"
              :theme-style="editor.themeStyleObject as Record<string, string>"
              :theme="editor.currentTheme"
              :animations="animationConfig"
              :custom-class="editor.slideClass"
              :slide-variant="resolvedSlideVariant"
              :slide-phase="slidePhase"
              :slide-direction="slideDirection"
              :content-variant="currentContentVariant"
              :content-phase="contentPhase"
              :is-fullscreen="true"
              :enable-debug-mode="false"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- Collaborator List -->
    <div v-if="collaboratorList.length" class="px-6 py-1 flex flex-wrap gap-2 items-center justify-end bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 text-xs">
      <span class="text-gray-500 dark:text-gray-400">{{$t('Commons.text.also_editing')}}</span>
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
      :theme-background="editor.currentThemeObj?.colors.background"
      :theme-text="editor.currentThemeObj?.colors.text"
      :theme-style="editor.themeStyleObject as Record<string, string>"
      :theme="editor.currentTheme"
      :custom-class="editor.slideClass"
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
import { FileCode } from 'lucide-vue-next';

const SLIDES_EDITOR_DEBUG = Boolean(import.meta.env.DEV);
const logSlidesEditorDebug = (...args: unknown[]) => {
  if (!SLIDES_EDITOR_DEBUG) return;
  console.log(...args);
};

// Components
import SlidesTitleBar from '@/components/slides/SlidesTitleBar.vue';
import SlidesToolbar from '@/components/slides/SlidesToolbar.vue';
import SlidesThumbnailSidebar from '@/components/slides/SlidesThumbnailSidebar.vue';
import SlidesMarkdownEditor from '@/components/slides/SlidesMarkdownEditor.vue';
import SlidesPreviewPane from '@/components/slides/SlidesPreviewPane.vue';
import ImprovedPropertiesPanel from '@/components/slides/ImprovedPropertiesPanel.vue';
import BlockPropertiesPanel from '@/components/slides/BlockPropertiesPanel.vue';
import SlidesAnimationPane from '@/components/slides/SlidesAnimationPane.vue';
import SlidesPresenter from '@/components/slides/SlidesPresenter.vue';
import InfographicsDialog from '@/components/slides/InfographicsDialog.vue';

// Composables
import { useMotionConfig } from '@/composables/useMotionConfig';
import { IWebsocketService, useWebSocket } from '@/lib/wsService';

// Stores
import { useAuthStore } from '@/store/auth';
import { useSlidesStore } from '../store/slides';

// Types
import { type SlideTemplate } from '@/utils/slidevMarkdown';
import { getElementByLineRange, type MarkdownElement } from '@/utils/markdownElementDetector';
import { toast } from '@/composables/useToast';
import { updateElementPosition, updateElementSize } from '@/utils/markdownPositionSync';
import { extractBlockInstances, updateBlockPropInMarkdown, type BlockInstance } from '@/utils/slideBlocks';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const slideStore = useSlidesStore();

// Refs
const markdownEditorRef = ref<InstanceType<typeof SlidesMarkdownEditor> | null>(null);
const pptxInput = ref<HTMLInputElement | null>(null);
const htmlInput = ref<HTMLInputElement | null>(null);

// Expose refs for template
defineExpose({ pptxInput, htmlInput });

// UI State
const showInfographics = ref(false);
const selectedElement = ref<HTMLElement | null>(null);
const currentMarkdownElement = ref<MarkdownElement | null>(null);
const arrangeMode = ref(false);
const showMarkdownInArrange = ref(false);
const focusLineRange = ref<{ start: number; end: number } | null>(null);

// Title bar state
const showRuler = ref(false);
const showThumbnails = ref(true);
const showProperties = ref(false);
const spellCheckEnabled = ref(true);
const propertiesTab = ref<'layout' | 'blocks'>('layout');

// Block editing state
const activeBlock = ref<BlockInstance | null>(null);

const blockInstances = computed(() => {
  const content = editor.currentSlideContent;
  if (!content) return [];
  return extractBlockInstances(content);
});

const hasBlocks = computed(() => blockInstances.value.length > 0);

// Animation State
const showAnimationPanel = ref(false);
const motionConfig = useMotionConfig();
const slidePhase = ref<'enter' | 'center' | 'exit'>('center');
const contentPhase = ref<'hidden' | 'visible'>('visible');
const slideDirection = ref(1);

const currentSlideFrontmatter = computed(() => editor.currentSlide?.frontmatter || {});

const slideVariantMap: Record<string, string> = {
  'venmail-3d': 'venmail3d',
  'venmail3d': 'venmail3d',
  'slide-left': 'slideLeft',
  'slideLeft': 'slideLeft'
};

const resolvedSlideVariant = computed(() => {
  const motionVariant = currentSlideFrontmatter.value?.motion?.slideVariant;
  const transition = motionVariant || currentSlideFrontmatter.value?.transition || editor.slideTransition;
  if (!transition) return 'venmail3d';
  return slideVariantMap[transition] || transition;
});

const currentContentVariant = computed(() => {
  return currentSlideFrontmatter.value?.motion?.contentVariant || 'default';
});

function triggerSlideAnimation() {
  slidePhase.value = 'enter';
  contentPhase.value = 'hidden';
  requestAnimationFrame(() => {
    slidePhase.value = 'center';
    contentPhase.value = 'visible';
  });
}

// Watch statements will be moved after editor initialization

// Convert motionConfig to legacy AnimationConfig format (for compatibility)
const animationConfig = computed(() => {
  const config = new Map<string, ElementAnimation>();
  
  // Convert structured motion config to legacy format
  Object.entries(motionConfig.elements.value).forEach(([elementId, elementConfig]) => {
    const cssAnim = elementConfig.cssAnimation;
    if (cssAnim?.enabled) {
      config.set(elementId, {
        enabled: cssAnim.enabled,
        type: cssAnim.type,
        duration: cssAnim.duration,
        delay: cssAnim.delay,
        easing: cssAnim.easing,
        trigger: cssAnim.trigger,
        repeat: cssAnim.repeat,
        repeatCount: cssAnim.repeatCount
      });
    }
  });
  
  return config;
});

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
const { editor, persistence, presenter } = slideStore;

// Watch statements that depend on editor (moved here after initialization)
watch(
  () => editor.currentSlideIndex,
  (newVal, oldVal) => {
    if (typeof newVal === 'number' && typeof oldVal === 'number') {
      slideDirection.value = newVal >= oldVal ? 1 : -1;
    }
    triggerSlideAnimation();
  },
  { immediate: true }
);

watch(currentSlideFrontmatter, () => {
  triggerSlideAnimation();
});

// Computed / Derived state
const nextSlidePreviewHtml = ref('');

watch(
  () => editor.nextSlidePreview,
  async (nextSlide, _prevSlide) => {
    if (!nextSlide) {
      nextSlidePreviewHtml.value = '';
      return;
    }

    try {
      nextSlidePreviewHtml.value = await editor.getSlidePreview(nextSlide);
    } catch (error) {
      console.error('Failed to render next slide preview', error);
      nextSlidePreviewHtml.value = '';
    }
  },
  { immediate: true }
);

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
  logSlidesEditorDebug('🎛️ editor.mode changed:', newVal);
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
  slideStore.markDirty();
}

// Animation handlers
function handleMotionConfigUpdate(motionConfig: Record<string, any>) {
  editor.setMotionConfig(motionConfig);
}

// Block editing handlers
function handleBlockPropUpdate(payload: { blockId: string; propKey: string; propValue: any }) {
  const content = editor.currentSlideContent;
  const updated = updateBlockPropInMarkdown(content, payload.blockId, payload.propKey, payload.propValue);
  if (updated !== content) {
    editor.updateSlideContent(updated);
    slideStore.markDirty();
    // Re-resolve active block after update
    nextTick(() => {
      const instances = extractBlockInstances(editor.currentSlideContent);
      const match = instances.find(b => b.blockId === payload.blockId);
      if (match) activeBlock.value = match;
    });
  }
}

function handleInsertBlock(markdown: string) {
  const currentContent = editor.currentSlideContent;
  const separator = currentContent.trim() ? '\n\n' : '';
  editor.updateSlideContent(currentContent + separator + markdown);
  slideStore.markDirty();
}

function handleClearSelection() {
  if (selectedElement.value) {
    selectedElement.value.classList.remove('element-selected');
    selectedElement.value = null;
  }
}

// Simplified element selection handler
function handleElementSelection(
  element: HTMLElement,
  _elementType: string,
  markdownLineStart?: number,
  markdownLineEnd?: number
) {
  console.log('🎯 Element selection:', { markdownLineStart, markdownLineEnd });
  
  // Clear previous DOM selections
  document.querySelectorAll('.element-selected')?.forEach((el) => {
    el.classList.remove('element-selected');
  });
  element.classList.add('element-selected');

  // Check if the selected element (or an ancestor) is a container block
  const blockEl = element.closest('[data-block-type]') as HTMLElement | null;
  if (blockEl) {
    const blockType = blockEl.getAttribute('data-block-type');
    const blockId = blockEl.getAttribute('data-block-id');
    if (blockType && blockId) {
      const match = blockInstances.value.find(b => b.blockId === blockId);
      if (match) {
        activeBlock.value = match;
        showAnimationPanel.value = false;
        propertiesTab.value = 'blocks';
        console.log('🧱 Block selected:', blockType, blockId);
      }
    }
  } else {
    activeBlock.value = null;
  }
  
  // Update markdown element if line numbers provided
  if (markdownLineStart !== undefined) {
    const newElement = getElementByLineRange(
      editor.currentSlide.content, 
      markdownLineStart, 
      markdownLineEnd || markdownLineStart
    );
    
    if (newElement) {
      console.log('🎯 Markdown element found:', newElement.type);
      currentMarkdownElement.value = newElement;
      showAnimationPanel.value = false;
      
      // Also try to match to a block instance by line range
      if (!activeBlock.value) {
        const matchByLine = blockInstances.value.find(
          b => markdownLineStart >= b.startLine && markdownLineStart <= b.endLine
        );
        if (matchByLine) {
          activeBlock.value = matchByLine;
          console.log('🧱 Block matched by line range:', matchByLine.type);
        }
      }
      
      syncMarkdownEditorCursor(markdownLineStart);
    } else {
      console.log('🎯 No markdown element found');
      currentMarkdownElement.value = null;
    }
  }
}

// Helper to sync markdown editor cursor (best effort, non-critical)
function syncMarkdownEditorCursor(targetLine: number) {
  try {
    const markdownEditor = markdownEditorRef.value;
    if (markdownEditor?.$el) {
      const textarea = markdownEditor.$el.querySelector('textarea') as HTMLTextAreaElement;
      if (textarea) {
        const lines = textarea.value.split('\n');
        const lineIndex = Math.max(0, Math.min(targetLine, lines.length - 1));
        const lineStart = lines.slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0);
        textarea.setSelectionRange(lineStart, lineStart);
      }
    }
  } catch (error) {
    console.warn('Failed to sync markdown cursor:', error);
  }
}

// Simplified cursor change handler
function handleCursorChange(element: MarkdownElement | null) {
  logSlidesEditorDebug('🔍 Cursor change:', element?.type || 'null');
  
  // Update current markdown element
  currentMarkdownElement.value = element;
  
  // Clear DOM element selection when cursor moves in markdown
  if (selectedElement.value) {
    handleClearSelection();
  }
  
  // Ensure properties panel is shown for markdown elements
  if (element && !arrangeMode.value) {
    showAnimationPanel.value = false;
  }
}

// Simplified arrange mode handlers
function handleEnterArrangeFromEditor() {
  console.log('🎯 Entering arrange mode');
  arrangeMode.value = true;
  showMarkdownInArrange.value = false;
  
  // Set focus range if we have a current element
  if (currentMarkdownElement.value) {
    focusLineRange.value = {
      start: currentMarkdownElement.value.startLine,
      end: currentMarkdownElement.value.endLine
    };
  }
}

function handleFinishArrange() {
  console.log('🎯 Finishing arrange mode');
  
  // Clear selections and state
  if (selectedElement.value) {
    handleClearSelection();
  }
  currentMarkdownElement.value = null;
  
  // Reset arrange mode
  arrangeMode.value = false;
  showMarkdownInArrange.value = false;
  focusLineRange.value = null;
  
  // Trigger re-render to apply changes
  const currentContent = editor.currentSlideContent;
  editor.updateSlideContent(currentContent);
}

// Simplified element position/size handlers
function handleUpdateElementPosition(payload: {
  markdownLineStart: number;
  markdownLineEnd: number;
  position: { top?: string; left?: string };
}) {
  const { markdownLineStart, markdownLineEnd, position } = payload;
  
  try {
    const currentContent = editor.currentSlideContent;
    const updatedMarkdown = updateElementPosition(
      currentContent,
      markdownLineStart,
      markdownLineEnd,
      position.top || '0%',
      position.left || '0%'
    );
    
    editor.updateSlideContent(updatedMarkdown);
    slideStore.markDirty();
    
    console.log('🎯 Position updated successfully');
  } catch (error) {
    console.error('🎯 Failed to update position:', error);
  }
}

function handleUpdateElementSize(payload: {
  markdownLineStart: number;
  markdownLineEnd: number;
  width: number;
  height: number;
}) {
  const { markdownLineStart, markdownLineEnd, width, height } = payload;
  
  try {
    const currentContent = editor.currentSlideContent;
    const updatedMarkdown = updateElementSize(
      currentContent,
      markdownLineStart,
      markdownLineEnd,
      width,
      height
    );
    
    editor.updateSlideContent(updatedMarkdown);
    slideStore.markDirty();
    
    console.log('🎯 Size updated successfully');
  } catch (error) {
    console.error('🎯 Failed to update size:', error);
  }
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
  // Initialize new deck first - this now sets deckId to 'new' for proper reload handling
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
    },
    {
      name: "Venmail Pitch",
      slug: "venmail-pitch",
      slides: [
        {
          content: `---
layout: cover

:::cover-slide{gradient="purple" align="center"}

# Venmail OS

One Operating System for Modern Communication

*Email • Office • Collaboration • Meetings — One Platform, Unlimited Users*
:::`,
          notes: "Cover slide — edit gradient and alignment in the Blocks panel"
        },
        {
          content: `---
layout: stats
title: "Market Opportunity"

:::market-slide{gradient="blue"}

:::headline{pill="Market Opportunity"}
## $160M ARR in underserved SMB markets
Email • Collaboration • Automation — one stack
:::

:::metrics{cols=4}
:::metric{value="$4.2B" label="Market Size" detail="Growing 18% YoY" color="blue"}
:::
:::metric{value="250M+" label="Active Users" detail="Global reach" color="emerald"}
:::
:::metric{value="85%" label="Satisfaction" detail="Industry leading" color="purple"}
:::
:::metric{value="12M" label="Enterprises" detail="Fortune 500" color="amber"}
:::
:::

:::`,
          notes: "Market opportunity — click any metric to edit its value, label, and detail in the Blocks panel"
        },
        {
          content: `---
layout: content
title: "Our Mission"

:::market-slide{gradient="emerald"}

:::icon-row{icon="🚀" color="emerald"}
## Our Mission
:::

Revolutionize business communication with an integrated platform

- Unified email and office suite
- Real-time collaboration tools
- AI-powered productivity features
- Enterprise-grade security

:::`,
          notes: "Mission slide — edit icon and color in the Blocks panel"
        },
        {
          content: `---
layout: content
title: "Product Overview"

:::market-slide{gradient="purple"}

:::headline{pill="Product"}
## All-in-One Platform
:::

:::card-grid{cols=2}
:::card{title="Email Suite"}
- **Smart Inbox**: AI-powered email triage
- **Templates**: Professional email templates
- **Scheduling**: Send later & follow-ups
:::
:::card{title="Collaboration"}
- **Real-time Docs**: Live co-editing
- **Video Meetings**: Built-in conferencing
- **Team Chat**: Instant messaging
:::
:::

:::`,
          notes: "Product overview — add/remove cards and edit titles in the Blocks panel"
        },
        {
          content: `---
layout: content
title: "Market Sizing"

:::market-slide{gradient="blue"}

:::icon-row{icon="📊" color="blue"}
## Market Sizing
:::

:::data-list
:::data-item{label="TAM" value="400M SMBs globally — $8.5B email software market"}
:::
:::data-item{label="SAM" value="40M tech-enabled SMBs in target geographies"}
:::
:::data-item{label="SOM" value="150K+ SMBs reachable via partnerships & direct sales"}
:::
:::

:::spacer{size="4"}
:::

:::metrics{cols=3}
:::metric{value="$50B+" label="Public Sector" detail="12% CAGR" color="blue"}
:::
:::metric{value="$30K" label="Effective ACV" detail="Storage-based pricing" color="emerald"}
:::
:::metric{value="3x" label="LTV/CAC" detail="Target ratio" color="purple"}
:::
:::

:::`,
          notes: "Market sizing — edit TAM/SAM/SOM values and metrics in the Blocks panel"
        },
        {
          content: `---
layout: content
title: "Roadmap"

:::market-slide{gradient="slate"}

:::headline{pill="Roadmap"}
## Go-to-Market Timeline
:::

:::card-grid{cols=3}
:::card{title="Phase 1" badge="Q1-Q2 2025"}
- Launch beta program
- 500 pilot customers
- Core email + docs
:::
:::card{title="Phase 2" badge="Q3-Q4 2025"}
- Public launch
- 5,000 customers
- Video + chat integration
:::
:::card{title="Phase 3" badge="2026"}
- Enterprise tier
- 25,000 customers
- AI automation suite
:::
:::

:::`,
          notes: "Roadmap — edit phases, badges, and milestones in the Blocks panel"
        },
        {
          content: `---
layout: cover

:::cover-slide{gradient="purple" align="center"}

# Thank You

**hello@venmail.com** • venmail.com

*Let's build the future of business communication together*
:::`,
          notes: "Closing slide — edit contact info directly in the markdown"
        }
      ]
    }
  ];
  
  return templates.find(t => t.slug === slug);
}

function parseTemplateSlide(rawContent: string) {
  const trimmed = rawContent?.trimStart() || '';
  if (!trimmed.startsWith('---')) {
    return { content: rawContent, frontmatter: undefined };
  }

  const lines = trimmed.split('\n');
  const frontmatterLines: string[] = [];
  let cursor = 1; // skip opening ---
  let frontmatterEnded = false;

  while (cursor < lines.length) {
    const line = lines[cursor];
    const normalized = line.trim();

    if (normalized === '---') {
      cursor++;
      frontmatterEnded = true;
      break;
    }

    if (!normalized) {
      cursor++;
      frontmatterEnded = true;
      break;
    }

    frontmatterLines.push(line);
    cursor++;
  }

  const frontmatter = frontmatterLines.reduce<Record<string, any>>((acc, rawLine) => {
    const delimiterIndex = rawLine.indexOf(':');
    if (delimiterIndex === -1) return acc;

    const key = rawLine.slice(0, delimiterIndex).trim();
    let value = rawLine.slice(delimiterIndex + 1).trim();
    value = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    acc[key] = value;
    return acc;
  }, {});

  const bodyStart = frontmatterEnded ? cursor : 1;
  const content = lines.slice(bodyStart).join('\n').trimStart();

  return { content, frontmatter };
}

async function applyTemplateSlides(template: any) {
  const timestamp = Date.now();
  const slides = template.slides.map((slideData: any, index: number) => {
    const { content, frontmatter } = parseTemplateSlide(slideData.content || '');
    return {
      id: `${template.slug}-${timestamp}-${index}`,
      content: content || '# New Slide',
      notes: slideData.notes || '',
      frontmatter: {
        ...(frontmatter || {}),
        ...(slideData.frontmatter || {})
      }
    };
  });

  editor.setSlides(slides);
  editor.selectSlide(0);

  const themeSlug = template.slug === 'blank' ? 'venmail-pitch' : template.slug;
  if (themeSlug) {
    slideStore.setTheme(themeSlug);
  }

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
      previewPane.addEventListener('preview-element-selected', (e: Event) => {
        const ev = e as CustomEvent<{
          element: HTMLElement;
          type: string;
          markdownLineStart?: number;
          markdownLineEnd?: number;
        }>;
        const d = ev.detail;
        handleElementSelection(
          d.element,
          d.type,
          d.markdownLineStart,
          d.markdownLineEnd
        );
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
