# Markdown Renderer Composables

This directory contains reusable composables for rendering Slidev-flavored markdown with advanced features.

## useSlideRenderer

A composable that provides core markdown rendering functionality for slides.

### Features

- **Markdown Parsing**: Parses Slidev-flavored markdown into structured blocks
- **HTML Rendering**: Converts blocks to HTML with data attributes for line tracking
- **Position Classes**: Applies arbitrary position classes (e.g., `top-[18%]`, `left-[30%]`)
- **Arrange Mode**: Optional support for arrange mode with MutationObserver
- **Auto-cleanup**: Proper cleanup of observers and event listeners

### Usage

```typescript
import { useSlideRenderer } from '@/composables/useSlideRenderer';

const presentationRef = ref<HTMLElement | null>(null);

const {
  renderedContent,
  renderSlide,
  parsePresentation,
  applyArbitraryPositionClasses,
  updateElementPosition,
  cleanup
} = useSlideRenderer({
  container: presentationRef,
  enableArrangeMode: true
});

// Render a single slide
await renderSlide('# Hello World\n\nThis is a slide');

// Parse complete presentation
const slides = parsePresentation(markdownContent);
```

### API

#### Options

```typescript
interface SlideRendererOptions {
  container?: Ref<HTMLElement | null>;    // Container element for DOM manipulation
  enableArrangeMode?: boolean;              // Enable arrange mode features
}
```

#### Return Values

- `renderedContent`: Computed HTML string
- `renderSlide()`: Render markdown to HTML
- `parsePresentation()`: Parse complete presentation
- `applyArbitraryPositionClasses()`: Apply position styles to DOM
- `updateElementPosition()`: Update element position in markdown
- `cleanup()`: Clean up resources

## Components

### SlidePresentation

A simple presentation component that uses the slide renderer composable.

```vue
<template>
  <SlidePresentation
    :markdown="slideContent"
    layout="center"
    background="#ffffff"
    text-color="#1e293b"
  />
</template>
```

### SlidesPreviewPane

The main preview pane component that uses the composable architecture. This is the refactored version that replaces the old implementation.

## Migration Guide

### From Direct Rendering

Old way:
```typescript
import { parseMarkdownToHtml } from '@/utils/slidevMarkdown';
const html = parseMarkdownToHtml(markdown);
```

New way:
```typescript
import { useSlideRenderer } from '@/composables/useSlideRenderer';
const { renderedContent, renderSlide } = useSlideRenderer();
await renderSlide(markdown);
```

### Benefits

1. **Reusability**: Same rendering logic in editor and presentation mode
2. **Maintainability**: Centralized rendering logic
3. **Type Safety**: Full TypeScript support
4. **Testability**: Easier to test rendering logic
5. **Performance**: Optimized re-rendering with watchers
6. **Features**: Built-in support for arrange mode

## Architecture

```
useSlideRenderer (Core)
├── slidevMarkdown.ts (Parsing)
├── markdownElementDetector.ts (Element detection)
└── Components
    ├── SlidePresentation.vue
    └── SlidesPreviewPane.vue (refactored)
```

## Future Enhancements

- [ ] Plugin system for custom renderers
- [ ] Theme support integration
- [ ] Real-time collaboration features
- [ ] Export to different formats (PDF, PPTX)
- [ ] Accessibility improvements
