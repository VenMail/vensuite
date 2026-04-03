/**
 * StoryTeller Block Interaction Composable
 * Manages drag-and-drop (overlay pattern: no document mutation during drag,
 * only on drag end) and resize interactions for story blocks.
 */
import { ref, computed, onBeforeUnmount } from 'vue';
import type { StoryBlockPosition, StoryBlock } from '@/types/story';
import type { StoryCanvasReturn } from '@/composables/useStoryCanvas';

// ─── Types ──────────────────────────────────────────────────────────────

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export type AlignmentDirection =
  | 'left'
  | 'center'
  | 'right'
  | 'top'
  | 'middle'
  | 'bottom';

export type DistributeDirection = 'horizontal' | 'vertical';

export interface DragState {
  isDragging: boolean;
  blockId: string | null;
  /** Mouse position in canvas space when drag started */
  startPos: { x: number; y: number };
  /** Current mouse position in canvas space */
  currentPos: { x: number; y: number };
  /** Offset from block origin to mouse at drag start */
  offset: { x: number; y: number };
  /** Original block position before drag */
  originalPosition: StoryBlockPosition | null;
}

export interface ResizeState {
  isResizing: boolean;
  blockId: string | null;
  handle: ResizeHandle | null;
  /** The block rect when resize started */
  startRect: StoryBlockPosition | null;
  /** Mouse position in canvas space when resize started */
  startPos: { x: number; y: number };
  /** Current computed rect during resize (overlay) */
  currentRect: StoryBlockPosition | null;
  /** Whether Shift is held (aspect-ratio lock) */
  shiftKey: boolean;
}

/** The overlay position shown during drag (not committed to document yet) */
export interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UseStoryBlocksOptions {
  /** Canvas composable instance for coordinate transforms and snapping */
  canvas: StoryCanvasReturn;
  /** Callback to look up a block by ID */
  getBlock: (blockId: string) => StoryBlock | undefined;
  /** Callback to commit a position change to the document (called on drag/resize end) */
  updateBlockPosition: (blockId: string, position: Partial<StoryBlockPosition>) => void;
  /** All blocks in the current scene */
  blocks: () => StoryBlock[];
}

// ─── Constants ──────────────────────────────────────────────────────────

const MIN_BLOCK_SIZE = 16;

// ─── Composable ─────────────────────────────────────────────────────────

export function useStoryBlocks(options: UseStoryBlocksOptions) {
  const { canvas, getBlock, updateBlockPosition, blocks: _blocks } = options;

  // ── Drag state ──────────────────────────────────────────────────────

  const isDragging = ref(false);
  const dragBlockId = ref<string | null>(null);
  const dragStartPos = ref({ x: 0, y: 0 });
  const dragCurrentPos = ref({ x: 0, y: 0 });
  const dragOffset = ref({ x: 0, y: 0 });
  const dragOriginalPosition = ref<StoryBlockPosition | null>(null);

  /** The overlay position rendered during drag (not yet committed) */
  const dragOverlayRect = computed<OverlayRect | null>(() => {
    if (!isDragging.value || !dragOriginalPosition.value) return null;

    const dx = dragCurrentPos.value.x - dragStartPos.value.x;
    const dy = dragCurrentPos.value.y - dragStartPos.value.y;

    let newX = dragOriginalPosition.value.x + dx;
    let newY = dragOriginalPosition.value.y + dy;

    // Apply grid snap
    const snapped = canvas.snapPositionToGrid(newX, newY);
    newX = snapped.x;
    newY = snapped.y;

    return {
      x: newX,
      y: newY,
      width: dragOriginalPosition.value.width,
      height: dragOriginalPosition.value.height,
    };
  });

  function startDrag(blockId: string, mouseEvent: MouseEvent) {
    const block = getBlock(blockId);
    if (!block || block.locked) return;

    const canvasPos = canvas.screenToCanvas(mouseEvent.clientX, mouseEvent.clientY);

    isDragging.value = true;
    dragBlockId.value = blockId;
    dragStartPos.value = { x: canvasPos.x, y: canvasPos.y };
    dragCurrentPos.value = { x: canvasPos.x, y: canvasPos.y };
    dragOffset.value = {
      x: canvasPos.x - block.position.x,
      y: canvasPos.y - block.position.y,
    };
    dragOriginalPosition.value = { ...block.position };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  }

  function updateDrag(mouseEvent: MouseEvent) {
    if (!isDragging.value || !dragBlockId.value || !dragOriginalPosition.value) return;

    const canvasPos = canvas.screenToCanvas(mouseEvent.clientX, mouseEvent.clientY);
    dragCurrentPos.value = { x: canvasPos.x, y: canvasPos.y };

    // Detect smart guides using the overlay rect
    if (dragOverlayRect.value) {
      const overlay = dragOverlayRect.value;
      const result = canvas.detectSmartGuides(
        [dragBlockId.value],
        overlay.x,
        overlay.y,
        overlay.width,
        overlay.height,
      );

      // If smart guides produced a snapped position, adjust current pos
      // so the computed overlay matches the snapped result
      if (result.snappedX !== overlay.x || result.snappedY !== overlay.y) {
        const adjustX = result.snappedX - dragOriginalPosition.value.x;
        const adjustY = result.snappedY - dragOriginalPosition.value.y;
        // Re-derive the snapped grid position through currentPos
        dragCurrentPos.value = {
          x: dragStartPos.value.x + adjustX,
          y: dragStartPos.value.y + adjustY,
        };
      }
    }
  }

  function endDrag() {
    if (!isDragging.value || !dragBlockId.value) return;

    // Commit final position to the document
    const overlay = dragOverlayRect.value;
    if (overlay && dragBlockId.value) {
      updateBlockPosition(dragBlockId.value, {
        x: overlay.x,
        y: overlay.y,
      });
    }

    // Clean up
    isDragging.value = false;
    dragBlockId.value = null;
    dragOriginalPosition.value = null;
    canvas.clearSmartGuides();

    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
  }

  function handleDragMove(e: MouseEvent) {
    updateDrag(e);
  }

  function handleDragEnd(_e: MouseEvent) {
    endDrag();
  }

  // ── Resize state ────────────────────────────────────────────────────

  const isResizing = ref(false);
  const resizeBlockId = ref<string | null>(null);
  const resizeHandle = ref<ResizeHandle | null>(null);
  const resizeStartRect = ref<StoryBlockPosition | null>(null);
  const resizeStartPos = ref({ x: 0, y: 0 });
  const resizeShiftKey = ref(false);

  /** The overlay rect rendered during resize (not yet committed) */
  const resizeOverlayRect = ref<StoryBlockPosition | null>(null);

  function startResize(blockId: string, handle: ResizeHandle, mouseEvent: MouseEvent) {
    const block = getBlock(blockId);
    if (!block || block.locked) return;

    const canvasPos = canvas.screenToCanvas(mouseEvent.clientX, mouseEvent.clientY);

    isResizing.value = true;
    resizeBlockId.value = blockId;
    resizeHandle.value = handle;
    resizeStartRect.value = { ...block.position };
    resizeStartPos.value = { x: canvasPos.x, y: canvasPos.y };
    resizeShiftKey.value = mouseEvent.shiftKey;
    resizeOverlayRect.value = { ...block.position };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  }

  function updateResize(mouseEvent: MouseEvent) {
    if (!isResizing.value || !resizeStartRect.value || !resizeHandle.value) return;

    const canvasPos = canvas.screenToCanvas(mouseEvent.clientX, mouseEvent.clientY);
    resizeShiftKey.value = mouseEvent.shiftKey;

    const dx = canvasPos.x - resizeStartPos.value.x;
    const dy = canvasPos.y - resizeStartPos.value.y;
    const start = resizeStartRect.value;
    const h = resizeHandle.value;

    let newX = start.x;
    let newY = start.y;
    let newW = start.width;
    let newH = start.height;

    // Compute new rect based on which handle is being dragged
    if (h.includes('e')) {
      newW = Math.max(MIN_BLOCK_SIZE, start.width + dx);
    }
    if (h.includes('w')) {
      const proposedW = start.width - dx;
      if (proposedW >= MIN_BLOCK_SIZE) {
        newW = proposedW;
        newX = start.x + dx;
      }
    }
    if (h.includes('s')) {
      newH = Math.max(MIN_BLOCK_SIZE, start.height + dy);
    }
    if (h.includes('n')) {
      const proposedH = start.height - dy;
      if (proposedH >= MIN_BLOCK_SIZE) {
        newH = proposedH;
        newY = start.y + dy;
      }
    }

    // Aspect ratio lock when Shift is held
    if (resizeShiftKey.value && start.width > 0 && start.height > 0) {
      const aspectRatio = start.width / start.height;

      if (h === 'n' || h === 's') {
        // Vertical-only handle: adjust width from height
        newW = newH * aspectRatio;
      } else if (h === 'e' || h === 'w') {
        // Horizontal-only handle: adjust height from width
        newH = newW / aspectRatio;
      } else {
        // Corner handles: use the larger dimension change
        const widthDriven = Math.abs(newW - start.width);
        const heightDriven = Math.abs(newH - start.height) * aspectRatio;

        if (widthDriven >= heightDriven) {
          newH = newW / aspectRatio;
          if (h.includes('n')) {
            newY = start.y + start.height - newH;
          }
        } else {
          newW = newH * aspectRatio;
          if (h.includes('w')) {
            newX = start.x + start.width - newW;
          }
        }
      }
    }

    // Snap to grid
    const snappedPos = canvas.snapPositionToGrid(newX, newY);
    newX = snappedPos.x;
    newY = snappedPos.y;

    // Also snap the far edges
    const snappedFarX = canvas.snapToGrid(newX + newW);
    const snappedFarY = canvas.snapToGrid(newY + newH);
    newW = Math.max(MIN_BLOCK_SIZE, snappedFarX - newX);
    newH = Math.max(MIN_BLOCK_SIZE, snappedFarY - newY);

    resizeOverlayRect.value = {
      x: newX,
      y: newY,
      width: newW,
      height: newH,
      rotation: start.rotation,
      zIndex: start.zIndex,
    };
  }

  function endResize() {
    if (!isResizing.value || !resizeBlockId.value || !resizeOverlayRect.value) return;

    // Commit final rect to the document
    updateBlockPosition(resizeBlockId.value, {
      x: resizeOverlayRect.value.x,
      y: resizeOverlayRect.value.y,
      width: resizeOverlayRect.value.width,
      height: resizeOverlayRect.value.height,
    });

    // Clean up
    isResizing.value = false;
    resizeBlockId.value = null;
    resizeHandle.value = null;
    resizeStartRect.value = null;
    resizeOverlayRect.value = null;

    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
  }

  function handleResizeMove(e: MouseEvent) {
    updateResize(e);
  }

  function handleResizeEnd(_e: MouseEvent) {
    endResize();
  }

  // ── Alignment helpers ───────────────────────────────────────────────

  /**
   * Align the given blocks along the specified axis.
   * Commits position changes immediately.
   */
  function alignBlocks(blockIds: string[], alignment: AlignmentDirection) {
    if (blockIds.length < 2) return;

    const targetBlocks = blockIds
      .map(id => getBlock(id))
      .filter((b): b is StoryBlock => b !== undefined);

    if (targetBlocks.length < 2) return;

    // Compute bounding box of all selected blocks
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const b of targetBlocks) {
      minX = Math.min(minX, b.position.x);
      minY = Math.min(minY, b.position.y);
      maxX = Math.max(maxX, b.position.x + b.position.width);
      maxY = Math.max(maxY, b.position.y + b.position.height);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    for (const block of targetBlocks) {
      let newX = block.position.x;
      let newY = block.position.y;

      switch (alignment) {
        case 'left':
          newX = minX;
          break;
        case 'center':
          newX = centerX - block.position.width / 2;
          break;
        case 'right':
          newX = maxX - block.position.width;
          break;
        case 'top':
          newY = minY;
          break;
        case 'middle':
          newY = centerY - block.position.height / 2;
          break;
        case 'bottom':
          newY = maxY - block.position.height;
          break;
      }

      if (newX !== block.position.x || newY !== block.position.y) {
        updateBlockPosition(block.id, { x: newX, y: newY });
      }
    }
  }

  /**
   * Distribute blocks evenly along the given axis.
   * Commits position changes immediately.
   */
  function distributeBlocks(blockIds: string[], direction: DistributeDirection) {
    if (blockIds.length < 3) return;

    const targetBlocks = blockIds
      .map(id => getBlock(id))
      .filter((b): b is StoryBlock => b !== undefined);

    if (targetBlocks.length < 3) return;

    if (direction === 'horizontal') {
      // Sort by x position
      const sorted = [...targetBlocks].sort((a, b) => a.position.x - b.position.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      // Total width occupied by blocks (excluding spacing)
      const totalBlockWidth = sorted.reduce((sum, b) => sum + b.position.width, 0);
      const totalSpan = (last.position.x + last.position.width) - first.position.x;
      const totalGap = totalSpan - totalBlockWidth;
      const gapSize = totalGap / (sorted.length - 1);

      let currentX = first.position.x + first.position.width + gapSize;
      for (let i = 1; i < sorted.length - 1; i++) {
        updateBlockPosition(sorted[i].id, { x: currentX });
        currentX += sorted[i].position.width + gapSize;
      }
    } else {
      // Sort by y position
      const sorted = [...targetBlocks].sort((a, b) => a.position.y - b.position.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const totalBlockHeight = sorted.reduce((sum, b) => sum + b.position.height, 0);
      const totalSpan = (last.position.y + last.position.height) - first.position.y;
      const totalGap = totalSpan - totalBlockHeight;
      const gapSize = totalGap / (sorted.length - 1);

      let currentY = first.position.y + first.position.height + gapSize;
      for (let i = 1; i < sorted.length - 1; i++) {
        updateBlockPosition(sorted[i].id, { y: currentY });
        currentY += sorted[i].position.height + gapSize;
      }
    }
  }

  // ── Utility: get the current overlay rect for a block ───────────────

  /**
   * Returns the overlay rect if the block is currently being dragged or resized,
   * otherwise returns null. Useful for rendering the block in its "preview" position.
   */
  function getBlockOverlayRect(blockId: string): OverlayRect | null {
    if (isDragging.value && dragBlockId.value === blockId && dragOverlayRect.value) {
      return dragOverlayRect.value;
    }
    if (isResizing.value && resizeBlockId.value === blockId && resizeOverlayRect.value) {
      return {
        x: resizeOverlayRect.value.x,
        y: resizeOverlayRect.value.y,
        width: resizeOverlayRect.value.width,
        height: resizeOverlayRect.value.height,
      };
    }
    return null;
  }

  /** Whether any interaction is in progress */
  const isInteracting = computed(() => isDragging.value || isResizing.value);

  // ── Cleanup on unmount ──────────────────────────────────────────────

  onBeforeUnmount(() => {
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
  });

  return {
    // Drag
    isDragging,
    dragBlockId,
    dragStartPos,
    dragCurrentPos,
    dragOffset,
    dragOverlayRect,
    startDrag,
    updateDrag,
    endDrag,

    // Resize
    isResizing,
    resizeBlockId,
    resizeHandle,
    resizeStartRect,
    resizeOverlayRect,
    startResize,
    updateResize,
    endResize,

    // Alignment
    alignBlocks,
    distributeBlocks,

    // Utilities
    getBlockOverlayRect,
    isInteracting,
  };
}

export type StoryBlocksReturn = ReturnType<typeof useStoryBlocks>;
