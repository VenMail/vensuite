<script lang="ts">
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { reactive, ref } from 'vue'
import type { WidgetOptions } from '@/design/config'
import emitter from '@/coolmitt'

export default {
  components: {
    NodeViewWrapper,
    NodeViewContent,
  },
  props: nodeViewProps,
  setup(props: any, _ctx: any) {
    let options = reactive({
      headerHeight: 100,
      footerHeight: 100,
      bodyHeight: 350,
      bodyWidth: 700,
      bodyPadding: 5,
      SystemAttributes: {},
    })
    const openPrint = ref(false)
    const editor = reactive(props.editor)
    const node = reactive(props.node)
    const decorations = reactive(props.decorations)
    const extension = reactive(props.extension)
    if (extension.options.bodyHeight) {
      options = extension.options
    }
    const headerlist = editor.storage.PageExtension.headerData
    const footerlist = editor.storage.PageExtension.footerData
    const updateValue = (index: number, item: WidgetOptions, v: any, header: boolean) => {
      item.value = v
      if (header) {
        editor.storage.PageExtension.headerData[index] = item
      }
      else {
        editor.storage.PageExtension.footerData[index] = item
      }
    }
    const maskheight = ref(0)
    const borderBottomText = ref('1px solid')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const printSetting = ({ editor }) => {
      openPrint.value = !editor.isEditable
    }
    editor.on('update', printSetting)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    emitter.on('printSet', ({ currentNumber }) => {
      const pageNumber = node.attrs.pageNumber
      // 如果还是可编辑模式 直接返回
      if (editor.isEditable || currentNumber == pageNumber)
        return
      const pageh = options.bodyHeight + options.footerHeight + options.headerHeight
      // 当前的页面比  续打的页面 小 直接全覆盖
      if (pageNumber < currentNumber) {
        maskheight.value = pageh
      }
      // 当前的页面比  续打的页面 大 直接不管
      if (pageNumber > currentNumber) {
        maskheight.value = 0
      }
    })
    const mousedown = (e: any) => {
      if (openPrint.value) {
        const page = document.getElementById(node.attrs.id)
        if (page)
          maskheight.value = e.pageY - page.offsetTop
        // 起始打印页
        editor.storage.PrintExtension.pageId = node.attrs.id
        // 续打起始高度
        editor.storage.PrintExtension.height = maskheight.value
        // 续打页数 从第几页开始续打
        editor.storage.PrintExtension.currentNumber = node.attrs.pageNumber
        emitter.emit('printSet', editor.storage.PrintExtension)
      }
    }
    return {
      footerlist,
      headerlist,
      options,
      editor,
      node,
      decorations,
      extension,
      updateValue,
      mousedown,
      maskheight,
      openPrint,
    }
  },
}
</script>

<template>
  <NodeViewWrapper :id="node.attrs.id" oncontextmenu="return false;" class="Page text-editor relative" :style="{ width: `${options.bodyWidth}px` }" @mousedown="mousedown">
    <div class="corner-top-left" />
    <div class="corner-top-right" />
    <div class="corner-bottom-left" />
    <div class="corner-bottom-right" />
    <div class="relative header" :style="{ height: `${options.headerHeight}px`, width: '100%' }">
      <div v-for="(item, i) in headerlist" :key="i" class="absolute" :style="{ width: `${item.w}px`, height: `${item.h}px`, top: `${item.y}px`, left: `${item.x}px` }">
        <component :is="item.component" class="min-w-full min-h-full" :value="item.value" :styles="item.styles" :editor="editor" :node="node" :extension="extension" @inpuvalue="(v: any) => updateValue(i, item, v, true)" />
      </div>
    </div>
    <NodeViewContent class="PageContent" :style="{ minHeight: `${options.bodyHeight}px`, padding: `${options.bodyPadding}px` }" />
    <div class="relative footer" :style="{ height: `${options.footerHeight}px`, width: '100%' }">
      <div v-for="(item, i) in footerlist" :key="i" class="absolute" :style="{ width: `${item.w}px`, height: `${item.h}px`, top: `${item.y}px`, left: `${item.x}px` }">
        <component :is="item.component" class="min-w-full min-h-full" :value="item.value" :styles="item.styles" :editor="editor" :node="node" :extension="extension" @inpuvalue="(v: any) => updateValue(i, item, v, false)" />
      </div>
    </div>
    <div
      v-if="openPrint"
      class="absolute flex place-content-center"
      :style="{
        background: '#ffffff',
        width: '100%',
        height: `${maskheight}px`,
        top: '0px',
        left: '0px',
      }"
    />
  </NodeViewWrapper>
</template>

<style>
.header {
  border-bottom: 1px solid;
}
.footer {
  border-top: 1px solid;
}
</style>
