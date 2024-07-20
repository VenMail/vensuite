<script>
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

export default {
  components: {
    NodeViewWrapper,
    NodeViewContent,
  },

  props: nodeViewProps,
}
</script>

<template>
  <NodeViewWrapper :id="node.attrs.id" class="node" :title="node.attrs.title" :group="node.attrs.group">
    <span class="font-black title" contenteditable="false">{{ node.attrs.title }}</span>
    <NodeViewContent class="content" />
  </NodeViewWrapper>
</template>

<style lang="scss">
.node > .label {
  letter-spacing: 1px;
  font-weight: bold;
  text-transform: uppercase;
}

.node > .content {
  padding-top: 4px;
  padding-bottom: 4px;
}
</style>
