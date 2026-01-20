/**
 * Smart Font Sizing Composable
 * Provides intelligent font sizing and layout optimization for slide content
 */

import { ref, computed, nextTick, type Ref } from 'vue';
import { debounce } from '@univerjs/core';

export interface FontSizingConstraints {
  minFontSize: number;
  maxFontSize: number;
  idealFontSize: number;
  lineHeight: number;
  maxWidth?: number;
}

export interface ContentMetrics {
  textLength: number;
  lineCount: number;
  hasDiagrams: boolean;
  hasLists: boolean;
  hasTables: boolean;
  estimatedHeight: number;
}

export interface LayoutConstraints {
  slideWidth: number;
  slideHeight: number;
  padding: number;
  availableWidth: number;
  availableHeight: number;
}

export interface TemplateProfile {
  name: string;
  constraints: {
    title: FontSizingConstraints;
    subtitle: FontSizingConstraints;
    body: FontSizingConstraints;
    caption: FontSizingConstraints;
  };
  layoutRules: {
    maxLinesTitle: number;
    maxLinesSubtitle: number;
    maxBodyHeight: number; // percentage of slide height
    diagramMaxSize: number; // percentage of slide area
  };
}

export const TEMPLATE_PROFILES: Record<string, TemplateProfile> = {
  'default': {
    name: 'Default',
    constraints: {
      title: { minFontSize: 24, maxFontSize: 48, idealFontSize: 36, lineHeight: 1.2 },
      subtitle: { minFontSize: 18, maxFontSize: 32, idealFontSize: 24, lineHeight: 1.3 },
      body: { minFontSize: 14, maxFontSize: 24, idealFontSize: 18, lineHeight: 1.6 },
      caption: { minFontSize: 12, maxFontSize: 18, idealFontSize: 14, lineHeight: 1.4 }
    },
    layoutRules: {
      maxLinesTitle: 2,
      maxLinesSubtitle: 3,
      maxBodyHeight: 0.6,
      diagramMaxSize: 0.5
    }
  },
  'infographic': {
    name: 'Infographic',
    constraints: {
      title: { minFontSize: 20, maxFontSize: 36, idealFontSize: 28, lineHeight: 1.2 },
      subtitle: { minFontSize: 16, maxFontSize: 24, idealFontSize: 20, lineHeight: 1.3 },
      body: { minFontSize: 12, maxFontSize: 18, idealFontSize: 14, lineHeight: 1.5 },
      caption: { minFontSize: 10, maxFontSize: 14, idealFontSize: 12, lineHeight: 1.4 }
    },
    layoutRules: {
      maxLinesTitle: 2,
      maxLinesSubtitle: 2,
      maxBodyHeight: 0.3,
      diagramMaxSize: 0.7
    }
  },
  'data-heavy': {
    name: 'Data Heavy',
    constraints: {
      title: { minFontSize: 18, maxFontSize: 28, idealFontSize: 22, lineHeight: 1.1 },
      subtitle: { minFontSize: 14, maxFontSize: 20, idealFontSize: 16, lineHeight: 1.2 },
      body: { minFontSize: 11, maxFontSize: 16, idealFontSize: 13, lineHeight: 1.4 },
      caption: { minFontSize: 10, maxFontSize: 12, idealFontSize: 11, lineHeight: 1.3 }
    },
    layoutRules: {
      maxLinesTitle: 1,
      maxLinesSubtitle: 2,
      maxBodyHeight: 0.4,
      diagramMaxSize: 0.6
    }
  },
  'minimal': {
    name: 'Minimal',
    constraints: {
      title: { minFontSize: 32, maxFontSize: 56, idealFontSize: 42, lineHeight: 1.1 },
      subtitle: { minFontSize: 20, maxFontSize: 36, idealFontSize: 28, lineHeight: 1.2 },
      body: { minFontSize: 16, maxFontSize: 24, idealFontSize: 20, lineHeight: 1.7 },
      caption: { minFontSize: 14, maxFontSize: 18, idealFontSize: 16, lineHeight: 1.5 }
    },
    layoutRules: {
      maxLinesTitle: 2,
      maxLinesSubtitle: 3,
      maxBodyHeight: 0.5,
      diagramMaxSize: 0.4
    }
  }
};

export function useSmartFontSizing(
  containerRef: Ref<HTMLElement | null>,
  options: {
    template?: string;
    slideWidth?: number;
    slideHeight?: number;
    padding?: number;
  } = {}
) {
  const {
    template = 'default',
    slideWidth = 560,
    slideHeight = 420,
    padding = 32
  } = options;

  // State
  const currentTemplate = ref(template);
  const isAnalyzing = ref(false);
  const overflowDetected = ref(false);
  const sizingRecommendations = ref<Record<string, string>>({});
  const contentMetrics = ref<ContentMetrics>({
    textLength: 0,
    lineCount: 0,
    hasDiagrams: false,
    hasLists: false,
    hasTables: false,
    estimatedHeight: 0
  });

  // Computed
  const templateProfile = computed(() => TEMPLATE_PROFILES[currentTemplate.value] || TEMPLATE_PROFILES.default);

  const layoutConstraints = computed<LayoutConstraints>(() => ({
    slideWidth,
    slideHeight,
    padding,
    availableWidth: slideWidth - (padding * 2),
    availableHeight: slideHeight - (padding * 2)
  }));

  // Analyze content metrics
  function analyzeContent(content: string): ContentMetrics {
    const metrics: ContentMetrics = {
      textLength: 0,
      lineCount: 0,
      hasDiagrams: false,
      hasLists: false,
      hasTables: false,
      estimatedHeight: 0
    };

    // Count text characters (excluding HTML tags and markdown)
    const textContent = content
      .replace(/<[^>]*>/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]*`/g, '')
      .replace(/^[#-]\s*/gm, '');
    
    metrics.textLength = textContent.length;
    metrics.lineCount = textContent.split('\n').length;

    // Check for content types
    metrics.hasDiagrams = /```mermaid|graph|piechart|flowchart|sequenceDiagram/i.test(content);
    metrics.hasLists = /^[\s]*[-*+]\s|^\d+\.\s/m.test(content);
    metrics.hasTables = /\|.*\|/m.test(content);

    // Estimate height based on content
    let estimatedHeight = 0;
    const profile = templateProfile.value;
    
    // Title height
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      const titleLines = titleMatch[1].split('\n').length;
      estimatedHeight += titleLines * profile.constraints.title.idealFontSize * profile.constraints.title.lineHeight;
    }

    // Subtitle height
    const subtitleMatch = content.match(/^##\s+(.+)$/m);
    if (subtitleMatch) {
      const subtitleLines = subtitleMatch[1].split('\n').length;
      estimatedHeight += subtitleLines * profile.constraints.subtitle.idealFontSize * profile.constraints.subtitle.lineHeight;
    }

    // Body content height
    const bodyContent = content
      .replace(/^#\s+.+$/m, '')
      .replace(/^##\s+.+$/m, '')
      .replace(/```mermaid[\s\S]*?```/g, '');
    
    const bodyLines = bodyContent.split('\n').length;
    estimatedHeight += bodyLines * profile.constraints.body.idealFontSize * profile.constraints.body.lineHeight;

    // Diagram height
    if (metrics.hasDiagrams) {
      estimatedHeight += layoutConstraints.value.availableHeight * profile.layoutRules.diagramMaxSize;
    }

    metrics.estimatedHeight = estimatedHeight;

    return metrics;
  }

  // Calculate optimal font size
  function calculateOptimalFontSize(
    text: string,
    elementType: 'title' | 'subtitle' | 'body' | 'caption',
    constraints: FontSizingConstraints,
    availableSpace: { width: number; height: number }
  ): number {
    const { minFontSize, maxFontSize, idealFontSize, lineHeight } = constraints;
    
    // Start with ideal size
    let optimalSize = idealFontSize;

    // Adjust based on text length
    const textLength = text.length;
    if (textLength > 100) {
      optimalSize = Math.max(minFontSize, optimalSize * 0.8);
    } else if (textLength < 20 && elementType === 'title') {
      optimalSize = Math.min(maxFontSize, optimalSize * 1.2);
    }

    // Check if text fits in available width
    const estimatedWidth = textLength * (optimalSize * 0.6); // Rough character width estimate
    if (estimatedWidth > availableSpace.width) {
      const scaleFactor = availableSpace.width / estimatedWidth;
      optimalSize = Math.max(minFontSize, optimalSize * scaleFactor);
    }

    // Check if text fits in available height
    const lines = Math.ceil(textLength / (availableSpace.width / (optimalSize * 0.6)));
    const estimatedHeight = lines * optimalSize * lineHeight;
    if (estimatedHeight > availableSpace.height) {
      const scaleFactor = availableSpace.height / estimatedHeight;
      optimalSize = Math.max(minFontSize, optimalSize * scaleFactor);
    }

    return Math.round(optimalSize);
  }

  // Generate font sizing recommendations
  function generateRecommendations(content: string, _container: HTMLElement): Record<string, string> {
    const recommendations: Record<string, string> = {};
    const profile = templateProfile.value;
    const layout = layoutConstraints.value;

    // Extract different content types
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const subtitleMatch = content.match(/^##\s+(.+)$/m);
    const bodyContent = content
      .replace(/^#\s+.+$/m, '')
      .replace(/^##\s+.+$/m, '')
      .replace(/```mermaid[\s\S]*?```/g, '');

    // Title sizing
    if (titleMatch) {
      const titleSize = calculateOptimalFontSize(
        titleMatch[1],
        'title',
        profile.constraints.title,
        { width: layout.availableWidth, height: layout.availableHeight * 0.2 }
      );
      recommendations.title = `${titleSize}px`;
    }

    // Subtitle sizing
    if (subtitleMatch) {
      const subtitleSize = calculateOptimalFontSize(
        subtitleMatch[1],
        'subtitle',
        profile.constraints.subtitle,
        { width: layout.availableWidth, height: layout.availableHeight * 0.15 }
      );
      recommendations.subtitle = `${subtitleSize}px`;
    }

    // Body sizing
    if (bodyContent.trim()) {
      const bodySize = calculateOptimalFontSize(
        bodyContent,
        'body',
        profile.constraints.body,
        { width: layout.availableWidth, height: layout.availableHeight * profile.layoutRules.maxBodyHeight }
      );
      recommendations.body = `${bodySize}px`;
    }

    return recommendations;
  }

  // Check for overflow
  function checkOverflow(container: HTMLElement): boolean {
    if (!container) return false;

    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;

    return scrollHeight > clientHeight || scrollWidth > clientWidth;
  }

  // Auto-scale content to fit
  function autoScaleContent(container: HTMLElement, scale: number = 0.95) {
    if (!container) return;

    const currentScale = parseFloat(container.style.transform?.replace('scale(', '')?.replace(')', '') || '1');
    const newScale = currentScale * scale;
    
    if (newScale >= 0.5 && newScale <= 1.0) {
      container.style.transform = `scale(${newScale})`;
      container.style.transformOrigin = 'top left';
      container.style.width = `${100 / newScale}%`;
      container.style.height = `${100 / newScale}%`;
    }
  }

  // Main analysis function
  const analyzeAndOptimize = debounce(async (content: string) => {
    if (!containerRef.value) return;

    isAnalyzing.value = true;
    
    await nextTick();

    try {
      // Analyze content
      contentMetrics.value = analyzeContent(content);

      // Generate recommendations
      sizingRecommendations.value = generateRecommendations(content, containerRef.value);

      // Check for overflow
      overflowDetected.value = checkOverflow(containerRef.value);

      // Auto-scale if overflow detected
      if (overflowDetected.value) {
        autoScaleContent(containerRef.value, 0.95);
      }
    } finally {
      isAnalyzing.value = false;
    }
  }, 300);

  // Apply font sizes
  function applyFontSizes(sizes: Record<string, string>) {
    if (!containerRef.value) return;

    const container = containerRef.value;

    // Apply title font size
    const titleElements = container.querySelectorAll('h1');
    titleElements.forEach(el => {
      if (sizes.title) {
        (el as HTMLElement).style.fontSize = sizes.title;
      }
    });

    // Apply subtitle font size
    const subtitleElements = container.querySelectorAll('h2, h3');
    subtitleElements.forEach(el => {
      if (sizes.subtitle) {
        (el as HTMLElement).style.fontSize = sizes.subtitle;
      }
    });

    // Apply body font size
    const bodyElements = container.querySelectorAll('p, li, td');
    bodyElements.forEach(el => {
      if (sizes.body) {
        (el as HTMLElement).style.fontSize = sizes.body;
      }
    });

    // Apply caption font size
    const captionElements = container.querySelectorAll('caption, .caption, figcaption');
    captionElements.forEach(el => {
      if (sizes.caption) {
        (el as HTMLElement).style.fontSize = sizes.caption || '14px';
      }
    });
  }

  // Reset scaling
  function resetScaling() {
    if (!containerRef.value) return;
    
    const container = containerRef.value;
    container.style.transform = '';
    container.style.transformOrigin = '';
    container.style.width = '';
    container.style.height = '';
  }

  // Switch template
  function switchTemplate(templateName: string) {
    currentTemplate.value = templateName;
    resetScaling();
  }

  // Generate CSS clamp values
  function generateClampValues(elementType: 'title' | 'subtitle' | 'body' | 'caption'): string {
    const constraints = templateProfile.value.constraints[elementType];
    return `clamp(${constraints.minFontSize}px, ${constraints.idealFontSize}px, ${constraints.maxFontSize}px)`;
  }

  return {
    // State
    currentTemplate,
    isAnalyzing,
    overflowDetected,
    sizingRecommendations,
    contentMetrics,
    templateProfile,
    layoutConstraints,

    // Methods
    analyzeAndOptimize,
    applyFontSizes,
    autoScaleContent,
    resetScaling,
    switchTemplate,
    generateClampValues,
    checkOverflow,

    // Constants
    TEMPLATE_PROFILES
  };
}

export type SmartFontSizingReturn = ReturnType<typeof useSmartFontSizing>;
