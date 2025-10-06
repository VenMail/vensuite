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
import { PAGE_WIDTH, PAGE_HEIGHT } from '@/constants/slides';

import '@excalidraw/excalidraw/index.css';

const props = defineProps<{
  scene: SlideScene;
  snapSettings: SnapSettings;
  disabled?: boolean;
  textCommand?: { seq: number; fontFamily?: number };
  chartCommand?: { seq: number; type: 'bar' | 'line' | 'pie' };
  textAdvancedCommand?: { seq: number; name: string };
}>();

const emit = defineEmits<{
  (e: 'update:scene', value: SlideScene): void;
  (e: 'thumbnail', value: string | null): void;
  (e: 'selection', value: { hasText: boolean; fontFamily?: number } ): void;
  (e: 'available-fonts', value: string[]): void;
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

function mapFontNameToFamilyId(name: string): number {
  const n = (name || '').trim().toLowerCase();
  // Known Excalidraw font IDs
  const KNOWN: Record<string, number> = {
    'virgil': 1,
    'helvetica': 2,
    'cascadia': 3,
    'excalifont': 5,
    'nunito': 6,
    'lilita one': 7,
    'comic shanns': 8,
  };
  if (KNOWN[n]) return KNOWN[n];
  // Heuristics
  if (n.includes('mono') || n.includes('code') || n.includes('cascadia') || n.includes('fira code') || n.includes('jetbrains')) return 3;
  // Default to Sans slot
  return 2;
}

function forceNotLoading() {
  const api = excalidrawApi.value as any;
  try {
    api?.setAppState?.({ isLoading: false, openDialog: null });
  } catch {}
}

const FONT_ALIAS_STYLE_ID = 'excal-font-alias';
function ensureFontAliasStyleEl(): HTMLStyleElement {
  let el = document.getElementById(FONT_ALIAS_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = FONT_ALIAS_STYLE_ID;
    document.head.appendChild(el);
  }
  return el;
}

function setFontAliases(options: { sans?: string; mono?: string }) {
  const el = ensureFontAliasStyleEl();
  const blocks: string[] = [];
  if (options.sans) {
    const f = options.sans;
    blocks.push(`@font-face { font-family: Helvetica; src: local('${f}'), local('${f} Regular'); font-weight: 400; font-style: normal; font-display: swap; }`);
    blocks.push(`@font-face { font-family: Helvetica; src: local('${f} Medium'), local('${f} 500'); font-weight: 500; font-style: normal; font-display: swap; }`);
    blocks.push(`@font-face { font-family: Helvetica; src: local('${f} SemiBold'), local('${f} 600'); font-weight: 600; font-style: normal; font-display: swap; }`);
    blocks.push(`@font-face { font-family: Helvetica; src: local('${f} Bold'), local('${f} 700'); font-weight: 700; font-style: normal; font-display: swap; }`);
  }
  if (options.mono) {
    const f = options.mono;
    blocks.push(`@font-face { font-family: Cascadia; src: local('${f}'), local('${f} Regular'); font-weight: 400; font-style: normal; font-display: swap; }`);
    blocks.push(`@font-face { font-family: Cascadia; src: local('${f} Medium'), local('${f} 500'); font-weight: 500; font-style: normal; font-display: swap; }`);
    blocks.push(`@font-face { font-family: Cascadia; src: local('${f} SemiBold'), local('${f} 600'); font-weight: 600; font-style: normal; font-display: swap; }`);
    blocks.push(`@font-face { font-family: Cascadia; src: local('${f} Bold'), local('${f} 700'); font-weight: 700; font-style: normal; font-display: swap; }`);
  }
  el.textContent = blocks.join('\n');
}

function registerAvailableFonts() {
  const api = excalidrawApi.value as any;
  if (!api) return;
  const extras = [
    'Inter', 'Nunito', 'Lilita One', 'JetBrains Mono', 'EB Garamond', 'Roboto Slab',
    'Poppins', 'Montserrat', 'Lato', 'Source Sans 3', 'Work Sans', 'Playfair Display',
    'DM Sans', 'DM Serif Display', 'Fira Code'
  ];
  try {
    const current = api.getAppState?.() || {};
    const list = Array.from(new Set([...(current.availableFonts || []), ...extras]));
    api.setAppState?.({ availableFonts: list });
    emit('available-fonts', list);
    // Set sensible defaults so Helvetica -> Inter, Cascadia -> JetBrains Mono
    setFontAliases({ sans: 'Inter', mono: 'JetBrains Mono' });
  } catch {}
}

function fitPageToViewport() {
  const api = excalidrawApi.value;
  const host = canvasHost.value;
  if (!api || !host) return;
  const rect = host.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const zoomValue = Math.max(0.1, Math.min(rect.width / PAGE_WIDTH, rect.height / PAGE_HEIGHT));
  const current = api.getAppState();
  (api.updateScene as unknown as (sceneData: any, addToHistory?: boolean) => void)({
    appState: { ...current, zoom: { value: zoomValue } },
  }, false);
  // Center the page frame
  (api.updateScene as unknown as (sceneData: any, addToHistory?: boolean) => void)({
    appState: { ...api.getAppState(), scrollX: rect.width / 2 - zoomValue * (PAGE_WIDTH / 2), scrollY: rect.height / 2 - zoomValue * (PAGE_HEIGHT / 2) },
  }, false);
  forceNotLoading();
}

function clampViewportToPage(appState: any) {
  const host = canvasHost.value;
  if (!host) return appState;
  const rect = host.getBoundingClientRect();
  const zoom = (appState?.zoom?.value ?? 1) || 1;
  const minScrollX = rect.width - zoom * PAGE_WIDTH;
  const minScrollY = rect.height - zoom * PAGE_HEIGHT;
  const maxScrollX = 0;
  const maxScrollY = 0;
  const scrollX = Math.max(minScrollX, Math.min(maxScrollX, appState.scrollX ?? 0));
  const scrollY = Math.max(minScrollY, Math.min(maxScrollY, appState.scrollY ?? 0));
  return { ...appState, scrollX, scrollY };
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
  forceNotLoading();
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
  forceNotLoading();
}

function handleChange(elements: readonly any[], appState: any, files: any) {
  if (isApplyingScene) return;
  const sanitizedAppState = { ...appState } as Record<string, any>;
  // Strip transient flags so we don't persist them to the store
  sanitizedAppState.isLoading = false;
  if (sanitizedAppState.openDialog) sanitizedAppState.openDialog = null;
  // Clamp viewport to page
  const clamped = clampViewportToPage(sanitizedAppState);
  const nextScene: SlideScene = {
    elements: elements.map((element) => ({ ...element })),
    appState: clamped,
    files: { ...files },
  };
  lastSceneSignature = computeSignature(normaliseScene(nextScene));
  emit('update:scene', nextScene);
  scheduleThumbnail();
  // Emit selection state for toolbar
  try {
    const selectedIds = clamped?.selectedElementIds ? Object.keys(clamped.selectedElementIds).filter((k) => clamped.selectedElementIds[k]) : [];
    const selected = (elements as any[]).filter((el) => selectedIds.includes(el.id));
    const firstText = selected.find((el) => el.type === 'text');
    emit('selection', { hasText: Boolean(firstText), fontFamily: firstText?.fontFamily });
  } catch {}
}

function applyFontFamilyToSelection(fontFamily: number) {
  const api = excalidrawApi.value;
  if (!api) return;
  const elements = api.getSceneElements() as any[];
  const appState = api.getAppState() as any;
  const selectedIds: string[] = appState?.selectedElementIds ? Object.keys(appState.selectedElementIds).filter((k) => appState.selectedElementIds[k]) : [];
  if (!selectedIds.length) return;
  const updated = elements.map((el: any) => (selectedIds.includes(el.id) && el.type === 'text' ? { ...el, fontFamily } : el));
  (api.updateScene as unknown as (sceneData: any, addToHistory?: boolean) => void)({ elements: updated }, true);
}

async function insertChart(type: 'bar' | 'line' | 'pie') {
  const api = excalidrawApi.value;
  const host = canvasHost.value;
  if (!api || !host) return;
  const rect = host.getBoundingClientRect();
  const app = api.getAppState() as any;
  const zoom = app?.zoom?.value ?? 1;
  const centerX = (rect.width / 2 - (app.scrollX ?? 0)) / zoom;
  const centerY = (rect.height / 2 - (app.scrollY ?? 0)) / zoom;
  const base = api.getSceneElements() as any[];
  const chartW = 420, chartH = 240;
  const originX = Math.round(centerX - chartW / 2);
  const originY = Math.round(centerY - chartH / 2);

  // Load local libraries first (from assets/libraries/*.excalidrawlib)
  const localRaw: Record<string, string> = (import.meta as any).glob
    ? (import.meta as any).glob('/src/assets/libraries/*.excalidrawlib', { as: 'raw', eager: true })
    : {};
  const localItems: any[] = Object.values(localRaw)
    .flatMap((raw: any) => {
      try {
        const parsed = JSON.parse(String(raw));
        return Array.isArray(parsed?.libraryItems) ? parsed.libraryItems : [];
      } catch {
        return [];
      }
    });

  const urls = String((import.meta as any).env?.VITE_EXCALIDRAW_CHART_LIBS || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);

  const tryLoad = async (): Promise<any[] | null> => {
    const scaleAndPlace = (els: any[]): any[] => {
      if (!els.length) return els;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const e of els) {
        const x = Number(e.x) || 0, y = Number(e.y) || 0;
        const w = Math.max(Number(e.width) || 0, 1);
        const h = Math.max(Number(e.height) || 0, 1);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      }
      const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
      const targetW = chartW - 20, targetH = chartH - 20;
      const s = Math.min(targetW / bw, targetH / bh, 1);
      const dx = originX - minX + (targetW - bw * s) / 2;
      const dy = originY - minY + (targetH - bh * s) / 2;
      return els.map((e) => {
        const x = (Number(e.x) || 0) * s + dx;
        const y = (Number(e.y) || 0) * s + dy;
        const width = (Number(e.width) || 0) * s;
        const height = (Number(e.height) || 0) * s;
        const out: any = { ...e, id: `lib-${Date.now()}-${Math.random().toString(36).slice(2)}`, x, y, width, height };
        if (typeof e.fontSize === 'number') {
          out.fontSize = e.fontSize * s;
          if (typeof e.baseline === 'number') out.baseline = Math.round(e.baseline * s);
        }
        if (Array.isArray(e.points)) {
          out.points = e.points.map((p: any) => [p[0] * s, p[1] * s]);
          if (Array.isArray(e.lastCommittedPoint)) out.lastCommittedPoint = [e.lastCommittedPoint[0] * s, e.lastCommittedPoint[1] * s];
        }
        return out;
      });
    };
    // Try local libraries and match by item name where possible
    if (localItems.length) {
      const byType = localItems.filter((it: any) => typeof it?.name === 'string' && it.name.toLowerCase().includes(type));
      const chosen = (byType.length ? byType : localItems).slice(0, 1);
      const libEls: any[] = chosen.flatMap((it: any) => (Array.isArray(it?.elements) ? it.elements : []));
      if (libEls.length) return scaleAndPlace(libEls);
    }
    // Then try remote urls (if configured)
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) continue;
        const lib = await res.json();
        const items = Array.isArray(lib?.libraryItems) ? lib.libraryItems : [];
        const candidates = items.filter((it: any) => typeof it?.name === 'string' && it.name.toLowerCase().includes(type));
        const pick = (candidates.length ? candidates : items).slice(0, 1);
        const libEls: any[] = pick.flatMap((it: any) => (Array.isArray(it?.elements) ? it.elements : []));
        if (libEls.length) return scaleAndPlace(libEls);
      } catch {
        // continue
      }
    }
    return null;
  };

  const placed = await tryLoad();
  if (placed && placed.length) {
    (api.updateScene as unknown as (sceneData: any, addToHistory?: boolean) => void)({ elements: [...base, ...placed] }, true);
    return;
  }

  // Fallback placeholders
  const uid = () => `chart-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fallback: any[] = [];
  fallback.push({ id: uid(), type: 'rectangle', x: originX, y: originY, width: chartW, height: chartH, angle: 0, strokeColor: '#64748b', backgroundColor: 'transparent', fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid', roughness: 0, opacity: 100, groupIds: [], seed: Math.floor(Math.random()*1e6), version: 1, versionNonce: Math.floor(Math.random()*1e6), isDeleted: false });
  if (type === 'bar') {
    const bars = 5; const gap = 12; const bw = Math.floor((chartW - 60 - (bars - 1) * gap) / bars);
    for (let i = 0; i < bars; i++) {
      const h = Math.floor(40 + (i * 23) % (chartH - 80));
      const x = originX + 40 + i * (bw + gap);
      const y = originY + chartH - 30 - h;
      fallback.push({ id: uid(), type: 'rectangle', x, y, width: bw, height: h, angle: 0, strokeColor: '#7c3aed', backgroundColor: '#a78bfa', fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid', roughness: 0, opacity: 90, groupIds: [], seed: Math.floor(Math.random()*1e6), version: 1, versionNonce: Math.floor(Math.random()*1e6), isDeleted: false });
    }
  } else if (type === 'line') {
    const points: [number, number][] = [];
    for (let i = 0; i < 7; i++) {
      const x = originX + 30 + Math.floor((i / 6) * (chartW - 60));
      const y = originY + 30 + Math.floor(Math.abs(Math.sin(i)) * (chartH - 60));
      points.push([x, y]);
    }
    for (let i = 1; i < points.length; i++) {
      const [x1, y1] = points[i - 1];
      const [x2, y2] = points[i];
      const dx = x2 - x1;
      const dy = y2 - y1;
      fallback.push({
        id: uid(),
        type: 'line',
        x: x1,
        y: y1,
        width: dx,
        height: dy,
        angle: 0,
        strokeColor: '#0ea5e9',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        seed: Math.floor(Math.random()*1e6),
        version: 1,
        versionNonce: Math.floor(Math.random()*1e6),
        isDeleted: false,
        points: [[0, 0], [dx, dy]],
        lastCommittedPoint: [dx, dy],
      } as any);
    }
  } else if (type === 'pie') {
    fallback.push({ id: uid(), type: 'ellipse', x: originX + 120, y: originY + 40, width: 160, height: 160, angle: 0, strokeColor: '#64748b', backgroundColor: '#e2e8f0', fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid', roughness: 0, opacity: 100, groupIds: [], seed: Math.floor(Math.random()*1e6), version: 1, versionNonce: Math.floor(Math.random()*1e6), isDeleted: false });
    fallback.push({ id: uid(), type: 'rectangle', x: originX + 200, y: originY + 100, width: 80, height: 2, angle: 0.7, strokeColor: '#ef4444', backgroundColor: '#ef4444', fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid', roughness: 0, opacity: 100, groupIds: [], seed: Math.floor(Math.random()*1e6), version: 1, versionNonce: Math.floor(Math.random()*1e6), isDeleted: false });
    fallback.push({ id: uid(), type: 'rectangle', x: originX + 200, y: originY + 120, width: 60, height: 2, angle: -0.9, strokeColor: '#10b981', backgroundColor: '#10b981', fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid', roughness: 0, opacity: 100, groupIds: [], seed: Math.floor(Math.random()*1e6), version: 1, versionNonce: Math.floor(Math.random()*1e6), isDeleted: false });
  }
  (api.updateScene as unknown as (sceneData: any, addToHistory?: boolean) => void)({ elements: [...base, ...fallback] }, true);
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
          forceNotLoading();
          registerAvailableFonts();
          // Extra failsafe to ensure no stuck loader
          setTimeout(forceNotLoading, 50);
          setTimeout(forceNotLoading, 200);
          setTimeout(forceNotLoading, 500);
        });
      },
    })
  );
}

onMounted(() => {
  mountExcalidraw();
  const onResize = () => {
    fitPageToViewport();
  };
  window.addEventListener('resize', onResize);
  // Store on window for removal in unmount closure
  (onMounted as any)._slides_onResize = onResize;
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
  const onResize = (onMounted as any)._slides_onResize as any;
  if (onResize) window.removeEventListener('resize', onResize);
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

// Toolbar commands
let lastTextSeq = 0;
watch(
  () => props.textCommand?.seq,
  (seq) => {
    if (!seq || seq === lastTextSeq) return;
    lastTextSeq = seq;
    const f = props.textCommand?.fontFamily;
    if (typeof f === 'number') applyFontFamilyToSelection(f);
  }
);

let lastChartSeq = 0;
watch(
  () => props.chartCommand?.seq,
  (seq) => {
    if (!seq || seq === lastChartSeq) return;
    lastChartSeq = seq;
    const t = props.chartCommand?.type;
    if (t) insertChart(t);
  }
);

let lastTextAdvSeq = 0;
watch(
  () => props.textAdvancedCommand?.seq,
  (seq) => {
    if (!seq || seq === lastTextAdvSeq) return;
    lastTextAdvSeq = seq;
    const name = props.textAdvancedCommand?.name || '';
    const id = mapFontNameToFamilyId(name);
    applyFontFamilyToSelection(id);
    // Also alias the slot so canvas renders with chosen face
    if (id === 3) setFontAliases({ mono: name });
    else setFontAliases({ sans: name });
  }
);
</script>
