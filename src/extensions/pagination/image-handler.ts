/**
 * Image Handler for Pagination
 * 
 * Handles special cases for images that may span across page boundaries.
 * Provides utilities for:
 * - Detecting image overflow
 * - Scaling images to fit within page constraints
 * - Handling image captions
 */

import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { EditorView } from '@tiptap/pm/view';

export interface ImageMeasurement {
  imagePos: number;
  imageNode: ProseMirrorNode;
  naturalWidth: number;
  naturalHeight: number;
  displayWidth: number;
  displayHeight: number;
  hasCaption: boolean;
  captionHeight: number;
  totalHeight: number;
}

/**
 * Measure an image's dimensions in the DOM
 */
export function measureImage(view: EditorView, imagePos: number): ImageMeasurement | null {
  try {
    const imageNode = view.state.doc.nodeAt(imagePos);
    if (!imageNode) {
      return null;
    }

    const isImage = imageNode.type.name === 'image' || imageNode.type.name === 'imagePlus';
    if (!isImage) {
      return null;
    }

    const imageDom = view.nodeDOM(imagePos);
    if (!imageDom) {
      return null;
    }

    // Find the actual img element
    let imgElement: HTMLImageElement | null = null;
    if (imageDom instanceof HTMLImageElement) {
      imgElement = imageDom;
    } else if (imageDom instanceof HTMLElement) {
      imgElement = imageDom.querySelector('img');
    }

    if (!imgElement) {
      return null;
    }

    // Check for caption
    let captionHeight = 0;
    let hasCaption = false;
    if (imageDom instanceof HTMLElement) {
      const caption = imageDom.querySelector('figcaption, .image-caption');
      if (caption instanceof HTMLElement) {
        hasCaption = true;
        captionHeight = caption.offsetHeight;
      }
    }

    const displayWidth = imgElement.offsetWidth || imgElement.width;
    const displayHeight = imgElement.offsetHeight || imgElement.height;

    return {
      imagePos,
      imageNode,
      naturalWidth: imgElement.naturalWidth || displayWidth,
      naturalHeight: imgElement.naturalHeight || displayHeight,
      displayWidth,
      displayHeight,
      hasCaption,
      captionHeight,
      totalHeight: displayHeight + captionHeight,
    };
  } catch {
    return null;
  }
}

/**
 * Calculate scaled dimensions to fit within constraints
 */
export function calculateFitDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number; scale: number } {
  if (naturalWidth <= maxWidth && naturalHeight <= maxHeight) {
    return { width: naturalWidth, height: naturalHeight, scale: 1 };
  }

  const widthScale = maxWidth / naturalWidth;
  const heightScale = maxHeight / naturalHeight;
  const scale = Math.min(widthScale, heightScale);

  return {
    width: Math.floor(naturalWidth * scale),
    height: Math.floor(naturalHeight * scale),
    scale,
  };
}

/**
 * Check if an image can fit within the available height
 */
export function canImageFit(
  measurement: ImageMeasurement,
  availableHeight: number
): boolean {
  return measurement.totalHeight <= availableHeight;
}

/**
 * Estimate image height without DOM measurement
 */
export function estimateImageHeight(imageNode: ProseMirrorNode): number {
  const attrs = imageNode.attrs;
  
  // Use explicit height if available
  if (attrs.height && typeof attrs.height === 'number') {
    return attrs.height + 16; // Add margin
  }

  // Use width and aspect ratio if available
  if (attrs.width && attrs.aspectRatio) {
    return (attrs.width / attrs.aspectRatio) + 16;
  }

  // Default estimate
  return 200 + 16;
}

/**
 * Get CSS classes for image pagination behavior
 */
export function getImagePaginationClasses(options: {
  allowScale: boolean;
  keepWithCaption: boolean;
}): string[] {
  const classes: string[] = ['pagination-image'];
  
  if (options.allowScale) {
    classes.push('pagination-scalable');
  }
  
  if (options.keepWithCaption) {
    classes.push('pagination-keep-caption');
  }
  
  return classes;
}

/**
 * Generate inline styles for image scaling
 */
export function getImageScaleStyles(
  measurement: ImageMeasurement,
  maxHeight: number
): Record<string, string> | null {
  if (measurement.totalHeight <= maxHeight) {
    return null; // No scaling needed
  }

  const availableForImage = maxHeight - measurement.captionHeight;
  const scale = availableForImage / measurement.displayHeight;

  if (scale >= 1) {
    return null;
  }

  return {
    'max-height': `${availableForImage}px`,
    'width': 'auto',
    'object-fit': 'contain',
  };
}

/**
 * Generate CSS for image pagination on print
 */
export function getImagePrintStyles(): string {
  return `
    @media print {
      /* Prevent images from splitting across pages */
      .pagination-image,
      .pagination-image img,
      figure,
      .image-plus-wrapper {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* Keep captions with their images */
      .pagination-keep-caption {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* Scalable images can be resized to fit */
      .pagination-scalable img {
        max-height: 100%;
        width: auto;
        object-fit: contain;
      }
    }
  `;
}
