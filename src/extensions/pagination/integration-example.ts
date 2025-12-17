/**
 * Integration Example for DocsEditor
 * 
 * This file shows how to integrate the new Pagination extension
 * into DocsEditor.vue, replacing @tiptap-pagination-plus.
 * 
 * NOTE: This is a reference file - copy the relevant parts into DocsEditor.vue
 */

import { Editor } from '@tiptap/core';
import { Pagination, PAGE_SIZES, PageBreak } from '@/extensions/pagination';

// Import the CSS (add to DocsEditor.vue or main.ts)
// import '@/extensions/pagination/pagination.css';

/**
 * Example: Creating an editor with the new pagination
 */
export function createEditorWithPagination(options: {
  pageSize?: keyof typeof PAGE_SIZES;
  orientation?: 'portrait' | 'landscape';
  content?: any;
}) {
  const { pageSize = 'A4', orientation = 'portrait', content = '' } = options;

  return new Editor({
    extensions: [
      // ... your other extensions (StarterKit, etc.)
      
      // Add PageBreak node for explicit breaks
      PageBreak,
      
      // Add Pagination extension
      Pagination.configure({
        pageSize: PAGE_SIZES[pageSize],
        pageOrientation: orientation,
        pageMargins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72,
        },
        contentMargins: {
          top: 16,
          bottom: 16,
        },
        pageGap: 40,
        pageGapColor: '#f3f4f6',
        pageBorderColor: '#e5e7eb',
        pageBackground: '#ffffff',
        headerContent: {
          left: '',
          right: '',
        },
        footerContent: {
          left: '',
          right: '{page}',
        },
        showPageNumbers: true,
        enableAutoFlow: true,
        preventOrphanLines: true,
        keepWithNext: true,
        tableRowSplitting: false,
      }),
    ],
    content,
  });
}

/**
 * Example: Mapping old PaginationPlus commands to new ones
 */
export function mapPaginationCommands(editor: Editor) {
  return {
    // Old: editor.commands.updatePageHeight(height)
    // New:
    updatePageHeight: (height: number) => {
      const currentSize = editor.storage.pagination?.options?.pageSize;
      editor.commands.setPageSize({
        width: currentSize?.width || 794,
        height,
      });
    },

    // Old: editor.commands.updatePageWidth(width)
    // New:
    updatePageWidth: (width: number) => {
      const currentSize = editor.storage.pagination?.options?.pageSize;
      editor.commands.setPageSize({
        width,
        height: currentSize?.height || 1123,
      });
    },

    // Old: editor.commands.updatePageSize({ width, height })
    // New:
    updatePageSize: (size: { width: number; height: number }) => {
      editor.commands.setPageSize(size);
    },

    // Old: editor.commands.updateMargins({ top, bottom, left, right })
    // New:
    updateMargins: (margins: { top: number; bottom: number; left: number; right: number }) => {
      editor.commands.setPageMargins(margins);
    },

    // Old: editor.commands.updateContentMargins({ top, bottom })
    // New:
    updateContentMargins: (margins: { top: number; bottom: number }) => {
      editor.commands.updatePagination({
        contentMargins: margins,
      });
    },

    // Old: editor.commands.updateHeaderContent(left, right)
    // New:
    updateHeaderContent: (left: string, right: string) => {
      editor.commands.setHeaderContent({ left, right });
    },

    // Old: editor.commands.updateFooterContent(left, right)
    // New:
    updateFooterContent: (left: string, right: string) => {
      editor.commands.setFooterContent({ left, right });
    },

    // Old: editor.commands.updatePageGap(gap)
    // New:
    updatePageGap: (gap: number) => {
      editor.commands.setPageGap(gap);
    },

    // Old: editor.commands.updatePageBreakBackground(color)
    // New:
    updatePageBreakBackground: (color: string) => {
      editor.commands.updatePagination({
        pageGapColor: color,
        pageBackground: color,
      });
    },
  };
}

/**
 * Example: DocsEditor integration snippet
 * 
 * Replace the PaginationPlus import and configuration in DocsEditor.vue:
 */
export const DOCS_EDITOR_CHANGES = `
// ============================================
// STEP 1: Update imports
// ============================================

// Remove:
// import { PaginationPlus } from 'tiptap-pagination-plus';

// Add:
import { Pagination, PAGE_SIZES, PageBreak } from '@/extensions/pagination';
import '@/extensions/pagination/pagination.css';

// ============================================
// STEP 2: Update initializeEditor function
// ============================================

// In the extensions array, replace:
// ...(shouldEnablePaginationPlus ? [PaginationPlus.configure(paginationConfig as any)] : []),

// With:
PageBreak,
Pagination.configure({
  pageSize: PAGE_SIZES.A4,
  pageOrientation: pageOrientation.value,
  pageMargins: {
    top: paginationSettings.marginTop,
    bottom: paginationSettings.marginBottom,
    left: paginationSettings.marginLeft,
    right: paginationSettings.marginRight,
  },
  footerContent: {
    left: paginationSettings.footerLeft,
    right: paginationSettings.footerRight,
  },
  headerContent: {
    left: paginationSettings.headerLeft,
    right: paginationSettings.headerRight,
  },
}),

// ============================================
// STEP 3: Update handlePageSizeChange function
// ============================================

// Replace the PaginationPlus commands with:
function handlePageSizeChange(size: string) {
  pageSize.value = size;
  
  if (!editor.value) return;

  const pageSizeMap: Record<string, { width: number; height: number }> = {
    'a4': PAGE_SIZES.A4,
    'a3': PAGE_SIZES.A3,
    'a5': PAGE_SIZES.A5,
    'letter': PAGE_SIZES.LETTER,
    'legal': PAGE_SIZES.LEGAL,
    'tabloid': PAGE_SIZES.TABLOID,
  };

  const newSize = pageSizeMap[size.toLowerCase()] || PAGE_SIZES.A4;
  
  // Apply orientation
  const finalSize = pageOrientation.value === 'landscape'
    ? { width: newSize.height, height: newSize.width }
    : newSize;

  editor.value.commands.setPageSize(finalSize);
  updatePrintStyles();
}

// ============================================
// STEP 4: Update updatePaginationSettings function
// ============================================

function updatePaginationSettings(settings: any) {
  if (!editor.value) return;

  // Update local state
  paginationSettings.marginTop = settings.marginTop ?? paginationSettings.marginTop;
  paginationSettings.marginBottom = settings.marginBottom ?? paginationSettings.marginBottom;
  paginationSettings.marginLeft = settings.marginLeft ?? paginationSettings.marginLeft;
  paginationSettings.marginRight = settings.marginRight ?? paginationSettings.marginRight;
  paginationSettings.footerLeft = settings.footerLeft ?? paginationSettings.footerLeft;
  paginationSettings.footerRight = settings.footerRight ?? paginationSettings.footerRight;
  paginationSettings.headerLeft = settings.headerLeft ?? paginationSettings.headerLeft;
  paginationSettings.headerRight = settings.headerRight ?? paginationSettings.headerRight;

  // Apply via new commands
  editor.value.commands.updatePagination({
    pageMargins: {
      top: paginationSettings.marginTop,
      bottom: paginationSettings.marginBottom,
      left: paginationSettings.marginLeft,
      right: paginationSettings.marginRight,
    },
    footerContent: {
      left: paginationSettings.footerLeft,
      right: paginationSettings.footerRight,
    },
    headerContent: {
      left: paginationSettings.headerLeft,
      right: paginationSettings.headerRight,
    },
  });

  updatePrintStyles();
}

// ============================================
// STEP 5: Remove helper functions
// ============================================

// These can be removed as they're no longer needed:
// - editorHasPaginationPlus()
// - getPaginationPlusConfig()

// The new extension handles everything internally.
`;
