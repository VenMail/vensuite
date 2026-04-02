<script setup lang="ts">
/**
 * StoryLayersPanel — Block layer management: reorder, lock, hide, rename, z-order.
 */
import { computed, inject, ref } from 'vue';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Type,
  Heading,
  Image,
  Square,
  GripVertical,
  ArrowUpToLine,
  ArrowDownToLine,
} from 'lucide-vue-next';
import type { StoryStoreReturn } from '@/store/story';
import type { StoryBlock, StoryBlockType } from '@/types/story';

const store = inject<StoryStoreReturn>('storyStore')!;
const editor = computed(() => store.editor);

const blocks = computed(() => {
  const scene = editor.value.currentScene.value;
  if (!scene) return [];
  // Show in reverse z-order (top layer first)
  return [...scene.blocks].sort(
    (a, b) => (b.position.zIndex ?? 0) - (a.position.zIndex ?? 0),
  );
});

const selectedIds = computed(() => editor.value.selectedBlockIds.value);

const editingNameId = ref<string | null>(null);
const editingNameValue = ref('');

// Block type icon map
const typeIcons: Partial<Record<StoryBlockType, typeof Type>> = {
  text: Type,
  heading: Heading,
  image: Image,
  shape: Square,
};

function getBlockLabel(block: StoryBlock): string {
  return block.name || `${block.type.charAt(0).toUpperCase() + block.type.slice(1)}`;
}

function handleSelect(blockId: string, e: MouseEvent) {
  editor.value.selectBlock(blockId, e.shiftKey);
}

function toggleVisibility(block: StoryBlock) {
  const scene = editor.value.currentScene.value;
  if (!scene) return;
  const target = scene.blocks.find(b => b.id === block.id);
  if (target) {
    target.hidden = !target.hidden;
    store.markDirty();
  }
}

function toggleLock(block: StoryBlock) {
  const scene = editor.value.currentScene.value;
  if (!scene) return;
  const target = scene.blocks.find(b => b.id === block.id);
  if (target) {
    target.locked = !target.locked;
    store.markDirty();
  }
}

function startRename(block: StoryBlock) {
  editingNameId.value = block.id;
  editingNameValue.value = block.name || '';
}

function commitRename(block: StoryBlock) {
  const scene = editor.value.currentScene.value;
  if (!scene) return;
  const target = scene.blocks.find(b => b.id === block.id);
  if (target) {
    target.name = editingNameValue.value || undefined;
    store.markDirty();
  }
  editingNameId.value = null;
}

function handleMoveUp(blockId: string) {
  editor.value.bringToFront(blockId);
}

function handleMoveDown(blockId: string) {
  editor.value.sendToBack(blockId);
}

function handleDuplicate(blockId: string) {
  editor.value.duplicateBlock(blockId);
}

function handleDelete(blockId: string) {
  editor.value.deleteBlock(blockId);
}
</script>

<template>
  <div class="p-2">
    <div v-if="blocks.length === 0" class="p-4 text-center">
      <p class="text-xs text-gray-400 dark:text-gray-500">
        No blocks in this scene. Add blocks from the toolbar.
      </p>
    </div>

    <div class="space-y-0.5">
      <div
        v-for="block in blocks"
        :key="block.id"
        :class="[
          'group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer',
          'transition-colors duration-100',
          selectedIds.has(block.id)
            ? 'bg-primary-50 dark:bg-primary-900/30 ring-1 ring-primary-200 dark:ring-primary-700'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          block.hidden ? 'opacity-50' : '',
        ]"
        @click="handleSelect(block.id, $event)"
      >
        <!-- Grip handle -->
        <GripVertical class="w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0" />

        <!-- Type icon -->
        <component
          :is="typeIcons[block.type] || Square"
          class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0"
        />

        <!-- Name -->
        <div class="flex-1 min-w-0">
          <input
            v-if="editingNameId === block.id"
            v-model="editingNameValue"
            class="w-full text-xs bg-white dark:bg-gray-800 border border-primary-300 dark:border-primary-600
                   rounded px-1 py-0.5 outline-none"
            @blur="commitRename(block)"
            @keydown.enter="commitRename(block)"
            @keydown.escape="editingNameId = null"
            @click.stop
          />
          <span
            v-else
            class="text-xs text-gray-700 dark:text-gray-300 truncate block"
            @dblclick.stop="startRename(block)"
          >
            {{ getBlockLabel(block) }}
          </span>
        </div>

        <!-- Action buttons (visible on hover) -->
        <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            class="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Bring to front"
            @click.stop="handleMoveUp(block.id)"
          >
            <ArrowUpToLine class="w-3 h-3" />
          </button>
          <button
            class="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Send to back"
            @click.stop="handleMoveDown(block.id)"
          >
            <ArrowDownToLine class="w-3 h-3" />
          </button>
          <button
            class="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            :title="block.locked ? 'Unlock' : 'Lock'"
            @click.stop="toggleLock(block)"
          >
            <Lock v-if="block.locked" class="w-3 h-3 text-amber-500" />
            <Unlock v-else class="w-3 h-3" />
          </button>
          <button
            class="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            :title="block.hidden ? 'Show' : 'Hide'"
            @click.stop="toggleVisibility(block)"
          >
            <EyeOff v-if="block.hidden" class="w-3 h-3 text-gray-400" />
            <Eye v-else class="w-3 h-3" />
          </button>
          <button
            class="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Duplicate"
            @click.stop="handleDuplicate(block.id)"
          >
            <Copy class="w-3 h-3" />
          </button>
          <button
            class="p-0.5 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400"
            title="Delete"
            @click.stop="handleDelete(block.id)"
          >
            <Trash2 class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
