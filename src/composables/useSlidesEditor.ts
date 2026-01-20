/**
 * Core slides editor composable
 * Manages slide state and operations
 */
import { ref, computed, type Ref } from 'vue';
import { 
  type SlidevSlide, 
  createDefaultSlides,
  parseMarkdownToHtml,
  SLIDEV_LAYOUTS,
  SLIDEV_THEMES,
  getThemeByValue,
  type SlideTemplate
} from '@/utils/slidevMarkdown';

export interface UseSlidesEditorOptions {
  initialSlides?: SlidevSlide[];
  initialTheme?: string;
}

export interface EditorTool {
  name: string;
  title: string;
  icon: any;
  template: string;
}

export function useSlidesEditor(options: UseSlidesEditorOptions = {}) {
  // Core state
  const slides = ref<SlidevSlide[]>(options.initialSlides || createDefaultSlides());
  const currentSlideIndex = ref(0);
  const currentTheme = ref(options.initialTheme || 'default');
  const currentLayout = ref('default');
  const slideBackground = ref('#ffffff');
  const slideTransition = ref('slide-left');
  const slideClass = ref('');
  const mode = ref<'edit' | 'preview'>('edit');

  // Undo/Redo state
  const history = ref<SlidevSlide[][]>([]);
  const historyIndex = ref(-1);
  const maxHistorySize = 50;

  // Computed
  const currentSlide = computed(() => slides.value[currentSlideIndex.value]);
  const nextSlidePreview = computed(() => slides.value[currentSlideIndex.value + 1]);
  const currentThemeObj = computed(() => getThemeByValue(currentTheme.value));

  const currentSlideContent = computed({
    get: () => currentSlide.value?.content || '',
    set: (value: string) => {
      if (currentSlide.value) {
        slides.value[currentSlideIndex.value].content = value;
      }
    }
  });

  const currentSlideNotes = computed({
    get: () => currentSlide.value?.notes || '',
    set: (value: string) => {
      if (currentSlide.value) {
        slides.value[currentSlideIndex.value].notes = value;
      }
    }
  });

  const renderedContent = computed(() => {
    return parseMarkdownToHtml(currentSlideContent.value, currentLayout.value);
  });

  const themeStyleObject = computed(() => {
    const theme = currentThemeObj.value;
    if (!theme) return {};
    return {
      '--slidev-primary': theme.colors.primary,
      '--slidev-secondary': theme.colors.secondary,
      '--slidev-accent': theme.colors.accent,
      '--slidev-text-muted': theme.colors.textMuted,
      fontFamily: theme.fontFamily || 'Inter, system-ui, sans-serif'
    };
  });

  // Navigation
  function selectSlide(index: number) {
    if (index >= 0 && index < slides.value.length) {
      currentSlideIndex.value = index;
      syncSlideProperties();
    }
  }

  function previousSlide() {
    if (currentSlideIndex.value > 0) {
      currentSlideIndex.value--;
      syncSlideProperties();
    }
  }

  function nextSlide() {
    if (currentSlideIndex.value < slides.value.length - 1) {
      currentSlideIndex.value++;
      syncSlideProperties();
    }
  }

  function goToSlide(index: number) {
    selectSlide(index);
  }

  function goToFirst() {
    selectSlide(0);
  }

  function goToLast() {
    selectSlide(slides.value.length - 1);
  }

  // Sync slide properties when changing slides
  function syncSlideProperties() {
    const slide = currentSlide.value;
    if (slide?.frontmatter) {
      currentLayout.value = slide.frontmatter.layout || 'default';
      if (slide.frontmatter.background) {
        slideBackground.value = slide.frontmatter.background;
      }
      if (slide.frontmatter.transition) {
        slideTransition.value = slide.frontmatter.transition;
      }
      if (slide.frontmatter.class) {
        slideClass.value = slide.frontmatter.class;
      }
    } else {
      currentLayout.value = 'default';
    }
  }

  // Slide operations
  function addSlide(afterIndex?: number): SlidevSlide {
    const insertIndex = afterIndex ?? currentSlideIndex.value;
    const newSlide: SlidevSlide = {
      id: Date.now().toString(),
      content: '# New Slide\n\nAdd your content here',
      notes: ''
    };
    slides.value.splice(insertIndex + 1, 0, newSlide);
    currentSlideIndex.value = insertIndex + 1;
    return newSlide;
  }

  function duplicateSlide(index: number): SlidevSlide {
    const slide = slides.value[index];
    const duplicate: SlidevSlide = {
      id: Date.now().toString(),
      content: slide.content,
      notes: slide.notes,
      frontmatter: slide.frontmatter ? { ...slide.frontmatter } : undefined
    };
    slides.value.splice(index + 1, 0, duplicate);
    currentSlideIndex.value = index + 1;
    return duplicate;
  }

  function deleteSlide(index: number): boolean {
    if (slides.value.length <= 1) return false;
    slides.value.splice(index, 1);
    if (currentSlideIndex.value >= slides.value.length) {
      currentSlideIndex.value = slides.value.length - 1;
    }
    return true;
  }

  function moveSlide(index: number, direction: 'up' | 'down'): boolean {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= slides.value.length) return false;
    
    const [slide] = slides.value.splice(index, 1);
    slides.value.splice(newIndex, 0, slide);
    currentSlideIndex.value = newIndex;
    return true;
  }

  function reorderSlides(fromIndex: number, toIndex: number): boolean {
    if (fromIndex < 0 || fromIndex >= slides.value.length) return false;
    if (toIndex < 0 || toIndex >= slides.value.length) return false;
    
    const [slide] = slides.value.splice(fromIndex, 1);
    slides.value.splice(toIndex, 0, slide);
    currentSlideIndex.value = toIndex;
    return true;
  }

  // Content operations
  function updateSlideContent(content: string) {
    currentSlideContent.value = content;
  }

  function updateSlideNotes(notes: string) {
    currentSlideNotes.value = notes;
  }

  function insertAtCursor(editorRef: Ref<HTMLTextAreaElement | null>, template: string) {
    const textarea = editorRef.value;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const value = textarea.value;
    
    currentSlideContent.value = value.substring(0, start) + template + value.substring(start);
    
    return start + template.length;
  }

  // Template operations
  function applyTemplate(template: SlideTemplate) {
    currentSlideContent.value = template.content;
    currentLayout.value = template.layout;
    
    if (template.frontmatter && currentSlide.value) {
      slides.value[currentSlideIndex.value].frontmatter = { ...template.frontmatter };
    }
    
    // Update background for special layouts
    if (['cover', 'section', 'end'].includes(template.layout) && currentThemeObj.value) {
      const theme = currentThemeObj.value;
      if (theme.colors.gradient) {
        slideBackground.value = theme.colors.gradient;
      } else {
        slideBackground.value = theme.colors.primary;
      }
    }
  }

  // Layout operations
  function setLayout(layout: string) {
    currentLayout.value = layout;
    if (currentSlide.value) {
      currentSlide.value.frontmatter = {
        ...currentSlide.value.frontmatter,
        layout
      };
    }
  }

  function setBackground(background: string) {
    slideBackground.value = background;
    if (currentSlide.value) {
      currentSlide.value.frontmatter = {
        ...currentSlide.value.frontmatter,
        background
      };
    }
  }

  function setTransition(transition: string) {
    slideTransition.value = transition;
    if (currentSlide.value) {
      currentSlide.value.frontmatter = {
        ...currentSlide.value.frontmatter,
        transition
      };
    }
  }

  function setSlideClass(className: string) {
    slideClass.value = className;
    if (currentSlide.value) {
      currentSlide.value.frontmatter = {
        ...currentSlide.value.frontmatter,
        class: className
      };
    }
  }

  // Theme operations
  function setTheme(theme: string) {
    currentTheme.value = theme;
  }

  // Preview helpers
  function getSlidePreview(slide: SlidevSlide): string {
    const html = parseMarkdownToHtml(slide.content);
    return html.substring(0, 500);
  }

  function getLayoutClass(layout: string): string {
    const layoutClasses: Record<string, string> = {
      'default': 'layout-default',
      'center': 'layout-center flex items-center justify-center text-center',
      'cover': 'layout-cover flex items-center justify-center text-center',
      'intro': 'layout-intro',
      'two-cols': 'layout-two-cols',
      'two-cols-header': 'layout-two-cols-header',
      'image': 'layout-image flex flex-col items-center justify-center',
      'image-left': 'layout-image-left grid grid-cols-2 gap-8',
      'image-right': 'layout-image-right grid grid-cols-2 gap-8',
      'quote': 'layout-quote flex items-center justify-center text-center italic',
      'section': 'layout-section flex items-center justify-center text-center',
      'fact': 'layout-fact flex items-center justify-center text-center',
      'statement': 'layout-statement flex items-center justify-center text-center text-2xl',
      'end': 'layout-end flex items-center justify-center text-center',
      'full': 'layout-full'
    };
    return layoutClasses[layout] || 'layout-default';
  }

  // Bulk operations
  function setSlides(newSlides: SlidevSlide[]) {
    slides.value = newSlides;
    if (currentSlideIndex.value >= newSlides.length) {
      currentSlideIndex.value = Math.max(0, newSlides.length - 1);
    }
    syncSlideProperties();
  }

  function reset() {
    slides.value = createDefaultSlides();
    currentSlideIndex.value = 0;
    currentTheme.value = 'default';
    currentLayout.value = 'default';
    slideBackground.value = '#ffffff';
    slideTransition.value = 'slide-left';
    slideClass.value = '';
  }

  // Generate Slidev-compatible markdown
  function generateSlidevMarkdown(): string {
    const frontmatter = `---
theme: ${currentTheme.value}
title: "${slides.value[0]?.content ? slides.value[0].content.split('\n')[0].replace(/^#\s+/, '') : 'Untitled Presentation'}
download: true
---

`;

    const slideContent = slides.value.map((slide, index) => {
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

  // Undo/Redo functionality
  function saveToHistory() {
    const currentState = JSON.parse(JSON.stringify(slides.value));
    
    // Remove any states after current index
    history.value = history.value.slice(0, historyIndex.value + 1);
    
    // Add new state
    history.value.push(currentState);
    historyIndex.value++;
    
    // Limit history size
    if (history.value.length > maxHistorySize) {
      history.value.shift();
      historyIndex.value--;
    }
  }

  function undo() {
    if (canUndo.value) {
      historyIndex.value--;
      slides.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
    }
  }

  function redo() {
    if (canRedo.value) {
      historyIndex.value++;
      slides.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
    }
  }

  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => historyIndex.value < history.value.length - 1);

  return {
    // State
    slides,
    currentSlideIndex,
    currentSlide,
    nextSlidePreview,
    currentTheme,
    currentThemeObj,
    currentLayout,
    slideBackground,
    slideTransition,
    slideClass,
    mode,
    
    // Content
    currentSlideContent,
    currentSlideNotes,
    renderedContent,
    themeStyleObject,
    
    // Navigation
    selectSlide,
    previousSlide,
    nextSlide,
    goToSlide,
    goToFirst,
    goToLast,
    
    // Slide operations
    addSlide,
    duplicateSlide,
    deleteSlide,
    moveSlide,
    reorderSlides,
    
    // Content operations
    updateSlideContent,
    updateSlideNotes,
    insertAtCursor,
    
    // Template operations
    applyTemplate,
    
    // Layout/Theme operations
    setLayout,
    setBackground,
    setTransition,
    setSlideClass,
    setTheme,
    
    // Preview helpers
    getSlidePreview,
    getLayoutClass,
    
    // Export helpers
    generateSlidevMarkdown,
    
    // Bulk operations
    setSlides,
    reset,
    
    // Undo/Redo
    canUndo,
    canRedo,
    undo,
    redo,
    saveToHistory,
    
    // Constants
    layouts: SLIDEV_LAYOUTS,
    themes: SLIDEV_THEMES
  };
}

export type SlidesEditorReturn = ReturnType<typeof useSlidesEditor>;
