# Pagination Extension

A robust pagination system for Tiptap that provides true print fidelity while maintaining smooth content flow during editing.

## Features

- **Automatic Page Breaks**: Detects content overflow and calculates optimal break points
- **Headers & Footers**: Configurable content with page number placeholders (`{page}`, `{total}`)
- **Multiple Page Sizes**: A4, A3, A5, Letter, Legal, Tabloid
- **Orientation Support**: Portrait and landscape modes
- **Smart Content Handling**:
  - Tables: Prevents splitting mid-row, can repeat headers
  - Images: Prevents splitting, optional scaling
  - Charts: Keeps intact across page boundaries
  - Headings: Keeps with following content (no orphan headings)
- **Print Optimization**: CSS for exact print fidelity
- **Dark Mode**: Full dark mode support

## Installation

The extension is located at `src/extensions/pagination/`. Import it in your editor setup:

```typescript
import { Pagination, PAGE_SIZES, PageBreak } from '@/extensions/pagination';
import '@/extensions/pagination/pagination.css';
```

## Usage

### Basic Setup

```typescript
import { Editor } from '@tiptap/core';
import { Pagination, PAGE_SIZES, PageBreak } from '@/extensions/pagination';

const editor = new Editor({
  extensions: [
    // ... other extensions
    PageBreak, // For explicit page breaks
    Pagination.configure({
      pageSize: PAGE_SIZES.A4,
      pageOrientation: 'portrait',
      footerContent: { right: 'Page {page}' },
    }),
  ],
});
```

### Configuration Options

```typescript
interface PaginationOptions {
  // Page dimensions
  pageSize: PageSize;                    // { width, height } in pixels at 96 DPI
  pageOrientation: 'portrait' | 'landscape';
  
  // Margins (in pixels)
  pageMargins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  contentMargins: {
    top: number;    // Space between header and content
    bottom: number; // Space between content and footer
  };
  
  // Visual settings
  pageGap: number;           // Gap between pages (default: 40)
  pageGapColor: string;      // Background color of gap
  pageBorderColor: string;   // Border color around pages
  pageBackground: string;    // Page background color
  
  // Header/Footer
  headerContent: {
    left: string;
    center?: string;
    right: string;
  };
  footerContent: {
    left: string;
    center?: string;
    right: string;
  };
  showPageNumbers: boolean;
  pageNumberFormat: 'numeric' | 'roman' | 'alpha';
  
  // Behavior
  enableAutoFlow: boolean;        // Auto-paginate content
  preventOrphanLines: boolean;    // Avoid single lines at page top/bottom
  keepWithNext: boolean;          // Keep headings with following content
  tableRowSplitting: boolean;     // Allow table rows to split across pages
  
  // Debug
  showPageBoundaries: boolean;
}
```

### Available Commands

```typescript
// Set page size
editor.commands.setPageSize({ width: 794, height: 1123 }); // A4

// Set orientation
editor.commands.setPageOrientation('landscape');

// Set margins
editor.commands.setPageMargins({ top: 96, bottom: 96, left: 72, right: 72 });

// Set header content
editor.commands.setHeaderContent({ 
  left: 'Document Title',
  right: '{page}' 
});

// Set footer content
editor.commands.setFooterContent({ 
  left: 'Confidential',
  right: 'Page {page} of {total}' 
});

// Insert page break (also available via Ctrl/Cmd+Enter)
editor.commands.insertPageBreak();

// Set page gap
editor.commands.setPageGap(50);

// Set page background
editor.commands.setPageBackground('#ffffff');

// Toggle page numbers
editor.commands.togglePageNumbers();

// Update multiple options at once
editor.commands.updatePagination({
  pageSize: PAGE_SIZES.LETTER,
  pageOrientation: 'portrait',
  footerContent: { right: '{page}' },
});
```

### Page Number Placeholders

Use these placeholders in header/footer content:

- `{page}` or `{PAGE}` - Current page number
- `{total}` or `{TOTAL}` or `{pages}` - Total page count

### Predefined Page Sizes

```typescript
import { PAGE_SIZES } from '@/extensions/pagination';

PAGE_SIZES.A4      // 794 x 1123 px (210 x 297 mm)
PAGE_SIZES.A3      // 1123 x 1591 px (297 x 420 mm)
PAGE_SIZES.A5      // 559 x 794 px (148 x 210 mm)
PAGE_SIZES.LETTER  // 816 x 1056 px (8.5 x 11 in)
PAGE_SIZES.LEGAL   // 816 x 1344 px (8.5 x 14 in)
PAGE_SIZES.TABLOID // 1056 x 1632 px (11 x 17 in)
```

## Replacing PaginationPlus

This extension is designed to replace `@tiptap-pagination-plus`. Key differences:

| Feature | PaginationPlus | This Extension |
|---------|---------------|----------------|
| Page calculation | CSS-based decorations | ProseMirror plugin with DOM measurement |
| Table handling | Basic | Smart row-boundary detection |
| Image handling | Basic | Scaling and caption support |
| Print fidelity | Approximate | Exact with CSS page-break rules |
| Header/Footer | CSS counters | Actual content with placeholders |

### Migration

1. Remove `tiptap-pagination-plus` from your imports
2. Import the new extension:
   ```typescript
   // Before
   import { PaginationPlus } from 'tiptap-pagination-plus';
   
   // After
   import { Pagination, PageBreak } from '@/extensions/pagination';
   ```

3. Update configuration:
   ```typescript
   // Before
   PaginationPlus.configure({
     pageHeight: 1123,
     pageWidth: 794,
     marginTop: 72,
     // ...
   })
   
   // After
   Pagination.configure({
     pageSize: { width: 794, height: 1123 },
     pageMargins: { top: 72, bottom: 72, left: 72, right: 72 },
     // ...
   })
   ```

4. Update command calls:
   ```typescript
   // Before
   editor.commands.updatePageHeight(1123);
   editor.commands.updatePageWidth(794);
   
   // After
   editor.commands.setPageSize({ width: 794, height: 1123 });
   ```

## Print Support

The extension includes comprehensive print styles. For best results:

1. Import the CSS file
2. Use the browser's print function (Ctrl/Cmd+P)
3. Set margins to "None" in print dialog (margins are handled by the extension)

### Print-specific CSS

```css
@media print {
  /* Pages break correctly */
  .pagination-gap {
    page-break-before: always;
  }
  
  /* Tables don't split mid-row */
  .with-pagination table tr {
    page-break-inside: avoid;
  }
  
  /* Images stay intact */
  .with-pagination img {
    page-break-inside: avoid;
  }
}
```

## Architecture

```
src/extensions/pagination/
├── index.ts              # Main exports
├── types.ts              # TypeScript types and constants
├── pagination-extension.ts  # Main Tiptap extension
├── pagination-plugin.ts  # ProseMirror plugin for page calculation
├── page-node.ts          # Page container node
├── page-header.ts        # Header node
├── page-footer.ts        # Footer node
├── page-break.ts         # Explicit page break node
├── table-handler.ts      # Table pagination utilities
├── image-handler.ts      # Image pagination utilities
├── pagination.css        # Styles including print
└── README.md             # This file
```

## Known Limitations

1. **Very large tables**: Tables taller than a single page will overflow rather than split
2. **Complex nested structures**: Deeply nested lists may not break optimally
3. **Real-time accuracy**: Page count updates after a short debounce delay

## Future Improvements

- [ ] Table row splitting with header repetition
- [ ] Widow/orphan control for paragraphs
- [ ] Column layout support
- [ ] Watermark support
- [ ] First page different header/footer
