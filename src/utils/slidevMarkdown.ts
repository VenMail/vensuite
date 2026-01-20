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
    let content = trimmed;
    let frontmatter: Record<string, any> | undefined;
    let notes = '';

    // Parse frontmatter (YAML between --- markers)
    if (trimmed.startsWith('---')) {
      const endIndex = trimmed.indexOf('---', 3);
      if (endIndex > 0) {
        const yamlContent = trimmed.substring(3, endIndex).trim();
        frontmatter = parseYamlFrontmatter(yamlContent);
        content = trimmed.substring(endIndex + 3).trim();

        // First slide's frontmatter is the headmatter
        if (index === 0) {
          headmatter = frontmatter || {};
        }
      }
    }

    // Extract presenter notes (HTML comments at the end)
    const notesMatch = content.match(/<!--\s*([\s\S]*?)\s*-->$/);
    if (notesMatch) {
      notes = notesMatch[1].trim();
      content = content.substring(0, content.lastIndexOf('<!--')).trim();
    }

    slides.push({
      id: `slide-${index + 1}-${Date.now()}`,
      content,
      notes,
      frontmatter
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
      // Process each section separately
      const headerHtml = processMarkdownContent(colsData.header || '');
      const leftHtml = processMarkdownContent(colsData.left || '');
      const rightHtml = processMarkdownContent(colsData.right || '');
      
      return `<div class="two-cols-header-container" data-layout="two-cols-header">
        <div class="header-content" data-section="header">${headerHtml}</div>
        <div class="cols-container">
          <div class="col-left" data-section="left">${leftHtml}</div>
          <div class="col-right" data-section="right">${rightHtml}</div>
        </div>
      </div>`;
    } else if (colsData.type === 'two-cols') {
      // Process each column separately
      const leftHtml = processMarkdownContent(colsData.left || '');
      const rightHtml = processMarkdownContent(colsData.right || '');
      
      return `<div class="two-cols-container" data-layout="two-cols">
        <div class="col-left" data-section="left">${leftHtml}</div>
        <div class="col-right" data-section="right">${rightHtml}</div>
      </div>`;
    }
  }
  
  // Process regular content
  return processMarkdownContent(markdown);
}

/**
 * Process markdown content to HTML
 */
function processMarkdownContent(markdown: string): string {
  let html = markdown;

  // Handle Mermaid diagrams
  html = html.replace(/```mermaid\n([\s\S]*?)```/g, (_, code) => {
    return `<div class="mermaid-diagram" data-mermaid="${encodeURIComponent(code.trim())}">${renderMermaidPlaceholder(code.trim())}</div>`;
  });

  // Handle other code blocks (must be before inline code)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escapedCode = code
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre class="code-block"><code class="language-${lang || 'text'}">${escapedCode}</code></pre>`;
  });

  // MDC Syntax: [text]{style="..."} or [text]{.class}
  html = html.replace(/\[([^\]]+)\]\{([^}]+)\}/g, (_, text, attrs) => {
    const styleMatch = attrs.match(/style="([^"]+)"/);
    const classMatch = attrs.match(/\.([a-zA-Z0-9_-]+)/g);
    
    let style = styleMatch ? ` style="${styleMatch[1]}"` : '';
    let className = classMatch ? ` class="${classMatch.map((c: string) => c.slice(1)).join(' ')}"` : '';
    
    return `<span${className}${style}>${text}</span>`;
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

  // Images with optional attributes (MDC style)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)\{([^}]+)\}/g, (_, alt, src, attrs) => {
    const widthMatch = attrs.match(/width=(\d+)/);
    const heightMatch = attrs.match(/height=(\d+)/);
    const classMatch = attrs.match(/\.([a-zA-Z0-9_-]+)/g);
    
    let style = '';
    if (widthMatch) style += `width: ${widthMatch[1]}px; `;
    if (heightMatch) style += `height: ${heightMatch[1]}px; `;
    
    let className = classMatch ? ` class="${classMatch.map((c: string) => c.slice(1)).join(' ')}"` : '';
    let styleAttr = style ? ` style="${style.trim()}"` : '';
    
    return `<img src="${src}" alt="${alt}"${className}${styleAttr} />`;
  });
  
  // Regular images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="slide-image" />');

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
    const parts = markdown.split('::right::');
    const leftContent = parts[0].trim();
    const rightContent = parts[1]?.trim() || '';
    
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
    description: 'Clean and minimal',
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
    description: 'Elegant serif typography',
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
    description: 'Dark purple theme',
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
    description: 'Warm and friendly',
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
    description: 'Bold and structured',
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
    description: 'Dark blue developer theme',
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
    description: 'Soft and elegant dark theme',
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
    description: 'Opening slide with title and subtitle',
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
    description: 'Introduction slide with speaker info',
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
    description: 'Section break with large title',
    category: 'title',
    layout: 'section',
    content: `# Section Title`,
    frontmatter: { layout: 'section' }
  },

  // Content slides
  {
    id: 'default',
    name: 'Content',
    description: 'Standard content slide with bullets',
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
    description: 'Centered content for emphasis',
    category: 'content',
    layout: 'center',
    content: `# Key Message

This is the main point you want to emphasize`,
    frontmatter: { layout: 'center' }
  },
  {
    id: 'statement',
    name: 'Statement',
    description: 'Bold statement or quote',
    category: 'content',
    layout: 'statement',
    content: `# "Your powerful statement goes here"`,
    frontmatter: { layout: 'statement' }
  },
  {
    id: 'quote',
    name: 'Quote',
    description: 'Quotation with attribution',
    category: 'content',
    layout: 'quote',
    content: `> "The only way to do great work is to love what you do."

— Steve Jobs`,
    frontmatter: { layout: 'quote' }
  },
  {
    id: 'fact',
    name: 'Fact / Statistic',
    description: 'Highlight a key number or fact',
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
    description: 'Header spanning both columns',
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
    description: 'Four equal sections',
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
    description: 'Image as main content',
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
    description: 'Embedded video content',
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
    description: 'Syntax highlighted code',
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
    description: 'Mermaid flowchart diagram',
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
    description: 'Mermaid sequence diagram',
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
    description: 'Mermaid pie chart',
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
    description: 'Mermaid timeline diagram',
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
    description: 'Closing with next steps',
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
