# Vensuite - Open Source Productivity Suite

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/VenMail/vensuite?style=social)](https://github.com/VenMail/vensuite)

**Google Docs, Sheets, Forms & Slides alternatives — fully open source.**

Vensuite is a complete productivity suite that you can self-host or use via our managed service at [https://venia.cloud](https://venia.cloud). Part of the [Venmail](https://venmail.io) enterprise email workspace.

> **⚠️ Work in Progress**  
> Vensuite is currently under active development. Features may be incomplete, APIs may change, and some functionality may be unstable.

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
- AVNAC canvas editor
- PPTX import/export
- Slide previews
- Professional template library
- Smart objects, pen, shapes, snapping, and guides

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/VenMail/vensuite.git
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
VITE_API_BASE_URL=https://m.venmail.io/api/v1
VITE_AUTH_URL=https://m.venmail.io/auth/oauth
SOCKET_BASE_URL=wss://w.venmail.io:8443
```

## 🤝 Integration with Venmail

Vensuite is originally built to work with [Venmail](https://venmail.io) enterprise email workspace:

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

- [x] Real-time collaboration (WebSocket)
- [ ] Offline support (PWA)
- [ ] Plugin system
- [ ] More templates

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Vensuite is built upon these essential open-source projects that make our productivity suite possible:

### 🎨 Core Framework
- **[Vue.js](https://vuejs.org/)** - The progressive JavaScript framework powering our entire application
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development experience
- **[Vite](https://vitejs.dev/)** - Lightning-fast build tool and development server
- **[Pinia](https://pinia.vuejs.org/)** - State management for Vue.js

### 🎨 UI & Styling
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Headless UI](https://headlessui.com/)** - Accessible UI components
- **[Iconify](https://iconify.design/)** - Unified icon framework

### 📝 Document Editing
- **[TipTap](https://tiptap.dev/)** - Rich text editor for documents
- **[ProseMirror](https://prosemirror.net/)** - Underlying rich text editor framework

### 📊 Spreadsheets
- **[Univer](https://univer.ai/)** - Spreadsheet engine bringing Excel functionality to web

### 🎨 Slides
- **AVNAC Vue** - Canvas-first presentation editor with PowerPoint-style slide tooling

### 🔄 Real-time Collaboration
- **[Y.js](https://github.com/yjs/yjs)** - CRDT for real-time collaboration
- **[uWebSockets.js](https://github.com/uWebSockets/uWebSockets.js)** - High-performance WebSocket server

### 🗃️ Data & Storage
- **[Axios](https://axios-http.com/)** - HTTP client for API requests
- **[Memcached](https://www.memcached.org/)** - Memory caching for real-time data

### 🧪 Testing
- **[Vitest](https://vitest.dev/)** - Testing framework powered by Vite
- **[Playwright](https://playwright.dev/)** - End-to-end testing

### 📦 Build & Deploy
- **[Docker](https://www.docker.com/)** - Container platform for deployments

### 🌐 Internationalization
- **[VenMail Localizer](https://github.com/VenMail/localizer)** - AI-powered localization and translation system

---

**Deep gratitude to the maintainers and contributors of these essential projects.** 🙏

## 🙏 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

---

## 🎨 Slides (AVNAC)

The slide editor provides a canvas-first presentation experience powered by AVNAC. Core routes:

- `slides/new` to create a fresh deck.
- `slides/:deckId` to open an existing deck.
- `slides/t/:template` redirects to the AVNAC editor flow.

### Features:
- **Real-time collaboration** - Edit slides together with Y.js CRDT synchronization
- **Canvas editing** - Edit text, shapes, images, pen strokes, diagrams, and infographics directly
- **PPTX import/export** - Import and export PowerPoint files from the AVNAC editor
- **Slide previews** - Generate deck thumbnails from AVNAC slide documents
- **Templates library** - Professional AVNAC document templates for common use cases
- **Smart objects** - Insert timelines, funnels, pyramids, cycles, matrices, flowcharts, and org charts
- **Canvas sizing** - Switch between 16:9, 4:3, 1:1, portrait, and A4 slide sizes

### Key Components

- `src/views/SlidesEditorV2.vue` - Main AVNAC editor route and autosave shell
- `src/components/slides/AvnacHost.vue` - AVNAC canvas host, slide strip, tools, import/export, and presenter
- `src/components/slides/SlidesTopBar.vue` - PowerPoint-style menu bar and deck actions
- `src/components/slides/SlideThumbnail.vue` - AVNAC slide preview renderer
- `src/utils/avnacSlideTemplates.ts` - AVNAC-native deck template generator

### Import & Export

- **PowerPoint Import** - Upload `.pptx` files into the AVNAC editor
- **PowerPoint Export** - Download AVNAC decks as `.pptx`
- **Template System** - Generate editable AVNAC slide documents from template presets

### Validation Checklist

- **Create**: Visit `slides/new`, add slides, and confirm autosave updates the deck title
- **Templates**: Create a deck from the Slides page template picker and ensure editable AVNAC slides load
- **Import**: Use the File menu to import PPTX files; confirm slide content converts properly
- **Smart Objects**: Use the Insert menu or right rail to insert diagrams and infographics
- **Export**: Trigger PDF and PPTX exports; verify file downloads
- **Thumbnails**: Confirm slide strip and deck list previews update after edits
- **Responsive**: Test slide editor on different screen sizes
