import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view'

export type PageSize = 'A4' | 'Letter' | { widthMM: number; heightMM: number }

export interface PaginationOptions {
  size: PageSize
  marginsMM: { top: number; right: number; bottom: number; left: number }
  // Debounce time for recalculation in ms
  debounce: number
  enabled: boolean
}

const pxPerInch = 96
const mmPerInch = 25.4
const mmToPx = (mm: number) => (mm / mmPerInch) * pxPerInch

function resolvePagePx(size: PageSize) {
  if (typeof size === 'object') {
    return { width: mmToPx(size.widthMM), height: mmToPx(size.heightMM) }
  }
  if (size === 'A4') {
    return { width: mmToPx(210), height: mmToPx(297) }
  }
  // Letter 8.5 x 11 inches
  return { width: 8.5 * pxPerInch, height: 11 * pxPerInch }
}

export const Pagination = Extension.create<PaginationOptions>({
  name: 'pagination',

  addOptions() {
    return {
      size: 'A4' as PageSize,
      marginsMM: { top: 20, right: 20, bottom: 20, left: 20 },
      debounce: 50,
      enabled: true,
    }
  },

  addProseMirrorPlugins() {
    const key = new PluginKey('pagination')
    const opts = this.options
    let decorations: DecorationSet = DecorationSet.empty
    let frameWidth = 0
    // track height if needed for future optimizations
    let rafId: number | null = null
    let resizeObserver: ResizeObserver | null = null
    let debTimer: number | null = null

    const recalc = (view: EditorView) => {
      const { width } = resolvePagePx(opts.size)
      const marginsPx = {
        top: mmToPx(opts.marginsMM.top),
        right: mmToPx(opts.marginsMM.right),
        bottom: mmToPx(opts.marginsMM.bottom),
        left: mmToPx(opts.marginsMM.left),
      }
      frameWidth = width
      const editorEl = view.dom as HTMLElement
      const contentEl = editorEl.querySelector('.ProseMirror') as HTMLElement
      if (!contentEl) {
        decorations = DecorationSet.empty
        return
      }

      // If pagination disabled (option may be toggled via external state), reset visuals and exit
      if (!opts.enabled || document.body.classList.contains('page-layout-off')) {
        contentEl.style.maxWidth = ''
        contentEl.style.margin = ''
        contentEl.style.padding = ''
        contentEl.style.background = ''
        contentEl.style.boxShadow = ''
        contentEl.style.borderRadius = ''
        decorations = DecorationSet.empty
        return
      }

      // Set visual width and padding for page look
      contentEl.style.maxWidth = `${frameWidth}px`
      contentEl.style.margin = '0 auto'
      contentEl.style.padding = `${marginsPx.top}px ${marginsPx.right}px ${marginsPx.bottom}px ${marginsPx.left}px`
      contentEl.style.background = '#fff'
      contentEl.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08), 0 10px 20px rgba(0,0,0,0.06)'
      contentEl.style.borderRadius = '4px'

      // Build decorations based on explicit pageBreak nodes only.
      // This avoids DOM-measurement issues and keeps editing stable.
      const footerPositions: { pos: number; page: number }[] = [{ pos: 0, page: 1 }]
      const breaks: number[] = []
      const doc = view.state.doc
      doc.descendants((node, pos) => {
        if ((node as any).type?.name === 'pageBreak') {
          breaks.push(pos)
        }
        return true
      })
      breaks.forEach((pos, i) => footerPositions.push({ pos, page: i + 2 }))

      const hideNumbers = document.body.classList.contains('hide-page-numbers')
      const widgets = [
        // Page footers
        ...(!hideNumbers ? footerPositions.map((fp) =>
          Decoration.widget(fp.pos, () => {
            const foot = document.createElement('div')
            foot.className = 'umo-page-footer'
            foot.textContent = `${fp.page}`
            return foot
          }, { side: 1, key: `page-footer-${fp.pos}-${fp.page}` })
        ) : []),
      ]

      decorations = DecorationSet.create(view.state.doc, widgets)
    }

    const scheduleRecalc = (view: EditorView) => {
      if (debTimer) window.clearTimeout(debTimer)
      debTimer = window.setTimeout(() => recalc(view), opts.debounce)
    }

    const plugin = new Plugin({
      key,
      state: {
        init: () => DecorationSet.empty,
        apply(tr, set: DecorationSet) {
          // If document changed or meta requests reflow
          if (tr.docChanged || tr.getMeta('pagination:reflow')) {
            return decorations.map(tr.mapping, tr.doc)
          }
          return set
        },
      },
      props: {
        decorations() {
          return decorations
        },
      },
      view(view) {
        // Initial calculation on next frame to ensure DOM is rendered
        rafId = requestAnimationFrame(() => recalc(view))
        // Recalculate on window resize
        resizeObserver = new ResizeObserver(() => scheduleRecalc(view))
        resizeObserver.observe(view.dom as HTMLElement)
        window.addEventListener('resize', () => scheduleRecalc(view))
        return {
          update: (v) => {
            // Always schedule; debounced to avoid thrash
            scheduleRecalc(v)
          },
          destroy: () => {
            if (rafId) cancelAnimationFrame(rafId)
            if (resizeObserver) resizeObserver.disconnect()
          },
        }
      },
    })
    return [plugin]
  },
})

export default Pagination
