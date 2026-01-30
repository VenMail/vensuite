/**
 * Shared Slide Renderer
 * Provides common rendering logic for both preview and presenter modes
 */

import { type Ref } from 'vue';
import { useMermaid } from './useMermaid';

export interface SharedRendererOptions {
  container?: Ref<HTMLElement | null>;
  enableArrangeMode?: boolean;
  zoom?: number;
}

export function useSharedSlideRenderer(options: SharedRendererOptions = {}) {
  const { 
    zoom = 100
  } = options;

  const mermaid = useMermaid();

  /**
   * Apply position classes with zoom support
   * This is the critical function that ensures accurate positioning
   */
  function applyPositionsWithZoom(container: HTMLElement, _zoomLevel: number = 100) {
    if (!container) return;

    try {
      const elements = container.querySelectorAll('[class*="["]');
      
      elements.forEach((el) => {
        try {
          const htmlEl = el as HTMLElement;
          const cls = htmlEl.className || '';
          
          // Handle arbitrary top values
          const topMatch = cls.match(/\btop-\[([^\]]+)\]/);
          if (topMatch) {
            const topValue = topMatch[1];
            
            // Validate and sanitize top value
            if (isValidPositionValue(topValue)) {
              htmlEl.style.position = 'absolute';
              htmlEl.style.top = topValue;
            }
          }
          
          // Handle arbitrary left values
          const leftMatch = cls.match(/\bleft-\[([^\]]+)\]/);
          if (leftMatch) {
            const leftValue = leftMatch[1];
            
            // Validate and sanitize left value
            if (isValidPositionValue(leftValue)) {
              htmlEl.style.position = 'absolute';
              htmlEl.style.left = leftValue;
            }
          }
          
          // Handle absolute positioning without explicit coordinates
          const hasAbsolute = /\babsolute\b/.test(cls);
          if (hasAbsolute && !topMatch && !leftMatch) {
            htmlEl.style.position = 'absolute';
            htmlEl.style.top = '0';
            htmlEl.style.left = '0';
          }
        } catch (error) {
          console.error(`🎨 ERROR: Failed to process element:`, error);
        }
      });
    } catch (error) {
      console.error('🎨 ERROR: Failed to apply position classes:', error);
    }
  }

  /**
   * Validate position values
   */
  function isValidPositionValue(value: string): boolean {
    if (!value) return false;
    
    // Allow percentage values
    if (value.endsWith('%')) {
      const num = parseFloat(value.slice(0, -1));
      return !isNaN(num) && num >= 0 && num <= 100;
    }
    
    // Allow pixel values
    if (value.endsWith('px')) {
      const num = parseFloat(value.slice(0, -2));
      return !isNaN(num) && num >= 0;
    }
    
    // Allow rem values
    if (value.endsWith('rem')) {
      const num = parseFloat(value.slice(0, -3));
      return !isNaN(num) && num >= 0;
    }
    
    return false;
  }

  /**
   * Render slide content with all enhancements
   */
  async function renderSlideContent(
    container: HTMLElement,
    options: {
      layoutClass?: string;
      background?: string;
      textColor?: string;
      padding?: string;
      zoomLevel?: number;
      enableAnimations?: boolean;
      animations?: Map<string, any>;
    } = {}
  ) {
    const {
      layoutClass = '',
      background = '#ffffff',
      textColor = '#1e293b',
      padding = '32px',
      zoomLevel = zoom,
      enableAnimations = false,
      animations = new Map()
    } = options;

    // Set container styles
    container.style.background = background;
    container.style.color = textColor;
    container.style.padding = padding;
    container.style.position = 'relative'; // Critical for positioning context

    // Apply layout class if provided
    if (layoutClass) {
      container.className = container.className
        .split(' ')
        .filter(cls => !cls.startsWith('slide-layout-'))
        .join(' ') + ' ' + layoutClass;
    }

    // Apply position classes with zoom support
    applyPositionsWithZoom(container, zoomLevel);

    // Ensure all text elements inherit the color
    const textElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, span, div');
    textElements.forEach(el => {
      (el as HTMLElement).style.color = 'inherit';
    });

    // Render mermaid diagrams
    await mermaid.renderAllDiagrams(container);

    // Apply animations if enabled
    if (enableAnimations && animations) {
      applyAnimations(container, animations);
    }
  }

  /**
   * Apply animations to elements
   */
  function applyAnimations(container: HTMLElement, animations: Map<string, any>) {
    animations.forEach((animation, elementId) => {
      if (!animation.enabled) return;
      
      let element: HTMLElement | null = null;
      
      // Try to find element by ID
      element = container.querySelector(`#${elementId}`) as HTMLElement;
      
      // If not found by ID, try other selectors
      if (!element) {
        element = container.querySelector(`[data-id="${elementId}"]`) as HTMLElement;
      }
      
      if (element) {
        applyAnimationToElement(element, animation);
      }
    });
  }

  /**
   * Apply animation to a specific element
   */
  function applyAnimationToElement(element: HTMLElement, animation: any) {
    if (!animation.enabled) {
      element.style.animation = '';
      element.classList.remove('animated-element');
      return;
    }
    
    const repeatValue = animation.repeat 
      ? animation.repeatCount === 'infinite' 
        ? 'infinite' 
        : animation.repeatCount
      : '1';
    
    // Add animation class
    element.classList.add('animated-element');
    
    // Apply animation style
    element.style.animation = `${animation.type} ${animation.duration}ms ${animation.easing} ${animation.delay}ms ${repeatValue}`;
    element.style.animationFillMode = 'both';
  }

  /**
   * Setup common styles for slide containers
   */
  function setupSlideStyles(
    container: HTMLElement,
    options: {
      width?: string;
      height?: string;
      padding?: string;
      borderRadius?: string;
      boxShadow?: string;
    } = {}
  ) {
    const {
      width = '100%',
      height = '100%',
      padding = '32px',
      borderRadius = '8px',
      boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    } = options;

    container.style.width = width;
    container.style.height = height;
    container.style.padding = padding;
    container.style.borderRadius = borderRadius;
    container.style.boxShadow = boxShadow;
    container.style.overflow = 'hidden';
  }

  return {
    // Core rendering functions
    renderSlideContent,
    applyPositionsWithZoom,
    applyAnimations,
    setupSlideStyles,
    
    // Utilities
    isValidPositionValue,
    
    // Mermaid integration
    mermaid
  };
}
