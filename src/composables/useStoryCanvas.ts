/**
 * StoryTeller Canvas Viewport Composable
 * Manages zoom, pan, grid, snap, smart guides, and coordinate transforms
 * for the DOM-based freeform canvas editor.
 */
import { ref, computed, reactive, onMounted, onBeforeUnmount, type Ref } from 'vue';
import type { StorySettings, StoryBlock } from '@/types/story';

// ─── Types ──────────────────────────────────────────────────────────────

export interface CanvasViewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface GridConfig {
  enabled: boolean;
  size: number;
  visible: boolean;
  snapEnabled: boolean;
  color: string;
  opacity: number;
}

export interface SmartGuide {
  orientation: 'horizontal' | 'vertical';
  position: number; // canvas-space coordinate
  sourceBlockId: string;
  targetBlockId: string;
  type: 'edge' | 'center';
}

export interface CanvasCoord {
  x: number;
  y: number;
}

export interface UseStoryCanvasOptions {
  /** Ref to the outer container element that receives wheel/pan events */
  containerRef: Ref<HTMLElement | null>;
  /** Ref to the inner canvas element that gets the CSS transform */
  canvasRef: Ref<HTMLElement | null>;
  /** Document settings providing canvasWidth / canvasHeight */
  settings: Ref<StorySettings>;
  /** All blocks in the current scene, used for smart guide detection */
  blocks: Ref<StoryBlock[]>;
}

// ─── Constants ──────────────────────────────────────────────────────────

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5.0;
const ZOOM_STEP = 0.1;
const ZOOM_WHEEL_FACTOR = 0.001;
const SMART_GUIDE_THRESHOLD = 5; // px in canvas space
const DEFAULT_GRID_SIZE = 16;

// ─── Composable ─────────────────────────────────────────────────────────

export function useStoryCanvas(options: UseStoryCanvasOptions) {
  const { containerRef, settings, blocks } = options;

  // ── Viewport state ──────────────────────────────────────────────────

  const zoom = ref(1);
  const panX = ref(0);
  const panY = ref(0);

  const viewport = computed<CanvasViewport>(() => ({
    zoom: zoom.value,
    panX: panX.value,
    panY: panY.value,
  }));

  // ── Grid state ──────────────────────────────────────────────────────

  const grid = reactive<GridConfig>({
    enabled: true,
    size: DEFAULT_GRID_SIZE,
    visible: true,
    snapEnabled: true,
    color: '#e5e7eb',
    opacity: 0.5,
  });

  // ── Smart guides ────────────────────────────────────────────────────

  const activeGuides = ref<SmartGuide[]>([]);

  // ── Canvas dimensions ───────────────────────────────────────────────

  const canvasWidth = computed(() => settings.value.canvasWidth ?? 1920);
  const canvasHeight = computed(() => settings.value.canvasHeight ?? 1080);

  // ── CSS transform string for the canvas element ─────────────────────

  const canvasTransform = computed(() =>
    `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`
  );

  const canvasTransformOrigin = computed(() => '0 0');

  // ── Coordinate transforms ───────────────────────────────────────────

  /**
   * Convert screen (viewport/client) coordinates to canvas-space coordinates,
   * accounting for the container offset, pan, and zoom.
   */
  function screenToCanvas(screenX: number, screenY: number): CanvasCoord {
    const container = containerRef.value;
    if (!container) return { x: screenX, y: screenY };

    const rect = container.getBoundingClientRect();
    const relX = screenX - rect.left;
    const relY = screenY - rect.top;

    return {
      x: (relX - panX.value) / zoom.value,
      y: (relY - panY.value) / zoom.value,
    };
  }

  /**
   * Convert canvas-space coordinates to screen (viewport/client) coordinates.
   */
  function canvasToScreen(canvasX: number, canvasY: number): CanvasCoord {
    const container = containerRef.value;
    if (!container) return { x: canvasX, y: canvasY };

    const rect = container.getBoundingClientRect();
    return {
      x: canvasX * zoom.value + panX.value + rect.left,
      y: canvasY * zoom.value + panY.value + rect.top,
    };
  }

  // ── Snap to grid ────────────────────────────────────────────────────

  /** Snap a single value to the nearest grid line. */
  function snapToGrid(value: number): number {
    if (!grid.enabled || !grid.snapEnabled) return value;
    return Math.round(value / grid.size) * grid.size;
  }

  /** Snap a position (x, y) to the grid. */
  function snapPositionToGrid(x: number, y: number): CanvasCoord {
    return {
      x: snapToGrid(x),
      y: snapToGrid(y),
    };
  }

  // ── Grid config helpers ─────────────────────────────────────────────

  function setGridSize(size: number) {
    grid.size = Math.max(4, Math.min(256, size));
  }

  function toggleGrid() {
    grid.visible = !grid.visible;
  }

  function toggleSnap() {
    grid.snapEnabled = !grid.snapEnabled;
  }

  // ── Zoom operations ─────────────────────────────────────────────────

  function clampZoom(z: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  }

  /** Zoom to a specific level, keeping the given screen point stationary. */
  function zoomTo(newZoom: number, pivotScreenX?: number, pivotScreenY?: number) {
    const clamped = clampZoom(newZoom);
    if (clamped === zoom.value) return;

    if (pivotScreenX !== undefined && pivotScreenY !== undefined) {
      const container = containerRef.value;
      if (container) {
        const rect = container.getBoundingClientRect();
        const relX = pivotScreenX - rect.left;
        const relY = pivotScreenY - rect.top;

        // Keep the canvas point under the cursor stationary:
        // canvasPoint = (relX - panX) / oldZoom
        // After zoom: relX - newPanX = canvasPoint * newZoom
        // => newPanX = relX - canvasPoint * newZoom
        const canvasPointX = (relX - panX.value) / zoom.value;
        const canvasPointY = (relY - panY.value) / zoom.value;
        panX.value = relX - canvasPointX * clamped;
        panY.value = relY - canvasPointY * clamped;
      }
    }

    zoom.value = clamped;
  }

  function zoomIn() {
    const container = containerRef.value;
    const cx = container ? container.clientWidth / 2 : undefined;
    const cy = container ? container.clientHeight / 2 : undefined;
    const pivotX = cx !== undefined && container ? cx + container.getBoundingClientRect().left : undefined;
    const pivotY = cy !== undefined && container ? cy + container.getBoundingClientRect().top : undefined;
    zoomTo(zoom.value + ZOOM_STEP, pivotX, pivotY);
  }

  function zoomOut() {
    const container = containerRef.value;
    const cx = container ? container.clientWidth / 2 : undefined;
    const cy = container ? container.clientHeight / 2 : undefined;
    const pivotX = cx !== undefined && container ? cx + container.getBoundingClientRect().left : undefined;
    const pivotY = cy !== undefined && container ? cy + container.getBoundingClientRect().top : undefined;
    zoomTo(zoom.value - ZOOM_STEP, pivotX, pivotY);
  }

  function zoomToFit() {
    const container = containerRef.value;
    if (!container) return;

    const padding = 48;
    const availW = container.clientWidth - padding * 2;
    const availH = container.clientHeight - padding * 2;
    const fitZoom = clampZoom(Math.min(availW / canvasWidth.value, availH / canvasHeight.value));

    zoom.value = fitZoom;
    panX.value = (container.clientWidth - canvasWidth.value * fitZoom) / 2;
    panY.value = (container.clientHeight - canvasHeight.value * fitZoom) / 2;
  }

  function resetZoom() {
    const container = containerRef.value;
    if (!container) {
      zoom.value = 1;
      panX.value = 0;
      panY.value = 0;
      return;
    }
    zoom.value = 1;
    panX.value = (container.clientWidth - canvasWidth.value) / 2;
    panY.value = (container.clientHeight - canvasHeight.value) / 2;
  }

  const zoomPercent = computed(() => Math.round(zoom.value * 100));

  // ── Pan state & logic ───────────────────────────────────────────────

  const isPanning = ref(false);
  const isSpaceHeld = ref(false);
  let panStartX = 0;
  let panStartY = 0;
  let panStartPanX = 0;
  let panStartPanY = 0;

  function startPan(screenX: number, screenY: number) {
    isPanning.value = true;
    panStartX = screenX;
    panStartY = screenY;
    panStartPanX = panX.value;
    panStartPanY = panY.value;
  }

  function updatePan(screenX: number, screenY: number) {
    if (!isPanning.value) return;
    panX.value = panStartPanX + (screenX - panStartX);
    panY.value = panStartPanY + (screenY - panStartY);
  }

  function endPan() {
    isPanning.value = false;
  }

  // ── Smart guides ────────────────────────────────────────────────────

  /**
   * Detect alignment guides between the moving block(s) and all other blocks.
   * Returns guides and optionally snapped coordinates.
   */
  function detectSmartGuides(
    movingBlockIds: string[],
    proposedX: number,
    proposedY: number,
    proposedWidth: number,
    proposedHeight: number,
  ): { guides: SmartGuide[]; snappedX: number; snappedY: number } {
    const guides: SmartGuide[] = [];
    let snappedX = proposedX;
    let snappedY = proposedY;

    const movingCenterX = proposedX + proposedWidth / 2;
    const movingCenterY = proposedY + proposedHeight / 2;
    const movingRight = proposedX + proposedWidth;
    const movingBottom = proposedY + proposedHeight;

    let closestDx = SMART_GUIDE_THRESHOLD + 1;
    let closestDy = SMART_GUIDE_THRESHOLD + 1;

    const otherBlocks = blocks.value.filter(b => !movingBlockIds.includes(b.id));

    for (const other of otherBlocks) {
      const op = other.position;
      const otherCenterX = op.x + op.width / 2;
      const otherCenterY = op.y + op.height / 2;
      const otherRight = op.x + op.width;
      const otherBottom = op.y + op.height;

      // Vertical guide candidates (x-axis alignment)
      const vCandidates: Array<{ moving: number; target: number; type: 'edge' | 'center' }> = [
        { moving: proposedX, target: op.x, type: 'edge' },
        { moving: proposedX, target: otherRight, type: 'edge' },
        { moving: movingRight, target: op.x, type: 'edge' },
        { moving: movingRight, target: otherRight, type: 'edge' },
        { moving: movingCenterX, target: otherCenterX, type: 'center' },
      ];

      for (const vc of vCandidates) {
        const d = Math.abs(vc.moving - vc.target);
        if (d <= SMART_GUIDE_THRESHOLD && d < closestDx) {
          closestDx = d;
          // Adjust snappedX so the moving edge/center aligns with target
          snappedX = proposedX + (vc.target - vc.moving);
          // We'll build the guide after the loop with the snapped value
        }
      }

      // Horizontal guide candidates (y-axis alignment)
      const hCandidates: Array<{ moving: number; target: number; type: 'edge' | 'center' }> = [
        { moving: proposedY, target: op.y, type: 'edge' },
        { moving: proposedY, target: otherBottom, type: 'edge' },
        { moving: movingBottom, target: op.y, type: 'edge' },
        { moving: movingBottom, target: otherBottom, type: 'edge' },
        { moving: movingCenterY, target: otherCenterY, type: 'center' },
      ];

      for (const hc of hCandidates) {
        const d = Math.abs(hc.moving - hc.target);
        if (d <= SMART_GUIDE_THRESHOLD && d < closestDy) {
          closestDy = d;
          snappedY = proposedY + (hc.target - hc.moving);
        }
      }
    }

    // Build final guide lines from snapped position
    const finalCenterX = snappedX + proposedWidth / 2;
    const finalCenterY = snappedY + proposedHeight / 2;
    const finalRight = snappedX + proposedWidth;
    const finalBottom = snappedY + proposedHeight;

    for (const other of otherBlocks) {
      const op = other.position;
      const otherCenterX = op.x + op.width / 2;
      const otherCenterY = op.y + op.height / 2;
      const otherRight = op.x + op.width;
      const otherBottom = op.y + op.height;

      // Check vertical guides on snapped position
      const verticalPositions = [
        { val: snappedX, type: 'edge' as const },
        { val: finalRight, type: 'edge' as const },
        { val: finalCenterX, type: 'center' as const },
      ];
      const targetVerticals = [
        { val: op.x, type: 'edge' as const },
        { val: otherRight, type: 'edge' as const },
        { val: otherCenterX, type: 'center' as const },
      ];

      for (const mv of verticalPositions) {
        for (const tv of targetVerticals) {
          if (Math.abs(mv.val - tv.val) < 1) {
            guides.push({
              orientation: 'vertical',
              position: tv.val,
              sourceBlockId: movingBlockIds[0],
              targetBlockId: other.id,
              type: mv.type === 'center' && tv.type === 'center' ? 'center' : 'edge',
            });
          }
        }
      }

      // Check horizontal guides on snapped position
      const horizontalPositions = [
        { val: snappedY, type: 'edge' as const },
        { val: finalBottom, type: 'edge' as const },
        { val: finalCenterY, type: 'center' as const },
      ];
      const targetHorizontals = [
        { val: op.y, type: 'edge' as const },
        { val: otherBottom, type: 'edge' as const },
        { val: otherCenterY, type: 'center' as const },
      ];

      for (const mh of horizontalPositions) {
        for (const th of targetHorizontals) {
          if (Math.abs(mh.val - th.val) < 1) {
            guides.push({
              orientation: 'horizontal',
              position: th.val,
              sourceBlockId: movingBlockIds[0],
              targetBlockId: other.id,
              type: mh.type === 'center' && th.type === 'center' ? 'center' : 'edge',
            });
          }
        }
      }
    }

    // Deduplicate guides by orientation + position
    const seen = new Set<string>();
    const uniqueGuides = guides.filter(g => {
      const key = `${g.orientation}:${Math.round(g.position)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    activeGuides.value = uniqueGuides;
    return { guides: uniqueGuides, snappedX, snappedY };
  }

  function clearSmartGuides() {
    activeGuides.value = [];
  }

  // ── Event handlers (mounted to container) ───────────────────────────

  function handleWheel(e: WheelEvent) {
    // Ctrl+scroll = zoom, plain scroll = vertical pan, shift+scroll = horizontal pan
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * ZOOM_WHEEL_FACTOR;
      zoomTo(zoom.value + delta * zoom.value, e.clientX, e.clientY);
    } else if (e.shiftKey) {
      e.preventDefault();
      panX.value -= e.deltaY;
    } else {
      // Allow natural scroll for pan
      e.preventDefault();
      panX.value -= e.deltaX;
      panY.value -= e.deltaY;
    }
  }

  function handleMouseDown(e: MouseEvent) {
    // Middle-click drag to pan
    if (e.button === 1) {
      e.preventDefault();
      startPan(e.clientX, e.clientY);
      return;
    }

    // Space+left-click drag to pan
    if (e.button === 0 && isSpaceHeld.value) {
      e.preventDefault();
      startPan(e.clientX, e.clientY);
      return;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (isPanning.value) {
      updatePan(e.clientX, e.clientY);
    }
  }

  function handleMouseUp(_e: MouseEvent) {
    if (isPanning.value) {
      endPan();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space' && !isSpaceHeld.value) {
      // Only capture space for pan if no input is focused
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      e.preventDefault();
      isSpaceHeld.value = true;
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') {
      isSpaceHeld.value = false;
      if (isPanning.value) endPan();
    }
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  function attachListeners() {
    const container = containerRef.value;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  }

  function detachListeners() {
    const container = containerRef.value;
    if (container) {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
    }
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  }

  onMounted(() => {
    attachListeners();
    zoomToFit();
  });

  onBeforeUnmount(() => {
    detachListeners();
  });

  // ── Grid background style (for the container) ──────────────────────

  const gridBackgroundStyle = computed(() => {
    if (!grid.visible || !grid.enabled) return {};

    const scaledSize = grid.size * zoom.value;
    const offsetX = panX.value % scaledSize;
    const offsetY = panY.value % scaledSize;

    return {
      backgroundImage:
        `linear-gradient(to right, ${grid.color} 1px, transparent 1px), ` +
        `linear-gradient(to bottom, ${grid.color} 1px, transparent 1px)`,
      backgroundSize: `${scaledSize}px ${scaledSize}px`,
      backgroundPosition: `${offsetX}px ${offsetY}px`,
      opacity: grid.opacity,
    };
  });

  // ── Cursor style ────────────────────────────────────────────────────

  const cursorStyle = computed(() => {
    if (isPanning.value) return 'grabbing';
    if (isSpaceHeld.value) return 'grab';
    return 'default';
  });

  return {
    // Viewport
    zoom,
    panX,
    panY,
    viewport,
    zoomPercent,
    isPanning,
    isSpaceHeld,

    // Canvas dimensions
    canvasWidth,
    canvasHeight,
    canvasTransform,
    canvasTransformOrigin,

    // Coordinate transforms
    screenToCanvas,
    canvasToScreen,

    // Zoom controls
    zoomTo,
    zoomIn,
    zoomOut,
    zoomToFit,
    resetZoom,

    // Grid
    grid,
    setGridSize,
    toggleGrid,
    toggleSnap,
    snapToGrid,
    snapPositionToGrid,
    gridBackgroundStyle,

    // Smart guides
    activeGuides,
    detectSmartGuides,
    clearSmartGuides,

    // Cursor
    cursorStyle,

    // Manual pan (if needed externally)
    startPan,
    updatePan,
    endPan,

    // Re-attach after dynamic mount
    attachListeners,
    detachListeners,
  };
}

export type StoryCanvasReturn = ReturnType<typeof useStoryCanvas>;
