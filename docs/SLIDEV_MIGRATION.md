# Slidev Migration Guide

## Overview

This guide documents the completed migration from the Excalidraw-based slide editor to the new Slidev-based markdown implementation.

## ✅ Migration Complete

The slide editor has been fully migrated to use Slidev markdown syntax with the following features:

### Key Features

✅ **Markdown-Based Editing** - Write slides in familiar markdown syntax  
✅ **Live Preview** - Real-time preview as you type  
✅ **Presenter Mode** - Full-screen presentation with notes, timer, and next slide preview  
✅ **PDF/PPTX Export** - Export to PDF and PowerPoint formats  
✅ **Theme System** - Multiple professional themes (default, seriph, apple-basic, etc.)  
✅ **Layout System** - 18+ slide layouts (cover, center, two-cols, image, quote, etc.)  
✅ **Presenter Notes** - Add notes visible only in presenter mode  
✅ **Quick Templates** - Pre-built slide templates for common use cases  
✅ **Dark Mode** - Full dark mode support throughout  

## Architecture

### Files Structure

```
src/
├── views/
│   └── SlidesEditor.vue          # Main slide editor (unified component)
├── components/slides/
│   └── SlidesTitleBar.vue        # Title bar with sharing controls
├── services/
│   └── slidevService.ts          # Export and markdown conversion
├── utils/
│   └── slidevMarkdown.ts         # Markdown parsing utilities
└── store/
    └── slides.ts                 # Pinia store for slide state
```

### Data Structure

```typescript
interface SlidevSlide {
  id: string;
  content: string;                 // Markdown content
  notes: string;                   // Presenter notes
  frontmatter?: Record<string, any>; // Slide-specific settings
}
```

## Slidev Markdown Syntax

### Slide Separators

Use `---` to separate slides:

```markdown
# Slide 1

Content here

---

# Slide 2

More content
```

### Frontmatter

Add slide-specific settings:

```markdown
---
layout: center
background: /image.jpg
class: text-white
---

# Centered Slide
```

### Presenter Notes

Add notes as HTML comments at the end of a slide:

```markdown
# My Slide

Content here

<!--
These are presenter notes.
Only visible in presenter mode.
-->
```

## Available Layouts

| Layout | Description |
|--------|-------------|
| `default` | Standard slide layout |
| `center` | Centered content |
| `cover` | Cover slide with gradient |
| `two-cols` | Two column layout |
| `image` | Image-focused layout |
| `quote` | Quote/testimonial layout |
| `section` | Section divider |
| `fact` | Fact/statistic highlight |
| `statement` | Statement emphasis |
| `end` | End slide |

## Available Themes

| Theme | Description |
|-------|-------------|
| `default` | Clean and minimal |
| `seriph` | Serif typography |
| `apple-basic` | Apple-style presentation |
| `bricks` | Brick wall background |
| `shibainu` | Cute and playful |
| `geist` | Vercel-inspired design |
| `dracula` | Dark purple theme |
| `unicorn` | Colorful gradient |

## Keyboard Shortcuts (Presenter Mode)

| Key | Action |
|-----|--------|
| `→` / `↓` / `Space` / `Enter` | Next slide |
| `←` / `↑` | Previous slide |
| `Home` | First slide |
| `End` | Last slide |
| `Escape` | Exit presenter mode |

## Export Options

### PDF Export

```typescript
await handleExport('pdf');
```

- Server-side export via Playwright (high quality)
- Client-side fallback using print dialog

### PPTX Export

```typescript
await handleExport('pptx');
```

- Requires backend endpoint at `/api/v1/slides/export`

## Quick Templates

The editor includes pre-built templates:

1. **Title** - Cover slide with title and subtitle
2. **Content** - Standard bullet point slide
3. **Two Cols** - Two column layout
4. **Image** - Image-focused slide
5. **Quote** - Quote with attribution
6. **Code** - Code example slide

## API Endpoints

### Export Endpoint

```
POST /api/v1/slides/export

Body:
{
  "markdown": "...",
  "format": "pdf" | "pptx",
  "theme": "default",
  "title": "Presentation Title"
}

Response: Binary file (PDF or PPTX)
```

## Support

- **Slidev Documentation**: https://sli.dev/guide/
- **Theme Gallery**: https://sli.dev/resources/theme-gallery/
- **Syntax Guide**: https://sli.dev/guide/syntax
