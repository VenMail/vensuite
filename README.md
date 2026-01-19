# Vensuite - Open Source Productivity Suite

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/venmail/vensuite?style=social)](https://github.com/venmail/vensuite)

**Google Docs, Sheets, Forms & Slides alternatives — fully open source.**

Vensuite is a complete productivity suite that you can self-host or use via our managed service at [https://venia.cloud](https://venia.cloud). Part of the [Venmail](https://venmail.io) enterprise email workspace.

## ✨ Features

### 📄 Docs
- Rich text editor with TipTap
- Real-time collaboration
- PDF/DOCX export
- AI writing assistance
- Version history

### 📊 Sheets
- Full spreadsheet functionality
- Formula support
- Charts and visualizations
- Excel/CSV import/export
- Powered by Univer

### 📝 Forms
- Drag-and-drop form builder
- 20+ field types
- Conditional logic
- Payment integration (Stripe)
- Response analytics

### 🎨 Slides
- Presentation editor powered by Excalidraw
- PPTX import/export
- PDF rendering
- Templates library
- Smart snapping & guides

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/venmail/vensuite.git
cd vensuite

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## 🏗️ Architecture

```
vensuite/
├── src/
│   ├── views/           # Main application views
│   │   ├── DocsEditor.vue
│   │   ├── SheetEditor.vue
│   │   ├── FormBuilder.vue
│   │   └── SlidesEditor.vue
│   ├── components/      # Reusable UI components
│   ├── store/           # Pinia state management
│   ├── composables/     # Vue composables
│   └── services/        # API services
├── public/              # Static assets
└── scripts/             # Build scripts
```

## 🔧 Configuration

Create a `.env` file:

```env
VITE_API_URL=https://api.venmail.io
VITE_STORAGE_URL=https://storage.venmail.io
VITE_SLIDES_IMPORT_ENDPOINT=/api/slides/import
```

## 🤝 Integration with Venmail

Vensuite integrates seamlessly with [Venmail](https://venmail.io) enterprise email workspace:

- **Shared authentication** - Single sign-on across all apps
- **Unified storage** - Files stored in your Venmail organization
- **Email attachments** - Create and attach docs directly from email composer
- **BYOS support** - Bring Your Own Storage (S3, R2, SFTP, WebDAV)

## 📦 Self-Hosting

### Docker

```bash
docker pull venmail/vensuite:latest
docker run -p 3000:3000 -e VITE_API_URL=https:/m.venmail.io venmail/vensuite
```

### Manual Deployment

```bash
pnpm build
pnpm preview
```

## 🛣️ Roadmap

- [ ] Real-time collaboration (WebSocket)
- [ ] Offline support (PWA)
- [ ] Mobile apps (Capacitor)
- [ ] Plugin system
- [ ] More templates

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

---

## Slide Manager (Excalidraw Slides)

The slide manager provides a PowerPoint-like experience powered by headless Excalidraw canvases. Core routes:

- `slides/new` to create a fresh deck.
- `slides/:deckId` to open an existing deck.
- `slides/t/:template` to start from a template file in `src/assets/templates/`.

### Key Components

- `src/views/SlidesEditor.vue` Orchestrates the layout using `SlidesTitleBar`, `SlidesToolbar`, `SlidesOutline`, `SlideCanvas`, and `SlidesInspector`.
- `src/store/slides.ts` is a Pinia store handling deck state, autosave, import/export, and snapping presets.
- `src/components/slides/SlideCanvas.vue` wraps Excalidraw, emitting scene updates and thumbnails.
- `src/components/slides/SlidesToolbar.vue` mirrors the docs toolbar style for slide actions.
- `src/components/slides/SlidesOutline.vue` renders slide thumbnails and ordering controls.
- `src/components/slides/SlidesInspector.vue` manages snapping settings and import triggers.

### Import & Export

- PowerPoint (`.pptx`) files post to `VITE_SLIDES_IMPORT_ENDPOINT` and convert into slide deck JSON.
- HTML files are parsed client-side into text-based scenes.
- Exports support `pdf`, `pptx`, and slide thumbnails (`images`) via the `slides/export` endpoint.

### Validation Checklist

- **Create**: Visit `slides/new`, add slides, and confirm autosave updates the deck title.
- **Template**: Open `slides/t/<template>` and ensure default slides load.
- **Import**: Use toolbar or inspector actions to import HTML/PPTX; confirm scenes populate.
- **Snapping**: Toggle grid/guides/smart snapping in the inspector and verify canvas behaviour.
- **Export**: Trigger each export type and verify downloads.
- **Thumbnail**: Confirm outline shows thumbnails after edits.
