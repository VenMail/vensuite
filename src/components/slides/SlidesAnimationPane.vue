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

      <!-- Animation Controls -->
      <template v-else>
        <!-- Enable Animation -->
        <div>
          <label class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              :checked="animationEnabled"
              class="rounded border-gray-300 dark:border-gray-600"
              @change="toggleAnimation(($event.target as HTMLInputElement).checked)"
            />
            {{$t('Commons.label.enable_animation')}}
          </label>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{$t('Components.Slides.text.add_entrance_emphasis_or')}}
          </p>
        </div>

        <template v-if="animationEnabled">
          <!-- Animation Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{$t('Commons.label.animation_type')}}
            </label>
            <div class="space-y-2">
              <select
                :value="animationType"
                class="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                @change="updateAnimationType(($event.target as HTMLSelectElement).value)"
              >
                <optgroup label="Entrance Animations">
                  <option value="fadeIn">{{$t('Commons.text.fade_in')}}</option>
                  <option value="slideInLeft">{{$t('Components.Slides.text.slide_in_left')}}</option>
                  <option value="slideInRight">{{$t('Components.Slides.text.slide_in_right')}}</option>
                  <option value="slideInUp">{{$t('Components.Slides.text.slide_in_up')}}</option>
                  <option value="slideInDown">{{$t('Components.Slides.text.slide_in_down')}}</option>
                  <option value="zoomIn">{{$t('Commons.text.zoom_in')}}</option>
                  <option value="rotateIn">{{$t('Commons.text.rotate_in')}}</option>
                  <option value="bounceIn">{{$t('Commons.text.bounce_in')}}</option>
                  <option value="flipIn">{{$t('Commons.text.flip_in')}}</option>
                </optgroup>
                <optgroup label="Emphasis Animations">
                  <option value="pulse">{{$t('Commons.text.pulse')}}</option>
                  <option value="shake">{{$t('Commons.text.shake')}}</option>
                  <option value="swing">{{$t('Commons.text.swing')}}</option>
                  <option value="tada">{{$t('Commons.text.tada')}}</option>
                  <option value="wobble">{{$t('Commons.text.wobble')}}</option>
                  <option value="jello">{{$t('Commons.text.jello')}}</option>
                  <option value="heartBeat">{{$t('Commons.text.heart_beat')}}</option>
                </optgroup>
                <optgroup label="Exit Animations">
                  <option value="fadeOut">{{$t('Commons.text.fade_out')}}</option>
                  <option value="slideOutLeft">{{$t('Components.Slides.text.slide_out_left')}}</option>
                  <option value="slideOutRight">{{$t('Components.Slides.text.slide_out_right')}}</option>
                  <option value="slideOutUp">{{$t('Components.Slides.text.slide_out_up')}}</option>
                  <option value="slideOutDown">{{$t('Components.Slides.text.slide_out_down')}}</option>
                  <option value="zoomOut">{{$t('Commons.text.zoom_out')}}</option>
                  <option value="rotateOut">{{$t('Commons.text.rotate_out')}}</option>
                  <option value="bounceOut">{{$t('Commons.text.bounce_out')}}</option>
                  <option value="flipOut">{{$t('Commons.text.flip_out')}}</option>
                </optgroup>
              </select>
            </div>
          </div>

          <!-- Animation Duration -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{$t('Commons.label.duration')}}
            </label>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <input
                  :value="animationDuration"
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  class="flex-1"
                  @input="updateAnimationDuration(parseInt(($event.target as HTMLInputElement).value))"
                />
                <span class="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                  {{ animationDuration }}ms
                </span>
              </div>
              <div class="flex gap-1">
                <button
                  v-for="duration in [500, 1000, 2000]"
                  :key="duration"
                  class="flex-1 px-2 py-1 text-xs border rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  :class="animationDuration === duration ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 dark:border-gray-600'"
                  @click="updateAnimationDuration(duration)"
                >
                  {{ duration }}ms
                </button>
              </div>
            </div>
          </div>

          <!-- Animation Delay -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{$t('Commons.label.delay')}}
            </label>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <input
                  :value="animationDelay"
                  type="range"
                  min="0"
                  max="5000"
                  step="100"
                  class="flex-1"
                  @input="updateAnimationDelay(parseInt(($event.target as HTMLInputElement).value))"
                />
                <span class="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                  {{ animationDelay }}ms
                </span>
              </div>
              <div class="flex gap-1">
                <button
                  v-for="delay in [0, 500, 1000, 2000]"
                  :key="delay"
                  class="flex-1 px-2 py-1 text-xs border rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  :class="animationDelay === delay ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 dark:border-gray-600'"
                  @click="updateAnimationDelay(delay)"
                >
                  {{ delay }}ms
                </button>
              </div>
            </div>
          </div>

          <!-- Easing Function -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{$t('Commons.label.easing')}}
            </label>
            <select
              :value="animationEasing"
              class="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              @change="updateAnimationEasing(($event.target as HTMLSelectElement).value)"
            >
              <option value="linear">{{$t('Commons.text.linear')}}</option>
              <option value="ease">{{$t('Commons.text.ease')}}</option>
              <option value="ease-in">{{$t('Commons.text.ease_in')}}</option>
              <option value="ease-out">{{$t('Commons.text.ease_out')}}</option>
              <option value="ease-in-out">{{$t('Components.Slides.text.ease_in_out')}}</option>
              <optgroup label="Bounce">
                <option value="ease-bounce">{{$t('Commons.label.bounce')}}</option>
                <option value="ease-bounce-in">{{$t('Commons.text.bounce_in')}}</option>
                <option value="ease-bounce-out">{{$t('Commons.text.bounce_out')}}</option>
              </optgroup>
              <optgroup label="Elastic">
                <option value="ease-elastic">{{$t('Commons.label.elastic')}}</option>
                <option value="ease-elastic-in">{{$t('Commons.text.elastic_in')}}</option>
                <option value="ease-elastic-out">{{$t('Commons.text.elastic_out')}}</option>
              </optgroup>
            </select>
          </div>

          <!-- Animation Trigger -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{$t('Commons.label.trigger')}}
            </label>
            <div class="space-y-2">
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  :checked="animationTrigger === 'onLoad'"
                  name="trigger"
                  class="border-gray-300 dark:border-gray-600"
                  @change="updateAnimationTrigger('onLoad')"
                />
                <span class="text-sm">{{$t('Commons.text.on_load')}}</span>
              </label>
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  :checked="animationTrigger === 'onClick'"
                  name="trigger"
                  class="border-gray-300 dark:border-gray-600"
                  @change="updateAnimationTrigger('onClick')"
                />
                <span class="text-sm">{{$t('Commons.text.on_click')}}</span>
              </label>
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  :checked="animationTrigger === 'onHover'"
                  name="trigger"
                  class="border-gray-300 dark:border-gray-600"
                  @change="updateAnimationTrigger('onHover')"
                />
                <span class="text-sm">{{$t('Commons.text.on_hover')}}</span>
              </label>
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  :checked="animationTrigger === 'onScroll'"
                  name="trigger"
                  class="border-gray-300 dark:border-gray-600"
                  @change="updateAnimationTrigger('onScroll')"
                />
                <span class="text-sm">{{$t('Commons.text.on_scroll')}}</span>
              </label>
            </div>
          </div>

          <!-- Repeat Animation -->
          <div>
            <label class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                :checked="animationRepeat"
                class="rounded border-gray-300 dark:border-gray-600"
                @change="updateAnimationRepeat(($event.target as HTMLInputElement).checked)"
              />
              {{$t('Commons.label.repeat_animation')}}
            </label>
            <template v-if="animationRepeat">
              <div class="mt-2 space-y-2">
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    :checked="animationRepeatCount === 'infinite'"
                    name="repeat"
                    class="border-gray-300 dark:border-gray-600"
                    @change="updateAnimationRepeatCount('infinite')"
                  />
                  <span class="text-sm">{{$t('Commons.text.infinite')}}</span>
                </label>
                <div class="flex items-center gap-2">
                  <input
                    type="radio"
                    :checked="animationRepeatCount !== 'infinite'"
                    name="repeat"
                    class="border-gray-300 dark:border-gray-600"
                    @change="updateAnimationRepeatCount(1)"
                  />
                  <span class="text-sm">Times:</span>
                  <input
                    :value="animationRepeatCount === 'infinite' ? 1 : animationRepeatCount"
                    type="number"
                    min="1"
                    max="10"
                    class="w-16 text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    @input="updateAnimationRepeatCount(parseInt(($event.target as HTMLInputElement).value))"
                  />
                </div>
              </div>
            </template>
          </div>

          <!-- Preview Animation -->
          <div>
            <button
              @click="previewAnimation"
              class="w-full px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Play class="h-4 w-4" />
              {{$t('Commons.button.preview_animation')}}
            </button>
          </div>

          <!-- CSS Code Preview -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{$t('Commons.label.css_code')}}
            </label>
            <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
              <pre class="text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto"><code>{{ cssCode }}</code></pre>
            </div>
            <button
              @click="copyCssCode"
              class="mt-2 px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {{$t('Commons.button.copy_css')}}
            </button>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ArrowLeft, X, Sparkles, Play } from 'lucide-vue-next';
import type { MarkdownElement } from '@/utils/markdownElementDetector';

interface ElementAnimation {
  enabled: boolean;
  type: string;
  duration: number;
  delay: number;
  easing: string;
  trigger: 'onLoad' | 'onClick' | 'onHover' | 'onScroll';
  repeat: boolean;
  repeatCount: number | 'infinite';
}

interface Props {
  selectedElement?: HTMLElement | null;
  markdownElement?: MarkdownElement | null;
}

const props = withDefaults(defineProps<Props>(), {
  selectedElement: null,
  markdownElement: null
});

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'close'): void;
  (e: 'update-animation', animation: ElementAnimation): void;
}>();

// Animation state
const animationEnabled = ref(false);
const animationType = ref('fadeIn');
const animationDuration = ref(1000);
const animationDelay = ref(0);
const animationEasing = ref('ease-in-out');
const animationTrigger = ref<'onLoad' | 'onClick' | 'onHover' | 'onScroll'>('onLoad');
const animationRepeat = ref(false);
const animationRepeatCount = ref<number | 'infinite'>(1);

// Computed CSS code
const cssCode = computed(() => {
  if (!animationEnabled.value) return '/* Animation disabled */';
  
  const repeatValue = animationRepeat.value 
    ? animationRepeatCount.value === 'infinite' 
      ? 'infinite' 
      : animationRepeatCount.value
    : '1';
  
  return `.animated-element {
  animation: ${animationType.value} ${animationDuration.value}ms ${animationEasing.value} ${animationDelay.value}ms ${repeatValue};
}`;
});

// Methods
function toggleAnimation(enabled: boolean) {
  animationEnabled.value = enabled;
  emitUpdate();
}

function updateAnimationType(type: string) {
  animationType.value = type;
  emitUpdate();
}

function updateAnimationDuration(duration: number) {
  animationDuration.value = duration;
  emitUpdate();
}

function updateAnimationDelay(delay: number) {
  animationDelay.value = delay;
  emitUpdate();
}

function updateAnimationEasing(easing: string) {
  animationEasing.value = easing;
  emitUpdate();
}

function updateAnimationTrigger(trigger: 'onLoad' | 'onClick' | 'onHover' | 'onScroll') {
  animationTrigger.value = trigger;
  emitUpdate();
}

function updateAnimationRepeat(repeat: boolean) {
  animationRepeat.value = repeat;
  emitUpdate();
}

function updateAnimationRepeatCount(count: number | 'infinite') {
  animationRepeatCount.value = count;
  emitUpdate();
}

function emitUpdate() {
  const animation: ElementAnimation = {
    enabled: animationEnabled.value,
    type: animationType.value,
    duration: animationDuration.value,
    delay: animationDelay.value,
    easing: animationEasing.value,
    trigger: animationTrigger.value,
    repeat: animationRepeat.value,
    repeatCount: animationRepeatCount.value
  };
  
  emit('update-animation', animation);
}

function previewAnimation() {
  if (!props.selectedElement) return;
  
  // Apply animation temporarily for preview
  const element = props.selectedElement;
  const originalStyle = element.style.cssText;
  
  // Apply animation
  element.style.animation = `${animationType.value} ${animationDuration.value}ms ${animationEasing.value} ${animationDelay.value}ms ${animationRepeat.value ? (animationRepeatCount.value === 'infinite' ? 'infinite' : animationRepeatCount.value) : '1'}`;
  
  // Remove animation after it completes
  setTimeout(() => {
    element.style.cssText = originalStyle;
  }, animationDuration.value + animationDelay.value + 100);
}

function copyCssCode() {
  navigator.clipboard.writeText(cssCode.value).then(() => {
    // Show success feedback (you could emit an event or use a toast)
    console.log('CSS code copied to clipboard');
  });
}
</script>
