/**
 * Mermaid Diagram Scaling Composable
 * Provides intelligent scaling and layout optimization for Mermaid diagrams
 */

import { ref, computed, nextTick, type Ref } from 'vue';
import { debounce } from 'lodash-es';

export interface MermaidDiagramConfig {
  type: 'pie' | 'bar' | 'line' | 'flowchart' | 'sequence' | 'gantt' | 'gitgraph' | 'journey' | 'mindmap';
  maxScale: number;
  minScale: number;
  idealScale: number;
  aspectRatio: number;
  padding: number;
}

export interface DiagramMetrics {
  width: number;
  height: number;
  aspectRatio: number;
  elementCount: number;
  textLength: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface ScalingConstraints {
  maxWidth: number;
  maxHeight: number;
  availableWidth: number;
  availableHeight: number;
  preserveAspectRatio: boolean;
}

export const MERMAID_CONFIGS: Record<string, MermaidDiagramConfig> = {
  pie: {
    type: 'pie',
    maxScale: 1.2,
    minScale: 0.5,
    idealScale: 0.8,
    aspectRatio: 1,
    padding: 20
  },
  bar: {
    type: 'bar',
    maxScale: 1.0,
    minScale: 0.6,
    idealScale: 0.8,
    aspectRatio: 1.6,
    padding: 40
  },
  line: {
    type: 'line',
    maxScale: 1.0,
    minScale: 0.6,
    idealScale: 0.8,
    aspectRatio: 1.6,
    padding: 40
  },
  flowchart: {
    type: 'flowchart',
    maxScale: 0.9,
    minScale: 0.4,
    idealScale: 0.7,
    aspectRatio: 1.2,
    padding: 60
  },
  sequence: {
    type: 'sequence',
    maxScale: 0.8,
    minScale: 0.3,
    idealScale: 0.6,
    aspectRatio: 2.0,
    padding: 40
  },
  gantt: {
    type: 'gantt',
    maxScale: 0.8,
    minScale: 0.3,
    idealScale: 0.5,
    aspectRatio: 2.5,
    padding: 60
  },
  gitgraph: {
    type: 'gitgraph',
    maxScale: 1.0,
    minScale: 0.5,
    idealScale: 0.8,
    aspectRatio: 1.0,
    padding: 40
  },
  journey: {
    type: 'journey',
    maxScale: 0.9,
    minScale: 0.4,
    idealScale: 0.7,
    aspectRatio: 2.0,
    padding: 60
  },
  mindmap: {
    type: 'mindmap',
    maxScale: 0.8,
    minScale: 0.3,
    idealScale: 0.6,
    aspectRatio: 1.0,
    padding: 40
  }
};

export function useMermaidScaling(
  containerRef: Ref<HTMLElement | null>,
  options: {
    slideWidth?: number;
    slideHeight?: number;
    padding?: number;
    autoScale?: boolean;
  } = {}
) {
  const {
    slideWidth = 560,
    slideHeight = 420,
    padding = 32,
    autoScale = true
  } = options;

  // State
  const currentScale = ref(1.0);
  const diagramType = ref<'pie' | 'bar' | 'line' | 'flowchart' | 'sequence' | 'gantt' | 'gitgraph' | 'journey' | 'mindmap'>('pie');
  const diagramMetrics = ref<DiagramMetrics>({
    width: 0,
    height: 0,
    aspectRatio: 1,
    elementCount: 0,
    textLength: 0,
    complexity: 'simple'
  });
  const isAnalyzing = ref(false);
  const scalingApplied = ref(false);

  // Computed
  const currentConfig = computed(() => MERMAID_CONFIGS[diagramType.value] || MERMAID_CONFIGS.pie);

  const constraints = computed<ScalingConstraints>(() => ({
    maxWidth: slideWidth - (padding * 2),
    maxHeight: slideHeight - (padding * 2),
    availableWidth: slideWidth - (padding * 2),
    availableHeight: slideHeight - (padding * 2),
    preserveAspectRatio: true
  }));

  // Detect diagram type from mermaid code
  function detectDiagramType(mermaidCode: string): typeof diagramType.value {
    const code = mermaidCode.toLowerCase().trim();
    
    if (code.startsWith('pie')) return 'pie';
    if (code.startsWith('graph') || code.includes('graph ')) return 'flowchart';
    if (code.startsWith('flowchart')) return 'flowchart';
    if (code.startsWith('sequencediagram') || code.startsWith('sequence')) return 'sequence';
    if (code.startsWith('gantt')) return 'gantt';
    if (code.startsWith('gitgraph')) return 'gitgraph';
    if (code.startsWith('journey')) return 'journey';
    if (code.startsWith('mindmap')) return 'mindmap';
    if (code.includes('bar') || code.includes('axis')) return 'bar';
    if (code.includes('line') || code.includes('plot')) return 'line';
    
    return 'pie'; // default
  }

  // Analyze diagram metrics
  function analyzeDiagram(mermaidCode: string): DiagramMetrics {
    const type = detectDiagramType(mermaidCode);
    
    let elementCount = 0;
    let textLength = 0;
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';

    // Count elements based on type
    switch (type) {
      case 'pie':
        const pieMatches = mermaidCode.match(/"[^"]+"\s*:\s*\d+/g);
        elementCount = pieMatches?.length || 0;
        textLength = mermaidCode.replace(/[^a-zA-Z0-9\s]/g, '').length;
        break;
        
      case 'flowchart':
        const nodeMatches = mermaidCode.match(/\w+\[.*?\]/g);
        elementCount = nodeMatches?.length || 0;
        const arrowMatches = mermaidCode.match(/-->/g);
        elementCount += arrowMatches?.length || 0;
        textLength = mermaidCode.replace(/[^a-zA-Z0-9\s]/g, '').length;
        break;
        
      case 'sequence':
        const participantMatches = mermaidCode.match(/participant\s+\w+/g);
        elementCount = participantMatches?.length || 0;
        const messageMatches = mermaidCode.match(/\w+\s*-->>\s*\w+/g);
        elementCount += messageMatches?.length || 0;
        textLength = mermaidCode.replace(/[^a-zA-Z0-9\s]/g, '').length;
        break;
        
      default:
        elementCount = (mermaidCode.match(/\w+/g) || []).length;
        textLength = mermaidCode.replace(/[^a-zA-Z0-9\s]/g, '').length;
    }

    // Determine complexity
    if (elementCount > 20 || textLength > 500) {
      complexity = 'complex';
    } else if (elementCount > 8 || textLength > 200) {
      complexity = 'moderate';
    }

    // Estimate dimensions based on type and complexity
    let estimatedWidth = 300;
    let estimatedHeight = 200;

    switch (type) {
      case 'pie':
        estimatedWidth = 250;
        estimatedHeight = 250;
        break;
      case 'flowchart':
        estimatedWidth = Math.min(600, 200 + (elementCount * 30));
        estimatedHeight = Math.min(400, 150 + (elementCount * 20));
        break;
      case 'sequence':
        estimatedWidth = Math.min(700, 300 + (elementCount * 40));
        estimatedHeight = Math.min(500, 200 + (elementCount * 25));
        break;
      case 'bar':
      case 'line':
        estimatedWidth = 500;
        estimatedHeight = 300;
        break;
      case 'gantt':
        estimatedWidth = 800;
        estimatedHeight = 400;
        break;
      default:
        estimatedWidth = 400;
        estimatedHeight = 300;
    }

    // Adjust for complexity
    if (complexity === 'complex') {
      estimatedWidth *= 1.2;
      estimatedHeight *= 1.2;
    }

    return {
      width: estimatedWidth,
      height: estimatedHeight,
      aspectRatio: estimatedWidth / estimatedHeight,
      elementCount,
      textLength,
      complexity
    };
  }

  // Calculate optimal scale
  function calculateOptimalScale(
    metrics: DiagramMetrics,
    constraints: ScalingConstraints,
    diagramConfig: MermaidDiagramConfig
  ): number {
    let scale = diagramConfig.idealScale;

    // Scale based on width
    const widthScale = constraints.availableWidth / (metrics.width + (diagramConfig.padding * 2));
    
    // Scale based on height
    const heightScale = constraints.availableHeight / (metrics.height + (diagramConfig.padding * 2));

    // Use the more restrictive dimension
    const maxFitScale = Math.min(widthScale, heightScale);

    // Apply constraints
    scale = Math.min(diagramConfig.maxScale, Math.max(diagramConfig.minScale, maxFitScale));

    // Adjust for complexity
    if (metrics.complexity === 'complex') {
      scale = Math.min(scale, 0.8);
    } else if (metrics.complexity === 'simple') {
      scale = Math.max(scale, 0.7);
    }

    return Math.round(scale * 100) / 100;
  }

  // Apply scaling to diagram
  function applyScaling(element: HTMLElement, scale: number) {
    if (!element) return;

    // Find the SVG or main diagram container
    const svg = element.querySelector('svg');
    const diagramContainer = element.querySelector('.mermaid');
    
    const targetElement = svg || diagramContainer || element;
    
    // Apply transform with proper type checking
    if ('style' in targetElement) {
      const styledElement = targetElement as HTMLElement | SVGSVGElement;
      styledElement.style.transform = `scale(${scale})`;
      styledElement.style.transformOrigin = 'center';
      styledElement.style.transition = 'transform 0.3s ease';
    }

    // Adjust container if needed
    if (element.classList.contains('mermaid-diagram')) {
      element.style.display = 'flex';
      element.style.alignItems = 'center';
      element.style.justifyContent = 'center';
      element.style.minHeight = `${Math.round(diagramMetrics.value.height * scale + (currentConfig.value.padding * 2))}px`;
    }

    currentScale.value = scale;
    scalingApplied.value = true;
  }

  // Reset scaling
  function resetScaling(element?: HTMLElement) {
    const targetElement = element || containerRef.value?.querySelector('svg') || containerRef.value;
    
    if (targetElement && 'style' in targetElement) {
      const styledElement = targetElement as HTMLElement | SVGSVGElement;
      styledElement.style.transform = '';
      styledElement.style.transformOrigin = '';
      styledElement.style.transition = '';
    }

    if (containerRef.value && containerRef.value.classList.contains('mermaid-diagram')) {
      containerRef.value.style.minHeight = '';
    }

    currentScale.value = 1.0;
    scalingApplied.value = false;
  }

  // Auto-scale diagram
  const autoScaleDiagram = debounce(async (mermaidCode: string) => {
    if (!containerRef.value || !autoScale) return;

    isAnalyzing.value = true;

    await nextTick();

    try {
      // Detect type and analyze
      diagramType.value = detectDiagramType(mermaidCode);
      diagramMetrics.value = analyzeDiagram(mermaidCode);

      // Calculate optimal scale
      const optimalScale = calculateOptimalScale(
        diagramMetrics.value,
        constraints.value,
        currentConfig.value
      );

      // Apply scaling
      applyScaling(containerRef.value, optimalScale);

    } finally {
      isAnalyzing.value = false;
    }
  }, 300);

  // Manual scale adjustment
  function scaleUp() {
    const newScale = Math.min(currentConfig.value.maxScale, currentScale.value + 0.1);
    if (containerRef.value) {
      applyScaling(containerRef.value, newScale);
    }
  }

  function scaleDown() {
    const newScale = Math.max(currentConfig.value.minScale, currentScale.value - 0.1);
    if (containerRef.value) {
      applyScaling(containerRef.value, newScale);
    }
  }

  function setScale(scale: number) {
    const clampedScale = Math.max(
      currentConfig.value.minScale,
      Math.min(currentConfig.value.maxScale, scale)
    );
    if (containerRef.value) {
      applyScaling(containerRef.value, clampedScale);
    }
  }

  // Generate CSS for diagram container
  function generateDiagramCSS(type: typeof diagramType.value): string {
    const config = MERMAID_CONFIGS[type];
    
    return `
      .mermaid-diagram[data-type="${type}"] {
        padding: ${config.padding}px;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-radius: 0.75rem;
        margin: 1rem 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: ${Math.round(200 * config.idealScale)}px;
        max-width: 100%;
        overflow: hidden;
      }
      
      .mermaid-diagram[data-type="${type}"] svg {
        max-width: 100%;
        height: auto;
        transition: transform 0.3s ease;
      }
      
      .mermaid-diagram[data-type="${type}"].scaled svg {
        transform: scale(var(--scale, 1));
        transform-origin: center;
      }
    `;
  }

  // Get recommended font sizes for diagram labels
  function getRecommendedFontSizes(): Record<string, string> {
    const baseSize = 12 * currentScale.value;
    const complexity = diagramMetrics.value.complexity;
    
    let multiplier = 1;
    if (complexity === 'complex') multiplier = 0.8;
    if (complexity === 'simple') multiplier = 1.2;

    return {
      title: `${Math.round(baseSize * 1.5 * multiplier)}px`,
      label: `${Math.round(baseSize * multiplier)}px`,
      caption: `${Math.round(baseSize * 0.8 * multiplier)}px`
    };
  }

  return {
    // State
    currentScale,
    diagramType,
    diagramMetrics,
    isAnalyzing,
    scalingApplied,
    currentConfig,
    constraints,

    // Methods
    detectDiagramType,
    analyzeDiagram,
    calculateOptimalScale,
    applyScaling,
    resetScaling,
    autoScaleDiagram,
    scaleUp,
    scaleDown,
    setScale,
    generateDiagramCSS,
    getRecommendedFontSizes,

    // Constants
    MERMAID_CONFIGS
  };
}

export type MermaidScalingReturn = ReturnType<typeof useMermaidScaling>;
