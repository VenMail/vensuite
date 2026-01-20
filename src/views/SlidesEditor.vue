<template>
  <div class="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Title Bar -->
    <SlidesTitleBar
      :title="persistence.deckTitle"
      :is-saving="persistence.isSaving"
      :has-unsaved-changes="persistence.hasUnsavedChanges"
      :is-offline="persistence.isOffline"
      :last-saved-at="persistence.lastSavedAt"
      :share-link="persistence.shareLink"
      :privacy-type="persistence.privacyType"
      :share-members="persistence.shareMembers"
      @update:title="handleTitleChange"
      @manual-save="handleManualSave"
      @back="goBack"
      @copy-link="copyShareLink"
      @change-privacy="persistence.updateVisibility"
      @invite="handleInviteMember"
      @update-member="handleUpdateMember"
      @remove-member="handleRemoveMember"
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
      <div class="flex-1 flex flex-col bg-gray-100 dark:bg-gray-950">
        <!-- Edit Mode -->
        <template v-if="editor.mode === 'edit'">
          <div class="flex-1 flex overflow-hidden">
            <!-- Markdown Editor -->
            <SlidesMarkdownEditor
              ref="markdownEditorRef"
              :content="editor.currentSlideContent"
              :notes="editor.currentSlideNotes"
              @update:content="handleContentChange"
              @update:notes="handleNotesChange"
              @insert-markdown="handleInsertMarkdown"
            />

            <!-- Live Preview -->
            <SlidesPreviewPane
              :rendered-content="editor.renderedContent"
              :layout-class="editor.getLayoutClass(editor.currentLayout)"
              :background="editor.slideBackground"
              :theme-background="editor.currentThemeObj?.colors.background"
              :theme-text="editor.currentThemeObj?.colors.text"
              :theme-style="editor.themeStyleObject as Record<string, string>"
              @update-content="handlePreviewContentUpdate"
              @select-element="handleElementSelect"
            />
          </div>
        </template>

        <!-- Preview Mode -->
        <template v-else-if="editor.mode === 'preview'">
          <SlidesPreviewPane
            :rendered-content="editor.renderedContent"
            :layout-class="editor.getLayoutClass(editor.currentLayout)"
            :background="editor.slideBackground"
            :theme-background="editor.currentThemeObj?.colors.background"
            :theme-text="editor.currentThemeObj?.colors.text"
            :theme-style="editor.themeStyleObject as Record<string, string>"
            :base-width="960"
            :base-height="720"
            fullscreen
            @update-content="handlePreviewContentUpdate"
            @select-element="handleElementSelect"
          />
        </template>
      </div>

      <!-- Right Panel: Properties -->
      <SlidesPropertiesPanel
        :layout="editor.currentLayout"
        :background="editor.slideBackground"
        :transition="editor.slideTransition"
        :slide-class="editor.slideClass"
        :theme-colors="editor.currentThemeObj?.colors"
        :theme-description="editor.currentThemeObj?.description"
        @update:layout="handleLayoutChange"
        @update:background="handleBackgroundChange"
        @update:transition="handleTransitionChange"
        @update:class="handleClassChange"
        @apply-template="handleApplyTemplate"
      />
    </div>

    <!-- Presenter Mode Overlay -->
    <SlidesPresenterOverlay
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
import SlidesPropertiesPanel from '@/components/slides/SlidesPropertiesPanel.vue';
import SlidesPresenterOverlay from '@/components/slides/SlidesPresenterOverlay.vue';
import InfographicsDialog from '@/components/slides/InfographicsDialog.vue';

// Composables
import { useSlideStoreEnhanced } from '@/store/slidesEnhanced';

// Types
import type { SlideTemplate } from '@/utils/slidevMarkdown';
import { getMarkdownFromPath } from '@/utils/slidevMarkdown';

const route = useRoute();
const router = useRouter();

// Refs
const markdownEditorRef = ref<InstanceType<typeof SlidesMarkdownEditor> | null>(null);
const pptxInput = ref<HTMLInputElement | null>(null);
const htmlInput = ref<HTMLInputElement | null>(null);

// Expose refs for template
defineExpose({ pptxInput, htmlInput });

// UI State
const showInfographics = ref(false);

// Initialize composables
const slideStore = useSlideStoreEnhanced();
const { editor, persistence, presenter } = slideStore;

// Computed
const nextSlidePreviewHtml = computed(() => {
  const nextSlide = editor.nextSlidePreview;
  if (!nextSlide) return '';
  return editor.getSlidePreview(nextSlide);
});

// Event Handlers - Title Bar
function handleTitleChange(value: string) {
  persistence.setTitle(value);
}

function handleManualSave() {
  persistence.persistDeck().catch(() => toast.error('Failed to save'));
}

function goBack() {
  router.back();
}

function copyShareLink() {
  if (!persistence.shareLink) {
    toast.info('Share link not available yet');
    return;
  }
  navigator.clipboard.writeText(persistence.shareLink).then(() => toast.success('Link copied'));
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
  editor.setTheme(theme);
  persistence.markDirty();
}

function handleLayoutChange(layout: string) {
  editor.setLayout(layout);
  persistence.markDirty();
}

function handleAddSlide() {
  editor.addSlide();
  persistence.markDirty();
  nextTick(() => markdownEditorRef.value?.focus());
}

function handleExport(format: 'pdf' | 'pptx') {
  if (format === 'pdf') {
    persistence.exportToPdf();
  } else {
    persistence.exportToPptx();
  }
}

// Event Handlers - Thumbnail Sidebar
function handleDuplicateSlide(index: number) {
  editor.duplicateSlide(index);
  persistence.markDirty();
}

function handleMoveSlide(index: number, direction: 'up' | 'down') {
  editor.moveSlide(index, direction);
  persistence.markDirty();
}

function handleDeleteSlide(index: number) {
  editor.deleteSlide(index);
  persistence.markDirty();
}

// Event Handlers - Editor
function handleContentChange(content: string) {
  editor.updateSlideContent(content);
  persistence.markDirty();
}

function handleNotesChange(notes: string) {
  editor.updateSlideNotes(notes);
  persistence.markDirty();
}

function handleInsertMarkdown(_template: string) {
  persistence.markDirty();
}

// Event Handlers - Preview Pane
function handlePreviewContentUpdate(markdownContent: string) {
  // Update the markdown editor with the new content from inline editing
  editor.updateSlideContent(markdownContent);
  persistence.markDirty();
  
  // Don't show toast for real-time updates to avoid spam
  // Only show toast for explicit save actions
}

function handleElementSelect(path: { section?: string; elementType?: string; index?: number }) {
  // Map the selected element back to markdown position
  const currentContent = editor.currentSlideContent;
  const markdownLocation = getMarkdownFromPath(currentContent, path);
  
  if (markdownLocation && markdownEditorRef.value?.editorRef) {
    // Highlight the corresponding text in the markdown editor
    const textarea = markdownEditorRef.value.editorRef;
    textarea.focus();
    textarea.setSelectionRange(markdownLocation.start, markdownLocation.end);
    textarea.scrollTop = Math.max(0, (markdownLocation.start / currentContent.length) * textarea.scrollHeight - 100);
  }
}

// Event Handlers - Properties Panel
function handleBackgroundChange(background: string) {
  editor.setBackground(background);
  persistence.markDirty();
}

function handleTransitionChange(transition: string) {
  editor.setTransition(transition);
  persistence.markDirty();
}

function handleClassChange(className: string) {
  editor.setSlideClass(className);
  persistence.markDirty();
}

function handleApplyTemplate(template: SlideTemplate) {
  editor.applyTemplate(template);
  persistence.markDirty();
}

// Event Handlers - Infographics
function handleInsertInfographic(markdown: string) {
  const currentContent = editor.currentSlideContent;
  editor.updateSlideContent(currentContent + '\n\n' + markdown);
  persistence.markDirty();
  toast.success('Infographic inserted');
}

// Event Handlers - Import
async function handlePowerPointFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) return;
  
  await persistence.importFromPowerPoint(file);
  input.value = '';
}

async function handleHtmlFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) return;
  
  await persistence.importFromHtml(file);
  input.value = '';
}

// Lifecycle
onMounted(async () => {
  persistence.setupNetworkListeners();
  
  const deckIdParam = route.params.deckId as string | undefined;
  if (deckIdParam) {
    await persistence.loadDeck(deckIdParam);
  }
});

onUnmounted(() => {
  persistence.cleanupNetworkListeners();
  persistence.cancelAutosave();
});

// Watch route changes
watch(() => route.params.deckId, async (newId) => {
  if (newId && typeof newId === 'string') {
    await persistence.loadDeck(newId);
  }
});
</script>

<style scoped>
/* Minimal styles - most styling is in child components */
</style>
