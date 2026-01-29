import { ref, computed, nextTick, watch, type Ref } from 'vue';
import { 
  parseSlidevMarkdown, 
  splitMarkdownIntoBlocks,
  renderBlocksToHtml, 
  type MarkdownBlock 
} from '@/utils/slidevMarkdown';

export interface SlideRendererOptions {
  container?: Ref<HTMLElement | null>;
  enableArrangeMode?: boolean;
}

export interface AnimationConfig {
  [elementId: string]: {
    enabled: boolean;
    type: 'on-load' | 'on-click' | 'on-hover' | 'on-scroll';
    animation: string;
    duration?: string;
    delay?: string;
  };
}

export interface RenderedSlide {
  id: string;
  content: string;
  notes: string;
  frontmatter?: Record<string, any>;
  renderedHtml: string;
  blocks: MarkdownBlock[];
}

export function useSlideRenderer(options: SlideRendererOptions = {}) {
  const { container, enableArrangeMode = false } = options;

  // Reactive state
  const currentSlide = ref<RenderedSlide | null>(null);
  const isRendering = ref(false);
  const renderError = ref<string | null>(null);

  // Computed properties
  const renderedContent = computed(() => currentSlide.value?.renderedHtml || '');
  const slideBlocks = computed(() => currentSlide.value?.blocks || []);

  /**
   * Parse and render a markdown slide
   */
  async function renderSlide(markdown: string): Promise<RenderedSlide> {
    isRendering.value = true;
    renderError.value = null;

    try {
      // Parse markdown into blocks
      const blocks = splitMarkdownIntoBlocks(markdown);
      
      // Render blocks to HTML
      const renderedHtml = renderBlocksToHtml(blocks);

      const renderedSlide: RenderedSlide = {
        id: `slide-${Date.now()}`,
        content: markdown,
        notes: '',
        renderedHtml,
        blocks
      };

      currentSlide.value = renderedSlide;
      return renderedSlide;
    } catch (error) {
      console.error('Error rendering markdown:', error);
      renderError.value = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      isRendering.value = false;
    }
  }

  /**
   * Parse complete presentation
   */
  function parsePresentation(markdown: string): RenderedSlide[] {
    const presentation = parseSlidevMarkdown(markdown);
    return presentation.slides.map(slide => {
      const blocks = splitMarkdownIntoBlocks(slide.content);
      const renderedHtml = renderBlocksToHtml(blocks);
      
      return {
        ...slide,
        renderedHtml,
        blocks
      };
    });
  }

  /**
   * Apply arbitrary position classes to elements
   */
  function applyArbitraryPositionClasses(container: HTMLElement | null) {
    if (!container) return;

    container.querySelectorAll('[class*="["]').forEach((el) => {
      const htmlEl = el as HTMLElement;
      const cls = htmlEl.className || '';
      const hasAbsolute = /\babsolute\b/.test(cls);
      
      // Handle arbitrary top values like top-[18%], top-[100px], etc.
      const topMatch = cls.match(/\btop-\[([^\]]+)\]/);
      if (topMatch) {
        const topValue = topMatch[1];
        htmlEl.style.position = 'absolute';
        htmlEl.style.top = topValue;
      }
      
      // Handle arbitrary left values like left-[30%], left-[200px], etc.
      const leftMatch = cls.match(/\bleft-\[([^\]]+)\]/);
      if (leftMatch) {
        const leftValue = leftMatch[1];
        htmlEl.style.position = 'absolute';
        htmlEl.style.left = leftValue;
      }
      
      // If element has absolute positioning but no top/left, center it
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
    });
  }

  /**
   * Update element position in markdown
   */
  function updateElementPosition(
    markdown: string, 
    lineStart: number, 
    lineEnd: number, 
    position: { top?: string; left?: string }
  ): string {
    const lines = markdown.split('\n');
    const blockLines = lines.slice(lineStart, lineEnd + 1);
    const firstLine = blockLines[0] || '';
    
    // Parse existing attributes
    const attrMatch = firstLine.match(/^(.*?)(\s*\{([^}]*)\}\s*)?$/);
    if (!attrMatch) return markdown;
    
    const content = attrMatch[1];
    const existingAttrs = attrMatch[3] || '';
    
    // Parse position classes
    const classes = existingAttrs.match(/\.([^\s]+)/g) || [];
    const filtered = classes.filter(c => {
      const cls = c.slice(1);
      return !cls.startsWith('top-[') && !cls.startsWith('left-[') && 
             !['static', 'relative', 'absolute'].includes(cls);
    });
    
    // Add new position classes
    const newClasses = ['absolute'];
    if (position.top) {
      newClasses.push(position.top.includes('%') ? `top-[${position.top}]` : position.top);
    }
    if (position.left) {
      newClasses.push(position.left.includes('%') ? `left-[${position.left}]` : position.left);
    }
    
    const allClasses = [...filtered, ...newClasses].filter(Boolean);
    const classAttr = allClasses.length ? `.${allClasses.join(' .')}` : '';
    
    // Reconstruct line
    const newFirstLine = content + (classAttr ? ` {${classAttr}}` : '');
    const newBlockLines = [newFirstLine, ...blockLines.slice(1)];
    const newLines = [
      ...lines.slice(0, lineStart),
      ...newBlockLines,
      ...lines.slice(lineEnd + 1)
    ];
    
    return newLines.join('\n');
  }

  /**
   * Setup automatic rendering and style application
   */
  function setupAutoRender() {
    if (!container?.value) return;

    // Watch for content changes
    watch(() => currentSlide.value?.renderedHtml, async () => {
      await nextTick();
      if (container.value) {
        applyArbitraryPositionClasses(container.value);
      }
    }, { immediate: true });

    // Set up MutationObserver for arrange mode
    if (enableArrangeMode && container.value) {
      const observer = new MutationObserver(() => {
        if (container.value) {
          setTimeout(() => applyArbitraryPositionClasses(container.value), 10);
        }
      });
      
      observer.observe(container.value, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });
      
      // Store observer for cleanup
      (container.value as any)._mutationObserver = observer;
    }
  }

  /**
   * Cleanup resources
   */
  function cleanup() {
    // Clear MutationObserver
    if (container?.value && (container.value as any)._mutationObserver) {
      (container.value as any)._mutationObserver.disconnect();
      delete (container.value as any)._mutationObserver;
    }
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
    isRendering: computed(() => isRendering.value),
    renderError: computed(() => renderError.value),
    
    // Methods
    renderSlide,
    parsePresentation,
    applyArbitraryPositionClasses,
    updateElementPosition,
    setupAutoRender,
    cleanup
  };
}
