/**
 * Thumbnail generation utilities for slide decks
 * Leverages the existing markdown preview system to create thumbnails
 */

import { ref } from 'vue';
import type { SlidevSlide } from '@/utils/slidevMarkdown';
// Simple markdown renderer for now
// In a real implementation, you'd import the actual markdown renderer
async function renderMarkdown(content: string): Promise<string> {
  // Basic markdown to HTML conversion
  return content
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  scale?: number;
  quality?: number;
  format?: 'png' | 'jpeg';
}

export interface SlideDeckThumbnail {
  id: string;
  title: string;
  thumbnailUrl: string;
  slideCount: number;
  lastModified: string;
  theme?: string;
}

// Cache for generated thumbnails
const thumbnailCache = ref<Map<string, string>>(new Map());
const loadingThumbnails = ref<Set<string>>(new Set());

/**
 * Generate a thumbnail for a single slide using canvas
 */
export async function generateSlideThumbnail(
  slide: SlidevSlide,
  options: ThumbnailOptions = {}
): Promise<string | null> {
  const {
    width = 400,
    height = 300,
    scale = 0.5,
    quality = 0.8,
    format = 'png'
  } = options;

  const cacheKey = `${slide.id}-${width}-${height}-${scale}`;
  
  // Check cache first
  if (thumbnailCache.value.has(cacheKey)) {
    return thumbnailCache.value.get(cacheKey)!;
  }

  // Check if already loading
  if (loadingThumbnails.value.has(cacheKey)) {
    return null; // Skip for now, will be available later
  }

  loadingThumbnails.value.add(cacheKey);

  try {
    // Create a temporary container for rendering
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: ${width / scale}px;
      height: ${height / scale}px;
      background: ${slide.frontmatter?.background || '#ffffff'};
      padding: 24px;
      font-family: 'Inter', system-ui, sans-serif;
      color: #1e293b;
      overflow: hidden;
    `;

    // Render the slide content
    const renderedContent = await renderSlideContent(slide);
    container.innerHTML = renderedContent;

    document.body.appendChild(container);

    // Wait for any images or diagrams to load
    await waitForImages(container);
    await renderMermaidDiagrams(container);

    // Generate thumbnail using canvas
    const thumbnailUrl = await captureElementAsImage(container, {
      width,
      height,
      scale,
      quality,
      format
    });

    // Cache the result
    thumbnailCache.value.set(cacheKey, thumbnailUrl);

    // Cleanup
    document.body.removeChild(container);

    return thumbnailUrl;
  } catch (error) {
    console.warn('Failed to generate thumbnail for slide:', slide.id, error);
    return null;
  } finally {
    loadingThumbnails.value.delete(cacheKey);
  }
}

/**
 * Generate a thumbnail for an entire slide deck (first slide)
 */
export async function generateDeckThumbnail(
  slides: SlidevSlide[],
  _title: string,
  options: ThumbnailOptions = {}
): Promise<string | null> {
  if (!slides.length) return null;

  // Use the first slide for the deck thumbnail
  const firstSlide = slides[0];
  return generateSlideThumbnail(firstSlide, options);
}

/**
 * Render slide content to HTML
 */
async function renderSlideContent(slide: SlidevSlide): Promise<string> {
  const content = slide.content || '';
  
  try {
    // Use the existing markdown renderer
    const html = await renderMarkdown(content);
    
    // Wrap with layout-specific structure
    return wrapWithLayout(html, slide.frontmatter?.layout);
  } catch (error) {
    console.warn('Failed to render slide content:', error);
    // Fallback to simple HTML
    return `<div class="slide-content">${content}</div>`;
  }
}

/**
 * Wrap content with layout-specific structure
 */
function wrapWithLayout(content: string, layout?: string): string {
  const slideLayout = layout;
  switch (slideLayout) {
    case 'two-cols':
      return `<div class="two-cols-container">${content}</div>`;
    case 'two-cols-header':
      return `<div class="two-cols-header-container">${content}</div>`;
    case 'center':
      return `<div class="center-container" style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%;">${content}</div>`;
    default:
      return `<div class="default-container">${content}</div>`;
  }
}

/**
 * Capture an element as an image using canvas
 */
async function captureElementAsImage(
  element: HTMLElement,
  options: {
    width: number;
    height: number;
    scale: number;
    quality: number;
    format: 'png' | 'jpeg';
  }
): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');

  canvas.width = options.width;
  canvas.height = options.height;

  // Fill background
  ctx.fillStyle = getComputedStyle(element).backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, options.width, options.height);

  // Simple text rendering for now (in a real implementation, you'd use html2canvas)
  ctx.fillStyle = '#1e293b';
  ctx.font = '16px Inter, system-ui, sans-serif';
  
  // Extract text content
  const textContent = element.textContent || '';
  const lines = textContent.split('\n').slice(0, 5); // Limit to 5 lines
  
  lines.forEach((line, index) => {
    ctx.fillText(line.substring(0, 50), 20, 30 + (index * 20)); // Truncate long lines
  });

  return canvas.toDataURL(`image/${options.format}`, options.quality);
}

/**
 * Wait for all images in an element to load
 */
function waitForImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');
  const promises = Array.from(images).map(img => {
    if (img.complete) return Promise.resolve();
    
    return new Promise<void>((resolve) => {
      img.addEventListener('load', () => resolve());
      img.addEventListener('error', () => resolve()); // Continue even if image fails
      setTimeout(resolve, 2000); // Timeout after 2 seconds
    });
  });

  return Promise.all(promises).then();
}

/**
 * Render Mermaid diagrams in an element
 */
async function renderMermaidDiagrams(element: HTMLElement): Promise<void> {
  const mermaidElements = element.querySelectorAll('.mermaid');
  
  if (mermaidElements.length === 0) return;

  try {
    // Import and use mermaid dynamically
    const { default: mermaid } = await import('mermaid');
    
    for (const mermaidEl of mermaidElements) {
      try {
        const graphDefinition = mermaidEl.textContent || '';
        const { svg } = await mermaid.render(`mermaid-${Date.now()}`, graphDefinition);
        mermaidEl.innerHTML = svg;
      } catch (error) {
        console.warn('Failed to render Mermaid diagram:', error);
        mermaidEl.innerHTML = '<div class="mermaid-error">Diagram rendering failed</div>';
      }
    }
  } catch (error) {
    console.warn('Mermaid not available:', error);
  }
}

/**
 * Generate multiple thumbnails in parallel with concurrency control
 */
export async function generateBatchThumbnails(
  slides: SlidevSlide[],
  options: ThumbnailOptions = {},
  concurrency: number = 3
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  // Process slides in batches
  for (let i = 0; i < slides.length; i += concurrency) {
    const batch = slides.slice(i, i + concurrency);
    const batchPromises = batch.map(async (slide) => {
      const thumbnail = await generateSlideThumbnail(slide, options);
      if (thumbnail) {
        results.set(slide.id, thumbnail);
      }
    });

    await Promise.all(batchPromises);
  }

  return results;
}

/**
 * Clear thumbnail cache
 */
export function clearThumbnailCache(): void {
  thumbnailCache.value.clear();
}

/**
 * Get cached thumbnail URL for a slide
 */
export function getCachedThumbnail(slideId: string, options: ThumbnailOptions = {}): string | null {
  const { width = 400, height = 300, scale = 0.5 } = options;
  const cacheKey = `${slideId}-${width}-${height}-${scale}`;
  return thumbnailCache.value.get(cacheKey) || null;
}

/**
 * Preload thumbnails for a slide deck
 */
export async function preloadDeckThumbnails(
  slides: SlidevSlide[],
  options: ThumbnailOptions = {}
): Promise<void> {
  // Only preload first few slides for performance
  const slidesToPreload = slides.slice(0, 5);
  await generateBatchThumbnails(slidesToPreload, options);
}

/**
 * Create a placeholder thumbnail for when generation fails
 */
export function createPlaceholderThumbnail(
  title: string,
  options: { width?: number; height?: number; color?: string } = {}
): string {
  const { width = 400, height = 300, color = '#3b82f6' } = options;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  canvas.width = width;
  canvas.height = height;
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, color + '20');
  gradient.addColorStop(1, color + '40');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Border
  ctx.strokeStyle = color + '60';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, width, height);
  
  // Title text
  ctx.fillStyle = color;
  ctx.font = 'bold 24px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const maxChars = 30;
  const displayTitle = title.length > maxChars ? title.substring(0, maxChars) + '...' : title;
  ctx.fillText(displayTitle, width / 2, height / 2);
  
  return canvas.toDataURL('image/png');
}
