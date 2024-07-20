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
  <NodeViewWrapper :id="node.attrs.id">
    <NodeViewContent class="content" />
  </NodeViewWrapper>
</template>

<style>
.content {
  padding-top: 4px;
  padding-bottom: 4px;
}
</style>
