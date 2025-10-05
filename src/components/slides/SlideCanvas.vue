<template>
  <div ref="canvasHost" class="h-full w-full"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Excalidraw, exportToCanvas } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
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

function cloneElements(elements: readonly any[] | undefined): any[] {
  if (!Array.isArray(elements)) return [];
  return elements.map((element) => ({ ...element }));
}

function buildAppState(base?: Record<string, any>) {
  const merged = {
    ...(base || {}),
    viewBackgroundColor: base?.viewBackgroundColor || '#ffffff',
    gridModeEnabled: props.snapSettings.showGrid,
    gridSize: props.snapSettings.showGrid ? props.snapSettings.gridSize : 0,
    showGrid: props.snapSettings.showGrid,
    showGuides: props.snapSettings.showGuides,
    smartSnapping: props.snapSettings.smartSnapping,
    viewModeEnabled: props.disabled ?? false,
  } as Record<string, any>;
  return merged;
}

function normaliseScene(scene: SlideScene) {
  return {
    elements: cloneElements(scene.elements),
    appState: buildAppState(scene.appState),
    files: { ...(scene.files || {}) },
  } as SlideScene;
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
    elements: cloneElements(api.getSceneElements()),
    appState: { ...api.getAppState() },
    files: { ...api.getFiles() },
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
      const elements = cloneElements(excalidrawApi.value.getSceneElements());
      const appState = {
        ...excalidrawApi.value.getAppState(),
        exportPadding: 24,
        exportBackground: true,
      };
      const files = { ...excalidrawApi.value.getFiles() };
      const canvas = await exportToCanvas({ elements, appState, files });
      emit('thumbnail', canvas.toDataURL('image/png'));
    } catch (error) {
      console.warn('Failed to generate slide thumbnail', error);
      emit('thumbnail', null);
    }
  }, 600);
}

function applySceneToCanvas(scene: SlideScene) {
  const api = excalidrawApi.value;
  if (!api) return;
  const normalised = normaliseScene(scene);
  const signature = computeSignature(normalised);
  if (signature === lastSceneSignature) return;
  isApplyingScene = true;
  api.updateScene({
    elements: cloneElements(normalised.elements),
    appState: { ...buildAppState(api.getAppState()), ...normalised.appState },
    files: normalised.files,
    commitToHistory: false,
  });
  lastSceneSignature = signature;
  isApplyingScene = false;
  scheduleThumbnail();
}

function applySnapSettings(settings: SnapSettings) {
  const api = excalidrawApi.value;
  if (!api) return;
  const current = api.getAppState();
  api.updateScene({
    appState: {
      ...current,
      gridSize: settings.showGrid ? settings.gridSize : 0,
      gridModeEnabled: settings.showGrid,
      showGrid: settings.showGrid,
      showGuides: settings.showGuides,
      smartSnapping: settings.smartSnapping,
    },
  });
  refreshSignatureFromCanvas();
  scheduleThumbnail();
}

function handleChange(elements: readonly any[], appState: any, files: any) {
  if (isApplyingScene) return;
  const nextScene: SlideScene = {
    elements: elements.map((element) => ({ ...element })),
    appState: { ...appState },
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
      renderFooter: () => null,
      onChange: handleChange,
      excalidrawAPI: (api: ExcalidrawImperativeAPI) => {
        excalidrawApi.value = api;
        applySnapSettings(props.snapSettings);
        refreshSignatureFromCanvas();
        scheduleThumbnail();
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
      appState: { ...current, viewModeEnabled: !!value },
    });
  },
  { deep: true }
);
</script>
