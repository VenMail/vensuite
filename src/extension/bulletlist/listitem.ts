import { mergeAttributes } from '@tiptap/core'
import { ListItem } from '@tiptap/extension-list-item'
import { idAttributes } from '@/utils/id'

export const EmrListItem = ListItem.extend({
  addAttributes() {
    return idAttributes
  },
  renderHTML({ node, HTMLAttributes }) {
    if (HTMLAttributes.id) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      node.attrs.id = HTMLAttributes.id
    }
    return ['li', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
})
