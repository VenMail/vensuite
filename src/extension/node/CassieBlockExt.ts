import { Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { CASSIE_BLOCK_EXTEND } from '../nodeNames'
import CassieBlockExtComponet from '@/extension/node/CassieBlockExtComponet.vue'
import { idAttributes } from '@/utils/id'

export const CassieBlockExt = Node.create({
  name: `${CASSIE_BLOCK_EXTEND}`,
  group: 'block',
  isolating: true,
  content: 'block*',
  addAttributes() {
    return idAttributes
  },
  parseHTML() {
    return [
      {
        tag: 'node-extend',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    if (HTMLAttributes.id) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      node.attrs.id = HTMLAttributes.id
    }
    return ['node-extend', HTMLAttributes, 0]
  },
  addNodeView() {
    return VueNodeViewRenderer(CassieBlockExtComponet)
  },
})
