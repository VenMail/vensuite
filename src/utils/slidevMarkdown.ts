import { t } from '@/i18n';
import { parseVideoMarkdown } from '@/composables/useVideoEmbed';
import { parsePresetSyntax, applyPresetStyles } from './presetStyling';
/**
 * Slidev Markdown Utilities
 * Handles parsing and conversion of Slidev-flavored markdown
 */

export interface SlidevSlide {
  id: string;
  content: string;
  notes: string;
  frontmatter?: Record<string, any>;
}

export interface SlidevPresentation {
  headmatter: Record<string, any>;
  slides: SlidevSlide[];
}

/**
 * Extract presenter notes (HTML comments at the end)
 * Also processes click markers for synchronization
 */
function extractPresenterNotes(markdown: string): { notes: string; content: string } {
  let content = markdown;
  let notes = '';

  // Extract notes from HTML comments at the end
  const notesMatch = content.match(/<!--[\s\S]*?-->$/);
  if (notesMatch) {
    notes = notesMatch[0].replace(/<!--[\s\S]*?-->/, (match) => {
      // Process click markers in notes
      return match
        .replace(/\[click\]/g, '<span class="click-marker">[click]</span>')
        .replace(/<!--\s*/g, '')
        .replace(/\s*-->/g, '');
    });
    content = content.substring(0, content.lastIndexOf('<!--')).trim();
  }

  return { notes: notes.trim(), content };
}

/**
 * Parse a complete Slidev markdown file into structured slides
 */
export function parseSlidevMarkdown(markdown: string): SlidevPresentation {
  const slides: SlidevSlide[] = [];
  let headmatter: Record<string, any> = {};

  // Split by slide separator (---)
  const parts = markdown.split(/\n---\n/);

  parts.forEach((part, index) => {
    const trimmed = part.trim();
    if (!trimmed) return;

    // Check for frontmatter at the start
    let slideContent = trimmed;
    let slideFrontmatter: Record<string, any> | undefined;

    // Parse frontmatter (YAML between --- markers)
    if (trimmed.startsWith('---')) {
      const endIndex = trimmed.indexOf('---', 3);
      if (endIndex > 0) {
        const yamlContent = trimmed.substring(3, endIndex).trim();
        slideFrontmatter = parseYamlFrontmatter(yamlContent);
        slideContent = trimmed.substring(endIndex + 3).trim();

        // First slide's frontmatter is the headmatter
        if (index === 0) {
          headmatter = slideFrontmatter || {};
        }
      }
    }

    // Extract presenter notes and process click markers
    const { notes, content } = extractPresenterNotes(slideContent);

    slides.push({
      id: `slide-${index + 1}-${Date.now()}`,
      content,
      notes,
      frontmatter: slideFrontmatter
    });
  });

  // Ensure at least one slide exists
  if (slides.length === 0) {
    slides.push({
      id: `slide-1-${Date.now()}`,
      content: '# Welcome\n\nStart creating your presentation',
      notes: ''
    });
  }

  return { headmatter, slides };
}

/**
 * Convert structured slides back to Slidev markdown format
 */
export function slidesToMarkdown(presentation: SlidevPresentation): string {
  const { headmatter, slides } = presentation;
  const parts: string[] = [];

  slides.forEach((slide, index) => {
    let slideContent = '';

    // Add frontmatter for first slide (headmatter) or if slide has frontmatter
    if (index === 0 && Object.keys(headmatter).length > 0) {
      slideContent += '---\n';
      slideContent += stringifyYamlFrontmatter({ ...headmatter, ...slide.frontmatter });
      slideContent += '\n---\n\n';
    } else if (slide.frontmatter && Object.keys(slide.frontmatter).length > 0) {
      slideContent += '---\n';
      slideContent += stringifyYamlFrontmatter(slide.frontmatter);
      slideContent += '\n---\n\n';
    }

    // Add content
    slideContent += slide.content;

    // Add notes as HTML comment
    if (slide.notes) {
      slideContent += '\n\n<!--\n' + slide.notes + '\n-->';
    }

    parts.push(slideContent);
  });

  return parts.join('\n\n---\n\n');
}

/**
 * Parse simple YAML frontmatter
 */
function parseYamlFrontmatter(yaml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yaml.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value: any = line.substring(colonIndex + 1).trim();

      // Parse value types
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (/^\d+$/.test(value)) value = parseInt(value, 10);
      else if (/^\d+\.\d+$/.test(value)) value = parseFloat(value);
      else if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }
  }

  return result;
}

/**
 * Stringify object to simple YAML format
 */
function stringifyYamlFrontmatter(obj: Record<string, any>): string {
  return Object.entries(obj)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}: "${value}"`;
      }
      return `${key}: ${value}`;
    })
    .join('\n');
}

/**
 * Parse optional block attributes at end of line: {.class1 .class2} or {style="..."}
 * Enhanced to support preset syntax: {.presets.styling.vignette{intensity=0.8,color=#000}}
 */
export function parseBlockAttributesFromLine(line: string): { rest: string; class?: string; style?: string; presets?: string } {
  const match = line.match(/\s*\{([^}]+)\}\s*$/);
  if (!match) return { rest: line };
  const rest = line.slice(0, match.index).trim();
  const attrs = match[1];
  
  // Enhanced regex to support arbitrary values like .top-[5.3%], .left-[4.0%], .w-[736px]
  // Also support preset syntax with nested braces
  const classMatch = attrs.match(/\.([a-zA-Z0-9_\-\[\]%\.]+(?:\{[^}]*\})?)/g);
  const styleMatch = attrs.match(/style\s*=\s*"([^"]*)"/);
  
  // Separate regular classes from preset classes
  const regularClasses: string[] = [];
  const presetClasses: string[] = [];
  
  if (classMatch) {
    for (const classWithBraces of classMatch) {
      const className = classWithBraces.slice(1); // Remove the dot
      if (className.includes('.presets.') || className.includes('{')) {
        // This is a preset class
        presetClasses.push(className);
      } else {
        // Regular class
        regularClasses.push(className);
      }
    }
  }
  
  const result = {
    rest,
    class: regularClasses.length > 0 ? regularClasses.join(' ') : undefined,
    style: styleMatch ? styleMatch[1] : undefined,
    presets: presetClasses.length > 0 ? presetClasses.join(' ') : undefined
  };
  
  // Debug logging
  if (result.class) {
    console.log('🎨 DEBUG: Parsed block classes:', result.class, 'from line:', line);
  }
  if (result.presets) {
    console.log('🎨 DEBUG: Parsed preset classes:', result.presets, 'from line:', line);
  }
  
  return result;
}

function parseBlockAttributes(line: string): { rest: string; class?: string; style?: string; presets?: string } {
  return parseBlockAttributesFromLine(line);
}

/**
 * Process inline content only (bold, italic, links, code, MDC, LaTeX) - no block wrappers
 */
function processInlineContent(html: string): string {
  let out = html;
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => `<div class="latex-block">${latex}</div>`);
  out = out.replace(/\$([^$\n]+)\$/g, (_, latex) => `<span class="latex-inline">${latex}</span>`);
  out = out.replace(/\[([^\]]+)\]\{([^}]+)\}/g, (_, text, attrs) => {
    const styleMatch = attrs.match(/style="([^"]+)"/);
    const classMatch = attrs.match(/\.([a-zA-Z0-9_-]+)/g);
    const style = styleMatch ? ` style="${styleMatch[1]}"` : '';
    const className = classMatch ? ` class="${classMatch.map((c: string) => c.slice(1)).join(' ')}"` : '';
    return `<span${className}${style}>${text}</span>`;
  });
  out = out.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
  out = out.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  out = out.replace(/__(.+?)__/g, '<strong>$1</strong>');
  out = out.replace(/_(.+?)_/g, '<em>$1</em>');
  out = out.replace(/~~(.+?)~~/g, '<del>$1</del>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  out = out.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  return out;
}

interface MarkdownBlock {
  id: string; // Unique identifier
  startLine: number;
  endLine: number;
  type: string;
  lines: string[];
  blockClass?: string;
  blockStyle?: string;
  blockPresets?: string; // Preset syntax like "presets.styling.vignette{intensity=0.8}"
}

export { MarkdownBlock };

/**
 * Split markdown into blocks with line ranges and optional block attributes
 */
export function splitMarkdownIntoBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  // Generate unique ID for each block
  const generateBlockId = (type: string, start: number, end: number): string => {
    return `${type}-${start}-${end}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```mermaid')) {
      const start = i;
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) i++;
      blocks.push({ 
        id: generateBlockId('mermaid', start, i),
        startLine: start, 
        endLine: i, 
        type: 'mermaid', 
        lines: lines.slice(start, i + 1) 
      });
      i++;
      continue;
    }
    if (trimmed.startsWith('```plantuml')) {
      const start = i;
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) i++;
      blocks.push({ 
        id: generateBlockId('plantuml', start, i),
        startLine: start, 
        endLine: i, 
        type: 'plantuml', 
        lines: lines.slice(start, i + 1) 
      });
      i++;
      continue;
    }
    if (trimmed.match(/^```(\w+)?/)) {
      const start = i;
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) i++;
      blocks.push({ 
        id: generateBlockId('code', start, i),
        startLine: start, 
        endLine: i, 
        type: 'code', 
        lines: lines.slice(start, i + 1) 
      });
      i++;
      continue;
    }
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const { rest, class: blockClass, style: blockStyle, presets: blockPresets } = parseBlockAttributes(trimmed);
      const innerMatch = rest.match(/^(#{1,6})\s+(.+)$/);
      const content = innerMatch ? innerMatch[2] : rest;
      blocks.push({
        id: generateBlockId('heading', i, i),
        startLine: i,
        endLine: i,
        type: 'heading',
        lines: [line],
        blockClass,
        blockStyle,
        blockPresets
      });
      (blocks[blocks.length - 1] as MarkdownBlock & { headingLevel: number }).headingLevel = headingMatch[1].length;
      (blocks[blocks.length - 1] as MarkdownBlock & { headingContent: string }).headingContent = content;
      i++;
      continue;
    }
    if (trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/)) {
      const { rest, class: blockClass, style: blockStyle, presets: blockPresets } = parseBlockAttributes(trimmed);
      const imgMatch = rest.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (imgMatch) {
        blocks.push({
          id: generateBlockId('image', i, i),
          startLine: i,
          endLine: i,
          type: 'image',
          lines: [line],
          blockClass,
          blockStyle,
          blockPresets
        });
        (blocks[blocks.length - 1] as MarkdownBlock & { imageAlt: string; imageSrc: string }).imageAlt = imgMatch[1];
        (blocks[blocks.length - 1] as MarkdownBlock & { imageSrc: string }).imageSrc = imgMatch[2];
      }
      i++;
      continue;
    }
    if (trimmed.match(/@\[(youtube|vimeo|video)\]\(([^)]+)\)/)) {
      const { class: blockClass, style: blockStyle } = parseBlockAttributes(trimmed);
      blocks.push({
        id: generateBlockId('video', i, i),
        startLine: i,
        endLine: i,
        type: 'video',
        lines: [line],
        blockClass,
        blockStyle
      });
      i++;
      continue;
    }
    if (trimmed.includes('|') && trimmed.match(/\|.+\|/)) {
      const start = i;
      while (i < lines.length && lines[i].trim().includes('|')) i++;
      blocks.push({ 
        id: generateBlockId('table', start, i - 1),
        startLine: start, 
        endLine: i - 1, 
        type: 'table', 
        lines: lines.slice(start, i) 
      });
      continue;
    }
    if (trimmed.match(/^[\*\-+]\s/) || trimmed.match(/^\d+\.\s/)) {
      const start = i;
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t === '' && i + 1 < lines.length && lines[i + 1].match(/^(\s*)([\*\-+]|\d+\.)\s/)) {
          i++;
          continue;
        }
        if (lines[i].match(/^(\s*)([\*\-+]|\d+\.)\s/)) {
          i++;
          continue;
        }
        break;
      }
      if (i > start && lines[i - 1].trim() === '') i--;
      blocks.push({ 
        id: generateBlockId('list', start, i - 1),
        startLine: start, 
        endLine: i - 1, 
        type: 'list', 
        lines: lines.slice(start, i) 
      });
      continue;
    }
    if (trimmed.startsWith('>')) {
      const start = i;
      while (i < lines.length && lines[i].trim().startsWith('>')) i++;
      blocks.push({ 
        id: generateBlockId('blockquote', start, i - 1),
        startLine: start, 
        endLine: i - 1, 
        type: 'blockquote', 
        lines: lines.slice(start, i) 
      });
      continue;
    }
    if (trimmed.match(/^[-*_]{3,}$/)) {
      blocks.push({ 
        id: generateBlockId('hr', i, i),
        startLine: i, 
        endLine: i, 
        type: 'hr', 
        lines: [line] 
      });
      i++;
      continue;
    }
    if (trimmed === '') {
      i++;
      continue;
    }
    const start = i;
    while (i < lines.length && lines[i].trim() !== '') {
      const l = lines[i].trim();
      if (l.startsWith('#') || l.startsWith('```') || l.startsWith('>') || l.match(/^[\*\-+]\s/) || l.match(/^\d+\.\s/) || l.match(/!\[.*\]\(.*\)/) || (l.includes('|') && l.match(/\|.+\|/))) break;
      i++;
    }
    const paraLines = lines.slice(start, i);
    const firstLine = paraLines[0] || '';
    const { rest: firstRest, class: blockClass, style: blockStyle, presets: blockPresets } = parseBlockAttributes(firstLine.trim());
    if (blockClass || blockStyle || blockPresets) {
      paraLines[0] = firstRest;
      blocks.push({
        id: generateBlockId('paragraph', start, i - 1),
        startLine: start,
        endLine: i - 1,
        type: 'paragraph',
        lines: paraLines,
        blockClass,
        blockStyle,
        blockPresets
      });
    } else {
      blocks.push({
        id: generateBlockId('paragraph', start, i - 1),
        startLine: start,
        endLine: i - 1,
        type: 'paragraph',
        lines: paraLines
      });
    }
  }

  return blocks;
}

/**
 * Render blocks to HTML with data-markdown-line-start/end and optional block class/style/presets
 */
export function renderBlocksToHtml(blocks: MarkdownBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    const { id, startLine, endLine, type, lines, blockClass, blockStyle, blockPresets } = block;
    // Include block ID in data attributes for better tracking
    const dataAttrs = ` data-block-id="${id}" data-markdown-line-start="${startLine}" data-markdown-line-end="${endLine}" data-markdown-type="${type}"`;
    
    // Process presets to extract CSS classes and data attributes
    let presetClasses: string[] = [];
    let presetDataAttrs: string[] = [];
    
    if (blockPresets) {
      const presets = parsePresetSyntax(blockPresets);
      for (const preset of presets) {
        presetClasses.push(preset.cssClass);
        for (const [key, value] of Object.entries(preset.options)) {
          presetDataAttrs.push(`data-preset-${key}="${value}"`);
        }
      }
    }
    
    // Combine all classes
    const allClasses = [blockClass, ...presetClasses].filter(Boolean).join(' ');
    const classAttr = allClasses ? ` class="${allClasses}"` : '';
    const styleAttr = blockStyle ? ` style="${blockStyle}"` : '';
    const presetAttrs = presetDataAttrs.length > 0 ? ' ' + presetDataAttrs.join(' ') : '';

    if (type === 'mermaid') {
      const code = lines.slice(1, -1).join('\n').trim();
      parts.push(`<div class="mermaid-diagram"${dataAttrs} data-mermaid="${encodeURIComponent(code)}">${renderMermaidPlaceholder(code)}</div>`);
      continue;
    }
    if (type === 'plantuml') {
      const code = lines.slice(1, -1).join('\n').trim();
      parts.push(`<div class="plantuml-diagram"${dataAttrs} data-plantuml="${encodeURIComponent(code)}">${renderPlantumlPlaceholder(code)}</div>`);
      continue;
    }
    if (type === 'video') {
      // Handle video blocks with video parsing
      const videoMarkdown = lines.join('\n');
      const videoHtml = parseVideoMarkdown(videoMarkdown);
      parts.push(`<div${dataAttrs}${classAttr}${styleAttr}${presetAttrs}>${videoHtml}</div>`);
      continue;
    }
    if (type === 'code') {
      const langMatch = lines[0].match(/^```(\w+)?/);
      const lang = langMatch ? langMatch[1] || 'text' : 'text';
      const code = lines.slice(1, -1).join('\n');
      const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      parts.push(`<pre class="code-block"${dataAttrs}${presetAttrs}><code class="language-${lang}">${escapedCode}</code></pre>`);
      continue;
    }
    if (type === 'heading') {
      const level = (block as MarkdownBlock & { headingLevel: number }).headingLevel;
      const content = (block as MarkdownBlock & { headingContent: string }).headingContent || '';
      const tag = `h${level}`;
      const inner = processInlineContent(content);
      parts.push(`<${tag}${classAttr}${styleAttr}${presetAttrs}${dataAttrs}>${inner}</${tag}>`);
      continue;
    }
    if (type === 'image') {
      const alt = (block as MarkdownBlock & { imageAlt: string }).imageAlt || '';
      const src = (block as MarkdownBlock & { imageSrc: string }).imageSrc || '';
      const rawLine = lines[0] || '';
      const braceMatch = rawLine.match(/!\[[^\]]*\]\([^)]+\)\s*\{([^}]+)\}/);
      let extraClass = blockClass || '';
      let extraStyle = blockStyle || '';
      if (braceMatch) {
        const attrs = braceMatch[1];
        const widthMatch = attrs.match(/width=(\d+)/);
        const heightMatch = attrs.match(/height=(\d+)/);
        const classMatch = attrs.match(/\.([a-zA-Z0-9_-]+)/g);
        const styleMatch = attrs.match(/style\s*=\s*"([^"]*)"/);
        if (widthMatch) extraStyle += (extraStyle ? ' ' : '') + `width: ${widthMatch[1]}px;`;
        if (heightMatch) extraStyle += (extraStyle ? ' ' : '') + `height: ${heightMatch[1]}px;`;
        if (classMatch) extraClass = (extraClass ? extraClass + ' ' : '') + classMatch.map((c: string) => c.slice(1)).join(' ');
        if (styleMatch) extraStyle += (extraStyle ? ' ' : '') + styleMatch[1];
      }
      // Combine with preset classes
      const allImgClasses = [extraClass, ...presetClasses].filter(Boolean).join(' ');
      const imgClass = allImgClasses ? `slide-image ${allImgClasses}` : 'slide-image';
      const finalClass = ` class="${imgClass}"`;
      const finalStyle = extraStyle ? ` style="${extraStyle.trim()}"` : '';
      parts.push(`<img src="${src}" alt="${alt}"${finalClass}${finalStyle}${presetAttrs}${dataAttrs} />`);
      continue;
    }
    if (type === 'table') {
      const tableHtml = parseMarkdownTables(lines.join('\n'));
      const allTableClasses = ['slide-table', blockClass, ...presetClasses].filter(Boolean).join(' ');
      const tableClassAttr = ` class="${allTableClasses}"`;
      const withData = tableHtml.replace(/^<table/, `<table${dataAttrs}${presetAttrs}${tableClassAttr}`);
      parts.push(withData);
      continue;
    }
    if (type === 'list') {
      const listContent = lines
        .map((l) => {
          const bullet = l.replace(/^(\s*)([\*\-+]|\d+\.)\s+(.*)$/s, '$3');
          return `<li>${processInlineContent(bullet)}</li>`;
        })
        .join('\n');
      parts.push(`<ul class="slide-list"${classAttr}${styleAttr}${presetAttrs}${dataAttrs}>\n${listContent}\n</ul>`);
      continue;
    }
    if (type === 'blockquote') {
      const quoteContent = lines.map((l) => l.replace(/^>\s?/, '')).join('\n');
      parts.push(`<blockquote${classAttr}${styleAttr}${presetAttrs}${dataAttrs}>${processInlineContent(quoteContent)}</blockquote>`);
      continue;
    }
    if (type === 'hr') {
      parts.push(`<hr class="slide-divider"${presetAttrs}${dataAttrs} />`);
      continue;
    }
    if (type === 'paragraph') {
      const text = lines.join('\n');
      // Process video syntax in paragraphs
      const processedText = parseVideoMarkdown(text);
      parts.push(`<p${classAttr}${styleAttr}${presetAttrs}${dataAttrs}>${processInlineContent(processedText)}</p>`);
      continue;
    }
    
    // Default case
    const text = lines.join('\n');
    parts.push(`<div${classAttr}${styleAttr}${presetAttrs}${dataAttrs}>${processInlineContent(text)}</div>`);
  }

  return parts.join('\n');
}

/**
 * Process markdown content to HTML with data-markdown-line-* on block elements and block-level {.class}/{style}
 */
function processMarkdownContentWithLineNumbers(markdown: string): string {
  const blocks = splitMarkdownIntoBlocks(markdown);
  return renderBlocksToHtml(blocks);
}

/**
 * Convert markdown to HTML for preview with full Slidev syntax support
 */
export function parseMarkdownToHtml(markdown: string, layout?: string): string {
  if (!markdown) return '';

  // Handle Slidev slot syntax (::right::, ::left::, ::default::)
  const hasTwoCols = layout === 'two-cols' || layout === 'two-cols-header' || 
                     markdown.includes('::right::') || markdown.includes('::left::');
  
  if (hasTwoCols) {
    const colsData = parseTwoColsLayout(markdown);
    
    if (colsData.type === 'two-cols-header') {
      const headerHtml = processMarkdownContentWithLineNumbers(colsData.header || '');
      const leftHtml = processMarkdownContentWithLineNumbers(colsData.left || '');
      const rightHtml = processMarkdownContentWithLineNumbers(colsData.right || '');
      
      return `<div class="two-cols-header-container" data-layout="two-cols-header">
        <div class="header-content" data-section="header">${headerHtml}</div>
        <div class="cols-container">
          <div class="col-left" data-section="left">${leftHtml}</div>
          <div class="col-right" data-section="right">${rightHtml}</div>
        </div>
      </div>`;
    } else if (colsData.type === 'two-cols') {
      const leftHtml = processMarkdownContentWithLineNumbers(colsData.left || '');
      const rightHtml = processMarkdownContentWithLineNumbers(colsData.right || '');
      
      return `<div class="two-cols-container" data-layout="two-cols">
        <div class="col-left" data-section="left">${leftHtml}</div>
        <div class="col-right" data-section="right">${rightHtml}</div>
      </div>`;
    }
  }
  
  return processMarkdownContentWithLineNumbers(markdown);
}

/**
 * Process markdown content to HTML (legacy, without line numbers).
 * Prefer parseMarkdownToHtml which uses processMarkdownContentWithLineNumbers.
 */
export function processMarkdownContent(markdown: string): string {
  let html = markdown;

  // Handle LaTeX blocks (must be before regular code blocks)
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
    return `<div class="latex-block">${latex}</div>`;
  });
  
  // Handle inline LaTeX
  html = html.replace(/\$([^$\n]+)\$/g, (_, latex) => {
    return `<span class="latex-inline">${latex}</span>`;
  });

  // Handle Mermaid diagrams
  html = html.replace(/```mermaid\n([\s\S]*?)```/g, (_, code) => {
    return `<div class="mermaid-diagram" data-mermaid="${encodeURIComponent(code.trim())}">${renderMermaidPlaceholder(code.trim())}</div>`;
  });

  // Handle PlantUML diagrams
  html = html.replace(/```plantuml\n([\s\S]*?)```/g, (_, code) => {
    return `<div class="plantuml-diagram" data-plantuml="${encodeURI(code.trim())}">${renderPlantumlPlaceholder(code.trim())}</div>`;
  });

  // Handle code blocks with line numbers and highlighting
  html = html.replace(/```(\w+)?(\{[^}]*\})?\n([\s\S]*?)```/g, (_, lang, attrs, code) => {
    const escapedCode = code
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Parse attributes for line numbers, highlighting, etc.
    const attributes = attrs ? attrs.slice(1, -1) : ''; // Remove { }
    const hasLineNumbers = attributes.includes('line-numbers');
    const highlightMatch = attributes.match(/lines="([^"]+)"/);
    const highlightedLines = highlightMatch ? highlightMatch[1] : '';
    
    let codeClass = `language-${lang || 'text'}`;
    if (hasLineNumbers) codeClass += ' line-numbers';
    if (highlightedLines) codeClass += ` highlight-lines="${highlightedLines}"`;
    
    return `<pre class="code-block"><code class="${codeClass}">${escapedCode}</code></pre>`;
  });

  // Enhanced MDC Syntax: [text]{style="..."} or [text]{.class}
  html = html.replace(/\[([^\]]+)\]\{([^}]+)\}/g, (_, text, attrs) => {
    const styleMatch = attrs.match(/style="([^"]+)"/);
    const classMatch = attrs.match(/\.([a-zA-Z0-9_-]+)/g);
    const idMatch = attrs.match(/#([a-zA-Z0-9_-]+)/);
    
    let style = styleMatch ? ` style="${styleMatch[1]}"` : '';
    let className = classMatch ? ` class="${classMatch.map((c: string) => c.slice(1)).join(' ')}"` : '';
    let id = idMatch ? ` id="${idMatch[1]}"` : '';
    
    return `<span${id}${className}${style}>${text}</span>`;
  });

  // Handle Vue components: :component-name{prop="value"}
  html = html.replace(/:([a-zA-Z0-9-]+)\{([^}]+)\}/g, (_, componentName, props) => {
    return `<component is="${componentName}" ${parseProps(props)} />`;
  });

  // Handle block components: ::component-name{prop="value"}
  html = html.replace(/::([a-zA-Z0-9-]+)\{([^}]+)\}/g, (_, componentName, props) => {
    return `<component is="${componentName}" ${parseProps(props)} />`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Headers
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Images with enhanced attributes (MDC style)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)\{([^}]+)\}/g, (_, alt, src, attrs) => {
    const widthMatch = attrs.match(/width=(\d+)/);
    const heightMatch = attrs.match(/height=(\d+)/);
    const classMatch = attrs.match(/\.([a-zA-Z0-9_-]+)/g);
    const idMatch = attrs.match(/#([a-zA-Z0-9_-]+)/);
    const isLazy = attrs.includes('lazy');
    
    let style = '';
    if (widthMatch) style += `width: ${widthMatch[1]}px; `;
    if (heightMatch) style += `height: ${heightMatch[1]}px; `;
    
    let className = classMatch ? ` class="${classMatch.map((c: string) => c.slice(1)).join(' ')}"` : '';
    let id = idMatch ? ` id="${idMatch[1]}"` : '';
    let loading = isLazy ? ' loading="lazy"' : '';
    let styleAttr = style ? ` style="${style.trim()}"` : '';
    
    return `<img src="${src}" alt="${alt}"${className}${id}${styleAttr}${loading} />`;
  });
  
  // Regular images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) =>
    `<img src="${src}" alt="${alt}" class="slide-image" />`);

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  // Horizontal rules (but not in frontmatter context)
  html = html.replace(/^---$/gm, '<hr class="slide-divider" />');
  html = html.replace(/^\*\*\*$/gm, '<hr class="slide-divider" />');

  // Tables
  html = parseMarkdownTables(html);

  // Unordered lists
  html = html.replace(/^[\*\-]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul class="slide-list">$&</ul>');

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // Paragraphs (lines that aren't already wrapped)
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return line;
    if (trimmed.startsWith('::')) return line; // Skip slot markers
    return `<p>${line}</p>`;
  });
  html = processedLines.join('\n');

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  // Fix nested list issues
  html = html.replace(/<\/ul>\s*<ul[^>]*>/g, '');
  html = html.replace(/<\/ol>\s*<ol>/g, '');

  return html;
}

/**
 * Extract markdown source from HTML element path
 * Used for reverse-mapping preview selections to markdown
 */
export function getMarkdownFromPath(fullMarkdown: string, elementPath: { section?: string; elementType?: string; index?: number }): { start: number; end: number; text: string } | null {
  const { section, elementType, index } = elementPath;
  
  // For two-column layouts, find the section
  if (section) {
    let sectionStart = 0;
    let sectionEnd = fullMarkdown.length;
    
    if (section === 'header') {
      const leftMatch = fullMarkdown.match(/::left::/);
      if (leftMatch && leftMatch.index) {
        sectionEnd = leftMatch.index;
      }
    } else if (section === 'left') {
      const leftMatch = fullMarkdown.match(/::left::/);
      const rightMatch = fullMarkdown.match(/::right::/);
      if (leftMatch && leftMatch.index) {
        sectionStart = leftMatch.index + 8; // length of '::left::'
        if (rightMatch && rightMatch.index) {
          sectionEnd = rightMatch.index;
        }
      }
    } else if (section === 'right') {
      const rightMatch = fullMarkdown.match(/::right::/);
      if (rightMatch && rightMatch.index) {
        sectionStart = rightMatch.index + 9; // length of '::right::'
      }
    }
    
    const sectionText = fullMarkdown.substring(sectionStart, sectionEnd).trim();
    
    // If we have element type and index, find that specific element
    if (elementType && index !== undefined) {
      // Find the nth occurrence of this element type
      const patterns: Record<string, RegExp> = {
        'h1': /^#\s+(.+)$/gm,
        'h2': /^##\s+(.+)$/gm,
        'h3': /^###\s+(.+)$/gm,
        'p': /^(?!#|\*|-|>|```|::)[^\n]+$/gm,
        'li': /^[\*\-]\s+(.+)$/gm
      };
      
      const pattern = patterns[elementType];
      if (pattern) {
        let count = 0;
        let match;
        while ((match = pattern.exec(sectionText)) !== null) {
          if (count === index) {
            return {
              start: sectionStart + match.index,
              end: sectionStart + match.index + match[0].length,
              text: match[0]
            };
          }
          count++;
        }
      }
    }
    
    return {
      start: sectionStart,
      end: sectionEnd,
      text: sectionText
    };
  }
  
  return null;
}

/**
 * Parse two-column layout with ::left:: and ::right:: slots
 * Returns structured data instead of HTML to allow markdown processing
 */
function parseTwoColsLayout(markdown: string): { type: 'two-cols' | 'two-cols-header' | 'none'; header?: string; left?: string; right?: string; original: string } {
  // Check for ::left:: and ::right:: slots (two-cols-header layout)
  if (markdown.includes('::left::') && markdown.includes('::right::')) {
    const headerMatch = markdown.match(/^([\s\S]*?)::left::/);
    const header = headerMatch ? headerMatch[1].trim() : '';
    
    const leftMatch = markdown.match(/::left::([\s\S]*?)::right::/);
    const leftContent = leftMatch ? leftMatch[1].trim() : '';
    
    const rightMatch = markdown.match(/::right::([\s\S]*)$/);
    const rightContent = rightMatch ? rightMatch[1].trim() : '';
    
    return {
      type: 'two-cols-header',
      header,
      left: leftContent,
      right: rightContent,
      original: markdown
    };
  }
  
  // Check for ::right:: slot (two-cols layout)
  if (markdown.includes('::right::')) {
    const rightIndex = markdown.indexOf('::right::');
    const leftContent = markdown.substring(0, rightIndex).trim();
    const rightContent = markdown.substring(rightIndex + 9).trim(); // 9 = length of '::right::'
    
    return {
      type: 'two-cols',
      left: leftContent,
      right: rightContent,
      original: markdown
    };
  }
  
  return { type: 'none', original: markdown };
}

/**
 * Parse markdown tables
 */
function parseMarkdownTables(html: string): string {
  const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
  
  return html.replace(tableRegex, (_, headerRow, bodyRows) => {
    const headers = headerRow.split('|').map((h: string) => h.trim()).filter(Boolean);
    const rows = bodyRows.trim().split('\n').map((row: string) => 
      row.split('|').map((cell: string) => cell.trim()).filter(Boolean)
    );
    
    let table = '<table class="slide-table">\n<thead>\n<tr>';
    headers.forEach((h: string) => {
      table += `<th>${h}</th>`;
    });
    table += '</tr>\n</thead>\n<tbody>';
    
    rows.forEach((row: string[]) => {
      table += '\n<tr>';
      row.forEach((cell: string) => {
        table += `<td>${cell}</td>`;
      });
      table += '</tr>';
    });
    
    table += '\n</tbody>\n</table>';
    return table;
  });
}

/**
 * Render a placeholder for PlantUML diagrams (actual rendering happens client-side)
 */
function renderPlantumlPlaceholder(_code: string): string {
  return `<div class="plantuml-placeholder">
    <svg class="plantuml-icon" viewBox="0 0 24 24" width="48" height="48">
      <path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
    <span class="plantuml-label">PlantUML Diagram</span>
  </div>`;
}

/**
 * Parse props string for Vue components
 */
function parseProps(propsString: string): string {
  return propsString
    .split(/\s+/)
    .filter(Boolean)
    .map(prop => {
      const [key, ...valueParts] = prop.split('=');
      const value = valueParts.join('=');
      if (value) {
        // Handle quoted values
        if (value.startsWith('"') && value.endsWith('"')) {
          return `${key}=${value}`;
        }
        return `${key}="${value}"`;
      }
      return key;
    })
    .join(' ');
}

/**
 * Render a placeholder for Mermaid diagrams (actual rendering happens client-side)
 */
function renderMermaidPlaceholder(code: string): string {
  // Detect diagram type
  const firstLine = code.split('\n')[0].trim().toLowerCase();
  let diagramType = 'diagram';
  
  if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) {
    diagramType = 'Flowchart';
  } else if (firstLine.startsWith('sequencediagram')) {
    diagramType = 'Sequence Diagram';
  } else if (firstLine.startsWith('classDiagram')) {
    diagramType = 'Class Diagram';
  } else if (firstLine.startsWith('statediagram')) {
    diagramType = 'State Diagram';
  } else if (firstLine.startsWith('erdiagram')) {
    diagramType = 'ER Diagram';
  } else if (firstLine.startsWith('gantt')) {
    diagramType = 'Gantt Chart';
  } else if (firstLine.startsWith('pie')) {
    diagramType = 'Pie Chart';
  } else if (firstLine.startsWith('mindmap')) {
    diagramType = 'Mind Map';
  } else if (firstLine.startsWith('timeline')) {
    diagramType = 'Timeline';
  }
  
  return `<div class="mermaid-placeholder">
    <svg class="mermaid-icon" viewBox="0 0 24 24" width="48" height="48">
      <path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
    <span class="mermaid-label">${diagramType}</span>
  </div>`;
}

/**
 * Generate default slides for a new presentation
 */
export function createDefaultSlides(): SlidevSlide[] {
  return [
    {
      id: `slide-1-${Date.now()}`,
      content: '# Welcome to Your Presentation\n\nClick to edit this slide',
      notes: 'This is your first slide. Add presenter notes here.',
      frontmatter: {
        layout: 'cover'
      }
    }
  ];
}

/**
 * Create a new empty slide
 */
export function createEmptySlide(): SlidevSlide {
  return {
    id: `slide-${Date.now()}`,
    content: '# New Slide\n\nAdd your content here',
    notes: ''
  };
}

/**
 * Available Slidev layouts
 */
export const SLIDEV_LAYOUTS = [
  { value: 'default', label: 'Default' },
  { value: 'center', label: 'Center' },
  { value: 'cover', label: 'Cover' },
  { value: 'intro', label: 'Intro' },
  { value: 'section', label: 'Section' },
  { value: 'statement', label: 'Statement' },
  { value: 'fact', label: 'Fact' },
  { value: 'quote', label: 'Quote' },
  { value: 'image', label: 'Image' },
  { value: 'image-left', label: 'Image Left' },
  { value: 'image-right', label: 'Image Right' },
  { value: 'two-cols', label: 'Two Columns' },
  { value: 'two-cols-header', label: 'Two Columns with Header' },
  { value: 'full', label: 'Full' },
  { value: 'iframe', label: 'iFrame' },
  { value: 'iframe-left', label: 'iFrame Left' },
  { value: 'iframe-right', label: 'iFrame Right' },
  { value: 'end', label: 'End' }
];

/**
 * Theme color definitions for styling
 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  gradient?: string;
}

export interface SlidevTheme {
  value: string;
  label: string;
  description: string;
  colors: ThemeColors;
  fontFamily?: string;
}

/**
 * Available Slidev themes with full color definitions
 */
export const SLIDEV_THEMES: SlidevTheme[] = [
  { 
    value: 'default', 
    label: 'Default', 
    description: t('Utils.SlidevMarkdown.text.clean_and_minimal'),
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textMuted: '#64748b',
      accent: '#3b82f6'
    }
  },
  { 
    value: 'seriph', 
    label: 'Seriph', 
    description: t('Utils.SlidevMarkdown.text.elegant_serif_typography'),
    colors: {
      primary: '#2c3e50',
      secondary: '#7f8c8d',
      background: '#fdfcfb',
      surface: '#f5f4f0',
      text: '#2c3e50',
      textMuted: '#7f8c8d',
      accent: '#e74c3c'
    },
    fontFamily: 'Playfair Display, serif'
  },
  { 
    value: 'apple-basic', 
    label: 'Apple Basic', 
    description: 'Apple-style presentation',
    colors: {
      primary: '#007aff',
      secondary: '#8e8e93',
      background: '#ffffff',
      surface: '#f2f2f7',
      text: '#1c1c1e',
      textMuted: '#8e8e93',
      accent: '#007aff'
    },
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  { 
    value: 'dracula', 
    label: 'Dracula', 
    description: t('Utils.SlidevMarkdown.text.dark_purple_theme'),
    colors: {
      primary: '#bd93f9',
      secondary: '#6272a4',
      background: '#282a36',
      surface: '#44475a',
      text: '#f8f8f2',
      textMuted: '#6272a4',
      accent: '#ff79c6',
      gradient: 'linear-gradient(135deg, #282a36 0%, #44475a 100%)'
    }
  },
  { 
    value: 'geist', 
    label: 'Geist', 
    description: 'Vercel-inspired design',
    colors: {
      primary: '#000000',
      secondary: '#666666',
      background: '#ffffff',
      surface: '#fafafa',
      text: '#000000',
      textMuted: '#666666',
      accent: '#0070f3'
    },
    fontFamily: 'Geist, Inter, sans-serif'
  },
  { 
    value: 'unicorn', 
    label: 'Unicorn', 
    description: 'Colorful gradient',
    colors: {
      primary: '#ff6b6b',
      secondary: '#4ecdc4',
      background: '#ffffff',
      surface: '#fef9f9',
      text: '#2d3436',
      textMuted: '#636e72',
      accent: '#a29bfe',
      gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 25%, #48dbfb 50%, #ff9ff3 75%, #a29bfe 100%)'
    }
  },
  { 
    value: 'shibainu', 
    label: 'Shibainu', 
    description: t('Utils.SlidevMarkdown.text.warm_and_friendly'),
    colors: {
      primary: '#f59e0b',
      secondary: '#78716c',
      background: '#fffbeb',
      surface: '#fef3c7',
      text: '#451a03',
      textMuted: '#78716c',
      accent: '#ea580c'
    }
  },
  { 
    value: 'bricks', 
    label: 'Bricks', 
    description: t('Utils.SlidevMarkdown.text.bold_and_structured'),
    colors: {
      primary: '#dc2626',
      secondary: '#78716c',
      background: '#fef2f2',
      surface: '#fee2e2',
      text: '#450a0a',
      textMuted: '#78716c',
      accent: '#b91c1c'
    }
  },
  {
    value: 'night-owl',
    label: 'Night Owl',
    description: t('Utils.SlidevMarkdown.text.dark_blue_developer_theme'),
    colors: {
      primary: '#82aaff',
      secondary: '#637777',
      background: '#011627',
      surface: '#0b2942',
      text: '#d6deeb',
      textMuted: '#637777',
      accent: '#c792ea',
      gradient: 'linear-gradient(135deg, #011627 0%, #0b2942 100%)'
    }
  },
  {
    value: 'rose-pine',
    label: 'Rosé Pine',
    description: t('Utils.SlidevMarkdown.text.soft_and_elegant_dark'),
    colors: {
      primary: '#ebbcba',
      secondary: '#908caa',
      background: '#191724',
      surface: '#1f1d2e',
      text: '#e0def4',
      textMuted: '#908caa',
      accent: '#c4a7e7',
      gradient: 'linear-gradient(135deg, #191724 0%, #26233a 100%)'
    }
  }
];

/**
 * Get theme by value
 */
export function getThemeByValue(value: string): SlidevTheme | undefined {
  return SLIDEV_THEMES.find(t => t.value === value);
}

/**
 * Generate CSS variables for a theme
 */
export function generateThemeCss(theme: SlidevTheme): string {
  const { colors, fontFamily } = theme;
  return `
    --slidev-primary: ${colors.primary};
    --slidev-secondary: ${colors.secondary};
    --slidev-background: ${colors.background};
    --slidev-surface: ${colors.surface};
    --slidev-text: ${colors.text};
    --slidev-text-muted: ${colors.textMuted};
    --slidev-accent: ${colors.accent};
    ${colors.gradient ? `--slidev-gradient: ${colors.gradient};` : ''}
    ${fontFamily ? `--slidev-font-family: ${fontFamily};` : ''}
  `.trim();
}

/**
 * Page template interface
 */
export interface SlideTemplate {
  id: string;
  name: string;
  description: string;
  category: 'title' | 'content' | 'layout' | 'media' | 'data' | 'end';
  layout: string;
  content: string;
  frontmatter?: Record<string, any>;
  thumbnail?: string;
}

/**
 * Comprehensive page templates
 */
export const SLIDE_TEMPLATES: SlideTemplate[] = [
  // Title slides
  {
    id: 'cover',
    name: 'Cover',
    description: t('Utils.SlidevMarkdown.text.opening_slide_with_title'),
    category: 'title',
    layout: 'cover',
    content: `# Presentation Title

Your subtitle or tagline here

**Your Name** | Date`,
    frontmatter: { layout: 'cover', class: 'text-center' }
  },
  {
    id: 'intro',
    name: 'Introduction',
    description: t('Utils.SlidevMarkdown.text.introduction_slide_with_speaker'),
    category: 'title',
    layout: 'intro',
    content: `# About Me

## Your Name

- Role / Title
- Company / Organization
- Contact info`,
    frontmatter: { layout: 'intro' }
  },
  {
    id: 'section',
    name: 'Section Divider',
    description: t('Utils.SlidevMarkdown.text.section_break_with_large'),
    category: 'title',
    layout: 'section',
    content: `# Section Title`,
    frontmatter: { layout: 'section' }
  },

  // Content slides
  {
    id: 'default',
    name: 'Content',
    description: t('Utils.SlidevMarkdown.text.standard_content_slide_with'),
    category: 'content',
    layout: 'default',
    content: `# Slide Title

- First point
- Second point
- Third point
- Fourth point`,
    frontmatter: { layout: 'default' }
  },
  {
    id: 'center',
    name: 'Centered',
    description: t('Utils.SlidevMarkdown.text.centered_content_for_emphasis'),
    category: 'content',
    layout: 'center',
    content: `# Key Message

This is the main point you want to emphasize`,
    frontmatter: { layout: 'center' }
  },
  {
    id: 'statement',
    name: 'Statement',
    description: t('Utils.SlidevMarkdown.text.bold_statement_or_quote'),
    category: 'content',
    layout: 'statement',
    content: `# "Your powerful statement goes here"`,
    frontmatter: { layout: 'statement' }
  },
  {
    id: 'quote',
    name: 'Quote',
    description: t('Utils.SlidevMarkdown.text.quotation_with_attribution'),
    category: 'content',
    layout: 'quote',
    content: `> "The only way to do great work is to love what you do."

— Steve Jobs`,
    frontmatter: { layout: 'quote' }
  },
  {
    id: 'fact',
    name: 'Fact / Statistic',
    description: t('Utils.SlidevMarkdown.text.highlight_a_key_number'),
    category: 'content',
    layout: 'fact',
    content: `# 95%

of users prefer this approach

*Source: Research Study 2024*`,
    frontmatter: { layout: 'fact' }
  },

  // Layout slides
  {
    id: 'two-cols',
    name: 'Two Columns',
    description: 'Side-by-side content',
    category: 'layout',
    layout: 'two-cols',
    content: `# Comparison

## Left Side

- Point A
- Point B
- Point C

::right::

## Right Side

- Point X
- Point Y
- Point Z`,
    frontmatter: { layout: 'two-cols' }
  },
  {
    id: 'two-cols-header',
    name: 'Two Columns with Header',
    description: t('Utils.SlidevMarkdown.text.header_spanning_both_columns'),
    category: 'layout',
    layout: 'two-cols-header',
    content: `# Main Title

This header spans both columns

::left::

## Column 1

Content for the left side

::right::

## Column 2

Content for the right side`,
    frontmatter: { layout: 'two-cols-header' }
  },
  {
    id: 'grid-2x2',
    name: '2x2 Grid',
    description: t('Utils.SlidevMarkdown.text.four_equal_sections'),
    category: 'layout',
    layout: 'default',
    content: `# Four Key Points

<div class="grid grid-cols-2 gap-8 mt-8">
<div class="p-4 bg-blue-50 rounded-lg">

### Point 1
Description here

</div>
<div class="p-4 bg-green-50 rounded-lg">

### Point 2
Description here

</div>
<div class="p-4 bg-yellow-50 rounded-lg">

### Point 3
Description here

</div>
<div class="p-4 bg-purple-50 rounded-lg">

### Point 4
Description here

</div>
</div>`,
    frontmatter: { layout: 'default' }
  },

  // Media slides
  {
    id: 'image',
    name: 'Full Image',
    description: t('Utils.SlidevMarkdown.text.image_as_main_content'),
    category: 'media',
    layout: 'image',
    content: `# Image Title

![Description](https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800)`,
    frontmatter: { layout: 'image' }
  },
  {
    id: 'image-left',
    name: 'Image Left',
    description: 'Image on left, content on right',
    category: 'media',
    layout: 'image-left',
    content: `# Title

- Key point one
- Key point two
- Key point three`,
    frontmatter: { layout: 'image-left', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400' }
  },
  {
    id: 'image-right',
    name: 'Image Right',
    description: 'Content on left, image on right',
    category: 'media',
    layout: 'image-right',
    content: `# Title

- Key point one
- Key point two
- Key point three`,
    frontmatter: { layout: 'image-right', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400' }
  },
  {
    id: 'video',
    name: 'Video Embed',
    description: t('Utils.SlidevMarkdown.text.embedded_video_content'),
    category: 'media',
    layout: 'default',
    content: `# Video Title

<video controls class="w-full rounded-lg">
  <source src="your-video.mp4" type="video/mp4">
</video>

*Video description or caption*`,
    frontmatter: { layout: 'default' }
  },

  // Data slides
  {
    id: 'code',
    name: 'Code Block',
    description: t('Utils.SlidevMarkdown.text.syntax_highlighted_code'),
    category: 'data',
    layout: 'default',
    content: `# Code Example

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

const message = greet('World');
console.log(message);
\`\`\``,
    frontmatter: { layout: 'default' }
  },
  {
    id: 'table',
    name: 'Table',
    description: 'Data table',
    category: 'data',
    layout: 'default',
    content: `# Data Overview

| Feature | Status | Priority |
|---------|--------|----------|
| Feature A | ✅ Done | High |
| Feature B | 🔄 In Progress | Medium |
| Feature C | ⏳ Planned | Low |`,
    frontmatter: { layout: 'default' }
  },
  {
    id: 'mermaid-flowchart',
    name: 'Flowchart',
    description: t('Utils.SlidevMarkdown.text.mermaid_flowchart_diagram'),
    category: 'data',
    layout: 'default',
    content: `# Process Flow

\`\`\`mermaid
flowchart LR
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\``,
    frontmatter: { layout: 'default' }
  },
  {
    id: 'mermaid-sequence',
    name: 'Sequence Diagram',
    description: t('Utils.SlidevMarkdown.text.mermaid_sequence_diagram'),
    category: 'data',
    layout: 'default',
    content: `# Interaction Flow

\`\`\`mermaid
sequenceDiagram
    participant User
    participant App
    participant Server
    User->>App: Request
    App->>Server: API Call
    Server-->>App: Response
    App-->>User: Display
\`\`\``,
    frontmatter: { layout: 'default' }
  },
  {
    id: 'mermaid-pie',
    name: 'Pie Chart',
    description: t('Utils.SlidevMarkdown.text.mermaid_pie_chart'),
    category: 'data',
    layout: 'default',
    content: `# Distribution

\`\`\`mermaid
pie title Market Share
    "Product A" : 45
    "Product B" : 30
    "Product C" : 15
    "Others" : 10
\`\`\``,
    frontmatter: { layout: 'default' }
  },
  {
    id: 'mermaid-timeline',
    name: 'Timeline',
    description: t('Utils.SlidevMarkdown.text.mermaid_timeline_diagram'),
    category: 'data',
    layout: 'default',
    content: `# Project Timeline

\`\`\`mermaid
timeline
    title Project Milestones
    2024 Q1 : Planning
            : Research
    2024 Q2 : Development
            : Testing
    2024 Q3 : Launch
            : Marketing
\`\`\``,
    frontmatter: { layout: 'default' }
  },

  // End slides
  {
    id: 'end',
    name: 'Thank You',
    description: 'Closing slide',
    category: 'end',
    layout: 'end',
    content: `# Thank You!

Questions?

**Contact:** your@email.com  
**Twitter:** @yourhandle`,
    frontmatter: { layout: 'end' }
  },
  {
    id: 'cta',
    name: 'Call to Action',
    description: t('Utils.SlidevMarkdown.text.closing_with_next_steps'),
    category: 'end',
    layout: 'center',
    content: `# Next Steps

1. Visit our website
2. Sign up for the newsletter
3. Follow us on social media

**www.example.com**`,
    frontmatter: { layout: 'center' }
  }
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: SlideTemplate['category']): SlideTemplate[] {
  return SLIDE_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): SlideTemplate | undefined {
  return SLIDE_TEMPLATES.find(t => t.id === id);
}

/**
 * Create a slide from a template
 */
export function createSlideFromTemplate(template: SlideTemplate): SlidevSlide {
  return {
    id: `slide-${Date.now()}`,
    content: template.content,
    notes: '',
    frontmatter: template.frontmatter
  };
}
