<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useStoryStore } from '@/store/story';
import { Plus, Copy, Trash2, ChevronUp, ChevronDown } from 'lucide-vue-next';

const store = useStoryStore();

const editingIndex = ref<number | null>(null);
const editingName = ref('');
const nameInputRef = ref<HTMLInputElement | null>(null);

function selectScene(index: number) {
  store.selectScene(index);
}

function addScene() {
  store.addScene();
}

function duplicateScene(index: number) {
  store.duplicateScene(index);
}

function deleteScene(index: number) {
  store.deleteScene(index);
}

function moveUp(index: number) {
  if (index > 0) {
    store.moveScene(index, index - 1);
  }
}

function moveDown(index: number) {
  if (index < store.scenes.length - 1) {
    store.moveScene(index, index + 1);
  }
}

async function startEditing(index: number) {
  editingIndex.value = index;
  editingName.value = store.scenes[index].name;
  await nextTick();
  nameInputRef.value?.focus();
  nameInputRef.value?.select();
}

function commitName() {
  if (editingIndex.value !== null) {
    const trimmed = editingName.value.trim();
    if (trimmed && store.scenes[editingIndex.value]) {
      store.scenes[editingIndex.value].name = trimmed;
      store.markDirty();
    }
    editingIndex.value = null;
  }
}

function cancelEditing() {
  editingIndex.value = null;
}

function handleNameKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    commitName();
  } else if (e.key === 'Escape') {
    cancelEditing();
  }
}

/** Extract a background CSS value from the scene background for thumbnail */
function sceneBgStyle(bg: { type: string; value: string }) {
  if (bg.type === 'gradient') return { background: bg.value };
  if (bg.type === 'image') return { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  return { backgroundColor: bg.value || '#ffffff' };
}
</script>

<template>
  <aside
    class="w-[200px] shrink-0 flex flex-col bg-white dark:bg-gray-900
           border-r border-gray-200 dark:border-gray-800 h-full select-none"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-3 py-2.5 border-b
             border-gray-100 dark:border-gray-800"
    >
      <span class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Scenes
      </span>
      <span class="text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
        {{ store.scenes.length }}
      </span>
    </div>

    <!-- Scene list -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-2 custom-scrollbar">
      <div
        v-for="(scene, index) in store.scenes"
        :key="scene.id"
        class="group relative"
      >
        <!-- Thumbnail card -->
        <div
          :class="[
            'relative w-full rounded-lg cursor-pointer transition-all duration-200',
            'border overflow-hidden',
            store.currentSceneIndex === index
              ? 'ring-2 ring-primary-500 border-primary-500 shadow-md'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm',
          ]"
          @click="selectScene(index)"
          @dblclick="startEditing(index)"
        >
          <!-- Mini preview area (16:9 ratio) -->
          <div
            class="w-full aspect-video relative"
            :style="sceneBgStyle(scene.background)"
          >
            <!-- Block count badge -->
            <div
              class="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[10px]
                     font-medium bg-black/40 backdrop-blur-sm text-white
                     rounded-full leading-none"
            >
              {{ scene.blocks.length }} {{ scene.blocks.length === 1 ? 'block' : 'blocks' }}
            </div>

            <!-- Scene number -->
            <div
              class="absolute bottom-1.5 left-1.5 w-5 h-5 flex items-center
                     justify-center text-[10px] font-bold bg-white/80
                     dark:bg-gray-900/80 backdrop-blur-sm rounded
                     text-gray-700 dark:text-gray-300 leading-none"
            >
              {{ index + 1 }}
            </div>
          </div>

          <!-- Scene name -->
          <div class="px-2 py-1.5">
            <input
              v-if="editingIndex === index"
              ref="nameInputRef"
              v-model="editingName"
              class="w-full text-xs font-medium bg-transparent border-none
                     outline-none text-gray-800 dark:text-gray-200 p-0
                     focus:ring-0"
              @blur="commitName"
              @keydown="handleNameKeydown"
            />
            <p
              v-else
              class="text-xs font-medium text-gray-700 dark:text-gray-300
                     truncate leading-snug"
            >
              {{ scene.name }}
            </p>
          </div>
        </div>

        <!-- Hover actions -->
        <div
          class="absolute -right-0.5 top-1 flex flex-col gap-0.5
                 opacity-0 group-hover:opacity-100 transition-opacity
                 duration-150 z-10"
        >
          <button
            v-if="index > 0"
            class="p-0.5 rounded bg-white dark:bg-gray-800 border
                   border-gray-200 dark:border-gray-700 shadow-sm
                   hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Move up"
            @click.stop="moveUp(index)"
          >
            <ChevronUp class="w-3 h-3 text-gray-500" />
          </button>
          <button
            v-if="index < store.scenes.length - 1"
            class="p-0.5 rounded bg-white dark:bg-gray-800 border
                   border-gray-200 dark:border-gray-700 shadow-sm
                   hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Move down"
            @click.stop="moveDown(index)"
          >
            <ChevronDown class="w-3 h-3 text-gray-500" />
          </button>
          <button
            class="p-0.5 rounded bg-white dark:bg-gray-800 border
                   border-gray-200 dark:border-gray-700 shadow-sm
                   hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Duplicate"
            @click.stop="duplicateScene(index)"
          >
            <Copy class="w-3 h-3 text-gray-500" />
          </button>
          <button
            v-if="store.scenes.length > 1"
            class="p-0.5 rounded bg-white dark:bg-gray-800 border
                   border-red-200 dark:border-red-800 shadow-sm
                   hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            title="Delete"
            @click.stop="deleteScene(index)"
          >
            <Trash2 class="w-3 h-3 text-red-500" />
          </button>
        </div>
      </div>
    </div>

    <!-- Add scene button -->
    <div class="px-2 py-2 border-t border-gray-100 dark:border-gray-800">
      <button
        class="w-full flex items-center justify-center gap-1.5 px-3 py-2
               text-xs font-medium text-gray-600 dark:text-gray-400
               bg-gray-50 dark:bg-gray-800/60 rounded-lg border
               border-dashed border-gray-300 dark:border-gray-700
               hover:border-primary-400 hover:text-primary-600
               hover:bg-primary-50 dark:hover:bg-primary-900/20
               transition-all duration-200"
        @click="addScene"
      >
        <Plus class="w-3.5 h-3.5" />
        Add Scene
      </button>
    </div>
  </aside>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.5);
}
</style>
