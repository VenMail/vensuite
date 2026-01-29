import { ref, computed, nextTick } from 'vue';

export interface AnimationConfig {
  [elementId: string]: {
    enabled: boolean;
    type: 'on-load' | 'on-click' | 'on-hover' | 'on-scroll';
    animation: string;
    duration?: string;
    delay?: string;
    easing?: string;
    repeat?: boolean;
    repeatCount?: number | 'infinite';
  };
}

export interface AnimationState {
  isAnimating: boolean;
  triggeredAnimations: Set<string>;
  animationQueue: string[];
}

export function useAnimations() {
  const animations = ref<AnimationConfig>({});
  const animationState = ref<AnimationState>({
    isAnimating: false,
    triggeredAnimations: new Set(),
    animationQueue: []
  });
  const isInitialized = ref(false);

  /**
   * CSS animation library with predefined animations
   */
  const animationLibrary = {
    // Fade animations
    fadeIn: 'fadeIn 0.5s ease-in-out',
    fadeOut: 'fadeOut 0.5s ease-in-out',
    fadeInUp: 'fadeInUp 0.6s ease-out',
    fadeInDown: 'fadeInDown 0.6s ease-out',
    fadeInLeft: 'fadeInLeft 0.6s ease-out',
    fadeInRight: 'fadeInRight 0.6s ease-out',

    // Slide animations
    slideInUp: 'slideInUp 0.6s ease-out',
    slideInDown: 'slideInDown 0.6s ease-out',
    slideInLeft: 'slideInLeft 0.6s ease-out',
    slideInRight: 'slideInRight 0.6s ease-out',

    // Scale animations
    scaleIn: 'scaleIn 0.5s ease-out',
    scaleOut: 'scaleOut 0.5s ease-out',
    zoomIn: 'zoomIn 0.5s ease-out',
    zoomOut: 'zoomOut 0.5s ease-out',

    // Rotate animations
    rotateIn: 'rotateIn 0.6s ease-out',
    rotateOut: 'rotateOut 0.6s ease-out',

    // Bounce animations
    bounceIn: 'bounceIn 0.8s ease-out',
    bounceOut: 'bounceOut 0.8s ease-out',
    bounce: 'bounce 1s ease-in-out infinite',

    // Special effects
    glow: 'glow 2s ease-in-out infinite',
    pulse: 'pulse 2s ease-in-out infinite',
    shake: 'shake 0.5s ease-in-out',
    wobble: 'wobble 1s ease-in-out',
    flip: 'flip 0.6s ease-in-out',
    flipInX: 'flipInX 0.6s ease-in-out',
    flipInY: 'flipInY 0.6s ease-in-out'
  };

  /**
   * Generate CSS keyframes for animations
   */
  function generateAnimationCSS(): string {
    return `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes fadeInDown {
        from {
          opacity: 0;
          transform: translateY(-30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes fadeInLeft {
        from {
          opacity: 0;
          transform: translateX(-30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes fadeInRight {
        from {
          opacity: 0;
          transform: translateX(30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes slideInUp {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
      }
      
      @keyframes slideInDown {
        from {
          transform: translateY(-100%);
        }
        to {
          transform: translateY(0);
        }
      }
      
      @keyframes slideInLeft {
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(0);
        }
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(0);
        }
      }
      
      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.3);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      @keyframes scaleOut {
        from {
          opacity: 1;
          transform: scale(1);
        }
        to {
          opacity: 0;
          transform: scale(0.3);
        }
      }
      
      @keyframes zoomIn {
        from {
          opacity: 0;
          transform: scale(0.1);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      @keyframes zoomOut {
        from {
          opacity: 1;
          transform: scale(1);
        }
        to {
          opacity: 0;
          transform: scale(0.1);
        }
      }
      
      @keyframes rotateIn {
        from {
          opacity: 0;
          transform: rotate(-200deg);
        }
        to {
          opacity: 1;
          transform: rotate(0);
        }
      }
      
      @keyframes rotateOut {
        from {
          opacity: 1;
          transform: rotate(0);
        }
        to {
          opacity: 0;
          transform: rotate(200deg);
        }
      }
      
      @keyframes bounceIn {
        0% {
          opacity: 0;
          transform: scale(0.3);
        }
        50% {
          opacity: 1;
          transform: scale(1.05);
        }
        70% {
          transform: scale(0.9);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      @keyframes bounceOut {
        0% {
          transform: scale(1);
        }
        25% {
          transform: scale(0.95);
        }
        50% {
          opacity: 1;
          transform: scale(1.1);
        }
        100% {
          opacity: 0;
          transform: scale(0.3);
        }
      }
      
      @keyframes bounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translateY(0);
        }
        40%, 43% {
          transform: translateY(-30px);
        }
        70% {
          transform: translateY(-15px);
        }
        90% {
          transform: translateY(-4px);
        }
      }
      
      @keyframes glow {
        0%, 100% {
          box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
        }
        50% {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
      }
      
      @keyframes shake {
        0%, 100% {
          transform: translateX(0);
        }
        10%, 30%, 50%, 70%, 90% {
          transform: translateX(-10px);
        }
        20%, 40%, 60%, 80% {
          transform: translateX(10px);
        }
      }
      
      @keyframes wobble {
        0% {
          transform: translateX(0%);
        }
        15% {
          transform: translateX(-25%) rotate(-5deg);
        }
        30% {
          transform: translateX(20%) rotate(3deg);
        }
        45% {
          transform: translateX(-15%) rotate(-3deg);
        }
        60% {
          transform: translateX(10%) rotate(2deg);
        }
        75% {
          transform: translateX(-5%) rotate(-1deg);
        }
        100% {
          transform: translateX(0%);
        }
      }
      
      @keyframes flip {
        from {
          transform: perspective(400px) rotateY(0);
        }
        to {
          transform: perspective(400px) rotateY(360deg);
        }
      }
      
      @keyframes flipInX {
        from {
          transform: perspective(400px) rotateX(90deg);
          opacity: 0;
        }
        40% {
          transform: perspective(400px) rotateX(-10deg);
        }
        70% {
          transform: perspective(400px) rotateX(10deg);
        }
        100% {
          transform: perspective(400px) rotateX(0deg);
          opacity: 1;
        }
      }
      
      @keyframes flipInY {
        from {
          transform: perspective(400px) rotateY(90deg);
          opacity: 0;
        }
        40% {
          transform: perspective(400px) rotateY(-10deg);
        }
        70% {
          transform: perspective(400px) rotateY(10deg);
        }
        100% {
          transform: perspective(400px) rotateY(0deg);
          opacity: 1;
        }
      }
      
      /* Animation classes */
      .animate-on-load {
        animation-fill-mode: both;
      }
      
      .animate-on-hover:hover {
        animation-fill-mode: both;
      }
      
      .animate-on-click.clicked {
        animation-fill-mode: both;
      }
      
      .animate-on-scroll.visible {
        animation-fill-mode: both;
      }
    `;
  }

  /**
   * Apply animation to an element
   */
  function applyAnimation(element: HTMLElement, animationConfig: AnimationConfig[string]): void {
    if (!animationConfig.enabled) return;

    const animationName = animationConfig.animation;
    const animationValue = animationLibrary[animationName as keyof typeof animationLibrary];
    
    if (!animationValue) {
      console.warn(`Animation "${animationName}" not found in library`);
      return;
    }

    // Parse animation value
    const [name, duration, easing] = animationValue.split(' ');
    const finalDuration = animationConfig.duration || duration || '0.5s';
    const finalEasing = animationConfig.easing || easing || 'ease-in-out';
    const delay = animationConfig.delay || '0s';
    const repeat = animationConfig.repeat ? 'infinite' : '1';

    // Build animation CSS
    const animationCSS = `${name} ${finalDuration} ${finalEasing} ${delay} ${repeat}`;
    
    // Apply animation styles
    element.style.animation = animationCSS;
    element.style.animationFillMode = 'both';

    // Add event listeners
    element.addEventListener('animationstart', () => {
      animationState.value.isAnimating = true;
    });

    element.addEventListener('animationend', () => {
      animationState.value.isAnimating = false;
      
      // Handle repeat logic
      if (animationConfig.repeat && animationConfig.repeatCount !== 'infinite') {
        const currentCount = parseInt(element.getAttribute('data-animation-count') || '0');
        const newCount = currentCount + 1;
        element.setAttribute('data-animation-count', newCount.toString());
        
        if (newCount >= (animationConfig.repeatCount || 1)) {
          element.style.animation = 'none';
        }
      }
    });
  }

  /**
   * Apply animations to all elements in a container
   */
  function applyAnimations(container: HTMLElement): void {
    if (!container) return;

    // Inject animation CSS if not already present
    if (!document.getElementById('slide-animations-css')) {
      const style = document.createElement('style');
      style.id = 'slide-animations-css';
      style.textContent = generateAnimationCSS();
      document.head.appendChild(style);
    }

    // Find all elements with animation data attributes
    const animatedElements = container.querySelectorAll('[data-animation]');
    
    animatedElements.forEach(element => {
      const elementId = element.getAttribute('data-animation-id') || 
                       element.getAttribute('data-markdown-line-start');
      
      if (elementId && animations.value[elementId]) {
        const animationConfig = animations.value[elementId];
        
        // Apply animation based on trigger type
        switch (animationConfig.type) {
          case 'on-load':
            element.classList.add('animate-on-load');
            applyAnimation(element as HTMLElement, animationConfig);
            break;
            
          case 'on-hover':
            element.classList.add('animate-on-hover');
            // Animation will be applied on hover
            element.addEventListener('mouseenter', () => {
              applyAnimation(element as HTMLElement, animationConfig);
            });
            break;
            
          case 'on-click':
            element.classList.add('animate-on-click');
            element.addEventListener('click', () => {
              element.classList.add('clicked');
              applyAnimation(element as HTMLElement, animationConfig);
              setTimeout(() => {
                element.classList.remove('clicked');
              }, 100);
            });
            break;
            
          case 'on-scroll':
            element.classList.add('animate-on-scroll');
            // Will be handled by scroll observer
            setupScrollObserver(element as HTMLElement, animationConfig);
            break;
        }
      }
    });
  }

  /**
   * Setup scroll observer for scroll-triggered animations
   */
  function setupScrollObserver(element: HTMLElement, animationConfig: AnimationConfig[string]): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            element.classList.add('visible');
            applyAnimation(element, animationConfig);
            observer.unobserve(element);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );
    
    observer.observe(element);
  }

  /**
   * Set animations configuration
   */
  function setAnimations(config: AnimationConfig): void {
    animations.value = { ...config };
  }

  /**
   * Add animation for an element
   */
  function addAnimation(elementId: string, config: AnimationConfig[string]): void {
    animations.value = {
      ...animations.value,
      [elementId]: config
    };
  }

  /**
   * Remove animation for an element
   */
  function removeAnimation(elementId: string): void {
    const newAnimations = { ...animations.value };
    delete newAnimations[elementId];
    animations.value = newAnimations;
  }

  /**
   * Clear all animations
   */
  function clearAnimations(): void {
    animations.value = {};
    animationState.value.triggeredAnimations.clear();
    animationState.value.animationQueue = [];
  }

  /**
   * Trigger animation manually
   */
  function triggerAnimation(elementId: string): void {
    const element = document.querySelector(`[data-animation-id="${elementId}"]`) as HTMLElement;
    const animationConfig = animations.value[elementId];
    
    if (element && animationConfig) {
      applyAnimation(element, animationConfig);
      animationState.value.triggeredAnimations.add(elementId);
    }
  }

  /**
   * Initialize animations
   */
  async function initializeAnimations(container: HTMLElement): Promise<void> {
    isInitialized.value = true;
    await nextTick();
    applyAnimations(container);
  }

  return {
    // State
    animations: computed(() => animations.value),
    animationState: computed(() => animationState.value),
    isInitialized: computed(() => isInitialized.value),
    
    // Methods
    setAnimations,
    addAnimation,
    removeAnimation,
    clearAnimations,
    triggerAnimation,
    applyAnimations,
    initializeAnimations,
    
    // Utilities
    generateAnimationCSS,
    animationLibrary
  };
}
