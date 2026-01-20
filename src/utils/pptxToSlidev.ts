/**
 * Advanced PPTX to Slidev Markdown Converter
 * Handles Slidev-specific syntax including UnoCSS, Mermaid, font sizes, etc.
 */

export interface SlidevSlideOptions {
  theme?: string;
  defaultLayout?: string;
  preserveImages?: boolean;
  detectMermaid?: boolean;
  detectCodeBlocks?: boolean;
}

export interface PptxElement {
  type: 'text' | 'image' | 'shape' | 'chart' | 'table' | 'list';
  content: string;
  styles: Record<string, any>;
  position: { x: number; y: number; width: number; height: number };
}

/**
 * Convert PPTX HTML to Slidev-compatible markdown
 */
export function pptxToSlidevMarkdown(
  html: string, 
  _slideIndex: number,
  options: SlidevSlideOptions = {}
): string {
  const {
    defaultLayout = 'default',
    preserveImages = true,
    detectMermaid = true,
    detectCodeBlocks = true
  } = options;

  let markdown = '';
  
  // Extract frontmatter from slide content
  const frontmatter = extractFrontmatter(html);
  
  // Process different element types
  const elements = parsePptxElements(html);
  
  // Build markdown with Slidev syntax
  markdown = buildSlidevMarkdown(elements, {
    defaultLayout,
    detectMermaid,
    detectCodeBlocks,
    preserveImages
  });
  
  // Add frontmatter
  if (Object.keys(frontmatter).length > 0) {
    const frontmatterYaml = Object.entries(frontmatter)
      .map(([key, value]) => `${key}: ${typeof value === 'string' ? `"${value}"` : value}`)
      .join('\n');
    markdown = `---\n${frontmatterYaml}\n---\n\n${markdown}`;
  }
  
  return markdown;
}

/**
 * Extract Slidev frontmatter from PPTX content
 */
function extractFrontmatter(html: string): Record<string, any> {
  const frontmatter: Record<string, any> = {
    layout: 'default'
  };
  
  // Detect layout from content structure
  if (html.includes('two-col') || html.match(/<div[^>]*float[^>]*>/gi)) {
    frontmatter.layout = 'two-cols';
  } else if (html.includes('center') || html.match(/text-align\s*:\s*center/gi)) {
    frontmatter.layout = 'center';
  }
  
  // Extract background color
  const bgMatch = html.match(/background[^:]*:\s*([^;]+)/gi);
  if (bgMatch) {
    const bgColor = bgMatch[0].match(/#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})/);
    if (bgColor) {
      frontmatter.background = bgColor[0];
    }
  }
  
  // Detect if slide should be skipped in presentation
  if (html.includes('skip') || html.includes('hidden')) {
    frontmatter.skip = true;
  }
  
  return frontmatter;
}

/**
 * Parse PPTX elements from HTML
 */
function parsePptxElements(html: string): PptxElement[] {
  if (!html || typeof html !== 'string') {
    return [];
  }
  
  const elements: PptxElement[] = [];
  
  // Extract text elements with better regex
  const textElements = html.match(/<[^>]*>([^<]*)<\/[^>]*>/gi) || [];
  textElements.forEach((element, index) => {
    const cleanText = element.replace(/<[^>]*>/g, '').trim();
    if (cleanText && cleanText.length > 0) {
      elements.push({
        type: 'text',
        content: cleanText,
        styles: extractStyles(element),
        position: extractPosition(element, index)
      });
    }
  });
  
  // Extract images
  const images = html.match(/<img[^>]*src="([^"]*)"[^>]*>/gi) || [];
  images.forEach(img => {
    const srcMatch = img.match(/src="([^"]*)"/);
    if (srcMatch) {
      elements.push({
        type: 'image',
        content: srcMatch[1],
        styles: extractStyles(img),
        position: extractPosition(img, elements.length)
      });
    }
  });
  
  // Extract tables
  const tables = html.match(/<table[^>]*>.*?<\/table>/gi) || [];
  tables.forEach(table => {
    elements.push({
      type: 'table',
      content: table,
      styles: extractStyles(table),
      position: extractPosition(table, elements.length)
    });
  });
  
  // Extract lists
  const lists = html.match(/<[ou]l[^>]*>.*?<\/[ou]l>/gi) || [];
  lists.forEach(list => {
    elements.push({
      type: 'list',
      content: list,
      styles: extractStyles(list),
      position: extractPosition(list, elements.length)
    });
  });
  
  return elements.sort((a, b) => a.position.y - b.position.y);
}

/**
 * Extract CSS styles from element
 */
function extractStyles(element: string): Record<string, any> {
  const styles: Record<string, any> = {};
  
  if (!element || typeof element !== 'string') {
    return styles;
  }
  
  // Extract inline styles
  const styleMatch = element.match(/style="([^"]*)"/);
  if (styleMatch) {
    const styleDeclarations = styleMatch[1].split(';');
    styleDeclarations.forEach(declaration => {
      const [property, value] = declaration.split(':').map(s => s.trim());
      if (property && value) {
        styles[property] = value;
      }
    });
  }
  
  // Extract font size with better pattern
  const fontSizeMatch = element.match(/font-size[^:]*:\s*([^;]+)/i);
  if (fontSizeMatch) {
    const size = fontSizeMatch[0].match(/(\d+(?:\.\d+)?)(px|pt|em)/);
    if (size) {
      styles.fontSize = `${size[1]}${size[2]}`;
    }
  }
  
  // Extract color with better pattern
  const colorMatch = element.match(/color[^:]*:\s*([^;]+)/i);
  if (colorMatch) {
    const color = colorMatch[0].match(/#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})|rgb\([^)]+\)/);
    if (color) {
      styles.color = color[0];
    }
  }
  
  return styles;
}

/**
 * Extract position information (simplified)
 */
function extractPosition(element: string, index: number): { x: number; y: number; width: number; height: number } {
  // Enhanced position extraction
  let x = 0, y = index * 100, width = 400, height = 50;
  
  // Try to extract position from style
  const styleMatch = element?.match(/style="([^"]*)"/);
  if (styleMatch) {
    const styles = styleMatch[1];
    
    // Extract left/position
    const leftMatch = styles.match(/left[^:]*:\s*(\d+(?:\.\d+)?)(px|pt|em)/i);
    if (leftMatch) {
      x = parseFloat(leftMatch[1]);
    }
    
    // Extract top/position
    const topMatch = styles.match(/top[^:]*:\s*(\d+(?:\.\d+)?)(px|pt|em)/i);
    if (topMatch) {
      y = parseFloat(topMatch[1]);
    }
    
    // Extract width
    const widthMatch = styles.match(/width[^:]*:\s*(\d+(?:\.\d+)?)(px|pt|em|%)/i);
    if (widthMatch) {
      width = parseFloat(widthMatch[1]);
    }
    
    // Extract height
    const heightMatch = styles.match(/height[^:]*:\s*(\d+(?:\.\d+)?)(px|pt|em|%)/i);
    if (heightMatch) {
      height = parseFloat(heightMatch[1]);
    }
  }
  
  return { x, y, width, height };
}

/**
 * Build Slidev-compatible markdown
 */
function buildSlidevMarkdown(
  elements: PptxElement[], 
  options: {
    defaultLayout: string;
    detectMermaid: boolean;
    detectCodeBlocks: boolean;
    preserveImages: boolean;
  }
): string {
  let markdown = '';
  
  elements.forEach((element, index) => {
    switch (element.type) {
      case 'text':
        markdown += convertTextElement(element, index);
        break;
      case 'image':
        if (options.preserveImages) {
          markdown += convertImageElement(element);
        }
        break;
      case 'table':
        markdown += convertTableElement(element);
        break;
      case 'list':
        markdown += convertListElement(element);
        break;
    }
  });
  
  // Detect potential Mermaid diagrams
  if (options.detectMermaid) {
    markdown = detectAndConvertMermaid(markdown);
  }
  
  // Detect code blocks
  if (options.detectCodeBlocks) {
    markdown = detectAndConvertCodeBlocks(markdown);
  }
  
  return markdown.trim();
}

/**
 * Convert text element with Slidev syntax
 */
function convertTextElement(element: PptxElement, index: number): string {
  if (!element || !element.content) {
    return '';
  }
  
  let text = element.content;
  
  // Apply UnoCSS classes based on styles
  const classes: string[] = [];
  
  // Font size conversion
  if (element.styles.fontSize) {
    const size = parseFloat(element.styles.fontSize);
    if (size < 12) classes.push('text-xs');
    else if (size < 14) classes.push('text-sm');
    else if (size < 16) classes.push('text-base');
    else if (size < 18) classes.push('text-lg');
    else if (size < 20) classes.push('text-xl');
    else if (size < 24) classes.push('text-2xl');
    else if (size < 30) classes.push('text-3xl');
    else if (size < 36) classes.push('text-4xl');
    else if (size < 48) classes.push('text-5xl');
    else classes.push('text-6xl');
  }
  
  // Text alignment
  if (element.styles.textAlign === 'center') {
    classes.push('text-center');
  } else if (element.styles.textAlign === 'right') {
    classes.push('text-right');
  }
  
  // Font weight
  if (element.styles.fontWeight === 'bold' || element.styles.fontWeight === '700') {
    text = `**${text}**`;
  }
  
  // Italic
  if (element.styles.fontStyle === 'italic') {
    text = `*${text}*`;
  }
  
  // Apply classes using UnoCSS syntax
  if (classes.length > 0) {
    text = `<div class="${classes.join(' ')}">${text}</div>`;
  }
  
  // Determine heading level based on position and size
  const isHeading = index === 0 || element.styles.fontSize && parseFloat(element.styles.fontSize) > 20;
  if (isHeading) {
    const level = element.styles.fontSize && parseFloat(element.styles.fontSize) > 30 ? 1 : 2;
    text = `${'#'.repeat(level)} ${text.replace(/\*\*/g, '').replace(/\*/g, '')}`;
    if (element.styles.fontWeight === 'bold') {
      text = `**${text}**`;
    }
  }
  
  return text + '\n\n';
}

/**
 * Convert image element with Slidev syntax
 */
function convertImageElement(element: PptxElement): string {
  if (!element || !element.content) {
    return '';
  }
  
  // Enhanced image handling with proper sizing
  const width = element.position?.width || 400;
  const height = element.position?.height || 'auto';
  
  return `<img src="${element.content}" style="width: ${width}px; height: ${height};" />\n\n`;
}

/**
 * Convert table element to markdown
 */
function convertTableElement(element: PptxElement): string {
  if (!element || !element.content) {
    return '';
  }
  
  // Enhanced table conversion with better regex
  let tableMarkdown = element.content
    .replace(/<table[^>]*>/gi, '')
    .replace(/<\/table>/gi, '')
    .replace(/<tr[^>]*>/gi, '|')
    .replace(/<\/tr>/gi, '|\n')
    .replace(/<t[dh][^>]*>/gi, '| ')
    .replace(/<\/t[dh]>/gi, ' |')
    .replace(/\n\s*\|\s*\n/g, '\n');
  
  // Clean up and add proper markdown table formatting
  const rows = tableMarkdown.split('\n').filter(row => row.trim());
  if (rows.length > 0) {
    // Ensure proper table structure
    return rows.join('\n') + '\n\n';
  }
  
  return '';
}

/**
 * Convert list element to markdown
 */
function convertListElement(element: PptxElement): string {
  if (!element || !element.content) {
    return '';
  }
  
  const isOrdered = element.content.includes('<ol');
  const items = element.content.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
  
  if (items.length === 0) {
    return '';
  }
  
  const listMarkdown = items.map((item, index) => {
    const content = item.replace(/<li[^>]*>(.*?)<\/li>/, '$1').trim();
    return isOrdered ? `${index + 1}. ${content}` : `- ${content}`;
  }).join('\n');
  
  return listMarkdown + '\n\n';
}

/**
 * Detect and convert potential Mermaid diagrams
 */
function detectAndConvertMermaid(markdown: string): string {
  // Look for diagram-like patterns
  const diagramPatterns = [
    /flowchart|graph|diagram|process/i,
    /node.*edge|arrow.*connection/i,
    /start.*end|begin.*finish/i
  ];
  
  const hasDiagram = diagramPatterns.some(pattern => pattern.test(markdown));
  
  if (hasDiagram) {
    // Wrap in mermaid block (simplified - real implementation would be more sophisticated)
    return `<!-- Mermaid diagram detected - convert manually -->\n${markdown}`;
  }
  
  return markdown;
}

/**
 * Detect and convert code blocks
 */
function detectAndConvertCodeBlocks(markdown: string): string {
  // Look for code-like patterns
  const codePatterns = [
    /function|class|const|let|var|import|export/i,
    /{|}|\(|\)|;/g,
    /\b(if|else|for|while|return)\b/g
  ];
  
  const lines = markdown.split('\n');
  const processedLines = lines.map(line => {
    const isCodeLine = codePatterns.some(pattern => pattern.test(line)) && line.trim().length > 0;
    if (isCodeLine && !line.startsWith('```')) {
      return `\`${line}\``;
    }
    return line;
  });
  
  return processedLines.join('\n');
}

/**
 * Main conversion function for multiple slides
 */
export function convertPptxSlidesToSlidev(
  slidesHtml: string[],
  options: SlidevSlideOptions = {}
): string[] {
  return slidesHtml.map((html, index) => {
    return pptxToSlidevMarkdown(html, index, options);
  });
}
