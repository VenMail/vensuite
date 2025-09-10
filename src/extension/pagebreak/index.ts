import { Node, mergeAttributes } from '@tiptap/core'

// Simple PageBreak node for Umo Editor (Tiptap) v8 compatibility
// - Renders a non-editable horizontal rule-like separator
// - Use insert command to add page breaks
// - Printing: consumers should style `.umo-page` and `.umo-page-break` as needed

export interface PageBreakOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      insertPageBreak: () => ReturnType
    }
  }
}

export const PageBreak = Node.create<PageBreakOptions>({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  parseHTML() {
    return [{ tag: 'div[data-page-break]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({
      'data-page-break': 'true',
      'class': 'umo-page-break',
      'contenteditable': 'false'
    }, HTMLAttributes)]
  },
  addOptions() {
    return {
      HTMLAttributes: {}
    }
  },
  addCommands() {
    return {
      insertPageBreak: () => ({ chain }) => {
        return chain().insertContent({ type: this.name }).run()
      }
    }
  },
})

export default PageBreak
