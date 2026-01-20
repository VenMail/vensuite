import { ref, computed } from 'vue';
import { debounce } from '@univerjs/core';

export interface EditingState {
  element: HTMLElement | null;
  elementType: string;
  content: string;
  styles: Record<string, string>;
}

export function useSmartBlockEditing() {
  // State
  const editingElement = ref<HTMLElement | null>(null);
  const editingElementType = ref('');
  const editingContent = ref('');
  const editingStyles = ref<Record<string, string>>({});
  const selectedElement = ref<HTMLElement | null>(null);

  // Create debounced markdown update
  const debouncedMarkdownUpdate = debounce((markdownContent: string, emit: Function) => {
    emit('update-content', markdownContent);
  }, 150);

  // Double-click handler
  function handleDoubleClick(event: MouseEvent, previewRef: HTMLElement | null, emit: Function) {
    event.preventDefault();
    event.stopPropagation();
    
    const target = event.target as HTMLElement;
    
    // Try multiple methods to find the editable element
    let editableElement = target.closest('.editable-element') as HTMLElement;
    
    // If not found, try broader selector
    if (!editableElement) {
      const textElements = target.closest('h1, h2, h3, h4, h5, h6, p, li, div[class*="col-"], span, strong, em, td, th') as HTMLElement;
      if (textElements && previewRef?.contains(textElements)) {
        editableElement = textElements;
      }
    }
    
    // If still not found, try parent elements
    if (!editableElement) {
      let parent = target.parentElement;
      while (parent && parent !== previewRef) {
        if (parent.classList.contains('editable-element') || 
            ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'LI'].includes(parent.tagName)) {
          editableElement = parent as HTMLElement;
          break;
        }
        parent = parent.parentElement;
      }
    }
    
    if (editableElement && previewRef?.contains(editableElement)) {
      // Ensure the element has the editable class
      if (!editableElement.classList.contains('editable-element')) {
        editableElement.classList.add('editable-element');
        editableElement.dataset.elementType = editableElement.tagName.toLowerCase();
        editableElement.dataset.elementIndex = Date.now().toString();
        editableElement.style.cursor = 'pointer';
      }
      
      // Store the original markdown structure
      const elementTag = editableElement.tagName.toLowerCase();
      const textContent = editableElement.textContent || '';
      
      let originalMarkdown = textContent;
      switch (elementTag) {
        case 'h1': originalMarkdown = `# ${textContent}`; break;
        case 'h2': originalMarkdown = `## ${textContent}`; break;
        case 'h3': originalMarkdown = `### ${textContent}`; break;
        case 'h4': originalMarkdown = `#### ${textContent}`; break;
        case 'h5': originalMarkdown = `##### ${textContent}`; break;
        case 'h6': originalMarkdown = `###### ${textContent}`; break;
        default: originalMarkdown = textContent; break;
      }
      
      editableElement.dataset.originalMarkdown = originalMarkdown;
      
      // Extract element information
      const elementType = editableElement.dataset.elementType || 'text';
      const elementContent = editableElement.innerHTML || editableElement.textContent || '';
      
      // Get computed styles
      const computedStyle = window.getComputedStyle(editableElement);
      const styles: Record<string, string> = {
        fontSize: computedStyle.fontSize,
        fontWeight: computedStyle.fontWeight,
        fontStyle: computedStyle.fontStyle,
        textDecoration: computedStyle.textDecoration,
        textAlign: computedStyle.textAlign || 'left',
        color: computedStyle.color
      };
      
      // Set up editing state
      editingElement.value = editableElement;
      editingElementType.value = elementType;
      editingContent.value = elementContent;
      editingStyles.value = styles;
      
      // Clear any existing selection
      if (selectedElement.value) {
        selectedElement.value.classList.remove('selected-element');
        selectedElement.value = null;
      }
      
      console.log('Smart block editing activated on:', elementType, elementContent);
    } else {
      console.log('No editable element found for smart block editing');
    }
  }

  // Real-time update handler
  function handleRealtimeUpdate(content: string, styles: Record<string, string>, emit: Function) {
    if (!editingElement.value) return;
    
    const element = editingElement.value;
    
    // Try to get the original markdown from the element's data
    let originalMarkdown = '';
    if (element.dataset.originalMarkdown) {
      originalMarkdown = element.dataset.originalMarkdown;
    } else {
      // Fallback to generating from current content
      originalMarkdown = generateStyledMarkdown(content, styles, element);
    }
    
    // Use debounced update
    debouncedMarkdownUpdate(originalMarkdown, emit);
    
    // Update text content for immediate visual feedback
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    if (element.textContent !== plainText) {
      element.textContent = plainText;
    }
    
    // Apply styles directly to the element
    applyStylesToElement(element, styles);
  }

  // Save handler
  function handleInlineSave(content: string, styles: Record<string, string>, emit: Function) {
    if (!editingElement.value) return;
    
    const element = editingElement.value;
    const markdownContent = generateStyledMarkdown(content, styles, element);
    
    // Immediately emit for final save
    emit('update-content', markdownContent);
    
    // Update text content
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    if (element.textContent !== plainText) {
      element.textContent = plainText;
    }
    
    // Apply styles
    applyStylesToElement(element, styles);
    
    // Clear editing state
    clearEditingState();
  }

  // Close handler
  function handleInlineClose() {
    clearEditingState();
  }

  // Generate styled markdown
  function generateStyledMarkdown(content: string, styles: Record<string, string>, element: HTMLElement): string {
    let markdown = content;
    
    // Convert HTML tags to markdown equivalents
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<u[^>]*>(.*?)<\/u>/gi, '__$1__');
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
    markdown = markdown.replace(/<[^>]*>/g, '');
    
    markdown = markdown.trim();
    
    // Handle font size with Slidev/UnoCSS classes
    let sizeClass = '';
    if (styles.fontSize) {
      const fontSize = parseInt(styles.fontSize);
      if (fontSize <= 12) sizeClass = 'text-xs';
      else if (fontSize <= 14) sizeClass = 'text-sm';
      else if (fontSize <= 16) sizeClass = 'text-base';
      else if (fontSize <= 18) sizeClass = 'text-lg';
      else if (fontSize <= 20) sizeClass = 'text-xl';
      else if (fontSize <= 24) sizeClass = 'text-2xl';
      else if (fontSize <= 32) sizeClass = 'text-4xl';
      else if (fontSize <= 40) sizeClass = 'text-5xl';
      else if (fontSize <= 48) sizeClass = 'text-6xl';
      else sizeClass = 'text-7xl';
    }
    
    // Apply formatting based on styles
    if (styles.fontWeight === 'bold' && !markdown.startsWith('**') && !markdown.startsWith('#')) {
      markdown = `**${markdown}**`;
    }
    
    if (styles.fontStyle === 'italic' && !markdown.startsWith('*') && !markdown.startsWith('#')) {
      markdown = `*${markdown}*`;
    }
    
    if (styles.textDecoration === 'underline' && !markdown.startsWith('__') && !markdown.startsWith('#')) {
      markdown = `__${markdown}__`;
    }
    
    // Handle element types smartly
    const elementTag = element.tagName.toLowerCase();
    
    switch (elementTag) {
      case 'h1':
        if (!markdown.startsWith('# ')) {
          markdown = `# ${markdown}`;
        }
        break;
      case 'h2':
        if (!markdown.startsWith('## ')) {
          markdown = `## ${markdown}`;
        }
        break;
      case 'h3':
        if (!markdown.startsWith('### ')) {
          markdown = `### ${markdown}`;
        }
        break;
      case 'h4':
        if (!markdown.startsWith('#### ')) {
          markdown = `#### ${markdown}`;
        }
        break;
      case 'h5':
        if (!markdown.startsWith('##### ')) {
          markdown = `##### ${markdown}`;
        }
        break;
      case 'h6':
        if (!markdown.startsWith('###### ')) {
          markdown = `###### ${markdown}`;
        }
        break;
      default:
        break;
    }
    
    // Add size class if different from default and not already a heading
    if (sizeClass && sizeClass !== 'text-base' && !markdown.startsWith('#')) {
      markdown = `<div class="${sizeClass}">${markdown}</div>`;
    }
    
    return markdown;
  }

  // Apply styles to element
  function applyStylesToElement(element: HTMLElement, styles: Record<string, string>) {
    Object.entries(styles).forEach(([property, value]) => {
      if (value && value !== 'normal' && value !== 'none') {
        element.style[property as any] = value;
      } else if (property === 'fontWeight' && value === 'normal') {
        element.style.fontWeight = 'normal';
      } else if (property === 'fontStyle' && value === 'normal') {
        element.style.fontStyle = 'normal';
      } else if (property === 'textDecoration' && value === 'none') {
        element.style.textDecoration = 'none';
      }
    });
  }

  // Setup interactive elements
  function setupInteractiveElements(previewRef: HTMLElement | null, handleDoubleClick: Function) {
    if (!previewRef) return;
    
    // Remove existing listeners
    const elements = previewRef.querySelectorAll('.editable-element');
    elements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.removeEventListener('dblclick', handleDoubleClick as EventListener);
    });
    
    // Add data attributes and listeners to editable elements
    const editableElements = previewRef.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, div[class*="col-"], span, strong, em, td, th');
    editableElements.forEach((el, index) => {
      const htmlEl = el as HTMLElement;
      
      if (!htmlEl.textContent?.trim()) return;
      
      htmlEl.dataset.elementIndex = index.toString();
      htmlEl.dataset.elementType = el.tagName.toLowerCase();
      htmlEl.style.cursor = 'pointer';
      htmlEl.classList.add('editable-element');
      
      htmlEl.addEventListener('dblclick', handleDoubleClick as EventListener);
      
      // Also add click listener for mobile support
      htmlEl.addEventListener('click', (e) => {
        if (e.detail === 2) {
          handleDoubleClick(e);
        }
      });
    });
    
    console.log(`Setup ${editableElements.length} editable elements for smart block editing`);
  }

  // Clear editing state
  function clearEditingState() {
    editingElement.value = null;
    editingElementType.value = '';
    editingContent.value = '';
    editingStyles.value = {};
  }

  // Cleanup
  function cleanup(previewRef: HTMLElement | null, handleDoubleClick: Function) {
    if (previewRef) {
      const elements = previewRef.querySelectorAll('.editable-element');
      elements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.removeEventListener('dblclick', handleDoubleClick as EventListener);
      });
    }
  }

  return {
    // State
    editingElement,
    editingElementType,
    editingContent,
    editingStyles,
    selectedElement,
    
    // Methods
    handleDoubleClick,
    handleRealtimeUpdate,
    handleInlineSave,
    handleInlineClose,
    setupInteractiveElements,
    cleanup,
    clearEditingState,
    
    // Computed
    editingState: computed<EditingState>(() => ({
      element: editingElement.value,
      elementType: editingElementType.value,
      content: editingContent.value,
      styles: editingStyles.value,
    })),
  };
}
