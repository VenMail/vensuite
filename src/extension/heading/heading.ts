import { mergeAttributes } from '@tiptap/core'
import { Heading } from '@tiptap/extension-heading'
import { getId } from '@/utils/id'

export const EmrHeading = Heading.extend({
  group: 'block',
  content: 'inline*',
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        parseHTML: element => element.getAttribute('id'),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return { id: getId() }
          }
          return {
            id: attributes.id,
          }
        },
      },
      extend: {
        default: 'false',
      },
      group: {
        default: null,
        parseHTML: element => element.getAttribute('data-group'),
        renderHTML: (attributes) => {
          if (!attributes.group) {
            return {}
          }
          return {
            'data-group': attributes.group,
          }
        },
      },
    }
  },
  renderHTML({ node, HTMLAttributes }) {
    if (HTMLAttributes.id) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      node.attrs.id = HTMLAttributes.id
    }
    const hasLevel = this.options.levels.includes(node.attrs.level)
    const level = hasLevel ? node.attrs.level : this.options.levels[0]

    return [`h${level}`, mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
  addKeyboardShortcuts() {
    return {
      'Mod-Alt-0': () => this.editor.commands.setParagraph(),
    }
  },
})
