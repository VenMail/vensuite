# Markdown Renderer Composables

This directory contains reusable composables for rendering Slidev-flavored markdown with advanced features.

## useSlideRenderer

A composable that provides enhanced markdown rendering functionality for slides with robust error handling, security improvements, and performance optimizations.

### Features

- **Robust Parsing**: Enhanced parsing with error recovery and validation
- **Security**: XSS prevention, URL validation, and CSS filtering
- **Performance**: Optimized rendering with metrics collection
- **Error Recovery**: Automatic retry with exponential backoff
- **Diagnostics**: Comprehensive error reporting and debug tools
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
  cleanup,
  slideErrors,
  slideWarnings,
  renderMetrics,
  getDiagnostics
} = useSlideRenderer({
  container: presentationRef,
  enableArrangeMode: true,
  enableErrorRecovery: true,
  maxRetries: 3
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

### SlidesPreviewPaneEnhanced

The main preview pane component that uses the enhanced composable architecture with robust error handling, security improvements, and performance optimizations. This replaces the old SlidesPreviewPane implementation.

## Migration Guide

### From Old Renderer

Old way:
```typescript
import { useSlideRenderer } from '@/composables/useSlideRenderer';
import SlidesPreviewPane from '@/components/slides/SlidesPreviewPane.vue';
const { renderedContent, renderSlide } = useSlideRenderer();
await renderSlide(markdown);
```

New way:
```typescript
import { useSlideRendererEnhanced } from '@/composables/useSlideRendererEnhanced';
import SlidesPreviewPaneEnhanced from '@/components/slides/SlidesPreviewPaneEnhanced.vue';
const { renderedContent, renderSlide, slideErrors, slideWarnings } = useSlideRendererEnhanced({
  enableErrorRecovery: true,
  maxRetries: 3
});
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
├── slideRendererRobustness.ts (Robust parsing & rendering)
├── slidevMarkdown.ts (Base parsing)
├── markdownElementDetector.ts (Element detection)
└── Components
    ├── SlidePresentation.vue
    └── SlidesPreviewPane.vue (enhanced with error handling)
```

## Enhanced Features

### Error Recovery
- Automatic retry with exponential backoff
- Graceful degradation on syntax errors
- Comprehensive error reporting and diagnostics

### Security
- XSS prevention with input sanitization
- URL validation and CSS filtering
- Safe rendering of user content

### Performance
- Optimized parsing for large content
- Memory management and cleanup
- Performance metrics collection

### Developer Experience
- Built-in debug mode and testing tools
- Visual error feedback
- Comprehensive test suite

## Future Enhancements

- [ ] Plugin system for custom renderers
- [ ] Theme support integration
- [ ] Real-time collaboration features
- [ ] Export to different formats (PDF, PPTX)
- [ ] Accessibility improvements
