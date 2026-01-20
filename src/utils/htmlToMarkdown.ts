/**
 * HTML to Markdown Converter
 * Converts HTML content from PPTX to clean markdown format
 */

export function htmlToMarkdown(_html: string): string {
  let html = _html;
  
  // Remove script and style tags
  html = html.replace(/<(script|style)[^>]*>.*?<\/\1>/gi, '');
  
  // Process headings
  html = html.replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (_match, level, content) => {
    const hashes = '#'.repeat(parseInt(level));
    return `${hashes} ${content.trim()}\n\n`;
  });
  
  // Process paragraphs
  html = html.replace(/<p[^>]*>(.*?)<\/p>/gi, (_match, content) => {
    return `${content.trim()}\n\n`;
  });
  
  // Process lists
  html = html.replace(/<ul[^>]*>(.*?)<\/ul>/gi, (_match, content) => {
    const listItems = content.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
    const markdownList = listItems.map((item: string, _index: number) => {
      const itemContent = item.replace(/<li[^>]*>(.*?)<\/li>/, '$1').trim();
      return `- ${itemContent}`;
    }).join('\n');
    return `${markdownList}\n\n`;
  });
  
  html = html.replace(/<ol[^>]*>(.*?)<\/ol>/gi, (_match, content) => {
    const listItems = content.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
    const markdownList = listItems.map((item: string, index: number) => {
      const itemContent = item.replace(/<li[^>]*>(.*?)<\/li>/, '$1').trim();
      return `${index + 1}. ${itemContent}`;
    }).join('\n');
    return `${markdownList}\n\n`;
  });
  
  // Process bold and italic
  html = html.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  html = html.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  html = html.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  html = html.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  
  // Process line breaks
  html = html.replace(/<br[^>]*>/gi, '\n');
  
  // Clean up remaining HTML tags
  html = html.replace(/<[^>]*>/g, '');
  
  // Clean up excessive whitespace
  html = html.replace(/\n{3,}/g, '\n\n');
  html = html.trim();
  
  return html;
}

/**
 * Extract title from HTML content
 */
export function extractTitleFromHtml(html: string, slideIndex: number): string {
  // Try to find heading first
  const headingMatch = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
  if (headingMatch) {
    const title = headingMatch[1].replace(/<[^>]*>/g, '').trim();
    if (title && title !== '') {
      return title;
    }
  }
  
  // Try to find text content that looks like a title
  const textContent = html.replace(/<[^>]*>/g, ' ').trim();
  const sentences = textContent.split(/[.!?]/);
  if (sentences.length > 0 && sentences[0]!.trim().length > 0) {
    const firstSentence = sentences[0]!.trim();
    if (firstSentence.length < 100) { // Reasonable title length
      return firstSentence;
    }
  }
  
  // Fallback to slide number
  return `Slide ${slideIndex + 1}`;
}

/**
 * Extract and clean text content from HTML
 */
export function extractTextContent(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Split into sentences for better formatting
  const sentences = text.split(/[.!?]/).filter(s => s.trim());
  
  return sentences.map(sentence => sentence.trim()).join('. ');
}
