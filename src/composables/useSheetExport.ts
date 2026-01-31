import { ExportService, ExportFormat, PDFEngine, type IExportOptions } from '@/plugins/ExportPlugin'
import { toast } from '@/composables/useToast'

export function useSheetExport(univerCoreRef: any) {
  const exportService = new ExportService()

  async function handleExport(format: string) {
    try {
      if (!univerCoreRef.value) {
        toast.error('Export is not available yet')
        return
      }
      const exportOptions: IExportOptions = {
        format: format as ExportFormat,
        filename: `sheet-export-${Date.now()}.${format}`,
        includeStyles: true,
        includeFormulas: true,
        includeHeaders: true,
        pdfEngine: format === 'pdf' ? PDFEngine.JSPDF : undefined,
      }
      await exportService.export(univerCoreRef.value as any, exportOptions)
    } catch (err) {
      console.error('Export failed', err)
      toast.error('Export failed')
    }
  }

  return {
    handleExport,
  }
}
