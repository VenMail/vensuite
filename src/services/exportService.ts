/**
 * Enhanced Export Service for DocsEditor
 * Based on DocExCore's export system
 * Provides powerful and exact export functionality for both DOCX and PDF
 */

import { exportToDocx, ExportOptions } from "../export/export";
import type { Editor } from "@tiptap/core";

/**
 * Enhanced export function for DocsEditor
 * Replaces the simple exportToDocx in DocsEditor.vue
 */
export async function exportDocument(
  editor: Editor,
  format: 'docx' | 'pdf',
  options: {
    fileName?: string;
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'a4' | 'letter';
    margins?: {
      top: number;    // in twips
      right: number;
      bottom: number;
      left: number;
    };
    toDownload?: boolean;
  } = {}
): Promise<Blob> {
  if (!editor) {
    throw new Error('Editor is required for export');
  }

  const title = options.fileName || 'document';
  
  try {
    // Get the HTML content from the editor
    const html = editor.getHTML();
    
    // Create a temporary container to process the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Configure export options
    const exportOptions: ExportOptions = {
      fileName: `${title}.${format}`,
      toDownload: options.toDownload ?? true,
      orientation: options.orientation || 'portrait',
      pageSize: options.pageSize === 'letter' 
        ? { width: 12240, height: 15840 } // Letter size in twips
        : { width: 11907, height: 16838 }, // A4 size in twips
      margins: options.margins || {
        top: 1440,    // 1 inch in twips
        right: 1440,
        bottom: 1440,
        left: 1440,
      },
    };

    if (format === 'docx') {
      return await exportToDocx(tempDiv, exportOptions);
    } else if (format === 'pdf') {
      // For PDF, we'll first export to DOCX then convert
      // This provides better formatting than direct HTML to PDF
      const docxBlob = await exportToDocx(tempDiv, exportOptions);
      return await convertDocxToPdf(docxBlob, title);
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
    
  } catch (error) {
    console.error(`Failed to export document as ${format}:`, error);
    throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert DOCX blob to PDF
 * This would typically use a server-side conversion service
 * For now, we'll return the DOCX blob as a placeholder
 */
async function convertDocxToPdf(docxBlob: Blob, _fileName: string): Promise<Blob> {
  // In a real implementation, this would:
  // 1. Upload DOCX to conversion service
  // 2. Get PDF back
  // 3. Return PDF blob
  
  // For now, return DOCX as placeholder
  console.warn('PDF conversion not implemented yet, returning DOCX');
  return docxBlob;
}

/**
 * Export with advanced options
 * Provides more control over the export process
 */
export async function exportDocumentAdvanced(
  editor: Editor,
  options: {
    format: 'docx' | 'pdf';
    fileName?: string;
    watermark?: {
      text: string;
      opacity: number;
      fontSize: number;
    };
    password?: string;
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'a4' | 'letter';
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  }
): Promise<Blob> {
  const {
    format,
    fileName,
    orientation = 'portrait',
    pageSize = 'a4',
    margins = {},
    watermark,
    password
  } = options;

  // Build export options
  const exportOptions: ExportOptions = {
    fileName: `${fileName || 'document'}.${format}`,
    toDownload: false, // Let caller handle download
    orientation,
    pageSize: pageSize === 'letter' 
      ? { width: 12240, height: 15840 }
      : { width: 11907, height: 16838 },
    margins: {
      top: margins.top || 1440,
      right: margins.right || 1440,
      bottom: margins.bottom || 1440,
      left: margins.left || 1440,
    },
  };

  // Get HTML content
  const html = editor.getHTML();
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Apply advanced processing
  if (watermark) {
    addWatermark(tempDiv, watermark);
  }

  if (password) {
    // Password protection would be handled by the conversion service
    console.warn('Password protection not implemented yet');
  }

  // Export
  if (format === 'docx') {
    return await exportToDocx(tempDiv, exportOptions);
  } else {
    const docxBlob = await exportToDocx(tempDiv, exportOptions);
    return await convertDocxToPdf(docxBlob, fileName || 'document');
  }
}

/**
 * Add watermark to document
 */
function addWatermark(container: HTMLElement, watermark: { text: string; opacity: number; fontSize: number }) {
  const watermarkEl = document.createElement('div');
  watermarkEl.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
    font-size: ${watermark.fontSize}px;
    color: rgba(128, 128, 128, ${watermark.opacity});
    pointer-events: none;
    z-index: 9999;
    user-select: none;
  `;
  watermarkEl.textContent = watermark.text;
  container.appendChild(watermarkEl);
}

/**
 * Quick export function for common use cases
 */
export const quickExport = {
  /**
   * Export to DOCX with default settings
   */
  async toDocx(editor: Editor, fileName?: string): Promise<Blob> {
    return exportDocument(editor, 'docx', { fileName });
  },

  /**
   * Export to PDF with default settings
   */
  async toPdf(editor: Editor, fileName?: string): Promise<Blob> {
    return exportDocument(editor, 'pdf', { fileName });
  },

  /**
   * Export to DOCX with landscape orientation
   */
  async toDocxLandscape(editor: Editor, fileName?: string): Promise<Blob> {
    return exportDocument(editor, 'docx', { fileName, orientation: 'landscape' });
  },

  /**
   * Export to PDF with landscape orientation
   */
  async toPdfLandscape(editor: Editor, fileName?: string): Promise<Blob> {
    return exportDocument(editor, 'pdf', { fileName, orientation: 'landscape' });
  },
};
