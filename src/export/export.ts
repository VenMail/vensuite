import { ISectionPropertiesOptions } from "docx";
import * as docx from "docx";

export type DocxChild = docx.Paragraph | docx.Table;

export interface NodeMetadata {
  index: number;
  children: DocxChild[];
  domChildren: HTMLElement[];
}

export interface ExportOptions {
  fileName?: string;
  toDownload?: boolean;
  pageSize?: {
    width: number;  // in twips
    height: number; // in twips
  };
  margins?: {
    top: number;    // in twips
    right: number;
    bottom: number;
    left: number;
  };
  orientation?: 'portrait' | 'landscape';
}

/**
 * Main export function - converts HTML content to DOCX
 * Based on DocExCore's exportToDocx function
 */
export const exportToDocx = async (
  content: HTMLElement,
  options: ExportOptions = {}
): Promise<Blob> => {
  const { Exporter } = await import('./Exporter');
  const exporter = new Exporter(content.firstElementChild as HTMLElement);
  return await exporter.exportToBlob(options);
};

/**
 * Get default page size in twips
 */
export const getDefaultPageSize = (orientation: 'portrait' | 'landscape' = 'portrait') => {
  const A4_WIDTH_TWIPS = 11907;  // 210mm * 56.7
  const A4_HEIGHT_TWIPS = 16838; // 297mm * 56.7
  
  if (orientation === 'landscape') {
    return {
      width: A4_HEIGHT_TWIPS,
      height: A4_WIDTH_TWIPS,
    };
  }
  
  return {
    width: A4_WIDTH_TWIPS,
    height: A4_HEIGHT_TWIPS,
  };
};

/**
 * Get default margins in twips (1 inch = 1440 twips)
 */
export const getDefaultMargins = () => ({
  top: 1440,
  right: 1440,
  bottom: 1440,
  left: 1440,
});

/**
 * Create section properties for DOCX document
 */
export const createSectionProperties = (options: ExportOptions): ISectionPropertiesOptions => {
  const pageSize = options.pageSize || getDefaultPageSize(options.orientation);
  const margins = options.margins || getDefaultMargins();
  
  return {
    page: {
      size: pageSize,
      ...margins,
    },
  };
};
