<template>
  <div ref="canvasHost" class="h-full w-full overflow-hidden"></div>
  
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Excalidraw, exportToCanvas } from '@excalidraw/excalidraw';
import type { AppState, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import type { SlideScene, SnapSettings } from '@/types/slides';

import '@excalidraw/excalidraw/index.css';

const props = defineProps<{
  scene: SlideScene;
  snapSettings: SnapSettings;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:scene', value: SlideScene): void;
  (e: 'thumbnail', value: string | null): void;
}>();

const canvasHost = ref<HTMLDivElement | null>(null);
const rootRef = ref<Root | null>(null);
const excalidrawApi = shallowRef<ExcalidrawImperativeAPI | null>(null);
let thumbnailTimer: ReturnType<typeof setTimeout> | null = null;
let lastSceneSignature = '';
let isApplyingScene = false;

function sanitizeAppStateForUpdate(state: AppState): Partial<AppState> {
  const s = { ...(state as any) } as any;
  // Clear transient keys that may keep the loader visible
  s.isLoading = false;
  if (s.openDialog) s.openDialog = null;
  return s as Partial<AppState>;
}

function normaliseScene(scene: SlideScene) {
  return {
    elements: Array.isArray(scene.elements) ? [...scene.elements] : [],
    appState: {
      ...(scene.appState || {}),
      viewBackgroundColor: scene.appState?.viewBackgroundColor || '#ffffff',
      // Ensure the loading overlay is not shown
      isLoading: false,
    },
    files: scene.files || {},
  } satisfies SlideScene;
}

function computeSignature(scene: SlideScene) {
  const elementSignature = scene.elements
    .map((element: any) => `${element?.id}:${element?.version}`)
    .join('|');
  const appStateSignature = JSON.stringify({
    gridSize: scene.appState?.gridSize,
    gridMode: (scene.appState as any)?.gridMode,
    viewBackgroundColor: scene.appState?.viewBackgroundColor,
    showGuides: (scene.appState as any)?.showGuides,
    smartSnapping: (scene.appState as any)?.smartSnapping,
  });
  const fileSignature = Object.keys(scene.files || {}).join('|');
  return `${elementSignature}::${appStateSignature}::${fileSignature}`;
}

function refreshSignatureFromCanvas() {
  const api = excalidrawApi.value;
  if (!api) return;
  const snapshot: SlideScene = {
    elements: [...api.getSceneElements()],
    appState: api.getAppState(),
    files: api.getFiles(),
  };
  lastSceneSignature = computeSignature(snapshot);
}

function scheduleThumbnail() {
  if (thumbnailTimer) {
    clearTimeout(thumbnailTimer);
  }
  thumbnailTimer = setTimeout(async () => {
    if (!excalidrawApi.value) return;
    try {
      const elements = excalidrawApi.value.getSceneElements();
      const appState = {
        ...excalidrawApi.value.getAppState(),
        exportPadding: 24,
        exportBackground: true,
      };
      const files = excalidrawApi.value.getFiles();
      const canvas = await exportToCanvas({ elements, appState, files });
      emit('thumbnail', canvas.toDataURL('image/png'));
    } catch (error) {
      console.warn('Failed to generate slide thumbnail', error);
      emit('thumbnail', null);
    }
  }, 600);
}

function centerViewportOnElements() {
  const api = excalidrawApi.value;
  const host = canvasHost.value;
  if (!api || !host) return;
  const elements = api.getSceneElements();
  if (!elements || elements.length === 0) return;
  // Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements as any[]) {
    if (!el || el.isDeleted) continue;
    const x = Number(el.x) || 0;
    const y = Number(el.y) || 0;
    const w = Math.max(Number(el.width) || 0, 1);
    const h = Math.max(Number(el.height) || 0, 1);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return;
  const bboxCenterX = (minX + maxX) / 2;
  const bboxCenterY = (minY + maxY) / 2;
  const zoom = (api.getAppState() as any)?.zoom?.value ?? 1;
  const hostRect = host.getBoundingClientRect();
  const targetScrollX = hostRect.width / 2 - zoom * bboxCenterX;
  const targetScrollY = hostRect.height / 2 - zoom * bboxCenterY;
  (api.updateScene as unknown as (sceneData: any, addToHistory?: boolean) => void)({
    appState: { ...api.getAppState(), scrollX: targetScrollX, scrollY: targetScrollY },
  }, false);
}

function applySceneToCanvas(scene: SlideScene) {
  const api = excalidrawApi.value;
  if (!api) return;
  const normalised = normaliseScene(scene);
  const signature = computeSignature(normalised);
  if (signature === lastSceneSignature) return;
  isApplyingScene = true;
  const currentAppState = api.getAppState();
  const mergedAppState: Partial<AppState> = {
    ...sanitizeAppStateForUpdate(currentAppState),
    ...normalised.appState,
    gridSize: props.snapSettings.showGrid ? props.snapSettings.gridSize : undefined,
    gridModeEnabled: props.snapSettings.showGrid,
    viewModeEnabled: props.disabled ?? false,
  };
  (mergedAppState as any).isLoading = false;
  (api.updateScene as unknown as (sceneData: any, addToHistory?: boolean) => void)({
    elements: normalised.elements as any,
    appState: mergedAppState as AppState,
  }, false);
  // Center after applying scene so shapes are visible within the page viewport
  centerViewportOnElements();
  lastSceneSignature = signature;
  isApplyingScene = false;
  scheduleThumbnail();
}

function applySnapSettings(settings: SnapSettings) {
  const api = excalidrawApi.value;
  if (!api) return;
  const current = api.getAppState();
  const updatedAppState: Partial<AppState> = {
    ...sanitizeAppStateForUpdate(current),
    gridSize: settings.showGrid ? settings.gridSize : undefined,
    gridModeEnabled: settings.showGrid,
  };
  (updatedAppState as any).isLoading = false;
  api.updateScene({
    appState: updatedAppState as AppState,
  });
  refreshSignatureFromCanvas();
  scheduleThumbnail();
}

function handleChange(elements: readonly any[], appState: any, files: any) {
  if (isApplyingScene) return;
  const sanitizedAppState = { ...appState } as Record<string, any>;
  // Strip transient flags so we don't persist them to the store
  sanitizedAppState.isLoading = false;
  if (sanitizedAppState.openDialog) sanitizedAppState.openDialog = null;
  const nextScene: SlideScene = {
    elements: elements.map((element) => ({ ...element })),
    appState: sanitizedAppState,
    files: { ...files },
  };
  lastSceneSignature = computeSignature(normaliseScene(nextScene));
  emit('update:scene', nextScene);
  scheduleThumbnail();
}

function mountExcalidraw() {
  if (!canvasHost.value || typeof window === 'undefined') return;
  const initialScene = normaliseScene(props.scene);
  lastSceneSignature = computeSignature(initialScene);
  rootRef.value = createRoot(canvasHost.value);
  rootRef.value.render(
    React.createElement(Excalidraw, {
      initialData: initialScene,
      langCode: 'en',
      viewModeEnabled: props.disabled ?? false,
      UIOptions: {
        canvasActions: {
          changeViewBackgroundColor: false,
          clearCanvas: false,
          loadScene: false,
          saveAsImage: false,
          saveToActiveFile: false,
          export: false,
        },
        dockedSidebarBreakpoint: 0,
      },
      onChange: handleChange,
      excalidrawAPI: (api: ExcalidrawImperativeAPI) => {
        excalidrawApi.value = api;
        // Defer updates to avoid React setState-on-unmounted warning
        requestAnimationFrame(() => {
          applySnapSettings(props.snapSettings);
          refreshSignatureFromCanvas();
          scheduleThumbnail();
          const current = sanitizeAppStateForUpdate(api.getAppState()) as AppState;
          (api.updateScene as unknown as (sceneData: any, addToHistory?: boolean) => void)({
            appState: { ...current, viewModeEnabled: !!(props.disabled ?? false), isLoading: false } as any,
          }, false);
          centerViewportOnElements();
        });
      },
    })
  );
}

onMounted(() => {
  mountExcalidraw();
});

onBeforeUnmount(() => {
  if (thumbnailTimer) {
    clearTimeout(thumbnailTimer);
  }
  if (rootRef.value) {
    rootRef.value.unmount();
    rootRef.value = null;
  }
  excalidrawApi.value = null;
});

watch(
  () => props.scene,
  (scene) => {
    if (!scene || !excalidrawApi.value) return;
    applySceneToCanvas(scene);
  },
  { deep: true }
);

watch(
  () => props.snapSettings,
  (settings) => {
    if (!excalidrawApi.value) return;
    applySnapSettings(settings);
  },
  { deep: true }
);

watch(
  () => props.disabled,
  (value) => {
    if (!excalidrawApi.value) return;
    const current = excalidrawApi.value.getAppState();
    excalidrawApi.value.updateScene({
      appState: { ...current, viewModeEnabled: !!value } as AppState,
    });
  },
  { deep: true }
);
</script>
