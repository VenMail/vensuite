<template>
  <div class="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Top Title Bar -->
    <StoryTitleBar
      :title="storyStore.storyTitle"
      :is-saving="storyStore.isSaving"
      :has-unsaved-changes="storyStore.hasUnsavedChanges"
      :last-saved-at="storyStore.lastSavedAt"
      :can-undo="canUndo"
      :can-redo="canRedo"
      @update:title="handleTitleChange"
      @save="handleManualSave"
      @back="goBack"
      @undo="handleUndo"
      @redo="handleRedo"
      @preview="showPreview = true"
      @present="presenter.startPresentation()"
      @share="handleShare"
    />

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col overflow-hidden min-h-0">
      <div class="flex-1 flex overflow-hidden min-h-0">
        <!-- Scene Thumbnails (left sidebar) -->
        <StorySceneThumbnails />

        <!-- Main Canvas (center) -->
        <div class="flex-1 flex flex-col min-w-0 min-h-0">
          <StoryCanvas
            ref="canvasComponentRef"
            @update:scene="handleSceneUpdate"
          />
        </div>

        <!-- Right Sidebar (properties / layers / theme / animate) -->
        <StorySidebar />
      </div>

      <!-- Bottom Timeline (collapsible) -->
      <StoryTimeline
        v-if="showTimeline"
        @close="showTimeline = false"
      />
    </div>

    <!-- Bottom Toolbar -->
    <StoryToolbar
      @toggle-timeline="showTimeline = !showTimeline"
      @present="presenter.startPresentation()"
    />

    <!-- Preview Dialog -->
    <StoryPreview
      v-model:open="showPreview"
      @start-presentation="showPreview = false; presenter.startPresentation()"
    />

    <!-- Full-screen Presenter -->
    <StoryPresenter :presenter="presenter" />
  </div>
</template>

<script setup lang="ts">
import { computed, provide, ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { toast } from 'vue-sonner';

// Components
import StoryTitleBar from '@/components/story/StoryTitleBar.vue';
import StoryCanvas from '@/components/story/StoryCanvas.vue';
import StorySceneThumbnails from '@/components/story/StorySceneThumbnails.vue';
import StoryToolbar from '@/components/story/StoryToolbar.vue';
import StorySidebar from '@/components/story/StorySidebar.vue';
import StoryTimeline from '@/components/story/StoryTimeline.vue';
import StoryPreview from '@/components/story/StoryPreview.vue';
import StoryPresenter from '@/components/story/StoryPresenter.vue';

// Store & Composables
import { useStoryStore } from '@/store/story';
import { useStoryAnimations } from '@/composables/useStoryAnimations';
import { useStoryPresenter } from '@/composables/useStoryPresenter';

const route = useRoute();
const router = useRouter();
const storyStore = useStoryStore();

// Canvas ref for animation targeting
const canvasComponentRef = ref<InstanceType<typeof StoryCanvas> | null>(null);
const canvasInnerRef = computed<HTMLElement | null>(() => {
  // StoryCanvas exposes { canvas, blockInteractions, canvasInnerRef } via defineExpose
  return (canvasComponentRef.value as any)?.canvasInnerRef ?? null;
});
const canvasViewport = computed(() => (canvasComponentRef.value as any)?.canvas ?? null);

// Animation engine
const storyAnimations = useStoryAnimations({
  containerRef: canvasInnerRef,
  scenes: storyStore.editor.scenes,
  currentSceneIndex: storyStore.editor.currentSceneIndex,
});

// Presenter
const presenter = useStoryPresenter({
  editor: storyStore.editor,
});

// UI state
const showTimeline = ref(false);
const showPreview = ref(false);

// Provide store, animations, and canvas for child components
provide('storyStore', storyStore);
provide('storyAnimations', storyAnimations);
provide('storyPresenter', presenter);
provide('storyCanvas', canvasViewport);

// Undo / Redo state (wired to editor history)
const canUndo = computed(() => storyStore.editor.canUndo.value);
const canRedo = computed(() => storyStore.editor.canRedo.value);

// ---------------------------------------------------------------------------
// Scene operations
// ---------------------------------------------------------------------------
function handleAddScene() {
  storyStore.addScene();
}

function handleDuplicateScene(index: number) {
  storyStore.duplicateScene(index);
}

function handleDeleteScene(index: number) {
  const result = storyStore.deleteScene(index);
  if (!result) {
    toast.warning('Cannot delete the last scene');
  }
}

function handleMoveScene(from: number, to: number) {
  storyStore.moveScene(from, to);
}

function handlePreviousScene() {
  const idx = storyStore.currentSceneIndex;
  if (idx > 0) {
    storyStore.selectScene(idx - 1);
  }
}

function handleNextScene() {
  const idx = storyStore.currentSceneIndex;
  if (idx < storyStore.totalScenes - 1) {
    storyStore.selectScene(idx + 1);
  }
}

function handleSceneUpdate(_payload: unknown) {
  storyStore.markDirty();
}

// ---------------------------------------------------------------------------
// Title & persistence
// ---------------------------------------------------------------------------
function handleTitleChange(newTitle: string) {
  storyStore.setTitle(newTitle);
}

async function handleManualSave() {
  await storyStore.saveStory();
}

function goBack() {
  router.push('/stories');
}

async function handleShare() {
  // Ensure story is saved first
  if (storyStore.hasUnsavedChanges) {
    await storyStore.saveStory();
  }
  const link = storyStore.persistence.shareLinkDoc.value;
  if (link) {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Share link copied to clipboard');
    } catch {
      toast.info(`Share link: ${link}`);
    }
  } else {
    toast.info('Save the story first to get a share link');
  }
}

// Undo / Redo
function handleUndo() {
  storyStore.editor.undo();
}

function handleRedo() {
  storyStore.editor.redo();
}

// Clipboard
function handleCopy() {
  storyStore.editor.copySelectedBlocks();
}

function handlePaste() {
  storyStore.editor.pasteBlocks();
}

function handleDeleteSelected() {
  storyStore.editor.deleteSelectedBlocks();
}

function handleSelectAll() {
  storyStore.editor.selectAllBlocks();
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------
function handleKeydown(e: KeyboardEvent) {
  const isCtrl = e.ctrlKey || e.metaKey;

  // Ctrl+Z — Undo
  if (isCtrl && !e.shiftKey && e.key === 'z') {
    e.preventDefault();
    handleUndo();
    return;
  }

  // Ctrl+Shift+Z — Redo
  if (isCtrl && e.shiftKey && e.key === 'z') {
    e.preventDefault();
    handleRedo();
    return;
  }

  // Ctrl+C — Copy
  if (isCtrl && e.key === 'c') {
    handleCopy();
    return;
  }

  // Ctrl+V — Paste
  if (isCtrl && e.key === 'v') {
    handlePaste();
    return;
  }

  // Ctrl+A — Select all
  if (isCtrl && e.key === 'a') {
    e.preventDefault();
    handleSelectAll();
    return;
  }

  // Ctrl+T — Toggle timeline
  if (isCtrl && e.key === 't') {
    e.preventDefault();
    showTimeline.value = !showTimeline.value;
    return;
  }

  // F5 — Start presentation
  if (e.key === 'F5') {
    e.preventDefault();
    presenter.startPresentation();
    return;
  }

  // Delete / Backspace — Delete selected
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // Only act when the target is not an editable element
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }
    e.preventDefault();
    handleDeleteSelected();
  }
}

// ---------------------------------------------------------------------------
// Unsaved changes guard
// ---------------------------------------------------------------------------
function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (storyStore.hasUnsavedChanges) {
    storyStore.saveStory().catch(() => {});
    e.preventDefault();
    e.returnValue = '';
  }
}

onBeforeRouteLeave(async () => {
  try {
    if (storyStore.hasUnsavedChanges) {
      await storyStore.saveStory();
    }
  } catch {}
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
onMounted(async () => {
  storyStore.startAutosave();

  const storyId = route.params.storyId as string | undefined;

  if (storyId && storyId !== 'new') {
    await storyStore.loadStory(storyId);
  } else {
    storyStore.initializeNewStory();
  }

  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
  storyStore.stopAutosave();
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('beforeunload', handleBeforeUnload);
});

// Watch route param changes (e.g. navigating between stories without full remount)
watch(
  () => route.params.storyId,
  async (newId) => {
    if (newId && typeof newId === 'string') {
      // Save current story if dirty before switching
      if (storyStore.hasUnsavedChanges) {
        try { await storyStore.saveStory(); } catch {}
      }
      if (newId === 'new') {
        storyStore.initializeNewStory();
      } else {
        await storyStore.loadStory(newId);
      }
    }
  },
);
</script>
