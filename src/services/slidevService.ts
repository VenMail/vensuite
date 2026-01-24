// Slidev Export Service
import { toast } from '@/composables/useToast';
import type { SlidevSlide } from '@/utils/slidevMarkdown';
import { t } from '@/i18n';

export type { SlidevSlide };

export interface SlidevExportOptions {
  format: 'pdf' | 'pptx' | 'png';
  theme?: string;
  title?: string;
  author?: string;
}

export interface SlidevPresentationConfig {
  theme: string;
  title: string;
  author?: string;
  download?: boolean;
  highlighter?: string;
  lineNumbers?: boolean;
  drawings?: {
    persist?: boolean;
  };
}

export class SlidevService {
  private static instance: SlidevService;

  static getInstance(): SlidevService {
    if (!SlidevService.instance) {
      SlidevService.instance = new SlidevService();
    }
    return SlidevService.instance;
  }

  /**
   * Convert slides to Slidev markdown format
   */
  convertSlidesToMarkdown(slides: SlidevSlide[], options: SlidevExportOptions): string {
    const frontmatter = [
      '---',
      `theme: ${options.theme || 'default'}`,
      `title: "${options.title || 'Presentation'}"`,
      options.author ? `author: "${options.author}"` : '',
      'download: true',
      'highlighter: shiki',
      'drawings:',
      '  persist: false',
      '---'
    ].filter(Boolean).join('\n');

    const slideContent = slides.map((slide, index) => {
      let content = '';
      
      // Add frontmatter for slides with layout or other properties
      if (slide.frontmatter && Object.keys(slide.frontmatter).length > 0) {
        content += '---\n';
        Object.entries(slide.frontmatter).forEach(([key, value]) => {
          if (typeof value === 'string') {
            content += `${key}: "${value}"\n`;
          } else {
            content += `${key}: ${value}\n`;
          }
        });
        content += '---\n\n';
      } else if (index > 0) {
        // Just add separator for subsequent slides without frontmatter
        content = '';
      }
      
      content += slide.content || '';
      
      // Add presenter notes as HTML comments
      if (slide.notes) {
        content += `\n\n<!--\n${slide.notes}\n-->`;
      }
      
      return content;
    }).join('\n\n---\n\n');

    return frontmatter + '\n\n' + slideContent;
  }

  /**
   * Parse Slidev markdown back to slides array
   */
  parseMarkdownToSlides(markdown: string): { slides: SlidevSlide[]; config: Partial<SlidevPresentationConfig> } {
    const slides: SlidevSlide[] = [];
    let config: Partial<SlidevPresentationConfig> = {};

    // Split by slide separator
    const parts = markdown.split(/\n---\n/);

    parts.forEach((part, index) => {
      const trimmed = part.trim();
      if (!trimmed) return;

      let content = trimmed;
      let frontmatter: Record<string, any> | undefined;
      let notes = '';

      // Check for frontmatter at start
      if (trimmed.startsWith('---')) {
        const endIndex = trimmed.indexOf('---', 3);
        if (endIndex > 0) {
          const yamlContent = trimmed.substring(3, endIndex).trim();
          frontmatter = this.parseYaml(yamlContent);
          content = trimmed.substring(endIndex + 3).trim();

          // First frontmatter is the headmatter/config
          if (index === 0) {
            config = frontmatter as Partial<SlidevPresentationConfig>;
          }
        }
      }

      // Extract notes from HTML comments at end
      const notesMatch = content.match(/<!--\s*([\s\S]*?)\s*-->$/);
      if (notesMatch) {
        notes = notesMatch[1].trim();
        content = content.substring(0, content.lastIndexOf('<!--')).trim();
      }

      slides.push({
        id: `slide-${index + 1}-${Date.now()}`,
        content,
        notes,
        frontmatter: index > 0 ? frontmatter : undefined
      });
    });

    return { slides, config };
  }

  private parseYaml(yaml: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = yaml.split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value: any = line.substring(colonIndex + 1).trim();

        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (/^\d+$/.test(value)) value = parseInt(value, 10);
        else if (/^\d+\.\d+$/.test(value)) value = parseFloat(value);
        else if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }

        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Export slides using client-side PDF generation (fallback)
   */
  private async exportClientSide(slides: SlidevSlide[], format: string): Promise<Blob> {
    // Create a temporary HTML document
    const htmlContent = slides.map((slide) => `
      <div class="slide" style="page-break-after: always; width: 1024px; height: 768px; padding: 40px; box-sizing: border-box; background: white;">
        ${slide.content}
      </div>
    `).join('\n');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: 1024px 768px; margin: 0; }
          body { margin: 0; font-family: 'Inter', sans-serif; }
          .slide { break-inside: avoid; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    if (format === 'pdf') {
      // Use browser's print functionality as fallback
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
      return new Blob(); // Return empty blob since we're using print
    }

    // For other formats, return HTML as blob
    return new Blob([html], { type: 'text/html' });
  }

  /**
   * Get authentication token from auth store or localStorage
   */
  private getAuthToken(): string {
    // Try to get from auth store first
    try {
      const { useAuthStore } = require('@/store/auth');
      const authStore = useAuthStore();
      const token = authStore.getToken();
      if (token) return token;
    } catch (e) {
      // Auth store not available, fallback to localStorage
    }
    
    // Fallback to localStorage
    return localStorage.getItem("venAuthToken") || '';
  }

  /**
   * Export slides using existing AppFileAPIController
   */
  private async exportServerSide(slides: SlidevSlide[], options: SlidevExportOptions): Promise<Blob> {
    const markdown = this.convertSlidesToMarkdown(slides, options);

    try {
      // Use the existing AppFileAPIController export endpoint pattern
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/app-files/export-${options.format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          content: markdown,
          title: options.title || 'Presentation',
          author: options.author,
          theme: options.theme || 'default',
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return response.blob();
    } catch (error) {
      console.error('Server-side export failed:', error);
      throw error;
    }
  }

  /**
   * Export slides to specified format
   */
  async exportSlides(slides: SlidevSlide[], options: SlidevExportOptions): Promise<void> {
    try {
      toast.info(`Exporting ${options.format.toUpperCase()}...`);

      let blob: Blob;
      let filename = `presentation.${options.format}`;

      try {
        // Try server-side export first
        blob = await this.exportServerSide(slides, options);
      } catch (serverError) {
        console.warn('Server-side export failed, falling back to client-side:', serverError);
        
        // Fallback to client-side export
        blob = await this.exportClientSide(slides, options.format);
        
        if (options.format === 'pdf') {
          toast.info(t('Services.SlidevService.toast.opening_print_dialog_for'));
          return; // Print dialog handles download
        }
        
        filename = `presentation.html`; // Client-side fallback exports HTML
      }

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${options.format.toUpperCase()} exported successfully`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(`Failed to export ${options.format.toUpperCase()}`);
    }
  }

  /**
   * Get available themes using existing API pattern
   */
  async getThemes(): Promise<Array<{ name: string; description: string }>> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/app-files/themes`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });
      
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      console.warn('Failed to fetch themes from server, using defaults');
    }

    // Fallback themes
    return [
      { name: 'default', description: t('Services.SlidevService.text.default_slidev_theme') },
      { name: 'seriph', description: t('Services.SlidevService.text.serif_typography_theme') },
      { name: 'shades-of-purple', description: t('Services.SlidevService.text.purple_gradient_theme') },
      { name: 'apple-basic', description: 'Apple-style presentation' },
      { name: 'bricks', description: t('Services.SlidevService.text.brick_wall_background_theme') },
      { name: 'carbon', description: t('Services.SlidevService.text.dark_carbon_fiber_theme') },
      { name: 'circuit-board', description: t('Services.SlidevService.text.tech_circuit_board_theme') },
      { name: 'gradient', description: t('Services.SlidevService.text.gradient_background_theme') },
      { name: 'mini', description: t('Services.SlidevService.text.compact_presentation_theme') },
      { name: 'penguin', description: t('Services.SlidevService.text.linux_penguin_theme') },
      { name: 'science', description: t('Services.SlidevService.text.scientific_presentation_theme') },
      { name: 'vibrant', description: t('Services.SlidevService.text.vibrant_colors_theme') },
    ];
  }

  /**
   * Validate slide content
   */
  validateSlide(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Slide content cannot be empty');
    }

    // Check for malformed HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    if (tempDiv.innerHTML !== content) {
      errors.push('Slide content contains malformed HTML');
    }

    // Check for extremely long content that might cause issues
    if (content.length > 50000) {
      errors.push('Slide content is too long (max 50,000 characters)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate slide thumbnail
   */
  async generateThumbnail(slide: SlidevSlide): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 200, 150);
        
        // Draw border
        ctx.strokeStyle = '#e5e7eb';
        ctx.strokeRect(0, 0, 200, 150);
        
        // Draw text preview
        ctx.fillStyle = '#374151';
        ctx.font = '12px Inter, sans-serif';
        const textContent = slide.content.replace(/<[^>]*>/g, '').substring(0, 100);
        const lines = textContent.split('\n').slice(0, 3);
        
        lines.forEach((line, lineIndex) => {
          ctx.fillText(line, 10, 20 + (lineIndex * 15));
        });
        
        resolve(canvas.toDataURL());
      } else {
        resolve(''); // Return empty string if canvas context is not available
      }
    });
  }
}

// Export singleton instance
export const slidevService = SlidevService.getInstance();
