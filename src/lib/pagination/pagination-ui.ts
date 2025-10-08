/**
 * Pagination UI Controls
 * Optional UI components for controlling pagination
 */
import { TiptapPaginationManager, PaginationConfig } from './pagination-manager';

export interface PaginationUIConfig {
  showToggleButton?: boolean;
  showExportButton?: boolean;
  showPageSizeSelector?: boolean;
  showMarginControls?: boolean;
  showPageNumberControls?: boolean;
  showAutoRecalculateToggle?: boolean;
}

export class PaginationUI {
  private paginationManager: TiptapPaginationManager;
  private controlPanels = new Map<string, HTMLElement>();
  private styleElement: HTMLStyleElement | null = null;

  constructor(paginationManager: TiptapPaginationManager) {
    this.paginationManager = paginationManager;
  }

  /**
   * Create control panel for an editor
   */
  createControlPanel(editorId: string, container: HTMLElement, config: PaginationUIConfig = {}): HTMLElement | null {
    const paginationConfig = this.paginationManager.getConfig(editorId);
    if (!paginationConfig) return null;

    const panel = document.createElement('div');
    panel.className = 'pagination-control-panel';
    panel.innerHTML = this.generateControlHTML(editorId, paginationConfig, config);

    container.appendChild(panel);
    this.attachEventListeners(panel, editorId);

    this.controlPanels.set(editorId, panel);
    return panel;
  }

  /**
   * Generate control panel HTML
   */
  private generateControlHTML(editorId: string, config: PaginationConfig, uiConfig: PaginationUIConfig): string {
    return `
      <div class="pagination-controls">
        <h3>Page Settings</h3>

        ${uiConfig.showToggleButton !== false ? `
        <div class="control-group">
          <button class="btn-toggle" data-editor="${editorId}">
            ${config.enabled ? 'Disable' : 'Enable'} Pagination
          </button>
          ${uiConfig.showExportButton !== false ? `<button class="btn-export" data-editor="${editorId}">Export PDF</button>` : ''}
        </div>
        ` : ''}

        ${uiConfig.showPageSizeSelector !== false ? `
        <div class="control-group">
          <label>Page Size:</label>
          <select class="page-size" data-editor="${editorId}">
            <option value="a4" ${this.getPageSize(config) === 'a4' ? 'selected' : ''}>A4</option>
            <option value="letter" ${this.getPageSize(config) === 'letter' ? 'selected' : ''}>Letter</option>
            <option value="a3" ${this.getPageSize(config) === 'a3' ? 'selected' : ''}>A3</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div class="control-group custom-size" style="display: none;">
          <label>Custom Size (px):</label>
          <input type="number" class="page-width" placeholder="Width" value="${config.pageWidth}">
          <input type="number" class="page-height" placeholder="Height" value="${config.pageHeight}">
        </div>
        ` : ''}

        ${uiConfig.showMarginControls !== false ? `
        <div class="control-group">
          <label>Margins (px):</label>
          <div class="margin-controls">
            <input type="number" class="margin-top" placeholder="Top" value="${config.marginTop}" min="0">
            <input type="number" class="margin-right" placeholder="Right" value="${config.marginRight}" min="0">
            <input type="number" class="margin-bottom" placeholder="Bottom" value="${config.marginBottom}" min="0">
            <input type="number" class="margin-left" placeholder="Left" value="${config.marginLeft}" min="0">
          </div>
        </div>
        ` : ''}

        ${uiConfig.showAutoRecalculateToggle !== false ? `
        <div class="control-group">
          <label>
            <input type="checkbox" class="auto-recalculate" ${config.autoRecalculate ? 'checked' : ''}>
            Auto-recalculate on changes
          </label>
        </div>
        ` : ''}

        ${uiConfig.showPageNumberControls !== false ? `
        <div class="control-group">
          <label>Page Numbers:</label>
          <select class="page-number-position" data-editor="${editorId}">
            <option value="bottom-right" ${config.pageNumberPosition === 'bottom-right' ? 'selected' : ''}>Bottom Right</option>
            <option value="bottom-center" ${config.pageNumberPosition === 'bottom-center' ? 'selected' : ''}>Bottom Center</option>
            <option value="top-right" ${config.pageNumberPosition === 'top-right' ? 'selected' : ''}>Top Right</option>
            <option value="none">Hidden</option>
          </select>
        </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Attach event listeners to control panel
   */
  private attachEventListeners(panel: HTMLElement, editorId: string): void {
    // Toggle pagination
    const toggleBtn = panel.querySelector('.btn-toggle') as HTMLButtonElement;
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.paginationManager.togglePagination(editorId);
        this.updatePanel(editorId);
      });
    }

    // Export PDF
    const exportBtn = panel.querySelector('.btn-export') as HTMLButtonElement;
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.paginationManager.exportToPDF(editorId);
      });
    }

    // Page size change
    const pageSizeSelect = panel.querySelector('.page-size') as HTMLSelectElement;
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', (e) => {
        this.handlePageSizeChange(editorId, (e.target as HTMLSelectElement).value, panel);
      });
    }

    // Margin changes
    panel.querySelectorAll('.margin-top, .margin-right, .margin-bottom, .margin-left').forEach(input => {
      input.addEventListener('change', (e) => {
        this.handleMarginChange(editorId, (e.target as HTMLInputElement).className, (e.target as HTMLInputElement).value);
      });
    });

    // Auto-recalculate toggle
    const autoRecalcCheckbox = panel.querySelector('.auto-recalculate') as HTMLInputElement;
    if (autoRecalcCheckbox) {
      autoRecalcCheckbox.addEventListener('change', (e) => {
        this.paginationManager.updateConfig(editorId, {
          autoRecalculate: (e.target as HTMLInputElement).checked
        });
      });
    }

    // Page number position
    const pageNumberSelect = panel.querySelector('.page-number-position') as HTMLSelectElement;
    if (pageNumberSelect) {
      pageNumberSelect.addEventListener('change', (e) => {
        const value = (e.target as HTMLSelectElement).value as PaginationConfig['pageNumberPosition'];
        this.paginationManager.updateConfig(editorId, {
          pageNumberPosition: value,
          showPageNumbers: value !== 'none'
        });
      });
    }

    // Custom size inputs
    const customSizeGroup = panel.querySelector('.custom-size');
    if (customSizeGroup) {
      const widthInput = panel.querySelector('.page-width') as HTMLInputElement;
      const heightInput = panel.querySelector('.page-height') as HTMLInputElement;

      if (widthInput) {
        widthInput.addEventListener('change', (e) => {
          this.paginationManager.updateConfig(editorId, {
            pageWidth: parseInt((e.target as HTMLInputElement).value)
          });
        });
      }

      if (heightInput) {
        heightInput.addEventListener('change', (e) => {
          this.paginationManager.updateConfig(editorId, {
            pageHeight: parseInt((e.target as HTMLInputElement).value)
          });
        });
      }
    }
  }

  /**
   * Handle page size changes
   */
  private handlePageSizeChange(editorId: string, size: string, panel: HTMLElement): void {
    const sizes = {
      a4: { pageHeight: 1123, pageWidth: 794 },
      letter: { pageHeight: 1056, pageWidth: 816 },
      a3: { pageHeight: 1587, pageWidth: 1123 }
    };

    const customGroup = panel.querySelector('.custom-size') as HTMLElement;

    if (size === 'custom') {
      customGroup.style.display = 'block';
    } else {
      customGroup.style.display = 'none';
      this.paginationManager.updateConfig(editorId, sizes[size as keyof typeof sizes]);
    }
  }

  /**
   * Handle margin changes
   */
  private handleMarginChange(editorId: string, marginType: string, value: string): void {
    const configUpdate: Partial<PaginationConfig> = {};
    (configUpdate as any)[marginType] = parseInt(value);
    this.paginationManager.updateConfig(editorId, configUpdate);
  }

  /**
   * Update control panel
   */
  private updatePanel(editorId: string): void {
    const panel = this.controlPanels.get(editorId);
    if (!panel) return;

    const config = this.paginationManager.getConfig(editorId);
    if (!config) return;

    const newPanel = document.createElement('div');
    newPanel.innerHTML = this.generateControlHTML(editorId, config, {});

    panel.parentNode?.replaceChild(newPanel, panel);
    this.attachEventListeners(newPanel, editorId);
    this.controlPanels.set(editorId, newPanel);
  }

  /**
   * Get page size from config
   */
  private getPageSize(config: PaginationConfig): string {
    if (config.pageHeight === 1123 && config.pageWidth === 794) return 'a4';
    if (config.pageHeight === 1056 && config.pageWidth === 816) return 'letter';
    if (config.pageHeight === 1587 && config.pageWidth === 1123) return 'a3';
    return 'custom';
  }

  /**
   * Remove control panel
   */
  removeControlPanel(editorId: string): void {
    const panel = this.controlPanels.get(editorId);
    if (panel) {
      panel.remove();
      this.controlPanels.delete(editorId);
    }
  }

  /**
   * Inject styles into the document
   */
  injectStyles(): void {
    if (this.styleElement) return;

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'pagination-ui-styles';
    this.styleElement.textContent = `
      .pagination-controls {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 16px;
        margin: 16px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .pagination-controls h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }

      .control-group {
        margin-bottom: 16px;
      }

      .control-group:last-child {
        margin-bottom: 0;
      }

      .control-group label {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        color: #666;
        font-weight: 500;
      }

      .control-group input,
      .control-group select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
      }

      .control-group input:focus,
      .control-group select:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
      }

      .margin-controls {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .margin-controls input {
        width: 100%;
      }

      .btn-toggle, .btn-export {
        background: #007bff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        margin-right: 8px;
        transition: background-color 0.2s;
      }

      .btn-toggle:hover, .btn-export:hover {
        background: #0056b3;
      }

      .btn-toggle:disabled, .btn-export:disabled {
        background: #6c757d;
        cursor: not-allowed;
      }
    `;

    document.head.appendChild(this.styleElement);
  }

  /**
   * Remove styles from the document
   */
  removeStyles(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }
}

// Create global UI instance
declare global {
  interface Window {
    PaginationUI: PaginationUI;
  }
}

export default PaginationUI;
