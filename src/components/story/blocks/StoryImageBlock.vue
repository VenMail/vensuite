<script setup lang="ts">
import { ref, computed } from 'vue';
import type { StoryImageContent } from '@/types/story';
import { ImagePlus, Replace } from 'lucide-vue-next';

const props = defineProps<{
  content: StoryImageContent;
  isSelected: boolean;
}>();

const emit = defineEmits<{
  'update:content': [payload: Partial<StoryImageContent>];
}>();

const showUrlInput = ref(false);
const urlValue = ref('');
const urlInputRef = ref<HTMLInputElement | null>(null);

const hasImage = computed(() => !!props.content.src);

const imageStyle = computed(() => ({
  objectFit: props.content.objectFit || 'cover',
  objectPosition: props.content.objectPosition || 'center',
  filter: props.content.filter || undefined,
}));

function openUrlDialog() {
  urlValue.value = props.content.src || '';
  showUrlInput.value = true;
}

function confirmUrl() {
  const trimmed = urlValue.value.trim();
  if (trimmed) {
    emit('update:content', { src: trimmed });
  }
  showUrlInput.value = false;
}

function cancelUrlInput() {
  showUrlInput.value = false;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    confirmUrl();
  } else if (e.key === 'Escape') {
    cancelUrlInput();
  }
}
</script>

<template>
  <div class="story-image-block relative w-full h-full overflow-hidden rounded-sm">
    <!-- Image display -->
    <img
      v-if="hasImage"
      :src="content.src"
      :alt="content.alt || ''"
      class="w-full h-full"
      :style="imageStyle"
      draggable="false"
    />

    <!-- Placeholder when no image -->
    <div
      v-else
      class="w-full h-full flex flex-col items-center justify-center gap-3
             bg-gray-50 dark:bg-gray-800/60 border-2 border-dashed
             border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer
             transition-colors hover:border-primary-400 hover:bg-primary-50
             dark:hover:bg-primary-900/20"
      @click="openUrlDialog"
    >
      <ImagePlus class="w-10 h-10 text-gray-400 dark:text-gray-500" />
      <span class="text-sm font-medium text-gray-500 dark:text-gray-400">
        Click to add image
      </span>
    </div>

    <!-- Selected overlay with change button -->
    <Transition name="fade">
      <div
        v-if="isSelected && hasImage"
        class="absolute inset-0 bg-black/10 flex items-end justify-center pb-4
               transition-opacity"
      >
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                 text-white bg-black/60 backdrop-blur-sm rounded-full
                 hover:bg-black/80 transition-colors shadow-lg"
          @click.stop="openUrlDialog"
        >
          <Replace class="w-3.5 h-3.5" />
          Change image
        </button>
      </div>
    </Transition>

    <!-- Caption -->
    <div
      v-if="content.caption && hasImage"
      class="absolute bottom-0 inset-x-0 px-3 py-2 bg-gradient-to-t
             from-black/50 to-transparent"
    >
      <p class="text-xs text-white/90 text-center leading-snug">
        {{ content.caption }}
      </p>
    </div>

    <!-- URL input dialog overlay -->
    <Transition name="fade">
      <div
        v-if="showUrlInput"
        class="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center
               justify-center p-4 z-10"
        @click.self="cancelUrlInput"
      >
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 w-full
                 max-w-sm space-y-3 border border-gray-200 dark:border-gray-700"
          @click.stop
        >
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Image URL
          </p>
          <input
            ref="urlInputRef"
            v-model="urlValue"
            type="url"
            placeholder="https://example.com/image.jpg"
            class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300
                   dark:border-gray-600 bg-white dark:bg-gray-900
                   text-gray-900 dark:text-gray-100
                   placeholder-gray-400 dark:placeholder-gray-500
                   focus:outline-none focus:ring-2 focus:ring-primary-500
                   focus:border-transparent transition-shadow"
            autofocus
            @keydown="handleKeydown"
          />
          <div class="flex justify-end gap-2">
            <button
              class="px-3 py-1.5 text-xs font-medium text-gray-600
                     dark:text-gray-400 rounded-lg hover:bg-gray-100
                     dark:hover:bg-gray-700 transition-colors"
              @click="cancelUrlInput"
            >
              Cancel
            </button>
            <button
              class="px-3 py-1.5 text-xs font-medium text-white
                     bg-primary-600 rounded-lg hover:bg-primary-700
                     transition-colors shadow-sm"
              @click="confirmUrl"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
