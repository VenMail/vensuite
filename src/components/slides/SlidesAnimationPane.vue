<template>
  <div class="w-80 max-w-80 min-w-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button
            @click="$emit('back')"
            class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Back to Properties"
          >
            <ArrowLeft class="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{$t('Commons.heading.animation_settings')}}
          </h3>
        </div>
        <button
          @click="$emit('close')"
          class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          title="Close Animation Panel"
        >
          <X class="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
      <!-- Element Selection Info -->
      <div v-if="!selectedElement && !markdownElement" class="text-center py-8">
        <div class="text-gray-400 mb-4">
          <Sparkles class="h-12 w-12 mx-auto mb-2" />
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{$t('Components.Slides.text.select_an_element_in')}}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-500 mt-2">
          Click on text, images, or other elements in the preview
        </p>
      </div>

      <!-- Structured Motion Controls -->
      <template v-else>
        <!-- Motion Role Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Motion Role
          </label>
          <select
            :value="motionRole"
            class="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            @change="updateMotionRole(($event.target as HTMLSelectElement).value)"
          >
            <option value="slide">Slide (Transition)</option>
            <option value="content">Content (Container)</option>
            <option value="item">Item (Element)</option>
            <option value="progress">Progress (Timeline)</option>
          </select>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Determines the animation context and timing
          </p>
        </div>

        <!-- Enable Motion -->
        <div>
          <label class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              :checked="motionEnabled"
              class="rounded border-gray-300 dark:border-gray-600"
              @change="toggleMotion(($event.target as HTMLInputElement).checked)"
            />
            Enable Motion
          </label>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Apply Venmail motion effects to this element
          </p>
        </div>

        <template v-if="motionEnabled">
          <!-- Motion Variant -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Motion Variant
            </label>
            <select
              :value="motionVariant"
              class="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              @change="updateMotionVariant(($event.target as HTMLSelectElement).value)"
            >
              <optgroup label="Slide Transitions">
                <option value="venmail3d">Venmail 3D</option>
                <option value="slideLeft">Slide Left</option>
                <option value="slideRight">Slide Right</option>
                <option value="slideUp">Slide Up</option>
                <option value="slideDown">Slide Down</option>
                <option value="fade">Fade</option>
                <option value="zoom">Zoom</option>
              </optgroup>
              <optgroup label="Content Animations" v-if="motionRole === 'content'">
                <option value="default">Default</option>
                <option value="staggered">Staggered</option>
                <option value="fadeIn">Fade In</option>
                <option value="slideUp">Slide Up</option>
              </optgroup>
              <optgroup label="Item Animations" v-if="motionRole === 'item'">
                <option value="default">Default</option>
                <option value="slideLeft">Slide Left</option>
                <option value="slideRight">Slide Right</option>
                <option value="scaleIn">Scale In</option>
                <option value="fadeIn">Fade In</option>
              </optgroup>
              <optgroup label="Progress Animations" v-if="motionRole === 'progress'">
                <option value="default">Default</option>
                <option value="slideIn">Slide In</option>
                <option value="fadeIn">Fade In</option>
              </optgroup>
            </select>
          </div>

          <!-- Motion State -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Motion State
            </label>
            <div class="space-y-2">
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  :checked="motionState === 'enter'"
                  name="state"
                  class="border-gray-300 dark:border-gray-600"
                  @change="updateMotionState('enter')"
                />
                <span class="text-sm">Enter (Entrance)</span>
              </label>
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  :checked="motionState === 'center'"
                  name="state"
                  class="border-gray-300 dark:border-gray-600"
                  @change="updateMotionState('center')"
                />
                <span class="text-sm">Center (Active)</span>
              </label>
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  :checked="motionState === 'exit'"
                  name="state"
                  class="border-gray-300 dark:border-gray-600"
                  @change="updateMotionState('exit')"
                />
                <span class="text-sm">Exit (Leave)</span>
              </label>
              <template v-if="motionRole === 'content' || motionRole === 'item'">
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    :checked="motionState === 'hidden'"
                    name="state"
                    class="border-gray-300 dark:border-gray-600"
                    @change="updateMotionState('hidden')"
                  />
                  <span class="text-sm">Hidden</span>
                </label>
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    :checked="motionState === 'visible'"
                    name="state"
                    class="border-gray-300 dark:border-gray-600"
                    @change="updateMotionState('visible')"
                  />
                  <span class="text-sm">Visible</span>
                </label>
              </template>
            </div>
          </div>

          <!-- Motion Trigger -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Motion Trigger
            </label>
            <div class="space-y-2">
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  :checked="motionTrigger === 'immediate'"
                  name="trigger"
                  class="border-gray-300 dark:border-gray-600"
                  @change="updateMotionTrigger('immediate')"
                />
                <span class="text-sm">Immediate</span>
              </label>
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  :checked="motionTrigger === 'delayed'"
                  name="trigger"
                  class="border-gray-300 dark:border-gray-600"
                  @change="updateMotionTrigger('delayed')"
                />
                <span class="text-sm">Delayed</span>
              </label>
              <label class="flex items-center gap-2" v-if="motionRole === 'content'">
                <input
                  type="radio"
                  :checked="motionTrigger === 'on-click'"
                  name="trigger"
                  class="border-gray-300 dark:border-gray-600"
                  @change="updateMotionTrigger('on-click')"
                />
                <span class="text-sm">On Click</span>
              </label>
              <label class="flex items-center gap-2" v-if="motionRole === 'item'">
                <input
                  type="radio"
                  :checked="motionTrigger === 'on-hover'"
                  name="trigger"
                  class="border-gray-300 dark:border-gray-600"
                  @change="updateMotionTrigger('on-hover')"
                />
                <span class="text-sm">On Hover</span>
              </label>
              <label class="flex items-center gap-2" v-if="motionRole === 'progress'">
                <input
                  type="radio"
                  :checked="motionTrigger === 'on-load'"
                  name="trigger"
                  class="border-gray-300 dark:border-gray-600"
                  @change="updateMotionTrigger('on-load')"
                />
                <span class="text-sm">On Load</span>
              </label>
            </div>
          </div>

          <!-- Motion Delay -->
          <div v-if="motionTrigger === 'delayed' || motionTrigger === 'on-load'">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Motion Delay (ms)
            </label>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <input
                  :value="motionDelay"
                  type="range"
                  min="0"
                  max="5000"
                  step="100"
                  class="flex-1"
                  @input="updateMotionDelay(parseInt(($event.target as HTMLInputElement).value))"
                />
                <span class="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                  {{ motionDelay }}ms
                </span>
              </div>
              <div class="flex gap-1">
                <button
                  v-for="delay in [0, 300, 600, 1000]"
                  :key="delay"
                  class="flex-1 px-2 py-1 text-xs border rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  :class="motionDelay === delay ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 dark:border-gray-600'"
                  @click="updateMotionDelay(delay)"
                >
                  {{ delay }}ms
                </button>
              </div>
            </div>
          </div>

          <!-- Stagger Settings (for items) -->
          <div v-if="motionRole === 'item'">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Item Index
            </label>
            <input
              :value="itemIndex"
              type="number"
              min="0"
              max="20"
              class="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              @input="updateItemIndex(parseInt(($event.target as HTMLInputElement).value))"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Determines stagger timing in sequence
            </p>
          </div>

          <!-- Preview Motion -->
          <div>
            <button
              @click="previewMotion"
              class="w-full px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Play class="h-4 w-4" />
              Preview Motion
            </button>
          </div>

          <!-- Motion Config Preview -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Motion Configuration
            </label>
            <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
              <pre class="text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto"><code>{{ motionConfigJson }}</code></pre>
            </div>
            <button
              @click="copyMotionConfig"
              class="mt-2 px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Copy Config
            </button>
          </div>
        </template>
      </template>

      <!-- Animation Timeline -->
      <div v-if="motionConfig && Object.keys(motionConfig).length > 0" class="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div class="mb-3">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Motion Timeline</h4>
          <p class="text-xs text-gray-500 dark:text-gray-400">Visualize and control motion sequence</p>
        </div>
        <MotionTimeline
          :config="motionConfig as any"
          :current-time="timelineCurrentTime"
          :is-playing="isTimelinePlaying"
          @update:current-time="handleTimelineTimeUpdate"
          @update:is-playing="handleTimelinePlayState"
          @item-click="handleTimelineItemClick"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ArrowLeft, X, Sparkles, Play } from 'lucide-vue-next';
import MotionTimeline from './motion/MotionTimeline.vue';

interface Props {
  selectedElement?: HTMLElement | null;
  markdownElement?: any | null; // MarkdownElement type
  motionConfig?: Record<string, any>;
}

const props = withDefaults(defineProps<Props>(), {});

const emit = defineEmits<{
  close: [];
  back: [];
  'update-motion-config': [config: Record<string, any>];
}>();

// Motion state derived from structured config
const elementId = computed(() => {
  return props.selectedElement?.id || 
         (props.markdownElement ? `markdown-${props.markdownElement.startLine}` : 'unknown');
});

const currentElementConfig = computed(() => {
  const items = props.motionConfig?.items || [];
  return items.find((item: any) => item.id === elementId.value) || {};
});

// Motion properties
const motionEnabled = computed(() => currentElementConfig.value?.enabled ?? false);
const motionRole = computed(() => currentElementConfig.value?.role ?? 'item');
const motionVariant = computed(() => currentElementConfig.value?.variant ?? 'default');
const motionState = computed(() => currentElementConfig.value?.state ?? 'visible');
const motionTrigger = computed(() => currentElementConfig.value?.trigger ?? 'immediate');
const motionDelay = computed(() => currentElementConfig.value?.delay ?? 0);
const itemIndex = computed(() => currentElementConfig.value?.index ?? 0);

// Helper function to update structured motion config
function updateMotionConfig(updates: Partial<Record<string, any>>) {
  if (!props.selectedElement && !props.markdownElement) return;
  
  // Get element ID
  const elementId = props.selectedElement?.id || 
                   (props.markdownElement ? `markdown-${props.markdownElement.startLine}` : 'unknown');
  
  // Create or update element-specific motion config
  const currentConfig = props.motionConfig || { items: [] };
  const items = currentConfig.items || [];
  
  // Find existing item or create new one
  let itemIndex = items.findIndex((item: any) => item.id === elementId);
  if (itemIndex === -1) {
    itemIndex = items.length;
  }
  
  // Update the item with structured motion properties
  items[itemIndex] = {
    id: elementId,
    role: updates.role || motionRole.value,
    enabled: updates.enabled !== false,
    variant: updates.variant || motionVariant.value,
    state: updates.state || motionState.value,
    trigger: updates.trigger || motionTrigger.value,
    delay: updates.delay ?? motionDelay.value,
    index: updates.index ?? itemIndex.value,
    ...updates
  };
  
  // Emit updated motion config
  const newConfig = {
    ...currentConfig,
    items
  };
  emit('update-motion-config', newConfig);
}

// Computed motion config JSON for preview
const motionConfigJson = computed(() => {
  return JSON.stringify(currentElementConfig.value, null, 2);
});

// Methods for updating motion properties
function toggleMotion(enabled: boolean) {
  updateMotionConfig({ enabled });
}

function updateMotionRole(role: string) {
  updateMotionConfig({ role });
  
  // Reset variant to appropriate default for new role
  let defaultVariant = 'default';
  if (role === 'slide') defaultVariant = 'venmail3d';
  else if (role === 'content') defaultVariant = 'default';
  else if (role === 'progress') defaultVariant = 'default';
  
  updateMotionConfig({ variant: defaultVariant });
}

function updateMotionVariant(variant: string) {
  updateMotionConfig({ variant });
}

function updateMotionState(state: string) {
  updateMotionConfig({ state });
}

function updateMotionTrigger(trigger: string) {
  updateMotionConfig({ trigger });
}

function updateMotionDelay(delay: number) {
  updateMotionConfig({ delay });
}

function updateItemIndex(index: number) {
  updateMotionConfig({ index });
}

function previewMotion() {
  if (!props.selectedElement) return;
  
  // Apply motion data attributes to element for preview
  const element = props.selectedElement;
  element.setAttribute('data-motion-role', motionRole.value);
  element.setAttribute('data-motion-variant', motionVariant.value);
  element.setAttribute('data-motion-state', motionState.value);
  element.setAttribute('data-motion-trigger', motionTrigger.value);
  element.setAttribute('data-motion-delay', motionDelay.toString());
  
  if (motionRole.value === 'item') {
    element.setAttribute('data-motion-index', itemIndex.toString());
  }
  
  // Trigger a re-render to apply the motion
  element.style.display = 'none';
  setTimeout(() => {
    element.style.display = '';
  }, 10);
}

function copyMotionConfig() {
  navigator.clipboard.writeText(motionConfigJson.value);
}

// Timeline state and handlers
const timelineCurrentTime = ref(0);
const isTimelinePlaying = ref(false);

function handleTimelineTimeUpdate(time: number) {
  timelineCurrentTime.value = time;
}

function handleTimelinePlayState(playing: boolean) {
  isTimelinePlaying.value = playing;
}

function handleTimelineItemClick(item: any) {
  console.log('Timeline item clicked:', item);
  // Could select the element or highlight it in the preview
}
</script>
