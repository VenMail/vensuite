/**
 * Unified Slide Export Pipeline
 * Handles all slide export operations with proper content rendering
 */

import { ref } from 'vue';
import { type SlidesEditorReturn } from '@/composables/useSlidesEditor';
import { useMermaid } from '@/composables/useMermaid';
import { parseMarkdownToHtml } from '@/utils/slidevMarkdown';
import type { SlidevSlide } from '@/utils/slidevMarkdown';

export interface ExportOptions {
  format: 'pdf' | 'pptx' | 'html';
  title?: string;
  theme?: string;
  includeNotes?: boolean;
  optimizeForPrint?: boolean;
  fontSize?: string;
  orientation?: 'portrait' | 'landscape';
}

export interface RenderedSlide {
  html: string;
  metadata: {
    hasMermaid: boolean;
    hasCharts: boolean;
    wordCount: number;
    estimatedHeight: number;
  };
}

export class SlideExportPipeline {
  private editor: SlidesEditorReturn;
  private mermaid: ReturnType<typeof useMermaid>;
  private tempContainer: HTMLElement | null = null;

  constructor(editor: SlidesEditorReturn) {
    this.editor = editor;
    this.mermaid = useMermaid();
  }

  /**
   * Main export method that handles all formats
   */
  async export(options: ExportOptions): Promise<Blob> {
    try {
      // Render all slides with proper content
      const renderedSlides = await this.renderAllSlides();
      
      switch (options.format) {
        case 'pdf':
          return this.exportToPdf(renderedSlides, options);
        case 'pptx':
          return this.exportToPptx(renderedSlides, options);
        case 'html':
          return this.exportToHtml(renderedSlides, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } finally {
      this.cleanup();
    }
  }

  /**
   * Render all slides with interactive content properly rendered
   */
  private async renderAllSlides(): Promise<RenderedSlide[]> {
    const slides = this.editor.slides.value;
    const rendered: RenderedSlide[] = [];

    // Create temporary container for rendering
    this.tempContainer = document.createElement('div');
    this.tempContainer.style.position = 'absolute';
    this.tempContainer.style.left = '-9999px';
    this.tempContainer.style.top = '-9999px';
    this.tempContainer.style.width = '1024px';
    this.tempContainer.style.fontSize = '16px';
    document.body.appendChild(this.tempContainer);

    for (const slide of slides) {
      const renderedSlide = await this.renderSlide(slide);
      rendered.push(renderedSlide);
    }

    return rendered;
  }

  /**
   * Render individual slide with all interactive content
   */
  private async renderSlide(slide: SlidevSlide): Promise<RenderedSlide> {
    // Create slide container
    const slideContainer = document.createElement('div');
    slideContainer.className = 'slide-export-container';
    slideContainer.style.cssText = `
      width: 1024px;
      min-height: 768px;
      padding: 40px;
      box-sizing: border-box;
      background: white;
      page-break-after: always;
      font-family: 'Inter', system-ui, sans-serif;
    `;

    // Parse and render markdown content
    const htmlContent = parseMarkdownToHtml(slide.content, this.editor.currentLayout.value);
    slideContainer.innerHTML = htmlContent;

    // Add to temporary container for DOM operations
    this.tempContainer!.appendChild(slideContainer);

    // Render Mermaid diagrams if present
    const hasMermaid = slideContainer.querySelectorAll('.mermaid-diagram').length > 0;
    if (hasMermaid) {
      await this.mermaid.renderAllDiagrams(slideContainer);
    }

    // Apply font optimization if needed
    await this.optimizeSlideFonts(slideContainer);

    // Extract metadata
    const metadata = this.extractSlideMetadata(slideContainer);

    return {
      html: slideContainer.outerHTML,
      metadata
    };
  }

  /**
   * Optimize fonts for export
   */
  private async optimizeSlideFonts(slideContainer: HTMLElement): Promise<void> {
    // Apply font sizing optimizations
    const elements = slideContainer.querySelectorAll('h1, h2, h3, p, li, td');
    elements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const computedStyle = window.getComputedStyle(htmlEl);
      
      // Convert font sizes to absolute values for export
      if (computedStyle.fontSize.includes('rem') || computedStyle.fontSize.includes('em')) {
        const fontSize = parseFloat(computedStyle.fontSize);
        htmlEl.style.fontSize = `${fontSize * 16}px`; // Convert to pixels
      }
    });
  }

  /**
   * Extract slide metadata for optimization
   */
  private extractSlideMetadata(container: HTMLElement): RenderedSlide['metadata'] {
    const textContent = container.textContent || '';
    const hasMermaid = container.querySelectorAll('.mermaid-diagram').length > 0;
    const hasCharts = container.querySelectorAll('svg, canvas, .chart').length > 0;
    
    return {
      hasMermaid,
      hasCharts,
      wordCount: textContent.split(/\s+/).length,
      estimatedHeight: container.scrollHeight
    };
  }

  /**
   * Export to PDF using server-side rendering
   */
  private async exportToPdf(slides: RenderedSlide[], options: ExportOptions): Promise<Blob> {
    const htmlContent = this.createPrintOptimizedHtml(slides, options);
    
    try {
      // Try server-side export first (higher quality)
      return await this.exportPdfServerSide(htmlContent, options);
    } catch (error) {
      console.warn('Server-side PDF export failed, falling back to client-side:', error);
      return this.exportPdfClientSide(slides, options);
    }
  }

  /**
   * Server-side PDF export using Playwright
   */
  private async exportPdfServerSide(htmlContent: string, options: ExportOptions): Promise<Blob> {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    
    const response = await fetch(`${API_BASE}/slides/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({
        html: htmlContent,
        format: 'pdf',
        title: options.title || 'presentation',
        theme: options.theme || 'venmail-pitch',
        orientation: options.orientation || 'portrait',
        includeNotes: options.includeNotes || false
      })
    });

    if (!response.ok) {
      throw new Error(`Server export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Client-side PDF export as fallback
   */
  private async exportPdfClientSide(slides: RenderedSlide[], options: ExportOptions): Promise<Blob> {
    // Create print-optimized HTML
    const htmlContent = this.createPrintOptimizedHtml(slides, options);
    
    // Use browser print functionality
    return new Promise((resolve, reject) => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        reject(new Error('Failed to open print window'));
        return;
      }

      printWindow.document.write(this.createPrintDocument(htmlContent, options));
      printWindow.document.close();

      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          
          // For now, return a placeholder blob
          // In a real implementation, you'd use a library like jsPDF
          resolve(new Blob([htmlContent], { type: 'application/pdf' }));
        }, 1000);
      };
    });
  }

  /**
   * Export to PPTX using server-side Slidev
   */
  private async exportToPptx(_slides: RenderedSlide[], options: ExportOptions): Promise<Blob> {
    // Convert slides back to Slidev markdown format
    const slidevMarkdown = this.editor.generateSlidevMarkdown();
    
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    
    const response = await fetch(`${API_BASE}/app-files/export-pptx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({
        content: slidevMarkdown,
        title: options.title || 'presentation',
        theme: options.theme || 'venmail-pitch'
      })
    });

    if (!response.ok) {
      throw new Error(`PPTX export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Export to HTML
   */
  private async exportToHtml(slides: RenderedSlide[], options: ExportOptions): Promise<Blob> {
    const htmlContent = this.createPrintOptimizedHtml(slides, options);
    return new Blob([htmlContent], { type: 'text/html' });
  }

  /**
   * Create print-optimized HTML document
   */
  private createPrintOptimizedHtml(slides: RenderedSlide[], options: ExportOptions): string {
    const slideHtml = slides.map(slide => slide.html).join('\n');
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title || 'Presentation'}</title>
    <style>
        @page {
            size: ${options.orientation || 'portrait'};
            margin: 20mm;
        }
        
        body {
            margin: 0;
            font-family: 'Inter', system-ui, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: #1e293b;
        }
        
        .slide-export-container {
            width: 100%;
            min-height: 100vh;
            padding: 40px;
            box-sizing: border-box;
            background: white;
            page-break-after: always;
            page-break-inside: avoid;
        }
        
        h1 { font-size: 36px; font-weight: 700; margin-bottom: 16px; }
        h2 { font-size: 28px; font-weight: 600; margin-bottom: 12px; }
        h3 { font-size: 22px; font-weight: 600; margin-bottom: 10px; }
        p { font-size: 18px; margin-bottom: 12px; }
        ul, ol { font-size: 18px; margin-left: 24px; margin-bottom: 12px; }
        li { margin-bottom: 4px; }
        code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: 'Fira Code', monospace; }
        pre { background: #1f2937; color: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; }
        pre code { background: transparent; padding: 0; }
        
        .mermaid-diagram svg {
            max-width: 100%;
            height: auto;
        }
        
        @media print {
            .slide-export-container {
                page-break-after: always;
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    ${slideHtml}
</body>
</html>`;
  }

  /**
   * Create complete print document
   */
  private createPrintDocument(htmlContent: string, options: ExportOptions): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${options.title || 'Presentation'}</title>
    <style>
        @page { size: A4; margin: 20mm; }
        body { margin: 0; font-family: 'Inter', sans-serif; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
  }

  /**
   * Get authentication token
   */
  private getAuthToken(): string {
    // Get token from your auth store
    return localStorage.getItem('auth_token') || '';
  }

  /**
   * Clean up temporary resources
   */
  private cleanup(): void {
    if (this.tempContainer && this.tempContainer.parentNode) {
      this.tempContainer.parentNode.removeChild(this.tempContainer);
      this.tempContainer = null;
    }
  }
}

/**
 * Composable for using the export pipeline
 */
export function useSlideExport(editor: SlidesEditorReturn) {
  const pipeline = new SlideExportPipeline(editor);
  const isExporting = ref(false);
  const exportProgress = ref(0);

  async function exportSlides(options: ExportOptions): Promise<void> {
    isExporting.value = true;
    exportProgress.value = 0;

    try {
      const blob = await pipeline.export(options);
      
      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${options.title || 'presentation'}.${options.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      isExporting.value = false;
      exportProgress.value = 0;
    }
  }

  return {
    exportSlides,
    isExporting,
    exportProgress
  };
}
