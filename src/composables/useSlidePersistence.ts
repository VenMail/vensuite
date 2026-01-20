/**
 * Slide persistence composable
 * Handles save, load, autosave, and export operations
 */
import { ref, onUnmounted, computed } from 'vue';
import { useFileStore } from '@/store/files';
import { useAuthStore } from '@/store/auth';
import { toast } from 'vue-sonner';
import axios from 'axios';
import { 
  createDefaultSlides, 
  type SlidevSlide 
} from '@/utils/slidevMarkdown';
import type { SlidesEditorReturn } from './useSlidesEditor';
import type { ShareMember, ShareLevel } from '@/utils/sharing';
import { parseSharingInfoString, serializeSharingInfoString } from '@/utils/sharing';

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
  const hasUserMadeChanges = ref(false); // Track if user has made any changes

  // Sharing state
  const shareLink = ref('');
  const privacyType = ref(7);
  const shareMembers = ref<ShareMember[]>([]);
  const isOffline = ref(!navigator.onLine);
  
  // Auth store for user info
  const authStore = useAuthStore();
  
  // Computed properties
  const canShare = computed(() => authStore.isAuthenticated && deckId.value);
  const shareLinkDoc = computed(() => {
    if (!deckId.value) return '';
    const baseUrl = import.meta.env.VITE_SHARE_BASE_URL || window.location.origin;
    return `${baseUrl}/slides/${deckId.value}`;
  });

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
    
    // Track first user change
    if (!hasUserMadeChanges.value) {
      hasUserMadeChanges.value = true;
      // Auto-guess title from first slide if still untitled
      if (deckTitle.value === 'Untitled Presentation') {
        const guessedTitle = guessTitleFromSlides();
        if (guessedTitle && guessedTitle !== 'Untitled Presentation') {
          deckTitle.value = guessedTitle;
          toast.info(`Auto-detected title: "${guessedTitle}"`);
        }
      }
      // Trigger immediate auto-save on first change
      setTimeout(() => {
        persistDeck().catch(err => console.warn('First change auto-save failed:', err));
      }, 1000);
    }
    
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
      hasUserMadeChanges.value = false; // Reset user changes flag

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
        shareLink.value = file.file_public_url || shareLinkDoc.value;
        privacyType.value = Number(file.privacy_type ?? 7);
        
        // Parse sharing members if available
        if (file.sharing_info) {
          const sharing = parseSharingInfoString(file.sharing_info);
          shareMembers.value = (sharing as any).members || [];
        }
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
      const payload: any = { privacy_type: value };
      if (shareMembers.value.length > 0) {
        payload.sharing_info = serializeSharingInfoString({
          members: shareMembers.value,
          level: value as unknown as ShareLevel
        } as any);
      }
      
      await axios.patch(`${FILES_ENDPOINT}/${deckId.value}`, payload, {
        headers: { Authorization: `Bearer ${fileStore.getToken()}` }
      });
      privacyType.value = value;
      toast.success('Visibility updated');
      return true;
    } catch (error) {
      console.error('Failed to update visibility:', error);
      toast.error('Failed to update visibility');
      return false;
    }
  }

  // Title change
  function setTitle(title: string) {
    deckTitle.value = title;
    markDirty();
  }

  // Auto-guess title from first slide content
  function guessTitleFromSlides(): string {
    const slides = editor.slides.value;
    if (!slides || slides.length === 0) {
      return 'Untitled Presentation';
    }

    const firstSlide = slides[0];
    const content = firstSlide.content || '';

    // Try to extract title from markdown content
    // Look for # Title (h1)
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match && h1Match[1]) {
      return h1Match[1].trim();
    }

    // Look for ## Title (h2) if no h1 found
    const h2Match = content.match(/^##\s+(.+)$/m);
    if (h2Match && h2Match[1]) {
      return h2Match[1].trim();
    }

    // Look for first line if it's not empty and doesn't contain markdown
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      // Skip if it looks like markdown syntax
      if (!firstLine.startsWith('#') && !firstLine.startsWith('!') && !firstLine.startsWith('[') && firstLine.length < 50) {
        return firstLine;
      }
    }

    // Look for text content that might be a title
    const textContent = content.replace(/[#*`\[\]{}()]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = textContent.split(' ').filter(word => word.length > 0);
    if (words.length >= 2 && words.length <= 6) {
      // If it's a short phrase, it might be a title
      const candidate = words.slice(0, 5).join(' ');
      if (candidate.length < 50) {
        return candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }

    return 'Untitled Presentation';
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

  // Import functions
  async function importFromPowerPoint(file: File): Promise<boolean> {
    try {
      toast.info('Importing PowerPoint...');
      
      // Use the slides store import functionality
      const slidesStoreModule = await import('@/store/slides');
      const slidesStore = (slidesStoreModule as any).useSlidesStore();
      
      await slidesStore.importPowerPoint(file);
      
      // Convert slides store data to our format
      const importedSlides = slidesStore.pages.map((page: any, index: number) => ({
        id: page.id,
        content: `# ${page.name}\n\nSlide content ${index + 1}`,
        notes: '',
        frontmatter: {}
      }));
      
      // Initialize with imported slides and title guessing
      initializeNewDeck(importedSlides);
      toast.success('PowerPoint imported successfully');
      return true;
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

      // Initialize with imported slides and title guessing
      initializeNewDeck(newSlides);
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

  // Initialize new deck with title guessing
  function initializeNewDeck(initialSlides?: any[]) {
    // Set default slides if none provided
    if (initialSlides && initialSlides.length > 0) {
      editor.setSlides(initialSlides);
    }
    
    // Auto-guess title from first slide
    const guessedTitle = guessTitleFromSlides();
    if (guessedTitle && guessedTitle !== 'Untitled Presentation') {
      deckTitle.value = guessedTitle;
      toast.info(`Auto-detected title: "${guessedTitle}"`);
    }
    
    // Reset state for new deck
    hasUserMadeChanges.value = false;
    hasUnsavedChanges.value = false;
  }

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
    canShare,
    shareLinkDoc,
    hasUserMadeChanges,

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
    cancelAutosave,
    
    // Sharing operations
    hydrateSharing,
    
    // Title guessing
    guessTitleFromSlides,
    
    // Initialize new deck
    initializeNewDeck
  };
}

export type SlidePersistenceReturn = ReturnType<typeof useSlidePersistence>;
