/**
 * Core StoryTeller editor composable
 * Manages document state, scene/block CRUD, selection, and snapshot undo/redo
 */
import { ref, computed, type Ref } from 'vue';
import {
  type StoryDocument,
  type StoryScene,
  type StoryBlock,
  type StoryBlockType,
  type StoryBlockContent,
  type StoryBlockPosition,
  type StoryBlockStyle,
  type StoryLayoutMode,
  type StoryAnimation,
  type StoryAnimationPresetName,
  createDefaultDocument,
  createDefaultScene,
  createDefaultBlock,
} from '@/types/story';

export interface UseStoryEditorOptions {
  initialDocument?: StoryDocument;
  onDocumentChange?: () => void;
}

export function useStoryEditor(options: UseStoryEditorOptions = {}) {
  const { onDocumentChange } = options;

  // ─── Core State ──────────────────────────────────────────────────
  const document = ref<StoryDocument>(
    options.initialDocument || createDefaultDocument()
  );
  const currentSceneIndex = ref(0);
  const selectedBlockIds = ref<Set<string>>(new Set());
  const clipboard = ref<StoryBlock[]>([]);
  const mode = ref<'edit' | 'preview'>('edit');

  // ─── Undo/Redo (Snapshot-based) ──────────────────────────────────
  const history = ref<string[]>([]);
  const historyIndex = ref(-1);
  const maxHistorySize = 50;

  function pushSnapshot() {
    const snapshot = JSON.stringify(document.value);
    // Trim future states if we're in the middle of history
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1);
    }
    history.value.push(snapshot);
    if (history.value.length > maxHistorySize) {
      history.value.shift();
    }
    historyIndex.value = history.value.length - 1;
  }

  function notifyChange() {
    pushSnapshot();
    onDocumentChange?.();
  }

  function undo() {
    if (historyIndex.value <= 0) return;
    historyIndex.value--;
    document.value = JSON.parse(history.value[historyIndex.value]);
  }

  function redo() {
    if (historyIndex.value >= history.value.length - 1) return;
    historyIndex.value++;
    document.value = JSON.parse(history.value[historyIndex.value]);
  }

  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => historyIndex.value < history.value.length - 1);

  // Initialize first snapshot
  pushSnapshot();

  // ─── Computed ────────────────────────────────────────────────────
  const currentScene = computed(() => document.value.scenes[currentSceneIndex.value]);
  const scenes = computed(() => document.value.scenes);
  const totalScenes = computed(() => document.value.scenes.length);

  const selectedBlocks = computed(() => {
    if (!currentScene.value) return [];
    return currentScene.value.blocks.filter(b => selectedBlockIds.value.has(b.id));
  });

  const hasSelection = computed(() => selectedBlockIds.value.size > 0);

  // ─── Scene Operations ────────────────────────────────────────────
  function selectScene(index: number) {
    if (index >= 0 && index < document.value.scenes.length) {
      currentSceneIndex.value = index;
      deselectAll();
    }
  }

  function addScene(name?: string): StoryScene {
    const scene = createDefaultScene(name || `Scene ${document.value.scenes.length + 1}`);
    document.value.scenes.push(scene);
    currentSceneIndex.value = document.value.scenes.length - 1;
    notifyChange();
    return scene;
  }

  function duplicateScene(index: number): StoryScene | null {
    if (index < 0 || index >= document.value.scenes.length) return null;
    const original = document.value.scenes[index];
    const duplicate: StoryScene = JSON.parse(JSON.stringify(original));
    duplicate.id = crypto.randomUUID();
    duplicate.name = `${original.name} (Copy)`;
    // Generate new IDs for all blocks
    duplicate.blocks.forEach(block => {
      block.id = crypto.randomUUID();
    });
    document.value.scenes.splice(index + 1, 0, duplicate);
    currentSceneIndex.value = index + 1;
    notifyChange();
    return duplicate;
  }

  function deleteScene(index: number): boolean {
    if (document.value.scenes.length <= 1) return false;
    if (index < 0 || index >= document.value.scenes.length) return false;
    document.value.scenes.splice(index, 1);
    if (currentSceneIndex.value >= document.value.scenes.length) {
      currentSceneIndex.value = document.value.scenes.length - 1;
    }
    deselectAll();
    notifyChange();
    return true;
  }

  function moveScene(fromIndex: number, toIndex: number): boolean {
    if (fromIndex < 0 || fromIndex >= document.value.scenes.length) return false;
    if (toIndex < 0 || toIndex >= document.value.scenes.length) return false;
    const [scene] = document.value.scenes.splice(fromIndex, 1);
    document.value.scenes.splice(toIndex, 0, scene);
    currentSceneIndex.value = toIndex;
    notifyChange();
    return true;
  }

  function updateSceneLayout(index: number, layout: StoryLayoutMode) {
    if (index < 0 || index >= document.value.scenes.length) return;
    document.value.scenes[index].layout = layout;
    notifyChange();
  }

  function updateSceneBackground(index: number, background: Partial<StoryScene['background']>) {
    if (index < 0 || index >= document.value.scenes.length) return;
    Object.assign(document.value.scenes[index].background, background);
    notifyChange();
  }

  // ─── Block Operations ────────────────────────────────────────────
  function addBlock(type: StoryBlockType, partial?: Partial<StoryBlock>): StoryBlock | null {
    if (!currentScene.value) return null;
    const block = createDefaultBlock(type, partial);

    // Auto-position: place below last block in auto-stack, or center in freeform
    if (currentScene.value.layout === 'auto-stack') {
      const lastBlock = currentScene.value.blocks[currentScene.value.blocks.length - 1];
      if (lastBlock) {
        block.position.y = lastBlock.position.y + lastBlock.position.height + 24;
        block.position.x = lastBlock.position.x;
      } else {
        block.position.x = (document.value.settings.canvasWidth - block.position.width) / 2;
        block.position.y = document.value.settings.canvasHeight * 0.1;
      }
    } else {
      // Freeform: center on canvas
      block.position.x = (document.value.settings.canvasWidth - block.position.width) / 2;
      block.position.y = (document.value.settings.canvasHeight - block.position.height) / 2;
    }

    // Set zIndex to top
    const maxZ = currentScene.value.blocks.reduce((max, b) => Math.max(max, b.position.zIndex || 0), 0);
    block.position.zIndex = maxZ + 1;

    currentScene.value.blocks.push(block);
    selectBlock(block.id);
    notifyChange();
    return block;
  }

  function deleteBlock(blockId: string): boolean {
    if (!currentScene.value) return false;
    const index = currentScene.value.blocks.findIndex(b => b.id === blockId);
    if (index === -1) return false;
    currentScene.value.blocks.splice(index, 1);
    selectedBlockIds.value.delete(blockId);
    notifyChange();
    return true;
  }

  function deleteSelectedBlocks(): boolean {
    if (!currentScene.value || selectedBlockIds.value.size === 0) return false;
    const ids = new Set(selectedBlockIds.value);
    currentScene.value.blocks = currentScene.value.blocks.filter(b => !ids.has(b.id));
    selectedBlockIds.value.clear();
    notifyChange();
    return true;
  }

  function duplicateBlock(blockId: string): StoryBlock | null {
    if (!currentScene.value) return null;
    const original = currentScene.value.blocks.find(b => b.id === blockId);
    if (!original) return null;
    const duplicate: StoryBlock = JSON.parse(JSON.stringify(original));
    duplicate.id = crypto.randomUUID();
    duplicate.position.x += 20;
    duplicate.position.y += 20;
    duplicate.position.zIndex = (duplicate.position.zIndex || 0) + 1;
    currentScene.value.blocks.push(duplicate);
    selectBlock(duplicate.id);
    notifyChange();
    return duplicate;
  }

  function updateBlockPosition(blockId: string, position: Partial<StoryBlockPosition>) {
    if (!currentScene.value) return;
    const block = currentScene.value.blocks.find(b => b.id === blockId);
    if (!block) return;
    Object.assign(block.position, position);
    notifyChange();
  }

  function updateBlockStyle(blockId: string, style: Partial<StoryBlockStyle>) {
    if (!currentScene.value) return;
    const block = currentScene.value.blocks.find(b => b.id === blockId);
    if (!block) return;
    Object.assign(block.style, style);
    notifyChange();
  }

  function updateBlockContent(blockId: string, content: Partial<StoryBlockContent>) {
    if (!currentScene.value) return;
    const block = currentScene.value.blocks.find(b => b.id === blockId);
    if (!block) return;
    Object.assign(block.content, content);
    notifyChange();
  }

  function moveBlockInStack(blockId: string, direction: 'up' | 'down') {
    if (!currentScene.value) return;
    const index = currentScene.value.blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentScene.value.blocks.length) return;
    const [block] = currentScene.value.blocks.splice(index, 1);
    currentScene.value.blocks.splice(targetIndex, 0, block);
    notifyChange();
  }

  function bringToFront(blockId: string) {
    if (!currentScene.value) return;
    const block = currentScene.value.blocks.find(b => b.id === blockId);
    if (!block) return;
    const maxZ = currentScene.value.blocks.reduce((max, b) => Math.max(max, b.position.zIndex || 0), 0);
    block.position.zIndex = maxZ + 1;
    notifyChange();
  }

  function sendToBack(blockId: string) {
    if (!currentScene.value) return;
    const block = currentScene.value.blocks.find(b => b.id === blockId);
    if (!block) return;
    const minZ = currentScene.value.blocks.reduce((min, b) => Math.min(min, b.position.zIndex || 0), 0);
    block.position.zIndex = minZ - 1;
    notifyChange();
  }

  // ─── Selection ───────────────────────────────────────────────────
  function selectBlock(blockId: string, addToSelection = false) {
    if (!addToSelection) {
      selectedBlockIds.value.clear();
    }
    selectedBlockIds.value.add(blockId);
  }

  function deselectBlock(blockId: string) {
    selectedBlockIds.value.delete(blockId);
  }

  function deselectAll() {
    selectedBlockIds.value.clear();
  }

  function selectAllBlocks() {
    if (!currentScene.value) return;
    selectedBlockIds.value = new Set(currentScene.value.blocks.map(b => b.id));
  }

  // ─── Clipboard ───────────────────────────────────────────────────
  function copySelectedBlocks() {
    clipboard.value = selectedBlocks.value.map(b => JSON.parse(JSON.stringify(b)));
  }

  function pasteBlocks() {
    if (!currentScene.value || clipboard.value.length === 0) return;
    const newBlocks: StoryBlock[] = [];
    clipboard.value.forEach(block => {
      const pasted: StoryBlock = JSON.parse(JSON.stringify(block));
      pasted.id = crypto.randomUUID();
      pasted.position.x += 30;
      pasted.position.y += 30;
      currentScene.value!.blocks.push(pasted);
      newBlocks.push(pasted);
    });
    selectedBlockIds.value = new Set(newBlocks.map(b => b.id));
    notifyChange();
  }

  // ─── Document Operations ─────────────────────────────────────────
  function setDocument(doc: StoryDocument) {
    document.value = doc;
    currentSceneIndex.value = 0;
    selectedBlockIds.value.clear();
    history.value = [];
    historyIndex.value = -1;
    pushSnapshot();
  }

  function updateTitle(title: string) {
    document.value.title = title;
    onDocumentChange?.();
  }

  function getBlock(blockId: string): StoryBlock | undefined {
    if (!currentScene.value) return undefined;
    return currentScene.value.blocks.find(b => b.id === blockId);
  }

  function updateBlockVisibility(blockId: string, hidden: boolean) {
    const block = getBlock(blockId);
    if (!block) return;
    block.hidden = hidden;
    notifyChange();
  }

  function updateBlockLock(blockId: string, locked: boolean) {
    const block = getBlock(blockId);
    if (!block) return;
    block.locked = locked;
    notifyChange();
  }

  function updateBlockName(blockId: string, name: string | undefined) {
    const block = getBlock(blockId);
    if (!block) return;
    block.name = name;
    notifyChange();
  }

  // ─── Animation Operations ─────────────────────────────────────────
  function addAnimation(blockId: string, preset: StoryAnimationPresetName): StoryAnimation | null {
    const block = getBlock(blockId);
    if (!block) return null;
    const animation: StoryAnimation = {
      id: crypto.randomUUID(),
      blockId,
      trigger: 'on-enter',
      preset,
      duration: 0.6,
      delay: 0,
      easing: 'power2.out',
      order: block.animations.length,
    };
    block.animations.push(animation);
    notifyChange();
    return animation;
  }

  function updateAnimation(blockId: string, animationId: string, updates: Partial<StoryAnimation>) {
    const block = getBlock(blockId);
    if (!block) return;
    const anim = block.animations.find(a => a.id === animationId);
    if (!anim) return;
    Object.assign(anim, updates);
    notifyChange();
  }

  function removeAnimation(blockId: string, animationId: string): boolean {
    const block = getBlock(blockId);
    if (!block) return false;
    const idx = block.animations.findIndex(a => a.id === animationId);
    if (idx === -1) return false;
    block.animations.splice(idx, 1);
    block.animations.forEach((a, i) => (a.order = i));
    notifyChange();
    return true;
  }

  function reorderAnimations(blockId: string, fromIndex: number, toIndex: number): boolean {
    const block = getBlock(blockId);
    if (!block) return false;
    if (fromIndex < 0 || fromIndex >= block.animations.length) return false;
    if (toIndex < 0 || toIndex >= block.animations.length) return false;
    const [anim] = block.animations.splice(fromIndex, 1);
    block.animations.splice(toIndex, 0, anim);
    block.animations.forEach((a, i) => (a.order = i));
    notifyChange();
    return true;
  }

  return {
    // State
    document,
    currentSceneIndex,
    selectedBlockIds,
    clipboard,
    mode,

    // Computed
    currentScene,
    scenes,
    totalScenes,
    selectedBlocks,
    hasSelection,
    canUndo,
    canRedo,

    // Scene operations
    selectScene,
    addScene,
    duplicateScene,
    deleteScene,
    moveScene,
    updateSceneLayout,
    updateSceneBackground,

    // Block operations
    addBlock,
    deleteBlock,
    deleteSelectedBlocks,
    duplicateBlock,
    updateBlockPosition,
    updateBlockStyle,
    updateBlockContent,
    moveBlockInStack,
    bringToFront,
    sendToBack,
    getBlock,
    updateBlockVisibility,
    updateBlockLock,
    updateBlockName,

    // Selection
    selectBlock,
    deselectBlock,
    deselectAll,
    selectAllBlocks,

    // Clipboard
    copySelectedBlocks,
    pasteBlocks,

    // Document
    setDocument,
    updateTitle,

    // Animation operations
    addAnimation,
    updateAnimation,
    removeAnimation,
    reorderAnimations,

    // Undo/Redo
    undo,
    redo,
  };
}

export type StoryEditorReturn = ReturnType<typeof useStoryEditor>;
