<script setup lang="ts">
/**
 * StoryAnimationPanel — Per-block animation configuration sidebar panel.
 * Add/edit/remove animations, pick presets, configure timing, preview.
 */
import { computed, inject, ref } from 'vue';
import {
  Plus,
  Trash2,
  Play,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Clock,
  Zap,
} from 'lucide-vue-next';
import type { StoryStoreReturn } from '@/store/story';
import type { StoryAnimationsReturn } from '@/composables/useStoryAnimations';
import {
  ANIMATION_PRESETS,
  PRESET_CATEGORIES,
  type AnimationCategory,
} from '@/composables/useStoryAnimations';
import type {
  StoryAnimation,
  StoryAnimationPresetName,
  StoryAnimationTrigger,
  EasingPreset,
} from '@/types/story';

const store = inject<StoryStoreReturn>('storyStore')!;
const animations = inject<StoryAnimationsReturn>('storyAnimations')!;
const editor = computed(() => store.editor);

const selectedBlock = computed(() => {
  const blocks = editor.value.selectedBlocks.value;
  return blocks.length === 1 ? blocks[0] : null;
});

const blockAnimations = computed(() => selectedBlock.value?.animations ?? []);

// Expanded animation editor
const expandedAnimId = ref<string | null>(null);
const showPresetPicker = ref(false);

// ── Trigger labels ──────────────────────────────────────────────────
const triggerLabels: Record<StoryAnimationTrigger, string> = {
  'on-enter': 'On Enter',
  'on-click': 'On Click',
  'on-load': 'On Load',
  'after-previous': 'After Previous',
  'with-previous': 'With Previous',
};

const triggerOptions: StoryAnimationTrigger[] = [
  'on-enter', 'on-click', 'on-load', 'after-previous', 'with-previous',
];

// ── Easing options ──────────────────────────────────────────────────
const easingOptions: { value: EasingPreset; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease', label: 'Ease' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In Out' },
  { value: 'power1.out', label: 'Power 1' },
  { value: 'power2.out', label: 'Power 2' },
  { value: 'power3.out', label: 'Power 3' },
  { value: 'power4.out', label: 'Power 4' },
  { value: 'back.out', label: 'Back' },
  { value: 'elastic.out', label: 'Elastic' },
  { value: 'bounce.out', label: 'Bounce' },
  { value: 'circ.out', label: 'Circular' },
  { value: 'expo.out', label: 'Expo' },
];

// ── Category colors ─────────────────────────────────────────────────
const categoryColors: Record<AnimationCategory, string> = {
  entrance: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  exit: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  emphasis: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  motion: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

// ── Actions ─────────────────────────────────────────────────────────
function addAnimation(preset: StoryAnimationPresetName) {
  if (!selectedBlock.value) return;
  const anim = editor.value.addAnimation(selectedBlock.value.id, preset);
  if (anim) {
    expandedAnimId.value = anim.id;
  }
  showPresetPicker.value = false;
}

function removeAnimation(animId: string) {
  if (!selectedBlock.value) return;
  editor.value.removeAnimation(selectedBlock.value.id, animId);
  if (expandedAnimId.value === animId) {
    expandedAnimId.value = null;
  }
}

function updateAnimation(animId: string, updates: Partial<StoryAnimation>) {
  if (!selectedBlock.value) return;
  editor.value.updateAnimation(selectedBlock.value.id, animId, updates);
}

function previewSingleAnimation(anim: StoryAnimation) {
  if (!selectedBlock.value || !animations) return;
  animations.previewAnimation(selectedBlock.value.id, anim);
}

function previewAllAnimations() {
  if (!animations) return;
  animations.previewScene();
}

function toggleExpand(animId: string) {
  expandedAnimId.value = expandedAnimId.value === animId ? null : animId;
}
</script>

<template>
  <div class="p-3">
    <!-- No selection -->
    <div v-if="!selectedBlock" class="text-center py-8">
      <Sparkles class="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
      <p class="text-xs text-gray-400 dark:text-gray-500">
        Select a block to configure animations.
      </p>
    </div>

    <!-- Block selected -->
    <template v-else>
      <div class="space-y-3">
        <!-- Block header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                     bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
            >
              {{ selectedBlock.type }}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ blockAnimations.length }} animation{{ blockAnimations.length !== 1 ? 's' : '' }}
            </span>
          </div>
        </div>

        <!-- Animation list -->
        <div v-if="blockAnimations.length > 0" class="space-y-1.5">
          <div
            v-for="anim in blockAnimations"
            :key="anim.id"
            class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <!-- Animation header row -->
            <button
              class="w-full flex items-center gap-2 px-2.5 py-2 text-left
                     hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              @click="toggleExpand(anim.id)"
            >
              <component
                :is="expandedAnimId === anim.id ? ChevronDown : ChevronRight"
                class="w-3 h-3 text-gray-400 flex-shrink-0"
              />
              <span
                :class="[
                  'text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0',
                  categoryColors[ANIMATION_PRESETS[anim.preset]?.category ?? 'entrance'],
                ]"
              >
                {{ ANIMATION_PRESETS[anim.preset]?.label ?? anim.preset }}
              </span>
              <span class="text-[10px] text-gray-400 flex-shrink-0">
                {{ triggerLabels[anim.trigger] }}
              </span>
              <span class="flex-1" />
              <span class="text-[10px] text-gray-400 tabular-nums flex-shrink-0">
                {{ anim.duration.toFixed(1) }}s
              </span>
              <button
                class="p-0.5 rounded text-gray-400 hover:text-green-500 flex-shrink-0"
                title="Preview"
                @click.stop="previewSingleAnimation(anim)"
              >
                <Play class="w-3 h-3" />
              </button>
              <button
                class="p-0.5 rounded text-gray-400 hover:text-red-500 flex-shrink-0"
                title="Remove"
                @click.stop="removeAnimation(anim.id)"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            </button>

            <!-- Expanded editor -->
            <div
              v-if="expandedAnimId === anim.id"
              class="px-3 py-2.5 border-t border-gray-100 dark:border-gray-800 space-y-2.5
                     bg-gray-50/50 dark:bg-gray-800/30"
            >
              <!-- Preset -->
              <label class="flex items-center gap-2">
                <span class="text-[10px] text-gray-400 w-12">Preset</span>
                <select
                  :value="anim.preset"
                  class="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                         rounded px-2 py-1 text-gray-700 dark:text-gray-300"
                  @change="updateAnimation(anim.id, { preset: ($event.target as HTMLSelectElement).value as StoryAnimationPresetName })"
                >
                  <optgroup
                    v-for="cat in PRESET_CATEGORIES"
                    :key="cat.id"
                    :label="cat.label"
                  >
                    <option
                      v-for="p in cat.presets"
                      :key="p"
                      :value="p"
                    >
                      {{ ANIMATION_PRESETS[p].label }}
                    </option>
                  </optgroup>
                  <option value="custom">Custom</option>
                </select>
              </label>

              <!-- Trigger -->
              <label class="flex items-center gap-2">
                <span class="text-[10px] text-gray-400 w-12">Trigger</span>
                <select
                  :value="anim.trigger"
                  class="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                         rounded px-2 py-1 text-gray-700 dark:text-gray-300"
                  @change="updateAnimation(anim.id, { trigger: ($event.target as HTMLSelectElement).value as StoryAnimationTrigger })"
                >
                  <option
                    v-for="t in triggerOptions"
                    :key="t"
                    :value="t"
                  >
                    {{ triggerLabels[t] }}
                  </option>
                </select>
              </label>

              <!-- Duration -->
              <label class="flex items-center gap-2">
                <Clock class="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span class="text-[10px] text-gray-400 w-8">Dur</span>
                <input
                  type="number"
                  :value="anim.duration"
                  min="0.1"
                  max="10"
                  step="0.1"
                  class="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                         rounded px-2 py-1 text-gray-700 dark:text-gray-300 tabular-nums"
                  @change="updateAnimation(anim.id, { duration: Number(($event.target as HTMLInputElement).value) })"
                />
                <span class="text-[10px] text-gray-400">s</span>
              </label>

              <!-- Delay -->
              <label class="flex items-center gap-2">
                <Zap class="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span class="text-[10px] text-gray-400 w-8">Delay</span>
                <input
                  type="number"
                  :value="anim.delay"
                  min="0"
                  max="10"
                  step="0.1"
                  class="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                         rounded px-2 py-1 text-gray-700 dark:text-gray-300 tabular-nums"
                  @change="updateAnimation(anim.id, { delay: Number(($event.target as HTMLInputElement).value) })"
                />
                <span class="text-[10px] text-gray-400">s</span>
              </label>

              <!-- Easing -->
              <label class="flex items-center gap-2">
                <span class="text-[10px] text-gray-400 w-12">Easing</span>
                <select
                  :value="anim.easing"
                  class="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                         rounded px-2 py-1 text-gray-700 dark:text-gray-300"
                  @change="updateAnimation(anim.id, { easing: ($event.target as HTMLSelectElement).value })"
                >
                  <option
                    v-for="e in easingOptions"
                    :key="e.value"
                    :value="e.value"
                  >
                    {{ e.label }}
                  </option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-else
          class="text-center py-4 rounded-lg border border-dashed border-gray-200 dark:border-gray-700"
        >
          <p class="text-xs text-gray-400 dark:text-gray-500">
            No animations yet
          </p>
        </div>

        <!-- Add animation -->
        <div class="relative">
          <button
            class="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium
                   text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20
                   border border-primary-200 dark:border-primary-800 rounded-lg
                   hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
            @click="showPresetPicker = !showPresetPicker"
          >
            <Plus class="w-3.5 h-3.5" />
            Add Animation
          </button>

          <!-- Preset picker dropdown -->
          <div
            v-if="showPresetPicker"
            class="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900
                   border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg
                   max-h-[280px] overflow-y-auto"
          >
            <div v-for="cat in PRESET_CATEGORIES" :key="cat.id" class="p-1.5">
              <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">
                {{ cat.label }}
              </div>
              <div class="grid grid-cols-2 gap-0.5">
                <button
                  v-for="preset in cat.presets"
                  :key="preset"
                  class="text-left px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300
                         rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  @click="addAnimation(preset)"
                >
                  {{ ANIMATION_PRESETS[preset].label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview all -->
        <button
          v-if="blockAnimations.length > 0"
          class="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium
                 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800
                 border border-gray-200 dark:border-gray-700 rounded-lg
                 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          @click="previewAllAnimations"
        >
          <Play class="w-3.5 h-3.5" />
          Preview Scene
        </button>
      </div>
    </template>
  </div>
</template>
