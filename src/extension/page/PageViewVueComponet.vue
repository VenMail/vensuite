<script lang="ts">
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

export default {
  components: {
    NodeViewWrapper,
    NodeViewContent,
  },
  props: nodeViewProps,

  setup({ extension, node }: any, _ctx: any) {
    const { options } = extension
    return {
      node,
      options,
      extension,
    }
  },
}
</script>

<template>
  <NodeViewWrapper :id="node.attrs.id" oncontextmenu="return false;" class="Page text-editor relative" :style="{ width: `${options.bodyWidth}px` }">
    <div class="corner-top-left" />
    <div class="corner-top-right" />
    <div class="corner-bottom-left" />
    <div class="corner-bottom-right" />
    <NodeViewContent class="PageContent" :style="{ minHeight: `${options.bodyHeight}px`, padding: `${options.bodyPadding}px` }" />
  </NodeViewWrapper>
</template>
