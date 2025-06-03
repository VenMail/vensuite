import { Plugin, Disposable, Inject, Injector } from '@univerjs/core'
import { ExportService } from './services/ExportService'
import type { IExportService } from './types/export'

export const EXPORT_PLUGIN_NAME = 'ExportPlugin'

export class ExportPlugin extends Plugin {
  static override pluginName = EXPORT_PLUGIN_NAME
  
  private _exportService: ExportService | null = null
  private _disposables: Disposable[] = []

  constructor(
    _config: null,
    @Inject(Injector) readonly _injector: Injector
  ) {
    super()
  }

  onStarting(): void {
    this._exportService = new ExportService()
  }

  onReady(): void {
    // Plugin is ready - export service is available for use
    console.log('ExportPlugin ready with formats:', this._exportService?.getSupportedFormats())
  }

  onStopping(): void {
    this._disposables.forEach(disposable => disposable.dispose())
    this._disposables = []
    this._exportService = null
  }

  getExportService(): IExportService | null {
    return this._exportService
  }
}

// Export all types and classes for external use
export * from './types/export'
export * from './services/ExportService'
export * from './exporters/CSVExporter'
export * from './exporters/XLSXExporter'
export * from './exporters/HTMLExporter'
export * from './exporters/PDFExporter'
export * from './exporters/PDFExporterJsPDF'
export * from './utils/ExportUtils'