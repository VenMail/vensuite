/**
 * Mermaid rendering composable
 * Handles initialization and rendering of Mermaid diagrams
 */
import { ref, onMounted } from 'vue';
import mermaid from 'mermaid';

export interface UseMermaidOptions {
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  securityLevel?: 'strict' | 'loose' | 'antiscript' | 'sandbox';
}

export function useMermaid(options: UseMermaidOptions = {}) {
  const isInitialized = ref(false);

  function initialize() {
    if (isInitialized.value) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: options.theme || 'default',
      securityLevel: options.securityLevel || 'loose',
      fontFamily: 'inherit',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      },
      sequence: {
        useMaxWidth: true,
        wrap: true
      },
      pie: {
        useMaxWidth: true
      },
      gantt: {
        useMaxWidth: true
      }
    });

    isInitialized.value = true;
  }

  async function renderDiagram(id: string, code: string): Promise<string> {
    if (!isInitialized.value) {
      initialize();
    }

    try {
      const { svg } = await mermaid.render(id, code);
      return svg;
    } catch (error) {
      console.error('Mermaid render error:', error);
      return `<div class="mermaid-error">Failed to render diagram</div>`;
    }
  }

  async function renderAllDiagrams(container: HTMLElement): Promise<void> {
    if (!isInitialized.value) {
      initialize();
    }

    const diagrams = container.querySelectorAll('.mermaid-diagram[data-mermaid]');
    
    for (let i = 0; i < diagrams.length; i++) {
      const element = diagrams[i] as HTMLElement;
      const code = element.dataset.mermaid;
      
      if (!code) continue;
      
      try {
        const decodedCode = decodeURIComponent(code);
        const id = `mermaid-${Date.now()}-${i}`;
        const svg = await renderDiagram(id, decodedCode);
        
        // Replace placeholder with actual SVG
        element.innerHTML = svg;
        element.classList.add('mermaid-rendered');
      } catch (error) {
        console.error('Failed to render mermaid diagram:', error);
      }
    }
  }

  function setTheme(theme: 'default' | 'dark' | 'forest' | 'neutral') {
    isInitialized.value = false;
    options.theme = theme;
    initialize();
  }

  onMounted(() => {
    initialize();
  });

  return {
    isInitialized,
    initialize,
    renderDiagram,
    renderAllDiagrams,
    setTheme
  };
}
