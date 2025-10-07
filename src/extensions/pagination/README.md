# Smart Pagination Plugin

A performant custom pagination plugin for TipTap that calculates page breaks based on actual node heights without inserting break nodes into the document.

## Features

- **Performance Optimized**: Uses debouncing (150ms), idle detection (500ms), and requestAnimationFrame
- **Height-Based Calculation**: Measures actual DOM node heights for accurate pagination
- **No Document Mutation**: Page breaks are decorations only, not part of the document
- **Print Preview Support**: Generates CSS that matches on-screen pagination
- **Configurable**: Supports different page sizes, margins, and page number positions

## Architecture

### Core Files

- **`types.ts`** - TypeScript interfaces for pagination state
- **`measure.ts`** - Height measurement utilities with mm/px conversion
- **`layout-engine.ts`** - Core pagination logic that calculates page breaks
- **`renderer.ts`** - Visual decorations for page breaks and print CSS
- **`index.ts`** - Main TipTap extension with performance optimizations

## Usage

```typescript
import { SmartPagination } from '@/extensions/pagination';

editor = new Editor({
  extensions: [
    SmartPagination.configure({
      pageSize: { width: 210, height: 297 }, // A4 in mm
      margins: { top: 20, bottom: 20, left: 20, right: 20 }, // in mm
      headerHeight: 0, // in mm
      footerHeight: 10, // in mm
      showPageNumbers: true,
      pageNumberPosition: 'right', // 'left' | 'center' | 'right'
    }),
  ],
});
```

## Integration with DocsEditor

The plugin integrates with:
- **Page size changes** (A4, A3, Letter, Legal, Card)
- **Page orientation** (Portrait, Landscape)
- **Pagination settings dialog** (page numbers, position, footer height)

## Visual Features

### On-Screen Display
- Page break markers between pages (with page numbers preview)
- Sticky page number indicator at document top
- Page numbers shown at break points

### Print Preview
- Page numbers in @page margins (CSS Paged Media)
- All decorations hidden in print
- Accurate page breaks matching on-screen display

## Performance

The plugin uses several optimization strategies:

1. **Debounced Recalculation**: Waits 150ms after last change
2. **Idle Detection**: Waits 500ms for user to pause typing
3. **requestAnimationFrame**: Avoids blocking main thread
4. **MutationObserver**: Efficient DOM change detection
5. **Lazy Calculation**: Only recalculates when document changes

## Testing

Test the following scenarios:

1. **Typing Performance**: Type rapidly and verify no lag
2. **Page Breaks**: Add content and verify breaks appear correctly
3. **Page Numbers**: Toggle settings and verify display
4. **Page Size**: Change size/orientation and verify recalculation
5. **Print Preview**: Press Ctrl+P and verify matches on-screen
6. **Large Documents**: Test with 10+ pages for performance

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pageSize` | `{ width: number, height: number }` | `{ width: 210, height: 297 }` | Page dimensions in mm |
| `margins` | `{ top, bottom, left, right }` | `{ top: 20, bottom: 20, left: 20, right: 20 }` | Page margins in mm |
| `headerHeight` | `number` | `0` | Header height in mm |
| `footerHeight` | `number` | `10` | Footer height in mm |
| `showPageNumbers` | `boolean` | `true` | Show page numbers |
| `pageNumberPosition` | `'left' \| 'center' \| 'right'` | `'right'` | Page number position |

## Future Enhancements

- [ ] Custom header/footer content
- [ ] Page number formatting (e.g., "Page 1 of 10")
- [ ] Different first page settings
- [ ] Orphan/widow control
- [ ] Keep-with-next for headings
