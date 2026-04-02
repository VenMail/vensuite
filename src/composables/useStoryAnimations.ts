/**
 * useStoryAnimations — GSAP animation engine for the StoryTeller module.
 * Preset registry, timeline builder, playback controls, preview, cleanup.
 */
import { ref, computed, watch, onBeforeUnmount, type Ref } from 'vue';
import gsap from 'gsap';
import type {
  StoryScene,
  StoryAnimation,
  StoryAnimationPresetName,
} from '@/types/story';

// ─── Preset Definitions ───────────────────────────────────────────────

export type AnimationCategory = 'entrance' | 'exit' | 'emphasis' | 'motion';

export interface AnimationPresetDef {
  category: AnimationCategory;
  label: string;
  from: gsap.TweenVars;
  to: gsap.TweenVars;
  /** Optional custom handler for complex animations (typewriter, countUp, etc.) */
  custom?: (
    el: HTMLElement,
    animation: StoryAnimation,
    tl: gsap.core.Timeline,
    position: string | number,
  ) => void;
}

export const ANIMATION_PRESETS: Record<StoryAnimationPresetName, AnimationPresetDef> = {
  fadeIn: {
    category: 'entrance',
    label: 'Fade In',
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  fadeOut: {
    category: 'exit',
    label: 'Fade Out',
    from: { opacity: 1 },
    to: { opacity: 0 },
  },
  slideUp: {
    category: 'entrance',
    label: 'Slide Up',
    from: { y: 60, opacity: 0 },
    to: { y: 0, opacity: 1 },
  },
  slideDown: {
    category: 'entrance',
    label: 'Slide Down',
    from: { y: -60, opacity: 0 },
    to: { y: 0, opacity: 1 },
  },
  slideLeft: {
    category: 'entrance',
    label: 'Slide Left',
    from: { x: 80, opacity: 0 },
    to: { x: 0, opacity: 1 },
  },
  slideRight: {
    category: 'entrance',
    label: 'Slide Right',
    from: { x: -80, opacity: 0 },
    to: { x: 0, opacity: 1 },
  },
  zoomIn: {
    category: 'entrance',
    label: 'Zoom In',
    from: { scale: 0.5, opacity: 0 },
    to: { scale: 1, opacity: 1 },
  },
  zoomOut: {
    category: 'exit',
    label: 'Zoom Out',
    from: { scale: 1, opacity: 1 },
    to: { scale: 0.5, opacity: 0 },
  },
  rotateIn: {
    category: 'entrance',
    label: 'Rotate In',
    from: { rotation: -15, opacity: 0 },
    to: { rotation: 0, opacity: 1 },
  },
  flipX: {
    category: 'emphasis',
    label: 'Flip X',
    from: { rotationX: 90, opacity: 0 },
    to: { rotationX: 0, opacity: 1 },
  },
  flipY: {
    category: 'emphasis',
    label: 'Flip Y',
    from: { rotationY: 90, opacity: 0 },
    to: { rotationY: 0, opacity: 1 },
  },
  bounceIn: {
    category: 'entrance',
    label: 'Bounce In',
    from: { scale: 0.3, opacity: 0 },
    to: { scale: 1, opacity: 1, ease: 'bounce.out' },
  },
  blurIn: {
    category: 'entrance',
    label: 'Blur In',
    from: { filter: 'blur(20px)', opacity: 0 },
    to: { filter: 'blur(0px)', opacity: 1 },
  },
  parallax: {
    category: 'motion',
    label: 'Parallax',
    from: { y: 100 },
    to: { y: -100 },
  },
  typewriter: {
    category: 'entrance',
    label: 'Typewriter',
    from: {},
    to: {},
    custom(el, animation, tl, position) {
      const text = el.textContent || '';
      const origHTML = el.innerHTML;
      // Wrap each character in a span
      el.innerHTML = text
        .split('')
        .map((ch) => `<span class="story-tw-char" style="opacity:0">${ch === ' ' ? '&nbsp;' : ch}</span>`)
        .join('');
      const chars = el.querySelectorAll('.story-tw-char');
      tl.to(
        chars,
        {
          opacity: 1,
          duration: animation.duration / Math.max(chars.length, 1),
          stagger: animation.duration / Math.max(chars.length, 1),
          ease: 'none',
          onReverseComplete() {
            el.innerHTML = origHTML;
          },
        },
        position,
      );
    },
  },
  countUp: {
    category: 'entrance',
    label: 'Count Up',
    from: {},
    to: {},
    custom(el, animation, tl, position) {
      const targetText = el.textContent || '0';
      const targetNum = parseFloat(targetText.replace(/[^0-9.-]/g, '')) || 0;
      const proxy = { val: 0 };
      const prefix = targetText.match(/^[^0-9.-]*/)?.[0] || '';
      const suffix = targetText.match(/[^0-9.-]*$/)?.[0] || '';
      const isInt = !targetText.includes('.');
      tl.to(
        proxy,
        {
          val: targetNum,
          duration: animation.duration,
          ease: animation.easing || 'power2.out',
          onUpdate() {
            el.textContent = `${prefix}${isInt ? Math.round(proxy.val) : proxy.val.toFixed(1)}${suffix}`;
          },
        },
        position,
      );
    },
  },
  staggerChildren: {
    category: 'entrance',
    label: 'Stagger Children',
    from: { y: 30, opacity: 0 },
    to: { y: 0, opacity: 1 },
    custom(el, animation, tl, position) {
      const children = el.children;
      if (children.length === 0) return;
      tl.fromTo(
        children,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: animation.duration / Math.max(children.length, 1),
          stagger: 0.1,
          ease: animation.easing || 'power2.out',
        },
        position,
      );
    },
  },
  none: {
    category: 'entrance',
    label: 'None',
    from: {},
    to: {},
  },
  custom: {
    category: 'entrance',
    label: 'Custom',
    from: {},
    to: {},
  },
};

// ─── Grouped presets by category (for UI) ─────────────────────────────

export const PRESET_CATEGORIES: { id: AnimationCategory; label: string; presets: StoryAnimationPresetName[] }[] = [
  {
    id: 'entrance',
    label: 'Entrance',
    presets: ['fadeIn', 'slideUp', 'slideDown', 'slideLeft', 'slideRight', 'zoomIn', 'rotateIn', 'bounceIn', 'blurIn', 'typewriter', 'countUp', 'staggerChildren'],
  },
  {
    id: 'exit',
    label: 'Exit',
    presets: ['fadeOut', 'zoomOut'],
  },
  {
    id: 'emphasis',
    label: 'Emphasis',
    presets: ['flipX', 'flipY'],
  },
  {
    id: 'motion',
    label: 'Motion',
    presets: ['parallax'],
  },
];

// ─── Composable ───────────────────────────────────────────────────────

export interface UseStoryAnimationsOptions {
  containerRef: Ref<HTMLElement | null>;
  scenes: Ref<StoryScene[]>;
  currentSceneIndex: Ref<number>;
}

export function useStoryAnimations(options: UseStoryAnimationsOptions) {
  const { containerRef, scenes, currentSceneIndex } = options;

  // ── Internal state ────────────────────────────────────────────────
  let gsapCtx: gsap.Context | null = null;
  const currentTimeline = ref<gsap.core.Timeline | null>(null);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const totalDuration = computed(() => currentTimeline.value?.duration() ?? 0);

  // Ticker callback reference for cleanup
  let tickerCallback: (() => void) | null = null;

  // ── Element lookup ────────────────────────────────────────────────
  function getBlockElement(blockId: string): HTMLElement | null {
    return containerRef.value?.querySelector<HTMLElement>(
      `[data-block-id="${blockId}"]`,
    ) ?? null;
  }

  // ── Timeline position from trigger ────────────────────────────────
  function getTriggerPosition(trigger: StoryAnimation['trigger'], delay: number): string | number {
    switch (trigger) {
      case 'on-load':
      case 'on-enter':
        return delay;
      case 'after-previous':
        return `>${delay > 0 ? `+=${delay}` : ''}`;
      case 'with-previous':
        return `<${delay > 0 ? `+=${delay}` : ''}`;
      case 'on-click':
        // on-click animations are added at the same position as on-enter
        // but paused — click handler is wired separately
        return delay;
      default:
        return delay;
    }
  }

  // ── Build scene timeline ──────────────────────────────────────────
  function buildSceneTimeline(scene?: StoryScene): gsap.core.Timeline | null {
    const container = containerRef.value;
    if (!container) return null;

    const targetScene = scene ?? scenes.value[currentSceneIndex.value];
    if (!targetScene) return null;

    // Clean up previous
    cleanup();

    // Create scoped context
    gsapCtx = gsap.context(() => {}, container);

    const tl = gsap.timeline({ paused: true });

    // Collect all animations from all blocks, sorted by order
    const allAnimations: { animation: StoryAnimation; blockId: string }[] = [];
    for (const block of targetScene.blocks) {
      for (const anim of block.animations) {
        allAnimations.push({ animation: anim, blockId: block.id });
      }
    }
    allAnimations.sort((a, b) => a.animation.order - b.animation.order);

    // Build tweens
    for (const { animation, blockId } of allAnimations) {
      const el = getBlockElement(blockId);
      if (!el) continue;

      const preset = ANIMATION_PRESETS[animation.preset];
      if (!preset) continue;

      const position = getTriggerPosition(animation.trigger, animation.delay);
      const ease = animation.easing || 'power2.out';
      const duration = animation.duration || 0.6;

      if (animation.preset === 'none') continue;

      if (preset.custom) {
        preset.custom(el, animation, tl, position);
      } else if (animation.preset === 'custom') {
        // Use animation's own from/to
        const from = (animation.from as gsap.TweenVars) || {};
        const to = (animation.to as gsap.TweenVars) || {};
        tl.fromTo(el, from, { ...to, duration, ease }, position);
      } else {
        tl.fromTo(
          el,
          { ...preset.from },
          { ...preset.to, duration, ease },
          position,
        );
      }
    }

    currentTimeline.value = tl;
    return tl;
  }

  // ── Playback controls ─────────────────────────────────────────────
  function play() {
    if (!currentTimeline.value) {
      buildSceneTimeline();
    }
    if (!currentTimeline.value) return;

    currentTimeline.value.play();
    isPlaying.value = true;

    // Sync currentTime via ticker
    if (tickerCallback) gsap.ticker.remove(tickerCallback);
    tickerCallback = () => {
      if (currentTimeline.value) {
        currentTime.value = currentTimeline.value.time();
        if (currentTimeline.value.progress() >= 1) {
          isPlaying.value = false;
          if (tickerCallback) gsap.ticker.remove(tickerCallback);
        }
      }
    };
    gsap.ticker.add(tickerCallback);
  }

  function pause() {
    currentTimeline.value?.pause();
    isPlaying.value = false;
    if (tickerCallback) {
      gsap.ticker.remove(tickerCallback);
      tickerCallback = null;
    }
  }

  function seek(time: number) {
    if (!currentTimeline.value) {
      buildSceneTimeline();
    }
    currentTimeline.value?.seek(time);
    currentTime.value = time;
  }

  function restart() {
    if (!currentTimeline.value) {
      buildSceneTimeline();
    }
    currentTimeline.value?.restart();
    isPlaying.value = true;

    // Sync ticker
    if (tickerCallback) gsap.ticker.remove(tickerCallback);
    tickerCallback = () => {
      if (currentTimeline.value) {
        currentTime.value = currentTimeline.value.time();
        if (currentTimeline.value.progress() >= 1) {
          isPlaying.value = false;
          if (tickerCallback) gsap.ticker.remove(tickerCallback);
        }
      }
    };
    gsap.ticker.add(tickerCallback);
  }

  // ── Preview single animation ──────────────────────────────────────
  function previewAnimation(blockId: string, animation: StoryAnimation) {
    const el = getBlockElement(blockId);
    if (!el) return;

    const preset = ANIMATION_PRESETS[animation.preset];
    if (!preset) return;

    const duration = animation.duration || 0.6;
    const ease = animation.easing || 'power2.out';

    // Create temporary context for cleanup
    const ctx = gsap.context(() => {
      if (animation.preset === 'none') return;

      if (preset.custom) {
        const miniTl = gsap.timeline();
        preset.custom(el, animation, miniTl, 0);
        // Auto-revert after play
        miniTl.eventCallback('onComplete', () => {
          setTimeout(() => ctx.revert(), 300);
        });
      } else if (animation.preset === 'custom') {
        const from = (animation.from as gsap.TweenVars) || {};
        const to = (animation.to as gsap.TweenVars) || {};
        gsap.fromTo(el, from, {
          ...to,
          duration,
          ease,
          onComplete() {
            setTimeout(() => ctx.revert(), 300);
          },
        });
      } else {
        gsap.fromTo(el, { ...preset.from }, {
          ...preset.to,
          duration,
          ease,
          onComplete() {
            setTimeout(() => ctx.revert(), 300);
          },
        });
      }
    }, el.parentElement || el);
  }

  // ── Preview full scene ────────────────────────────────────────────
  function previewScene() {
    const tl = buildSceneTimeline();
    if (tl) {
      tl.restart();
      isPlaying.value = true;

      if (tickerCallback) gsap.ticker.remove(tickerCallback);
      tickerCallback = () => {
        if (currentTimeline.value) {
          currentTime.value = currentTimeline.value.time();
          if (currentTimeline.value.progress() >= 1) {
            isPlaying.value = false;
            if (tickerCallback) gsap.ticker.remove(tickerCallback);
          }
        }
      };
      gsap.ticker.add(tickerCallback);
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────
  function cleanup() {
    if (tickerCallback) {
      gsap.ticker.remove(tickerCallback);
      tickerCallback = null;
    }
    if (currentTimeline.value) {
      currentTimeline.value.kill();
      currentTimeline.value = null;
    }
    if (gsapCtx) {
      gsapCtx.revert();
      gsapCtx = null;
    }
    isPlaying.value = false;
    currentTime.value = 0;
  }

  // ── Scene change watcher ──────────────────────────────────────────
  watch(currentSceneIndex, () => {
    cleanup();
  });

  // ── Lifecycle cleanup ─────────────────────────────────────────────
  onBeforeUnmount(() => {
    cleanup();
  });

  return {
    // State
    currentTimeline,
    isPlaying,
    currentTime,
    totalDuration,

    // Element lookup
    getBlockElement,

    // Timeline
    buildSceneTimeline,

    // Playback
    play,
    pause,
    seek,
    restart,

    // Preview
    previewAnimation,
    previewScene,

    // Cleanup
    cleanup,

    // Constants
    ANIMATION_PRESETS,
    PRESET_CATEGORIES,
  };
}

export type StoryAnimationsReturn = ReturnType<typeof useStoryAnimations>;
