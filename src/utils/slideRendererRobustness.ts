/**
 * Slide Renderer Robustness Improvements
 * Addresses edge cases and error handling issues
 */

/**
 * Enhanced block attribute parser with robust error handling
 */
export function parseBlockAttributesRobust(line: string): { rest: string; class?: string; style?: string; errors?: string[] } {
  const errors: string[] = [];
  
  try {
    // Handle null/undefined input
    if (!line || typeof line !== 'string') {
      return { rest: line || '', errors: ['Invalid input: line must be a string'] };
    }

    // Handle empty line
    if (line.trim() === '') {
      return { rest: line };
    }

    // Find attribute block - more robust regex
    const attrMatch = line.match(/\s*\{([^}]*)\}\s*$/);
    if (!attrMatch) {
      return { rest: line };
    }

    const rest = line.slice(0, attrMatch.index).trim();
    const attrs = attrMatch[1];

    // Handle empty attribute block
    if (!attrs || attrs.trim() === '') {
      return { rest, errors: ['Empty attribute block'] };
    }

    // Parse classes with better validation
    const classMatches = attrs.match(/\.([a-zA-Z0-9_\-\[\]%\.]+)/g);
    let classes: string[] = [];
    
    if (classMatches) {
      classes = classMatches
        .map(c => c.slice(1))
        .filter(cls => {
          // Validate class names
          if (!cls || cls.length === 0) {
            errors.push(`Empty class name in: ${attrs}`);
            return false;
          }
          // Allow arbitrary values like [10%], [100px], etc.
          if (cls.includes('[') && cls.includes(']')) {
            return true; // Arbitrary value class
          }
          // Regular class validation
          if (!/^[a-zA-Z0-9_-]+$/.test(cls)) {
            errors.push(`Invalid class name: ${cls}`);
            return false;
          }
          return true;
        });
    }

    // Parse styles with better error handling
    const styleMatch = attrs.match(/style\s*=\s*"([^"]*)"/);
    let style: string | undefined;
    
    if (styleMatch) {
      style = styleMatch[1];
      // Basic style validation
      if (!style.trim()) {
        errors.push('Empty style attribute');
        style = undefined;
      } else if (style.includes('javascript:') || style.includes('data:')) {
        errors.push('Potentially unsafe style detected');
        style = undefined;
      }
    }

    // Check for unparseable content
    const remainingAttrs = attrs
      .replace(/\.([a-zA-Z0-9_\-\[\]%\.]+)/g, '')
      .replace(/style\s*=\s*"([^"]*)"/g, '')
      .trim();

    if (remainingAttrs) {
      errors.push(`Unparseable attributes: ${remainingAttrs}`);
    }

    return {
      rest,
      class: classes.length > 0 ? classes.join(' ') : undefined,
      style,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    return {
      rest: line,
      errors: [`Parse error: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

/**
 * Enhanced markdown block splitter with better error recovery
 */
export function splitMarkdownIntoBlocksRobust(markdown: string): { blocks: any[]; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const blocks: any[] = [];

  try {
    // Input validation
    if (!markdown || typeof markdown !== 'string') {
      errors.push('Invalid markdown input');
      return { blocks: [], errors, warnings };
    }

    const lines = markdown.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      try {
        // Handle mermaid blocks with better error recovery
        if (trimmed.startsWith('```mermaid')) {
          const start = i;
          i++;
          let foundEnd = false;
          
          while (i < lines.length) {
            if (lines[i].trim().startsWith('```')) {
              foundEnd = true;
              break;
            }
            i++;
          }

          if (!foundEnd) {
            errors.push(`Unclosed mermaid block starting at line ${start + 1}`);
            // Create block with what we have
            blocks.push({ 
              startLine: start, 
              endLine: lines.length - 1, 
              type: 'mermaid', 
              lines: lines.slice(start),
              error: 'Unclosed block'
            });
            break;
          }

          blocks.push({ 
            startLine: start, 
            endLine: i, 
            type: 'mermaid', 
            lines: lines.slice(start, i + 1) 
          });
          i++;
          continue;
        }

        // Handle plantuml blocks
        if (trimmed.startsWith('```plantuml')) {
          const start = i;
          i++;
          let foundEnd = false;
          
          while (i < lines.length) {
            if (lines[i].trim().startsWith('```')) {
              foundEnd = true;
              break;
            }
            i++;
          }

          if (!foundEnd) {
            errors.push(`Unclosed plantuml block starting at line ${start + 1}`);
            blocks.push({ 
              startLine: start, 
              endLine: lines.length - 1, 
              type: 'plantuml', 
              lines: lines.slice(start),
              error: 'Unclosed block'
            });
            break;
          }

          blocks.push({ 
            startLine: start, 
            endLine: i, 
            type: 'plantuml', 
            lines: lines.slice(start, i + 1) 
          });
          i++;
          continue;
        }

        // Handle generic code blocks
        const codeMatch = trimmed.match(/^```(\w+)?/);
        if (codeMatch) {
          const start = i;
          const lang = codeMatch[1] || 'text';
          i++;
          let foundEnd = false;
          
          while (i < lines.length) {
            if (lines[i].trim().startsWith('```')) {
              foundEnd = true;
              break;
            }
            i++;
          }

          if (!foundEnd) {
            errors.push(`Unclosed code block starting at line ${start + 1}`);
            blocks.push({ 
              startLine: start, 
              endLine: lines.length - 1, 
              type: 'code', 
              lines: lines.slice(start),
              language: lang,
              error: 'Unclosed block'
            });
            break;
          }

          blocks.push({ 
            startLine: start, 
            endLine: i, 
            type: 'code', 
            lines: lines.slice(start, i + 1),
            language: lang
          });
          i++;
          continue;
        }

        // Handle headings with robust attribute parsing
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
          const attrResult = parseBlockAttributesRobust(trimmed);
          const innerMatch = attrResult.rest.match(/^(#{1,6})\s+(.+)$/);
          const content = innerMatch ? innerMatch[2] : attrResult.rest;
          
          const block: any = {
            startLine: i,
            endLine: i,
            type: 'heading',
            lines: [line],
            headingLevel: headingMatch[1].length,
            headingContent: content
          };

          if (attrResult.class) block.blockClass = attrResult.class;
          if (attrResult.style) block.blockStyle = attrResult.style;
          if (attrResult.errors) {
            warnings.push(`Line ${i + 1}: ${attrResult.errors.join(', ')}`);
          }

          blocks.push(block);
          i++;
          continue;
        }

        // Handle images with robust parsing
        const imageMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (imageMatch) {
          const attrResult = parseBlockAttributesRobust(trimmed);
          
          const block: any = {
            startLine: i,
            endLine: i,
            type: 'image',
            lines: [line],
            imageAlt: imageMatch[1],
            imageSrc: imageMatch[2]
          };

          if (attrResult.class) block.blockClass = attrResult.class;
          if (attrResult.style) block.blockStyle = attrResult.style;
          if (attrResult.errors) {
            warnings.push(`Line ${i + 1}: ${attrResult.errors.join(', ')}`);
          }

          blocks.push(block);
          i++;
          continue;
        }

        // Handle tables with better validation
        if (trimmed.includes('|') && trimmed.match(/\|.+\|/)) {
          const start = i;
          let validTable = true;
          
          // Basic table validation
          const firstRow = trimmed.split('|').filter(cell => cell.trim() !== '');
          if (firstRow.length < 2) {
            warnings.push(`Invalid table format at line ${i + 1}`);
            validTable = false;
          }

          while (i < lines.length && lines[i].trim().includes('|')) {
            i++;
          }

          if (validTable) {
            blocks.push({ 
              startLine: start, 
              endLine: i - 1, 
              type: 'table', 
              lines: lines.slice(start, i) 
            });
          } else {
            // Treat as paragraphs if invalid table
            for (let j = start; j < i; j++) {
              blocks.push({
                startLine: j,
                endLine: j,
                type: 'paragraph',
                lines: [lines[j]]
              });
            }
          }
          continue;
        }

        // Handle lists with better nesting detection
        if (trimmed.match(/^[\*\-\+]\s/) || trimmed.match(/^\d+\.\s/)) {
          const start = i;
          
          while (i < lines.length) {
            const currentLine = lines[i];
            const currentTrimmed = currentLine.trim();
            
            // Handle empty lines in lists
            if (currentTrimmed === '' && i + 1 < lines.length) {
              const nextLine = lines[i + 1];
              if (nextLine.match(/^(\s*)([\*\-+]|\d+\.)\s/)) {
                i++;
                continue;
              }
            }
            
            if (currentLine.match(/^(\s*)([\*\-+]|\d+\.)\s/)) {
              i++;
              continue;
            }
            break;
          }

          const listLines = lines.slice(start, i);
          const attrResult = parseBlockAttributesRobust(listLines[0].trim());
          
          const block: any = {
            startLine: start,
            endLine: i - 1,
            type: 'list',
            lines: listLines
          };

          if (attrResult.class) block.blockClass = attrResult.class;
          if (attrResult.style) block.blockStyle = attrResult.style;
          if (attrResult.errors) {
            warnings.push(`Line ${start + 1}: ${attrResult.errors.join(', ')}`);
          }

          blocks.push(block);
          continue;
        }

        // Handle blockquotes
        if (trimmed.startsWith('>')) {
          const start = i;
          while (i < lines.length && lines[i].trim().startsWith('>')) {
            i++;
          }
          
          const quoteLines = lines.slice(start, i);
          const attrResult = parseBlockAttributesRobust(quoteLines[0].trim());
          
          const block: any = {
            startLine: start,
            endLine: i - 1,
            type: 'blockquote',
            lines: quoteLines
          };

          if (attrResult.class) block.blockClass = attrResult.class;
          if (attrResult.style) block.blockStyle = attrResult.style;
          if (attrResult.errors) {
            warnings.push(`Line ${start + 1}: ${attrResult.errors.join(', ')}`);
          }

          blocks.push(block);
          continue;
        }

        // Handle dividers
        if (trimmed.match(/^---+$|^===+$/)) {
          blocks.push({
            startLine: i,
            endLine: i,
            type: 'hr',
            lines: [line]
          });
          i++;
          continue;
        }

        // Handle paragraphs (fallback)
        const start = i;
        while (i < lines.length) {
          const nextLineTrimmed = lines[i]?.trim() || '';
          
          // Stop at empty line
          if (nextLineTrimmed === '') break;
          
          // Stop at block-level elements
          if (nextLineTrimmed.match(/^(#{1,6})\s/) ||
              nextLineTrimmed.match(/^```/) ||
              nextLineTrimmed.match(/^>\s/) ||
              nextLineTrimmed.match(/^---+$|^===+$/) ||
              nextLineTrimmed.match(/!\[([^\]]*)\]\(/) ||
              (nextLineTrimmed.includes('|') && nextLineTrimmed.match(/\|.+\|/))) {
            break;
          }
          
          i++;
        }

        const paraLines = lines.slice(start, i);
        if (paraLines.length > 0) {
          const attrResult = parseBlockAttributesRobust(paraLines[0].trim());
          
          const block: any = {
            startLine: start,
            endLine: i - 1,
            type: 'paragraph',
            lines: paraLines
          };

          if (attrResult.class) block.blockClass = attrResult.class;
          if (attrResult.style) block.blockStyle = attrResult.style;
          if (attrResult.errors) {
            warnings.push(`Line ${start + 1}: ${attrResult.errors.join(', ')}`);
          }

          blocks.push(block);
        }

      } catch (blockError) {
        errors.push(`Error processing line ${i + 1}: ${blockError instanceof Error ? blockError.message : String(blockError)}`);
        // Create a paragraph block as fallback
        blocks.push({
          startLine: i,
          endLine: i,
          type: 'paragraph',
          lines: [line],
          error: 'Parse error'
        });
        i++;
      }
    }

    return { blocks, errors, warnings };

  } catch (error) {
    errors.push(`Critical parsing error: ${error instanceof Error ? error.message : String(error)}`);
    return { blocks: [], errors, warnings };
  }
}

/**
 * Enhanced HTML renderer with better error handling
 */
export function renderBlocksToHtmlRobust(blocks: any[]): { html: string; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parts: string[] = [];

  try {
    if (!Array.isArray(blocks)) {
      errors.push('Invalid blocks input: expected array');
      return { html: '', errors, warnings };
    }

    for (const block of blocks) {
      try {
        if (!block || typeof block !== 'object') {
          errors.push('Invalid block: expected object');
          continue;
        }

        const { startLine, endLine, type, lines, blockClass, blockStyle } = block;
        
        // Validate block data
        if (typeof startLine !== 'number' || typeof endLine !== 'number') {
          errors.push(`Invalid line numbers in block: ${JSON.stringify(block)}`);
          continue;
        }

        if (!type || typeof type !== 'string') {
          errors.push(`Invalid or missing type in block: ${JSON.stringify(block)}`);
          continue;
        }

        const dataAttrs = ` data-markdown-line-start="${startLine}" data-markdown-line-end="${endLine}" data-markdown-type="${type}"`;
        const classAttr = blockClass ? ` class="${escapeHtml(blockClass)}"` : '';
        const styleAttr = blockStyle ? ` style="${escapeHtml(blockStyle)}"` : '';

        // Render based on type with error handling
        switch (type) {
          case 'mermaid':
            try {
              const code = lines.slice(1, -1).join('\n').trim();
              const encodedCode = encodeURIComponent(code);
              parts.push(`<div class="mermaid-diagram"${dataAttrs} data-mermaid="${encodedCode}">Loading diagram...</div>`);
            } catch (error) {
              errors.push(`Error rendering mermaid block at lines ${startLine}-${endLine}: ${error}`);
              parts.push(`<div class="error"${dataAttrs}>Error rendering mermaid diagram</div>`);
            }
            break;

          case 'code':
            try {
              const langMatch = lines[0]?.match(/^```(\w+)?/);
              const lang = langMatch ? langMatch[1] || 'text' : 'text';
              const code = lines.slice(1, -1).join('\n');
              const escapedCode = escapeHtml(code);
              parts.push(`<pre class="code-block"${dataAttrs}><code class="language-${escapeHtml(lang)}">${escapedCode}</code></pre>`);
            } catch (error) {
              errors.push(`Error rendering code block at lines ${startLine}-${endLine}: ${error}`);
              parts.push(`<pre class="code-block error"${dataAttrs}><code>Error rendering code</code></pre>`);
            }
            break;

          case 'heading':
            try {
              const level = Math.max(1, Math.min(6, block.headingLevel || 1));
              const content = block.headingContent || '';
              const tag = `h${level}`;
              const inner = processInlineContentRobust(content);
              parts.push(`<${tag}${classAttr}${styleAttr}${dataAttrs}>${inner}</${tag}>`);
            } catch (error) {
              errors.push(`Error rendering heading at lines ${startLine}-${endLine}: ${error}`);
              parts.push(`<h1 class="error"${dataAttrs}>Error rendering heading</h1>`);
            }
            break;

          case 'image':
            try {
              const alt = escapeHtml(block.imageAlt || '');
              const src = escapeHtml(block.imageSrc || '');
              parts.push(`<img src="${src}" alt="${alt}" class="slide-image${blockClass ? ' ' + blockClass : ''}"${styleAttr}${dataAttrs} />`);
            } catch (error) {
              errors.push(`Error rendering image at lines ${startLine}-${endLine}: ${error}`);
              parts.push(`<div class="image-error"${dataAttrs}>Error rendering image</div>`);
            }
            break;

          case 'list':
            try {
              const listContent = lines
                .map((l: string) => {
                  const bullet = l.replace(/^(\s*)([\*\-+]|\d+\.)\s+(.*)$/s, '$3');
                  return `<li>${processInlineContentRobust(bullet)}</li>`;
                })
                .join('\n');
              parts.push(`<ul class="slide-list"${classAttr}${styleAttr}${dataAttrs}>\n${listContent}\n</ul>`);
            } catch (error) {
              errors.push(`Error rendering list at lines ${startLine}-${endLine}: ${error}`);
              parts.push(`<ul class="slide-list error"${dataAttrs}><li>Error rendering list</li></ul>`);
            }
            break;

          case 'table':
            try {
              const tableHtml = parseMarkdownTablesRobust(lines.join('\n'));
              const withData = tableHtml.replace(/^<table/, `<table${dataAttrs}${blockClass ? ` class="slide-table ${blockClass}"` : ' class="slide-table"'}`);
              parts.push(withData);
            } catch (error) {
              errors.push(`Error rendering table at lines ${startLine}-${endLine}: ${error}`);
              parts.push(`<div class="table-error"${dataAttrs}>Error rendering table</div>`);
            }
            break;

          case 'blockquote':
            try {
              const quoteContent = lines.map((l: string) => l.replace(/^>\s?/, '')).join('\n');
              parts.push(`<blockquote${classAttr}${styleAttr}${dataAttrs}>${processInlineContentRobust(quoteContent)}</blockquote>`);
            } catch (error) {
              errors.push(`Error rendering blockquote at lines ${startLine}-${endLine}: ${error}`);
              parts.push(`<blockquote class="error"${dataAttrs}>Error rendering blockquote</blockquote>`);
            }
            break;

          case 'hr':
            parts.push(`<hr class="slide-divider"${dataAttrs} />`);
            break;

          case 'paragraph':
          default:
            try {
              const text = lines.join('\n');
              const processedText = processInlineContentRobust(text);
              parts.push(`<p${classAttr}${styleAttr}${dataAttrs}>${processedText}</p>`);
            } catch (error) {
              errors.push(`Error rendering paragraph at lines ${startLine}-${endLine}: ${error}`);
              parts.push(`<p class="error"${dataAttrs}>Error rendering content</p>`);
            }
            break;
        }

      } catch (blockError) {
        errors.push(`Unexpected error rendering block: ${blockError instanceof Error ? blockError.message : String(blockError)}`);
        parts.push(`<div class="render-error">Error rendering block</div>`);
      }
    }

    return { html: parts.join('\n'), errors, warnings };

  } catch (error) {
    errors.push(`Critical rendering error: ${error instanceof Error ? error.message : String(error)}`);
    return { html: '<div class="critical-error">Critical rendering error</div>', errors, warnings };
  }
}

/**
 * Robust inline content processor
 */
function processInlineContentRobust(html: string): string {
  try {
    if (!html || typeof html !== 'string') {
      return '';
    }

    let out = html;

    // Process LaTeX with error handling
    try {
      out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
        if (!latex || latex.trim() === '') return '$$$$';
        return `<div class="latex-block">${escapeHtml(latex)}</div>`;
      });
      
      out = out.replace(/\$([^$\n]+)\$/g, (_, latex) => {
        if (!latex || latex.trim() === '') return '$$';
        return `<span class="latex-inline">${escapeHtml(latex)}</span>`;
      });
    } catch (error) {
      // LaTeX errors are not critical, continue without it
    }

    // Process links with validation
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      const cleanText = escapeHtml(text);
      const cleanUrl = escapeHtml(url);
      
      // Basic URL validation
      if (!cleanUrl || cleanUrl.trim() === '') {
        return cleanText;
      }
      
      // Prevent javascript: URLs
      if (cleanUrl.toLowerCase().startsWith('javascript:')) {
        return cleanText;
      }
      
      return `<a href="${cleanUrl}" target="_blank" rel="noopener">${cleanText}</a>`;
    });

    // Process bold/italic
    out = out.replace(/\*\*([^*]+)\*\*/g, (_, text) => `<strong>${escapeHtml(text)}</strong>`);
    out = out.replace(/\*([^*]+)\*/g, (_, text) => `<em>${escapeHtml(text)}</em>`);
    out = out.replace(/__([^_]+)__/g, (_, text) => `<strong>${escapeHtml(text)}</strong>`);
    out = out.replace(/_([^_]+)_/g, (_, text) => `<em>${escapeHtml(text)}</em>`);

    // Process code
    out = out.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`);

    // Process line breaks
    out = out.replace(/\n/g, '<br>');

    return out;

  } catch (error) {
    return escapeHtml(html);
  }
}

/**
 * Simple HTML escape function
 */
function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Robust table parser (placeholder - implement as needed)
 */
function parseMarkdownTablesRobust(markdown: string): string {
  try {
    // Basic table parsing - enhance as needed
    const lines = markdown.split('\n');
    const tableLines = lines.filter(line => line.trim().includes('|'));
    
    if (tableLines.length < 2) {
      return '<table class="slide-table"><tr><td>Invalid table</td></tr></table>';
    }

    let html = '<table class="slide-table">\n';
    
    for (const line of tableLines) {
      const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
      html += '<tr>';
      for (const cell of cells) {
        html += `<td>${escapeHtml(cell)}</td>`;
      }
      html += '</tr>\n';
    }
    
    html += '</table>';
    return html;
    
  } catch (error) {
    return '<table class="slide-table error"><tr><td>Table parsing error</td></tr></table>';
  }
}
