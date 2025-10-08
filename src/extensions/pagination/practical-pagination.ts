import type { Editor } from '@tiptap/core';

export type PageNumberPosition = 'left' | 'center' | 'right';

export interface PracticalPaginationConfig {
  pageHeight: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  pageHeaderHeight: number;
  pageFooterHeight: number;
  contentMarginTop: number;
  contentMarginBottom: number;
  pageGap: number;
  showPageNumbers: boolean;
  pageNumberPosition: PageNumberPosition;
}

interface OverlayPositionCache {
  parent: HTMLElement | null;
  originalPosition: string | null;
}

const MIN_PAGE_HEIGHT = 200;

/**
 * Lightweight pagination helper that renders page overlays based on the
 * editor's rendered height. Relies on the browser layout engine instead of
 * manipulating the ProseMirror document, so it can be toggled on demand.
 */
export class PracticalPagination {
  private editor: Editor;
  private config: PracticalPaginationConfig;
  private isEnabled = false;
  private overlay: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private darkModeObserver: MutationObserver | null = null;
  private overlayPositionCache: OverlayPositionCache = {
    parent: null,
    originalPosition: null,
  };
  private pendingCalculation: Promise<void> | null = null;
  private destroyed = false;

  private readonly recalculationHandler: () => void;

  constructor(editor: Editor, config: PracticalPaginationConfig) {
    this.editor = editor;
    this.config = { ...config };
    this.recalculationHandler = this.debounce(() => {
      if (this.isEnabled) {
        this.scheduleCalculation();
      }
    }, 120);
  }

  get enabled(): boolean {
    return this.isEnabled;
  }

  /** Update current pagination configuration. */
  updateConfig(partial: Partial<PracticalPaginationConfig>): void {
    this.config = { ...this.config, ...partial };
    if (this.isEnabled) {
      this.scheduleCalculation();
    }
  }

  /** Trigger a recalculation at the next animation frame. */
  scheduleCalculation(): void {
    if (!this.isEnabled || this.destroyed) return;
    // Chain calculations so we don't run multiple layouts simultaneously.
    if (!this.pendingCalculation) {
      this.pendingCalculation = this.calculatePagination().finally(() => {
        this.pendingCalculation = null;
      });
    }
  }

  async enable(): Promise<void> {
    if (this.isEnabled || this.destroyed) return;
    if (typeof window === 'undefined') return;

    this.isEnabled = true;
    this.addEditorClasses();
    this.ensureOverlay();
    await this.calculatePagination();
    this.setupObservers();
  }

  disable(): void {
    if (!this.isEnabled) return;

    this.isEnabled = false;
    this.teardownObservers();
    this.removeOverlay();
    this.removeEditorClasses();
  }

  destroy(): void {
    this.destroyed = true;
    this.disable();
    this.darkModeObserver?.disconnect();
    this.darkModeObserver = null;
  }

  private addEditorClasses(): void {
    const root = this.editor.view.dom;
    root.classList.add('pagination-mode');
  }

  private removeEditorClasses(): void {
    const root = this.editor.view.dom;
    root.classList.remove('pagination-mode');
  }

  private ensureOverlay(): void {
    if (this.overlay) return;

    const parent = this.editor.view.dom.parentElement;
    if (!parent) return;

    const overlay = document.createElement('div');
    overlay.className = 'pagination-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '1'; // Lower z-index to avoid interfering with editor
    overlay.style.overflow = 'hidden'; // Prevent overflow issues

    if (parent instanceof HTMLElement) {
      if (!parent.style.position || parent.style.position === 'static') {
        this.overlayPositionCache.parent = parent;
        this.overlayPositionCache.originalPosition = parent.style.position;
        parent.style.position = 'relative';
      }
      parent.appendChild(overlay);
      this.overlay = overlay;
    }
  }

  private removeOverlay(): void {
    this.overlay?.remove();
    this.overlay = null;

    if (this.overlayPositionCache.parent) {
      const { parent, originalPosition } = this.overlayPositionCache;
      parent.style.position = originalPosition ?? '';
    }
    this.overlayPositionCache = { parent: null, originalPosition: null };
  }

  private setupObservers(): void {
    this.editor.on('update', this.recalculationHandler);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.recalculationHandler);
      this.resizeObserver.observe(this.editor.view.dom);
    }

    window.addEventListener('resize', this.recalculationHandler, { passive: true });

    // Listen for dark mode changes
    if (typeof MutationObserver !== 'undefined') {
      const darkModeObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' &&
              (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
            if (this.isEnabled) {
              this.scheduleCalculation();
            }
          }
        });
      });

      darkModeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme']
      });

      darkModeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'data-theme']
      });
    }
  }

  private teardownObservers(): void {
    this.editor.off('update', this.recalculationHandler);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.darkModeObserver?.disconnect();
    this.darkModeObserver = null;
    window.removeEventListener('resize', this.recalculationHandler);
  }

  private async waitForLayout(): Promise<void> {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }

  private get totalPageHeight(): number {
    return Math.max(MIN_PAGE_HEIGHT, this.config.pageHeight);
  }

  private get headerOffset(): number {
    return this.config.marginTop + this.config.pageHeaderHeight + this.config.contentMarginTop;
  }

  private get footerOffset(): number {
    return this.config.marginBottom + this.config.pageFooterHeight + this.config.contentMarginBottom;
  }

  private get contentHeight(): number {
    return Math.max(
      100,
      this.totalPageHeight - this.headerOffset - this.footerOffset,
    );
  }

  private clearOverlay(): void {
    if (this.overlay) {
      this.overlay.innerHTML = '';
    }
  }

  private async calculatePagination(): Promise<void> {
    if (!this.isEnabled || !this.overlay) return;

    await this.waitForLayout();

    const editorElement = this.editor.view.dom as HTMLElement;
    const pageContentHeight = this.contentHeight;
    const totalHeight = editorElement.scrollHeight;

    if (totalHeight <= 0 || pageContentHeight <= 0) {
      this.clearOverlay();
      this.overlay.style.height = '0px';
      return;
    }

    this.clearOverlay();

    let currentContentOffset = 0;
    let currentPageTop = 0;
    let pageNumber = 1;

    while (currentContentOffset < totalHeight) {
      this.createPageIndicator(pageNumber, Math.max(0, currentPageTop));
      currentContentOffset += pageContentHeight;
      currentPageTop += this.totalPageHeight + this.config.pageGap;
      pageNumber += 1;
    }

    this.overlay.style.height = `${Math.max(totalHeight, currentPageTop)}px`;
  }

  private createPageIndicator(pageNumber: number, top: number): void {
    if (!this.overlay) return;

    const totalPageHeight = this.totalPageHeight;

    const wrapper = document.createElement('div');
    wrapper.className = 'page-indicator';
    wrapper.dataset.pageNumber = pageNumber.toString();
    wrapper.style.position = 'absolute';
    wrapper.style.left = '0';
    wrapper.style.width = '100%';
    wrapper.style.top = `${top}px`;
    wrapper.style.height = `${totalPageHeight}px`;
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.marginBottom = '0';

    // Use CSS variables for dark mode compatibility
    const isDarkMode = document.documentElement.classList.contains('dark') ||
                       document.body.classList.contains('dark');

    // wrapper.style.border = `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`;
    wrapper.style.background = 'transparent';
    // wrapper.style.boxShadow = `${isDarkMode ? '0 0 8px rgba(0, 0, 0, 0.3)' : '0 0 8px rgba(0, 0, 0, 0.08)'}`;

    const contentFrame = document.createElement('div');
    contentFrame.className = 'page-indicator__content';
    contentFrame.style.position = 'relative';
    contentFrame.style.width = '100%';
    contentFrame.style.height = '100%';
    contentFrame.style.boxSizing = 'border-box';
    contentFrame.style.paddingTop = `${this.headerOffset}px`;
    contentFrame.style.paddingBottom = `${this.footerOffset}px`;

    wrapper.appendChild(contentFrame);

    if (this.config.showPageNumbers) {
      const pageNumberEl = document.createElement('div');
      pageNumberEl.className = 'page-number';
      pageNumberEl.textContent = pageNumber.toString();
      pageNumberEl.style.position = 'absolute';
      pageNumberEl.style.bottom = `${Math.max(4, this.config.marginBottom)}px`;
      pageNumberEl.style.padding = '2px 8px';
      pageNumberEl.style.borderRadius = '4px';
      pageNumberEl.style.border = `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.25)'}`;
      pageNumberEl.style.fontSize = '12px';
      pageNumberEl.style.pointerEvents = 'none';

      // Use dark mode appropriate colors
      pageNumberEl.style.background = `${isDarkMode ? 'rgba(55, 65, 81, 0.9)' : 'white'}`;
      pageNumberEl.style.color = `${isDarkMode ? '#f9fafb' : '#4b5563'}`;

      switch (this.config.pageNumberPosition) {
        case 'left':
          pageNumberEl.style.left = `${Math.max(8, this.config.marginLeft)}px`;
          break;
        case 'center':
          pageNumberEl.style.left = '50%';
          pageNumberEl.style.transform = 'translateX(-50%)';
          break;
        default:
          pageNumberEl.style.right = `${Math.max(8, this.config.marginRight)}px`;
          break;
      }

      contentFrame.appendChild(pageNumberEl);
    }

    this.overlay.appendChild(wrapper);
  }

  private debounce<T extends (...args: any[]) => void>(fn: T, wait: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        timeout = null;
        fn.apply(this, args);
      }, wait);
    };
  }
}
