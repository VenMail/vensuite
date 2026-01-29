/**
 * Slide Renderer with Robust Error Handling
 * Integrates comprehensive robustness improvements
 */

import { ref, computed, nextTick, watch, type Ref } from 'vue';
import { 
  parseSlidevMarkdown
} from '@/utils/slidevMarkdown';
import { 
  splitMarkdownIntoBlocksRobust, 
  renderBlocksToHtmlRobust
} from '@/utils/slideRendererRobustness';
import { useAnimations } from './useAnimations';
import { useVideoEmbed } from './useVideoEmbed';

export interface AnimationConfig {
  [elementId: string]: {
    enabled: boolean;
    type: 'on-load' | 'on-click' | 'on-hover' | 'on-scroll';
    animation: string;
    duration?: string;
    delay?: string;
  };
}

export interface SlideRendererOptions {
  container?: Ref<HTMLElement | null>;
  enableArrangeMode?: boolean;
  enableErrorRecovery?: boolean;
  maxRetries?: number;
}

export interface EnhancedRenderedSlide {
  id: string;
  content: string;
  notes: string;
  frontmatter?: Record<string, any>;
  renderedHtml: string;
  blocks: any[];
  errors: string[];
  warnings: string[];
  renderTime: number;
}

export interface RenderMetrics {
  totalSlides: number;
  successfulRenders: number;
  failedRenders: number;
  averageRenderTime: number;
  totalErrors: number;
  totalWarnings: number;
}

export function useSlideRenderer(options: SlideRendererOptions = {}) {
  const { 
    container, 
    enableArrangeMode = false, 
    enableErrorRecovery = true,
    maxRetries = 3 
  } = options;

  // Reactive state
  const currentSlide = ref<EnhancedRenderedSlide | null>(null);
  const isRendering = ref(false);
  const renderError = ref<string | null>(null);
  const renderMetrics = ref<RenderMetrics>({
    totalSlides: 0,
    successfulRenders: 0,
    failedRenders: 0,
    averageRenderTime: 0,
    totalErrors: 0,
    totalWarnings: 0
  });

  // Use composables
  const { animations, setAnimations, applyAnimations, initializeAnimations } = useAnimations();
  const { initializeVideoEmbeds } = useVideoEmbed();

  // Computed properties
  const renderedContent = computed(() => currentSlide.value?.renderedHtml || '');
  const slideBlocks = computed(() => currentSlide.value?.blocks || []);
  const slideErrors = computed(() => currentSlide.value?.errors || []);
  const slideWarnings = computed(() => currentSlide.value?.warnings || []);

  /**
   * Enhanced slide rendering with comprehensive error handling
   */
  async function renderSlide(markdown: string, retryCount = 0): Promise<EnhancedRenderedSlide> {
    const startTime = performance.now();
    isRendering.value = true;
    renderError.value = null;

    try {
      // Input validation
      if (!markdown || typeof markdown !== 'string') {
        throw new Error('Invalid markdown input: expected non-empty string');
      }

      // Parse blocks with robust error handling
      const { blocks, errors: blockErrors, warnings: blockWarnings } = splitMarkdownIntoBlocksRobust(markdown);
      
      // Render HTML with robust error handling
      const { html, errors: renderErrors, warnings: renderWarnings } = renderBlocksToHtmlRobust(blocks);

      // Combine all errors and warnings
      const allErrors = [...blockErrors, ...renderErrors];
      const allWarnings = [...blockWarnings, ...renderWarnings];

      const renderedSlide: EnhancedRenderedSlide = {
        id: `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: markdown,
        notes: '',
        renderedHtml: html,
        blocks,
        errors: allErrors,
        warnings: allWarnings,
        renderTime: performance.now() - startTime
      };

      currentSlide.value = renderedSlide;
      
      // Update metrics
      updateMetrics(renderedSlide);

      // Log warnings and errors
      if (allWarnings.length > 0) {
        console.warn('Slide rendering warnings:', allWarnings);
      }
      
      if (allErrors.length > 0) {
        console.error('Slide rendering errors:', allErrors);
        if (!enableErrorRecovery) {
          throw new Error(`Rendering failed with ${allErrors.length} errors`);
        }
      }

      return renderedSlide;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      renderError.value = errorMessage;
      
      console.error('Slide rendering error:', error);

      // Retry logic
      if (enableErrorRecovery && retryCount < maxRetries) {
        console.log(`Retrying render (${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1))); // Exponential backoff
        return renderSlide(markdown, retryCount + 1);
      }

      // Create fallback slide
      const fallbackSlide: EnhancedRenderedSlide = {
        id: `slide-fallback-${Date.now()}`,
        content: markdown,
        notes: '',
        renderedHtml: `<div class="render-error">
          <h3>Rendering Error</h3>
          <p>Failed to render slide content.</p>
          <details>
            <summary>Error Details</summary>
            <pre>${escapeHtml(errorMessage)}</pre>
          </details>
          <details>
            <summary>Original Content</summary>
            <pre>${escapeHtml(markdown)}</pre>
          </details>
        </div>`,
        blocks: [],
        errors: [errorMessage],
        warnings: [],
        renderTime: performance.now() - startTime
      };

      currentSlide.value = fallbackSlide;
      updateMetrics(fallbackSlide);
      
      return fallbackSlide;
    } finally {
      isRendering.value = false;
    }
  }

  /**
   * Enhanced presentation parsing with error recovery
   */
  function parsePresentation(markdown: string): EnhancedRenderedSlide[] {
    const startTime = performance.now();
    const slides: EnhancedRenderedSlide[] = [];
    
    try {
      if (!markdown || typeof markdown !== 'string') {
        throw new Error('Invalid presentation input');
      }

      const presentation = parseSlidevMarkdown(markdown);
      
      for (const slide of presentation.slides) {
        try {
          const { blocks, errors: blockErrors, warnings: blockWarnings } = splitMarkdownIntoBlocksRobust(slide.content);
          const { html, errors: renderErrors, warnings: renderWarnings } = renderBlocksToHtmlRobust(blocks);
          
          const enhancedSlide: EnhancedRenderedSlide = {
            ...slide,
            id: slide.id || `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            renderedHtml: html,
            blocks,
            errors: [...blockErrors, ...renderErrors],
            warnings: [...blockWarnings, ...renderWarnings],
            renderTime: 0 // Not tracked for batch parsing
          };
          
          slides.push(enhancedSlide);
          
        } catch (slideError) {
          console.error(`Error parsing slide ${slide.id}:`, slideError);
          
          // Add fallback slide
          const fallbackSlide: EnhancedRenderedSlide = {
            ...slide,
            id: slide.id || `slide-fallback-${Date.now()}`,
            renderedHtml: `<div class="slide-error">
              <h3>Slide Parse Error</h3>
              <p>Failed to parse this slide.</p>
              <details>
                <summary>Error Details</summary>
                <pre>${escapeHtml(slideError instanceof Error ? slideError.message : String(slideError))}</pre>
              </details>
            </div>`,
            blocks: [],
            errors: [slideError instanceof Error ? slideError.message : String(slideError)],
            warnings: [],
            renderTime: 0
          };
          
          slides.push(fallbackSlide);
        }
      }

      console.log(`Parsed ${slides.length} slides in ${(performance.now() - startTime).toFixed(2)}ms`);
      return slides;

    } catch (error) {
      console.error('Critical presentation parsing error:', error);
      
      // Return minimal fallback presentation
      return [{
        id: 'fallback-presentation',
        content: markdown || '',
        notes: '',
        renderedHtml: `<div class="presentation-error">
          <h2>Presentation Error</h2>
          <p>Failed to parse the entire presentation.</p>
          <details>
            <summary>Error Details</summary>
            <pre>${escapeHtml(error instanceof Error ? error.message : String(error))}</pre>
          </details>
        </div>`,
        blocks: [],
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        renderTime: 0
      }];
    }
  }

  /**
   * Enhanced arbitrary position class application
   */
  function applyArbitraryPositionClasses(container: HTMLElement | null): void {
    if (!container) return;

    try {
      const elements = container.querySelectorAll('[class*="["]');
      console.log('🎨 DEBUG: Elements with bracket classes:', elements.length);
      
      elements.forEach((el, index) => {
        try {
          const htmlEl = el as HTMLElement;
          const cls = htmlEl.className || '';
          console.log(`🎨 DEBUG: Element ${index} classes:`, cls);
          
          // Handle arbitrary top values
          const topMatch = cls.match(/\btop-\[([^\]]+)\]/);
          if (topMatch) {
            const topValue = topMatch[1];
            console.log(`🎨 DEBUG: Found top value: ${topValue}`);
            
            // Validate and sanitize top value
            if (isValidPositionValue(topValue)) {
              htmlEl.style.position = 'absolute';
              htmlEl.style.top = topValue;
              console.log(`🎨 DEBUG: Applied top: ${topValue}`);
            } else {
              console.warn(`Invalid top value: ${topValue}`);
            }
          }
          
          // Handle arbitrary left values
          const leftMatch = cls.match(/\bleft-\[([^\]]+)\]/);
          if (leftMatch) {
            const leftValue = leftMatch[1];
            console.log(`🎨 DEBUG: Found left value: ${leftValue}`);
            
            // Validate and sanitize left value
            if (isValidPositionValue(leftValue)) {
              htmlEl.style.position = 'absolute';
              htmlEl.style.left = leftValue;
              console.log(`🎨 DEBUG: Applied left: ${leftValue}`);
            } else {
              console.warn(`Invalid left value: ${leftValue}`);
            }
          }
          
          // Handle absolute positioning without explicit coordinates
          const hasAbsolute = /\babsolute\b/.test(cls);
          console.log(`🎨 DEBUG: Has absolute class: ${hasAbsolute}`);
          if (hasAbsolute && !topMatch && !leftMatch) {
            htmlEl.style.position = 'absolute';
            if (!htmlEl.style.top && !htmlEl.style.left) {
              htmlEl.style.top = '50%';
              htmlEl.style.left = '50%';
              htmlEl.style.transform = 'translate(-50%, -50%)';
              htmlEl.style.transformOrigin = 'center center';
            }
          } else if (hasAbsolute || topMatch || leftMatch) {
            if (!htmlEl.style.transform || htmlEl.style.transform === 'none') {
              htmlEl.style.transform = 'translate(-50%, -50%)';
              htmlEl.style.transformOrigin = 'center center';
            }
          }

        } catch (elementError) {
          console.error('Error applying position classes to element:', elementError);
        }
      });

    } catch (error) {
      console.error('Error applying arbitrary position classes:', error);
    }
  }

  /**
   * Validate position values for security and correctness
   */
  function isValidPositionValue(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    
    // Allow percentage values
    if (/^-?\d+(\.\d+)?%$/.test(value)) return true;
    
    // Allow pixel values
    if (/^-?\d+px$/.test(value)) return true;
    
    // Allow viewport units
    if (/^-?\d+(\.\d+)?vh$/.test(value)) return true;
    if (/^-?\d+(\.\d+)?vw$/.test(value)) return true;
    
    // Allow em/rem values
    if (/^-?\d+(\.\d+)?em$/.test(value)) return true;
    if (/^-?\d+(\.\d+)?rem$/.test(value)) return true;
    
    // Allow calc() expressions (basic validation)
    if (value.startsWith('calc(') && value.endsWith(')')) {
      const inner = value.slice(5, -1);
      // Basic check for potentially dangerous content
      if (!/javascript:|data:|expression\(/.test(inner)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Update rendering metrics
   */
  function updateMetrics(slide: EnhancedRenderedSlide): void {
    renderMetrics.value.totalSlides++;
    
    if (slide.errors.length > 0) {
      renderMetrics.value.failedRenders++;
    } else {
      renderMetrics.value.successfulRenders++;
    }
    
    renderMetrics.value.totalErrors += slide.errors.length;
    renderMetrics.value.totalWarnings += slide.warnings.length;
    
    // Update average render time
    const totalTime = renderMetrics.value.averageRenderTime * (renderMetrics.value.totalSlides - 1) + slide.renderTime;
    renderMetrics.value.averageRenderTime = totalTime / renderMetrics.value.totalSlides;
  }

  /**
   * Reset metrics
   */
  function resetMetrics(): void {
    renderMetrics.value = {
      totalSlides: 0,
      successfulRenders: 0,
      failedRenders: 0,
      averageRenderTime: 0,
      totalErrors: 0,
      totalWarnings: 0
    };
  }

  /**
   * Setup enhanced auto-render with error handling
   */
  function setupAutoRender(): void {
    if (!container?.value) return;

    // Watch for content changes with error handling
    watch(() => currentSlide.value?.renderedHtml, async () => {
      try {
        await nextTick();
        if (container.value) {
          applyArbitraryPositionClasses(container.value);
          
          // Initialize animations with error handling
          try {
            await initializeAnimations(container.value);
          } catch (animError) {
            console.warn('Animation initialization failed:', animError);
          }
          
          // Initialize video embeds with error handling
          try {
            await initializeVideoEmbeds(container.value);
          } catch (videoError) {
            console.warn('Video embed initialization failed:', videoError);
          }
        }
      } catch (error) {
        console.error('Auto-render setup error:', error);
      }
    }, { immediate: true });

    // Enhanced MutationObserver for arrange mode
    if (enableArrangeMode && container.value) {
      const observer = new MutationObserver(async () => {
        try {
          if (container.value) {
            setTimeout(() => {
              try {
                applyArbitraryPositionClasses(container.value);
                if (container.value) applyAnimations(container.value);
              } catch (error) {
                console.error('MutationObserver error:', error);
              }
            }, 10);
          }
        } catch (error) {
          console.error('MutationObserver callback error:', error);
        }
      });
      
      try {
        observer.observe(container.value, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class']
        });
        
        // Store observer for cleanup
        (container.value as any)._mutationObserver = observer;
      } catch (error) {
        console.error('Failed to setup MutationObserver:', error);
      }
    }
  }

  /**
   * Enhanced cleanup
   */
  function cleanup(): void {
    try {
      // Clear MutationObserver
      if (container?.value && (container.value as any)._mutationObserver) {
        (container.value as any)._mutationObserver.disconnect();
        delete (container.value as any)._mutationObserver;
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Get diagnostic information
   */
  function getDiagnostics(): {
    currentSlide: EnhancedRenderedSlide | null;
    metrics: RenderMetrics;
    isRendering: boolean;
    renderError: string | null;
  } {
    return {
      currentSlide: currentSlide.value,
      metrics: { ...renderMetrics.value },
      isRendering: isRendering.value,
      renderError: renderError.value
    };
  }

  // Initialize auto-render if container is provided
  if (container) {
    setupAutoRender();
  }

  return {
    // State
    currentSlide: computed(() => currentSlide.value),
    renderedContent,
    slideBlocks,
    slideErrors,
    slideWarnings,
    isRendering: computed(() => isRendering.value),
    renderError: computed(() => renderError.value),
    renderMetrics: computed(() => renderMetrics.value),
    
    // Methods
    renderSlide: renderSlide,
    parsePresentation: parsePresentation,
    applyArbitraryPositionClasses: applyArbitraryPositionClasses,
    setupAutoRender: setupAutoRender,
    cleanup: cleanup,
    resetMetrics,
    getDiagnostics,
    
    // Animation methods
    animations,
    setAnimations,
    applyAnimations,
    initializeAnimations,
    
    // Video methods
    initializeVideoEmbeds
  };
}

/**
 * Simple HTML escape function
 */
function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
