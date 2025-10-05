import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import type {
  SlideDeckData,
  SlideDeckTemplate,
  SlideDeckTemplatePage,
  SlideImportStatus,
  SlidePage,
  SlideScene,
  SlideTemplateManifest,
  SlideTemplateSummary,
  SnapSettings,
} from '@/types/slides';
import { useFileStore } from './files';
import { useAuthStore } from './auth';

const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  showGrid: true,
  gridSize: 20,
  showGuides: true,
  smartSnapping: true,
};

function createPlaceholderTextElement(options: {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  color?: string;
}): any {
  const { text, x, y, width, fontSize, color = '#6b7280' } = options;
  return {
    id: uuidv4(),
    type: 'text',
    x,
    y,
    width,
    height: 0,
    angle: 0,
    strokeColor: color,
    backgroundColor: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    seed: Math.floor(Math.random() * 1_000_000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 1_000_000),
    isDeleted: false,
    text,
    fontSize,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    baseline: Math.round(fontSize * 0.8),
    lineHeight: 1.25,
    containerId: null,
    originalText: text,
  };
}

function createDefaultSlideElements(): any[] {
  const canvasWidth = 960;
  const titleWidth = 680;
  const subtitleWidth = 540;
  const titleX = (canvasWidth - titleWidth) / 2;
  const subtitleX = (canvasWidth - subtitleWidth) / 2;

  return [
    createPlaceholderTextElement({
      text: 'Click to add title',
      x: titleX,
      y: 160,
      width: titleWidth,
      fontSize: 56,
      color: '#374151',
    }),
    createPlaceholderTextElement({
      text: 'Click to add subtitle',
      x: subtitleX,
      y: 280,
      width: subtitleWidth,
      fontSize: 28,
      color: '#6b7280',
    }),
  ];
}

function createSceneSkeleton(): SlideScene {
  return {
    elements: [],
    appState: {
      gridSize: DEFAULT_SNAP_SETTINGS.showGrid ? DEFAULT_SNAP_SETTINGS.gridSize : undefined,
      viewBackgroundColor: '#ffffff',
    },
    files: {},
  };
}

const TEMPLATE_DIRECTORY = '@/assets/templates';

function cloneScene(scene?: SlideScene, index = 0): SlideScene {
  const base = scene ?? createFallbackScene(index);
  return {
    elements: (base.elements || []).map((element: any) => ({
      ...element,
      id: uuidv4(),
      seed: Math.floor(Math.random() * 1_000_000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 1_000_000),
      isDeleted: false,
    })),
    appState: {
      ...createSceneSkeleton().appState,
      ...(base.appState || {}),
    },
    files: { ...(base.files || {}) },
  };
}

function createFallbackScene(index = 0): SlideScene {
  const replacements = index === 0
    ? (text: string) => text
    : (text: string) => text
        .replace(/title/gi, 'heading')
        .replace(/subtitle/gi, 'body');

  return {
    elements: createDefaultSlideElements().map((element) => {
      if (typeof element.text !== 'string') {
        return element;
      }
      const updatedText = replacements(element.text);
      return {
        ...element,
        text: updatedText,
        originalText: replacements(element.originalText || element.text),
      };
    }),
    appState: { ...createSceneSkeleton().appState },
    files: {},
  };
}

interface ResolvedTemplate extends SlideTemplateSummary {
  pages: SlideDeckTemplatePage[];
}

const templateModules = import.meta.glob<{ default: SlideTemplateManifest }>(`${TEMPLATE_DIRECTORY}/*.json`, {
  eager: true,
});

const loadedTemplates: ResolvedTemplate[] = Object.entries(templateModules).map(([path, module], index) => {
  const manifest = module.default || {};
  const slug = manifest.slug || path.split('/').pop()?.replace(/\.json$/, '') || `template-${index}`;
  return {
    slug,
    title: manifest.title || slug,
    description: manifest.description,
    isDefault: Boolean(manifest.isDefault ?? manifest.default),
    pages: manifest.pages || [],
  };
});

const FALLBACK_TEMPLATE: ResolvedTemplate = {
  slug: 'title-slide',
  title: 'Title Slide',
  description: 'Centered title with subtitle',
  isDefault: true,
  pages: [
    {
      name: 'Title Slide',
      scene: createFallbackScene(0),
    },
  ],
};

let templates: ResolvedTemplate[] = loadedTemplates.length ? loadedTemplates : [FALLBACK_TEMPLATE];

if (!templates.some((template) => template.isDefault)) {
  templates = templates.map((template, index) => (index === 0 ? { ...template, isDefault: true } : template));
}

const TEMPLATES: ResolvedTemplate[] = templates;

export const SLIDE_TEMPLATE_SUMMARIES: SlideTemplateSummary[] = TEMPLATES.map(({ slug, title, description, isDefault }) => ({
  slug,
  title,
  description,
  isDefault,
}));

const DEFAULT_TEMPLATE = TEMPLATES.find((template) => template.isDefault) || TEMPLATES[0];
const DEFAULT_SCENE: SlideScene = cloneScene(DEFAULT_TEMPLATE.pages[0]?.scene, 0);

function getTemplateBySlug(slug?: string): ResolvedTemplate {
  if (!slug) return DEFAULT_TEMPLATE;
  return TEMPLATES.find((template) => template.slug === slug) || DEFAULT_TEMPLATE;
}

function createPageFromTemplate(index: number, templateSlug?: string): SlidePage {
  const template = getTemplateBySlug(templateSlug);
  const firstPage = template.pages?.[0];
  const name = firstPage?.name || template.title || `Slide ${index + 1}`;
  return {
    id: uuidv4(),
    name,
    scene: cloneScene(firstPage?.scene, index),
  };
}

function createPagesFromTemplate(pages: SlideDeckTemplatePage[] | undefined, fallbackTemplateSlug?: string): SlidePage[] {
  if (!pages || !pages.length) {
    return [createPageFromTemplate(0, fallbackTemplateSlug)];
  }
  return pages.map((page, index) => ({
    id: uuidv4(),
    name: page.name || `Slide ${index + 1}`,
    scene: cloneScene(page.scene, index),
  }));
}

const DEFAULT_IMPORT_STATUS: SlideImportStatus = {
  isImporting: false,
  lastError: null,
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8000/api/v1';
const SLIDES_IMPORT_ENDPOINT = (import.meta.env.VITE_SLIDES_IMPORT_ENDPOINT as string | undefined)
  || `${API_BASE_URL.replace(/\/$/, '')}/slides/import`;
const SLIDES_EXPORT_ENDPOINT = (import.meta.env.VITE_SLIDES_EXPORT_ENDPOINT as string | undefined)
  || `${API_BASE_URL.replace(/\/$/, '')}/slides/export`;

function clonePage(page: SlidePage): SlidePage {
  return {
    id: uuidv4(),
    name: `${page.name} Copy`,
    scene: cloneScene(page.scene),
    thumbnail: page.thumbnail,
  };
}

function normaliseGridSize(value: number): number {
  if (Number.isNaN(value) || value <= 2) return 5;
  if (value > 200) return 200;
  return Math.round(value);
}

function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === 'undefined') return;
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildDeckData(title: string, pages: SlidePage[], snapSettings: SnapSettings, deckId?: string | null): SlideDeckData {
  return {
    id: deckId || undefined,
    title,
    pages: pages.map((page) => ({
      ...page,
      scene: cloneScene(page.scene),
    })),
    snapSettings,
    version: 1,
  };
}

function htmlStringToSlides(html: string): SlidePage[] {
  const sections = html
    .split(/<!--\s*slide\s*-->/i)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  const slidesSource = sections.length > 0 ? sections : [html];

  return slidesSource.map((section, index) => {
    const textContent = section
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const elements: any[] = [];
    if (textContent.length) {
      elements.push({
        id: uuidv4(),
        type: 'text',
        x: 100,
        y: 120,
        width: 600,
        height: 0,
        angle: 0,
        strokeColor: '#000000',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        text: textContent,
        fontSize: 32,
        fontFamily: 1,
        textAlign: 'left',
        verticalAlign: 'top',
        baseline: 32,
        containerId: null,
        originalText: textContent,
      });
    }

    return {
      id: uuidv4(),
      name: sections.length > 0 ? `Slide ${index + 1}` : 'Slide 1',
      scene: cloneScene({ elements, appState: DEFAULT_SCENE.appState, files: {} }, index),
    } as SlidePage;
  });
}

export const useSlidesStore = defineStore('slides', {
  state: () => ({
    deckId: null as string | null,
    title: 'Untitled Deck',
    pages: [createPageFromTemplate(0)] as SlidePage[],
    activePageId: null as string | null,
    snapSettings: { ...DEFAULT_SNAP_SETTINGS } as SnapSettings,
    isSaving: false,
    hasUnsavedChanges: false,
    lastSavedAt: null as Date | null,
    importStatus: { ...DEFAULT_IMPORT_STATUS } as SlideImportStatus,
    autosaveDelay: 30000,
    autosaveTimer: null as ReturnType<typeof setTimeout> | null,
    selectedTemplateSlug: DEFAULT_TEMPLATE.slug as string,
  }),

  getters: {
    activePage(state): SlidePage | undefined {
      if (!state.activePageId) {
        return state.pages[0];
      }
      return state.pages.find((page) => page.id === state.activePageId);
    },
    pageCount(state): number {
      return state.pages.length;
    },
    deckData(state): SlideDeckData {
      return buildDeckData(state.title, state.pages, state.snapSettings, state.deckId);
    },
    templateSummaries(): SlideTemplateSummary[] {
      return SLIDE_TEMPLATE_SUMMARIES;
    },
    selectedTemplate(state): ResolvedTemplate {
      return getTemplateBySlug(state.selectedTemplateSlug);
    },
  },

  actions: {
    initNewDeck(templateSlug?: string) {
      this.deckId = null;
      this.title = 'Untitled Deck';
      this.selectedTemplateSlug = templateSlug || DEFAULT_TEMPLATE.slug;
      this.pages = [createPageFromTemplate(0, this.selectedTemplateSlug)];
      this.activePageId = this.pages[0]?.id ?? null;
      this.snapSettings = { ...DEFAULT_SNAP_SETTINGS };
      this.hasUnsavedChanges = false;
      this.isSaving = false;
      this.lastSavedAt = null;
    },

    applyTemplate(template: SlideDeckTemplate, slug?: string) {
      const { title, pages } = template;
      this.title = title || 'Untitled Deck';
      if (slug) {
        this.selectedTemplateSlug = slug;
      }
      this.pages = createPagesFromTemplate(pages, this.selectedTemplateSlug);
      this.activePageId = this.pages[0]?.id ?? null;
      this.hasUnsavedChanges = true;
    },

    setSelectedTemplate(slug: string) {
      const template = getTemplateBySlug(slug);
      this.selectedTemplateSlug = template.slug;
    },

    applyDeckData(data: SlideDeckData) {
      this.deckId = data.id || null;
      this.title = data.title || 'Untitled Deck';
      this.snapSettings = {
        ...DEFAULT_SNAP_SETTINGS,
        ...(data.snapSettings || {}),
      };
      this.pages = data.pages && data.pages.length
        ? data.pages.map((page, index) => ({
            id: page.id || uuidv4(),
            name: page.name || `Slide ${index + 1}`,
            scene: cloneScene(page.scene, index),
            thumbnail: page.thumbnail,
          }))
        : [createPageFromTemplate(0, this.selectedTemplateSlug)];
      this.activePageId = this.pages[0]?.id ?? null;
      this.hasUnsavedChanges = false;
      this.lastSavedAt = new Date();
    },

    async loadDeckFromFileId(id: string) {
      const fileStore = useFileStore();
      const file = await fileStore.loadDocument(id, 'pptx');
      if (!file) {
        throw new Error('Slide deck not found');
      }
      this.deckId = file.id || id;
      this.title = file.title || 'Untitled Deck';
      if (file.content) {
        try {
          const data = JSON.parse(file.content) as SlideDeckData;
          this.applyDeckData(data);
        } catch (error) {
          console.warn('Failed to parse slide deck content', error);
          this.pages = [createPageFromTemplate(0, this.selectedTemplateSlug)];
        }
      } else {
        this.pages = [createPageFromTemplate(0, this.selectedTemplateSlug)];
      }
      this.hasUnsavedChanges = false;
    },

    addPage(templateSlug?: string) {
      const slug = templateSlug || this.selectedTemplateSlug;
      const newPage = createPageFromTemplate(this.pages.length, slug);
      this.pages.push(newPage);
      this.setActivePage(newPage.id);
      this.markDirty();
    },

    duplicatePage(pageId?: string) {
      const targetId = pageId || this.activePageId;
      if (!targetId) return;
      const index = this.pages.findIndex((page) => page.id === targetId);
      if (index === -1) return;
      const cloned = clonePage(this.pages[index]);
      this.pages.splice(index + 1, 0, cloned);
      this.setActivePage(cloned.id);
      this.markDirty();
    },

    deletePage(pageId?: string) {
      if (this.pages.length <= 1) return;
      const targetId = pageId || this.activePageId;
      if (!targetId) return;
      const index = this.pages.findIndex((page) => page.id === targetId);
      if (index === -1) return;
      this.pages.splice(index, 1);
      const newIndex = index >= this.pages.length ? this.pages.length - 1 : index;
      this.activePageId = this.pages[newIndex]?.id ?? null;
      this.markDirty();
    },

    movePage(pageId: string | undefined, direction: 'up' | 'down') {
      const targetId = pageId || this.activePageId;
      if (!targetId) return;
      const index = this.pages.findIndex((page) => page.id === targetId);
      if (index === -1) return;
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === this.pages.length - 1) return;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const [page] = this.pages.splice(index, 1);
      this.pages.splice(targetIndex, 0, page);
      this.markDirty();
      this.activePageId = page.id;
    },

    reorderPages(from: number, to: number) {
      if (from === to) return;
      if (from < 0 || to < 0) return;
      if (from >= this.pages.length || to >= this.pages.length) return;
      const [page] = this.pages.splice(from, 1);
      this.pages.splice(to, 0, page);
      this.activePageId = page.id;
      this.markDirty();
    },

    setActivePage(pageId: string) {
      this.activePageId = pageId;
    },

    updatePageScene(pageId: string, scene: SlideScene) {
      const page = this.pages.find((item) => item.id === pageId);
      if (!page) return;
      page.scene = {
        elements: [...scene.elements],
        appState: {
          ...DEFAULT_SCENE.appState,
          ...(scene.appState || {}),
          gridSize: this.snapSettings.showGrid ? this.snapSettings.gridSize : undefined,
        },
        files: { ...(scene.files || {}) },
      };
      this.markDirty();
    },

    setPageThumbnail(pageId: string, thumbnail: string | null) {
      const page = this.pages.find((item) => item.id === pageId);
      if (!page) return;
      if (thumbnail) {
        page.thumbnail = thumbnail;
      }
    },

    requestThumbnail(_pageId: string | null) {
      // Placeholder hook for future thumbnail queue integration.
    },

    updateSnapSettings(settings: Partial<SnapSettings>) {
      const merged: SnapSettings = {
        ...this.snapSettings,
        ...settings,
      };
      merged.gridSize = normaliseGridSize(merged.gridSize || DEFAULT_SNAP_SETTINGS.gridSize);
      this.snapSettings = merged;
      const gridSize = merged.showGrid ? merged.gridSize : undefined;
      this.pages = this.pages.map((page) => ({
        ...page,
        scene: {
          ...page.scene,
          appState: {
            ...(page.scene.appState || {}),
            gridSize,
          },
        },
      }));
      this.markDirty();
    },

    updateTitle(value: string) {
      this.title = value || 'Untitled Deck';
    },

    markDirty() {
      this.hasUnsavedChanges = true;
    },

    scheduleAutosave() {
      if (typeof window === 'undefined') return;
      if (!this.hasUnsavedChanges) return;
      if (this.autosaveTimer) {
        clearTimeout(this.autosaveTimer);
      }
      this.autosaveTimer = setTimeout(() => {
        this.persistDeck().catch((error) => console.warn('Autosave failed', error));
      }, this.autosaveDelay);
    },

    clearAutosaveTimer() {
      if (this.autosaveTimer) {
        clearTimeout(this.autosaveTimer);
        this.autosaveTimer = null;
      }
    },

    async persistDeck() {
      if (this.isSaving) {
        return;
      }
      try {
        this.isSaving = true;
        this.clearAutosaveTimer();
        const fileStore = useFileStore();
        const deckData = this.deckData;
        const filePayload = {
          id: this.deckId || undefined,
          title: deckData.title,
          file_type: 'pptx',
          content: JSON.stringify(deckData),
          is_folder: false,
        } as any;
        const result = await fileStore.saveDocument(filePayload);
        const saved = result.document;
        if (saved?.id) {
          this.deckId = saved.id;
        }
        this.hasUnsavedChanges = false;
        this.lastSavedAt = new Date();
      } catch (error) {
        console.error('Failed to persist deck', error);
        throw error;
      } finally {
        this.isSaving = false;
      }
    },

    async exportDeck(type: 'pdf' | 'pptx' | 'images') {
      if (type === 'images') {
        const thumbnails = this.pages
          .map((page, index) => ({
            name: `${page.name || `slide-${index + 1}`}.png`,
            dataUrl: page.thumbnail,
          }))
          .filter((item) => !!item.dataUrl);
        if (!thumbnails.length) {
          throw new Error('No slide thumbnails available. Generate thumbnails before exporting images.');
        }
        for (const item of thumbnails) {
          if (!item.dataUrl) continue;
          const response = await fetch(item.dataUrl);
          const blob = await response.blob();
          downloadBlob(blob, item.name);
        }
        return;
      }

      const authStore = useAuthStore();
      const token = authStore.getToken?.();
      if (!token) {
        throw new Error('Authentication required to export slides');
      }
      const endpoint = SLIDES_EXPORT_ENDPOINT;
      const payload = {
        deck: this.deckData,
        format: type,
      };
      const response = await axios.post(endpoint, payload, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const mime = type === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      const extension = type === 'pdf' ? 'pdf' : 'pptx';
      const blob = new Blob([response.data], { type: mime });
      downloadBlob(blob, `${this.title || 'deck'}.${extension}`);
    },

    async importPowerPoint(file: File) {
      this.importStatus = {
        isImporting: true,
        lastError: null,
        source: 'pptx',
      };
      try {
        if (!SLIDES_IMPORT_ENDPOINT) {
          throw new Error('Slides import endpoint is not configured');
        }
        const authStore = useAuthStore();
        const token = authStore.getToken?.();
        if (!token) {
          throw new Error('Authentication required to import PowerPoint files');
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('target', 'pptx');
        const response = await axios.post(SLIDES_IMPORT_ENDPOINT, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
        const deck = (response.data?.data?.deck || response.data?.deck) as SlideDeckData | undefined;
        if (!deck) {
          throw new Error('Converted slide deck data not found in response');
        }
        this.applyDeckData(deck);
        this.hasUnsavedChanges = true;
      } catch (error) {
        console.error('PowerPoint import failed', error);
        this.importStatus = {
          isImporting: false,
          lastError: (error as Error).message || 'PowerPoint import failed',
          source: 'pptx',
        };
        throw error;
      }
      this.importStatus = {
        isImporting: false,
        lastError: null,
        source: 'pptx',
      };
    },

    async importHtml(file: File) {
      this.importStatus = {
        isImporting: true,
        lastError: null,
        source: 'html',
      };
      try {
        const text = await file.text();
        const slides = htmlStringToSlides(text);
        if (slides.length) {
          this.pages = slides;
          this.activePageId = this.pages[0]?.id ?? null;
          this.hasUnsavedChanges = true;
        }
      } catch (error) {
        console.error('HTML import failed', error);
        this.importStatus = {
          isImporting: false,
          lastError: (error as Error).message || 'HTML import failed',
          source: 'html',
        };
        throw error;
      }
      this.importStatus = {
        isImporting: false,
        lastError: null,
        source: 'html',
      };
    },
  },
});
