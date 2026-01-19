// Slidev Export Service
import { toast } from '@/composables/useToast';

export interface SlidevSlide {
  id: string;
  content: string;
  notes: string;
}

export interface SlidevExportOptions {
  format: 'pdf' | 'pptx' | 'png';
  theme?: string;
  title?: string;
  author?: string;
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
  private convertSlidesToMarkdown(slides: SlidevSlide[], options: SlidevExportOptions): string {
    const frontmatter = [
      '---',
      `theme: ${options.theme || 'default'}`,
      `title: "${options.title || 'Presentation'}"`,
      options.author ? `author: "${options.author}"` : '',
      'download: true',
      'export-filename: presentation',
      '---'
    ].filter(Boolean).join('\n');

    const slideContent = slides.map((slide) => {
      const slideNumber = slides.indexOf(slide) + 1;
      const content = slide.content || '';
      const notes = slide.notes ? `\n\n<!--\nPresenter Notes:\n${slide.notes}\n-->` : '';
      
      return [
        `<!-- Slide ${slideNumber} -->`,
        content,
        notes
      ].filter(Boolean).join('\n');
    }).join('\n\n---\n\n');

    return frontmatter + '\n\n' + slideContent;
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
          toast.info('Opening print dialog for PDF export...');
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
      { name: 'default', description: 'Default Slidev theme' },
      { name: 'seriph', description: 'Serif typography theme' },
      { name: 'shades-of-purple', description: 'Purple gradient theme' },
      { name: 'apple-basic', description: 'Apple-style presentation' },
      { name: 'bricks', description: 'Brick wall background theme' },
      { name: 'carbon', description: 'Dark carbon fiber theme' },
      { name: 'circuit-board', description: 'Tech circuit board theme' },
      { name: 'gradient', description: 'Gradient background theme' },
      { name: 'mini', description: 'Compact presentation theme' },
      { name: 'penguin', description: 'Linux penguin theme' },
      { name: 'science', description: 'Scientific presentation theme' },
      { name: 'vibrant', description: 'Vibrant colors theme' },
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
