/**
 * Slide persistence composable
 * Handles save, load, autosave, and export operations
 */
import { ref, onUnmounted } from 'vue';
import { useFileStore } from '@/store/files';
import { toast } from 'vue-sonner';
import axios from 'axios';
import { 
  createDefaultSlides, 
  parseMarkdownToHtml,
  type SlidevSlide 
} from '@/utils/slidevMarkdown';
import type { SlidesEditorReturn } from './useSlidesEditor';

export interface UseSlidePersistenceOptions {
  editor: SlidesEditorReturn;
  autosaveDelay?: number;
}

export interface DeckData {
  title: string;
  theme: string;
  slides: SlidevSlide[];
  version: number;
}

const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const FILES_ENDPOINT = `${API_BASE_URI}/app-files`;

export function useSlidePersistence(options: UseSlidePersistenceOptions) {
  const { editor, autosaveDelay = 3000 } = options;
  const fileStore = useFileStore();

  // State
  const deckId = ref<string | null>(null);
  const deckTitle = ref('Untitled Presentation');
  const isSaving = ref(false);
  const isLoading = ref(false);
  const hasUnsavedChanges = ref(false);
  const lastSavedAt = ref<Date | null>(null);
  const autosaveTimer = ref<ReturnType<typeof setTimeout> | null>(null);

  // Sharing state
  const shareLink = ref('');
  const privacyType = ref(7);
  const shareMembers = ref<any[]>([]);
  const isOffline = ref(!navigator.onLine);

  // Network status handlers
  function setOnline() {
    isOffline.value = false;
  }

  function setOffline() {
    isOffline.value = true;
  }

  // Mark as dirty and schedule autosave
  function markDirty() {
    hasUnsavedChanges.value = true;
    scheduleAutosave();
  }

  function scheduleAutosave() {
    if (autosaveTimer.value) {
      clearTimeout(autosaveTimer.value);
    }
    autosaveTimer.value = setTimeout(() => {
      persistDeck().catch(err => console.warn('Autosave failed:', err));
    }, autosaveDelay);
  }

  function cancelAutosave() {
    if (autosaveTimer.value) {
      clearTimeout(autosaveTimer.value);
      autosaveTimer.value = null;
    }
  }

  // Save deck
  async function persistDeck(): Promise<boolean> {
    if (isSaving.value) return false;

    try {
      isSaving.value = true;

      const deckData: DeckData = {
        title: deckTitle.value,
        theme: editor.currentTheme.value,
        slides: editor.slides.value,
        version: 1
      };

      const filePayload = {
        id: deckId.value || undefined,
        title: deckTitle.value,
        file_type: 'pptx',
        content: JSON.stringify(deckData),
        is_folder: false
      };

      const result = await fileStore.saveDocument(filePayload as any);
      if (result.document?.id) {
        deckId.value = result.document.id;
      }

      hasUnsavedChanges.value = false;
      lastSavedAt.value = new Date();
      return true;
    } catch (error) {
      console.error('Failed to save deck:', error);
      toast.error('Failed to save presentation');
      throw error;
    } finally {
      isSaving.value = false;
    }
  }

  // Load deck
  async function loadDeck(id: string): Promise<boolean> {
    try {
      isLoading.value = true;

      const file = await fileStore.loadDocument(id, 'pptx');
      if (!file) {
        throw new Error('Presentation not found');
      }

      deckId.value = file.id || id;
      deckTitle.value = file.title || 'Untitled Presentation';

      if (file.content) {
        try {
          const data: DeckData = JSON.parse(file.content);
          editor.setSlides(data.slides || createDefaultSlides());
          editor.setTheme(data.theme || 'default');
        } catch {
          editor.setSlides(createDefaultSlides());
        }
      }

      hasUnsavedChanges.value = false;
      lastSavedAt.value = new Date();

      await hydrateSharing(id);
      return true;
    } catch (error) {
      console.error('Failed to load deck:', error);
      toast.error('Failed to load presentation');
      editor.setSlides(createDefaultSlides());
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Hydrate sharing info
  async function hydrateSharing(id: string) {
    try {
      const file = await fileStore.loadDocument(id, 'pptx') as any;
      if (file) {
        shareLink.value = file.file_url || `${window.location.origin}/slides/${id}`;
        privacyType.value = Number(file.privacy_type ?? 7);
      }
    } catch (error) {
      console.warn('Failed to hydrate sharing:', error);
    }
  }

  // Update visibility
  async function updateVisibility(value: number): Promise<boolean> {
    if (!deckId.value) {
      toast.info('Save the presentation first');
      return false;
    }
    try {
      await axios.patch(`${FILES_ENDPOINT}/${deckId.value}`, { privacy_type: value });
      privacyType.value = value;
      toast.success('Visibility updated');
      return true;
    } catch {
      toast.error('Failed to update visibility');
      return false;
    }
  }

  // Title change
  function setTitle(title: string) {
    deckTitle.value = title;
    markDirty();
  }

  // Export functions
  async function exportToPdf(): Promise<boolean> {
    try {
      toast.info('Exporting PDF...');

      // Use the new unified export pipeline
      const { useSlideExport } = await import('@/composables/useSlideExportPipeline');
      const exportPipeline = useSlideExport(editor);
      
      await exportPipeline.exportSlides({
        format: 'pdf',
        title: deckTitle.value,
        theme: editor.currentTheme.value,
        includeNotes: true,
        optimizeForPrint: true
      });
      
      toast.success('PDF exported successfully');
      return true;
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('PDF export failed. Please try again.');
      return false;
    }
  }

  async function exportToPptx(): Promise<boolean> {
    try {
      toast.info('Exporting PPTX...');

      // Use the new unified export pipeline
      const { useSlideExport } = await import('@/composables/useSlideExportPipeline');
      const exportPipeline = useSlideExport(editor);
      
      await exportPipeline.exportSlides({
        format: 'pptx',
        title: deckTitle.value,
        theme: editor.currentTheme.value,
        includeNotes: true
      });
      
      toast.success('PPTX exported successfully');
      return true;
    } catch (error) {
      console.error('PPTX export failed:', error);
      toast.error('PPTX export failed. Please try again.');
      return false;
    }
  }

  function generateSlidevMarkdown(): string {
    const frontmatter = `---
theme: ${editor.currentTheme.value}
title: "${deckTitle.value}"
download: true
---

`;

    const slideContent = editor.slides.value.map((slide, index) => {
      let content = '';

      if (slide.frontmatter && Object.keys(slide.frontmatter).length > 0) {
        content += '---\n';
        Object.entries(slide.frontmatter).forEach(([key, value]) => {
          content += `${key}: ${typeof value === 'string' ? `"${value}"` : value}\n`;
        });
        content += '---\n\n';
      } else if (index > 0) {
        content += '---\n\n';
      }

      content += slide.content;

      if (slide.notes) {
        content += `\n\n<!--\n${slide.notes}\n-->`;
      }

      return content;
    }).join('\n\n');

    return frontmatter + slideContent;
  }

  function exportPdfClientSide() {
    const htmlContent = editor.slides.value.map(slide => `
      <div style="page-break-after: always; width: 1024px; height: 768px; padding: 40px; box-sizing: border-box; background: white;">
        ${parseMarkdownToHtml(slide.content)}
      </div>
    `).join('\n');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${deckTitle.value}</title>
          <style>
            @page { size: 1024px 768px; margin: 0; }
            body { margin: 0; font-family: 'Inter', sans-serif; }
            h1 { font-size: 48px; margin-bottom: 16px; }
            h2 { font-size: 36px; margin-bottom: 12px; }
            p { font-size: 24px; line-height: 1.5; }
            ul, ol { font-size: 24px; margin-left: 32px; }
            code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
            pre { background: #1f2937; color: #f3f4f6; padding: 16px; border-radius: 8px; }
          </style>
        </head>
        <body>${htmlContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  }

  function downloadBlob(data: Blob, filename: string, mimeType: string) {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Import functions
  async function importFromPowerPoint(_file: File): Promise<boolean> {
    try {
      toast.info('Importing PowerPoint...');
      // This would need the slidesStore import functionality
      // For now, return false as placeholder
      toast.error('PowerPoint import not yet implemented');
      return false;
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import PowerPoint');
      return false;
    }
  }

  async function importFromHtml(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const sections = text.split(/<!--\s*slide\s*-->/i).filter(s => s.trim());
      
      const newSlides: SlidevSlide[] = sections.map((section, index) => ({
        id: Date.now().toString() + index,
        content: htmlToMarkdown(section),
        notes: ''
      }));

      editor.setSlides(newSlides);
      markDirty();
      toast.success('HTML imported successfully');
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import HTML');
      return false;
    }
  }

  function htmlToMarkdown(html: string): string {
    let md = html;
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n');
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    md = md.replace(/<[^>]+>/g, '');
    md = md.replace(/&nbsp;/g, ' ');
    md = md.replace(/&amp;/g, '&');
    md = md.replace(/&lt;/g, '<');
    md = md.replace(/&gt;/g, '>');
    return md.trim() || '# Slide\n\nContent here';
  }

  // Setup network listeners
  function setupNetworkListeners() {
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
  }

  function cleanupNetworkListeners() {
    window.removeEventListener('online', setOnline);
    window.removeEventListener('offline', setOffline);
  }

  // Cleanup
  onUnmounted(() => {
    cancelAutosave();
    cleanupNetworkListeners();
  });

  return {
    // State
    deckId,
    deckTitle,
    isSaving,
    isLoading,
    hasUnsavedChanges,
    lastSavedAt,
    isOffline,

    // Sharing
    shareLink,
    privacyType,
    shareMembers,

    // Core operations
    markDirty,
    persistDeck,
    loadDeck,
    setTitle,
    updateVisibility,

    // Export
    exportToPdf,
    exportToPptx,
    generateSlidevMarkdown,

    // Import
    importFromPowerPoint,
    importFromHtml,

    // Lifecycle
    setupNetworkListeners,
    cleanupNetworkListeners,
    cancelAutosave
  };
}

export type SlidePersistenceReturn = ReturnType<typeof useSlidePersistence>;
