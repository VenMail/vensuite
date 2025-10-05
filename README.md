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
