<script setup lang="ts">
/**
 * StoryPresenter — Full-screen presentation overlay.
 * Supports slide, scroll, and auto modes with GSAP animation playback,
 * drawing overlays, pointer/laser, scene transitions, and keyboard navigation.
 */
import {
  ref,
  computed,
  watch,
  nextTick,
  onBeforeUnmount,
  inject,
} from 'vue';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  Pointer,
  LayoutGrid,
  Maximize,
  Minimize,
} from 'lucide-vue-next';
import type { StoryStoreReturn } from '@/store/story';
import type { StoryPresenterReturn, DrawingPoint, DrawingStroke } from '@/composables/useStoryPresenter';
import { useStoryAnimations, ANIMATION_PRESETS } from '@/composables/useStoryAnimations';
import type { StoryScene, StoryAnimation } from '@/types/story';
import gsap from 'gsap';
import StorySceneRendererReadonly from './StorySceneRendererReadonly.vue';

const props = defineProps<{
  presenter: StoryPresenterReturn;
}>();

const store = inject<StoryStoreReturn>('storyStore')!;
const editor = computed(() => store.editor);
const settings = computed(() => editor.value.document.value?.settings);

// ── Element refs ────────────────────────────────────────────────────────
const presenterRef = ref<HTMLElement | null>(null);
const sceneContainerRef = ref<HTMLElement | null>(null);
const scrollContainerRef = ref<HTMLElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);

// ── Aliases for template readability ───────────────────────────────────
const p = props.presenter;
const currentScene = computed(() => p.currentPresentationScene.value);
const scenes = computed(() => editor.value.scenes.value);

// ── Viewport scaling ────────────────────────────────────────────────────
const windowW = ref(window.innerWidth);
const windowH = ref(window.innerHeight);

const viewportScale = computed(() => {
  const cw = settings.value.canvasWidth;
  const ch = settings.value.canvasHeight;
  return Math.min(windowW.value / cw, windowH.value / ch);
});

const viewportStyle = computed(() => ({
  width: `${settings.value.canvasWidth}px`,
  height: `${settings.value.canvasHeight}px`,
  transform: `scale(${viewportScale.value})`,
  transformOrigin: 'center center',
}));

function onResize() {
  windowW.value = window.innerWidth;
  windowH.value = window.innerHeight;
}

// ── Scene background ────────────────────────────────────────────────────
function getSceneBgStyle(scene: StoryScene | null) {
  if (!scene) return {};
  const bg = scene.background;
  if (bg.type === 'solid') return { backgroundColor: bg.value };
  if (bg.type === 'gradient') return { backgroundImage: bg.value };
  if (bg.type === 'image') return { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  return {};
}

// ── Scene transitions ───────────────────────────────────────────────────
const transitionName = computed(() => {
  const transition = currentScene.value?.transition;
  if (!transition || transition.type === 'none') return '';

  const type = transition.type;
  const dir = p.transitionDirection.value;

  if (type === 'slide') {
    return dir === 'forward' ? 'slide-left' : 'slide-right';
  }
  if (type === 'zoom') return 'zoom';
  return 'fade';
});

// ── GSAP animations on scene enter ──────────────────────────────────────
const presenterAnimations = useStoryAnimations({
  containerRef: sceneContainerRef,
  scenes: computed(() => editor.value.scenes.value),
  currentSceneIndex: computed(() => p.presentationSceneIndex.value),
});

function onSceneEntered() {
  nextTick(() => {
    presenterAnimations.buildSceneTimeline();
    presenterAnimations.play();
  });
}

// Cleanup animations on scene change
watch(() => p.presentationSceneIndex.value, () => {
  presenterAnimations.cleanup();
});

// ── Drawing ─────────────────────────────────────────────────────────────
const activeStroke = ref<DrawingStroke | null>(null);
let isDrawing = false;

function strokeToPoints(stroke: DrawingStroke): string {
  return stroke.points.map(pt => `${pt.x},${pt.y}`).join(' ');
}

function getSceneCoords(e: MouseEvent): DrawingPoint {
  const scale = viewportScale.value;
  const rect = (sceneContainerRef.value || presenterRef.value)?.getBoundingClientRect();
  if (!rect) return { x: e.clientX, y: e.clientY };
  return {
    x: (e.clientX - rect.left) / scale,
    y: (e.clientY - rect.top) / scale,
  };
}

function onDrawStart(e: MouseEvent) {
  if (!p.isDrawingMode.value) return;
  isDrawing = true;
  const pt = getSceneCoords(e);
  activeStroke.value = {
    points: [pt],
    color: p.drawingColor.value,
    width: p.drawingWidth.value,
  };
}

function onDrawMove(e: MouseEvent) {
  if (!isDrawing || !activeStroke.value) return;
  activeStroke.value.points.push(getSceneCoords(e));
}

function onDrawEnd() {
  if (!isDrawing || !activeStroke.value) return;
  isDrawing = false;
  if (activeStroke.value.points.length > 1) {
    p.addStroke(activeStroke.value);
  }
  activeStroke.value = null;
}

// ── Pointer tracking ───────────────────────────────────────────────────
function onPointerMove(e: MouseEvent) {
  if (p.isPointerMode.value) {
    p.updatePointerPosition({ x: e.clientX, y: e.clientY });
  }
}

function onPointerLeave() {
  if (p.isPointerMode.value) {
    p.updatePointerPosition(null);
  }
}

// ── Auto-hide controls ─────────────────────────────────────────────────
let hideControlsTimer: ReturnType<typeof setTimeout> | null = null;

function showControlsTemporarily() {
  p.showControls.value = true;
  if (hideControlsTimer) clearTimeout(hideControlsTimer);
  hideControlsTimer = setTimeout(() => {
    p.showControls.value = false;
  }, 3000);
}

function onMouseMove(e: MouseEvent) {
  showControlsTemporarily();
  onPointerMove(e);
}

// ── Focus on mount for keyboard ────────────────────────────────────────
watch(() => p.isPresenting.value, (presenting) => {
  if (presenting) {
    nextTick(() => {
      presenterRef.value?.focus();
      window.addEventListener('resize', onResize);
      onResize();
    });
  } else {
    presenterAnimations.cleanup();
    window.removeEventListener('resize', onResize);
  }
});

// ── Scroll mode: IntersectionObserver ──────────────────────────────────
const sceneContainerRefs = ref<Map<number, HTMLElement>>(new Map());
const scrollInnerRefs = ref<Map<number, HTMLElement>>(new Map());
let observers: IntersectionObserver[] = [];
const activeScrollSceneIndex = ref(0);

// Per-scene animation tracking for scroll mode
const scrollAnimatedScenes = new Set<number>();
const scrollSceneTimelines: gsap.core.Timeline[] = [];

function triggerScrollSceneAnimation(idx: number) {
  if (scrollAnimatedScenes.has(idx)) return;
  scrollAnimatedScenes.add(idx);

  const container = scrollInnerRefs.value.get(idx);
  if (!container) return;

  const targetScene = scenes.value[idx];
  if (!targetScene) return;

  // Build a one-off GSAP timeline for this scene
  const tl = gsap.timeline({ paused: true });

  const allAnimations: { animation: StoryAnimation; blockId: string }[] = [];
  for (const block of targetScene.blocks) {
    for (const anim of block.animations) {
      allAnimations.push({ animation: anim, blockId: block.id });
    }
  }
  allAnimations.sort((a, b) => a.animation.order - b.animation.order);

  for (const { animation, blockId } of allAnimations) {
    const el = container.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`);
    if (!el) continue;

    const preset = ANIMATION_PRESETS[animation.preset];
    if (!preset || animation.preset === 'none') continue;

    const ease = animation.easing || 'power2.out';
    const duration = animation.duration || 0.6;
    const delay = animation.delay || 0;

    if (preset.custom) {
      preset.custom(el, animation, tl, delay);
    } else {
      tl.fromTo(el, { ...preset.from }, { ...preset.to, duration, ease }, delay);
    }
  }

  scrollSceneTimelines.push(tl);

  nextTick(() => {
    tl.play();
  });
}

function setupScrollObservers() {
  cleanupScrollObservers();
  if (p.presentationMode.value !== 'scroll') return;

  nextTick(() => {
    sceneContainerRefs.value.forEach((el, idx) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
              activeScrollSceneIndex.value = idx;
              triggerScrollSceneAnimation(idx);
            }
          });
        },
        { threshold: 0.5 },
      );
      observer.observe(el);
      observers.push(observer);
    });
  });
}

function cleanupScrollObservers() {
  observers.forEach(o => o.disconnect());
  observers = [];
  // Clean up scroll-mode GSAP timelines
  scrollSceneTimelines.forEach(tl => tl.kill());
  scrollSceneTimelines.length = 0;
  scrollAnimatedScenes.clear();
}

function setSceneRef(index: number, el: HTMLElement | null) {
  if (el) {
    sceneContainerRefs.value.set(index, el);
  } else {
    sceneContainerRefs.value.delete(index);
  }
}

function setScrollInnerRef(index: number, el: HTMLElement | null) {
  if (el) {
    scrollInnerRefs.value.set(index, el);
  } else {
    scrollInnerRefs.value.delete(index);
  }
}

watch(() => p.presentationMode.value, (mode) => {
  if (mode === 'scroll' && p.isPresenting.value) {
    setupScrollObservers();
  } else {
    cleanupScrollObservers();
  }
});

// ── Cleanup ────────────────────────────────────────────────────────────
onBeforeUnmount(() => {
  presenterAnimations.cleanup();
  cleanupScrollObservers();
  window.removeEventListener('resize', onResize);
  if (hideControlsTimer) clearTimeout(hideControlsTimer);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="p.isPresenting.value"
      ref="presenterRef"
      class="fixed inset-0 z-[100] bg-black select-none outline-none"
      tabindex="0"
      @keydown="p.handleKeydown"
      @mousemove="onMouseMove"
      @mouseleave="onPointerLeave"
    >
      <!-- ═══════ SLIDE / AUTO MODE ═══════ -->
      <template v-if="p.presentationMode.value !== 'scroll'">
        <Transition :name="transitionName" mode="out-in" @after-enter="onSceneEntered">
          <div
            v-if="currentScene"
            :key="currentScene.id"
            class="w-full h-full flex items-center justify-center"
          >
            <div
              ref="sceneContainerRef"
              class="relative overflow-hidden"
              :style="viewportStyle"
            >
              <!-- Scene background -->
              <div class="absolute inset-0" :style="getSceneBgStyle(currentScene)" />

              <!-- Scene blocks -->
              <StorySceneRendererReadonly :scene="currentScene" />
            </div>
          </div>
        </Transition>
      </template>

      <!-- ═══════ SCROLL MODE ═══════ -->
      <template v-else>
        <div
          ref="scrollContainerRef"
          class="w-full h-full overflow-y-auto scroll-smooth"
        >
          <div
            v-for="(scene, i) in scenes"
            :key="scene.id"
            :ref="(el) => setSceneRef(i, el as HTMLElement)"
            class="min-h-screen flex items-center justify-center"
          >
            <div
              :ref="(el) => setScrollInnerRef(i, el as HTMLElement)"
              class="relative overflow-hidden"
              :style="viewportStyle"
            >
              <div class="absolute inset-0" :style="getSceneBgStyle(scene)" />
              <StorySceneRendererReadonly :scene="scene" />
            </div>
          </div>
        </div>
      </template>

      <!-- ═══════ DRAWING SVG OVERLAY ═══════ -->
      <svg
        v-if="p.isDrawingMode.value"
        ref="svgRef"
        class="absolute inset-0 z-10"
        style="cursor: crosshair"
        @mousedown="onDrawStart"
        @mousemove="onDrawMove"
        @mouseup="onDrawEnd"
        @mouseleave="onDrawEnd"
      >
        <!-- Existing strokes for current scene -->
        <polyline
          v-for="(stroke, i) in p.currentSceneDrawings.value"
          :key="i"
          :points="strokeToPoints(stroke)"
          :stroke="stroke.color"
          :stroke-width="stroke.width"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Active stroke being drawn -->
        <polyline
          v-if="activeStroke"
          :points="strokeToPoints(activeStroke)"
          :stroke="activeStroke.color"
          :stroke-width="activeStroke.width"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>

      <!-- ═══════ POINTER / LASER ═══════ -->
      <div
        v-if="p.isPointerMode.value && p.pointerPosition.value"
        class="absolute z-20 w-4 h-4 -ml-2 -mt-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50 pointer-events-none animate-pulse"
        :style="{
          left: `${p.pointerPosition.value.x}px`,
          top: `${p.pointerPosition.value.y}px`,
        }"
      />

      <!-- ═══════ PROGRESS BAR ═══════ -->
      <div
        v-if="settings.showProgressBar"
        class="absolute top-0 left-0 h-1 bg-purple-500 transition-all duration-300 z-30"
        :style="{ width: `${p.progressPercent.value}%` }"
      />

      <!-- ═══════ SCENE COUNTER ═══════ -->
      <div
        v-if="settings.showSceneIndicator"
        class="absolute top-4 right-4 text-white/50 text-sm font-mono z-30 transition-opacity duration-300"
        :class="p.showControls.value ? 'opacity-100' : 'opacity-0'"
      >
        {{ p.presentationSceneIndex.value + 1 }} / {{ p.totalScenes.value }}
      </div>

      <!-- ═══════ TIMER ═══════ -->
      <div
        class="absolute top-4 left-4 text-white/50 text-sm font-mono z-30 transition-opacity duration-300"
        :class="p.showControls.value ? 'opacity-100' : 'opacity-0'"
      >
        {{ p.formattedTime.value }}
      </div>

      <!-- ═══════ CONTROL BAR (auto-hide) ═══════ -->
      <div
        class="absolute bottom-4 left-1/2 -translate-x-1/2 z-30
               bg-black/70 backdrop-blur-md rounded-full px-3 py-2
               flex items-center gap-2 transition-opacity duration-300"
        :class="p.showControls.value ? 'opacity-100' : 'opacity-0 pointer-events-none'"
        @mouseenter="p.showControls.value = true"
      >
        <!-- Drawing toggle -->
        <button
          :class="[
            'p-1.5 rounded-full transition-colors',
            p.isDrawingMode.value ? 'bg-red-500/30 text-red-400' : 'text-white/60 hover:text-white',
          ]"
          title="Drawing (D)"
          @click="p.toggleDrawing()"
        >
          <Pencil class="w-4 h-4" />
        </button>

        <!-- Pointer toggle -->
        <button
          :class="[
            'p-1.5 rounded-full transition-colors',
            p.isPointerMode.value ? 'bg-red-500/30 text-red-400' : 'text-white/60 hover:text-white',
          ]"
          title="Pointer (P)"
          @click="p.togglePointer()"
        >
          <Pointer class="w-4 h-4" />
        </button>

        <div class="w-px h-5 bg-white/20" />

        <!-- Scene nav -->
        <button
          class="p-1.5 rounded-full text-white/60 hover:text-white transition-colors disabled:opacity-30"
          :disabled="p.presentationSceneIndex.value <= 0"
          @click="p.previousScene()"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <span class="text-white/60 text-xs font-mono tabular-nums min-w-[3rem] text-center">
          {{ p.presentationSceneIndex.value + 1 }} / {{ p.totalScenes.value }}
        </span>

        <button
          class="p-1.5 rounded-full text-white/60 hover:text-white transition-colors disabled:opacity-30"
          :disabled="p.presentationSceneIndex.value >= p.totalScenes.value - 1"
          @click="p.nextScene()"
        >
          <ChevronRight class="w-4 h-4" />
        </button>

        <div class="w-px h-5 bg-white/20" />

        <!-- Overview -->
        <button
          class="p-1.5 rounded-full text-white/60 hover:text-white transition-colors"
          title="Overview (O)"
          @click="p.showOverview.value = !p.showOverview.value"
        >
          <LayoutGrid class="w-4 h-4" />
        </button>

        <!-- Fullscreen -->
        <button
          class="p-1.5 rounded-full text-white/60 hover:text-white transition-colors"
          title="Toggle fullscreen"
          @click="p.isFullscreen.value ? p.exitFullscreen() : p.enterFullscreen()"
        >
          <Minimize v-if="p.isFullscreen.value" class="w-4 h-4" />
          <Maximize v-else class="w-4 h-4" />
        </button>

        <!-- Exit -->
        <button
          class="p-1.5 rounded-full text-white/60 hover:text-white transition-colors"
          title="Exit (Esc)"
          @click="p.stopPresentation()"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- ═══════ OVERVIEW GRID ═══════ -->
      <div
        v-if="p.showOverview.value"
        class="absolute inset-0 z-40 bg-black/90 p-8 overflow-auto"
        @click.self="p.showOverview.value = false"
      >
        <div class="grid grid-cols-4 gap-4 max-w-6xl mx-auto">
          <div
            v-for="(scene, i) in scenes"
            :key="scene.id"
            class="cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105"
            :class="
              i === p.presentationSceneIndex.value
                ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                : 'border-transparent hover:border-white/30'
            "
            @click="p.goToScene(i); p.showOverview.value = false"
          >
            <!-- Mini scene -->
            <div
              class="aspect-video relative overflow-hidden"
              :style="getSceneBgStyle(scene)"
            >
              <!-- Simplified block preview: just colored rectangles for performance -->
              <div
                v-for="block in scene.blocks.filter(b => !b.hidden)"
                :key="block.id"
                class="absolute"
                :style="{
                  left: `${(block.position.x / settings.canvasWidth) * 100}%`,
                  top: `${(block.position.y / settings.canvasHeight) * 100}%`,
                  width: `${(block.position.width / settings.canvasWidth) * 100}%`,
                  height: `${(block.position.height / settings.canvasHeight) * 100}%`,
                  backgroundColor: block.style.backgroundColor || (block.type === 'text' || block.type === 'heading' ? 'transparent' : '#e5e7eb'),
                  borderRadius: block.style.borderRadius || '2px',
                  opacity: 0.7,
                }"
              >
                <div
                  v-if="block.type === 'text' || block.type === 'heading'"
                  class="w-full h-full flex items-start p-1"
                >
                  <div
                    class="w-3/4 rounded-sm"
                    :style="{
                      height: block.type === 'heading' ? '30%' : '20%',
                      backgroundColor: '#9ca3af',
                      opacity: 0.5,
                    }"
                  />
                </div>
              </div>
            </div>
            <div class="text-white/60 text-[10px] text-center py-1 bg-black/50">
              {{ scene.name || `Scene ${i + 1}` }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Scene Transitions ─────────────────────────────────────────────────── */

/* Fade */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide Left (forward) */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.5s ease, opacity 0.3s ease;
}
.slide-left-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* Slide Right (backward) */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.5s ease, opacity 0.3s ease;
}
.slide-right-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}
.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Zoom */
.zoom-enter-active,
.zoom-leave-active {
  transition: transform 0.5s ease, opacity 0.3s ease;
}
.zoom-enter-from {
  transform: scale(0.8);
  opacity: 0;
}
.zoom-leave-to {
  transform: scale(1.2);
  opacity: 0;
}
</style>
