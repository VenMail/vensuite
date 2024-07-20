<script lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { reactive } from 'vue'
import { footerlist, headerlist, pageContent } from './content'
import { CassieKit } from '@/extension/CassieKit'
import { DiffExtension } from '@/extension/track/DiffExtension'
import { UnitConversion } from '@/extension/page/core'
import { BuildRender } from '@/default'

const unitConversion = new UnitConversion()
export default {
  components: {
    EditorContent,
  },
  setup() {
    const w = unitConversion.mmConversionPx(210)
    const h = unitConversion.mmConversionPx(297)
    const menulist = [
      { classify: 'radio', label: '单选', value: 'radio' },
      {
        classify: 'checkbox',
        label: '多选',
        value: 'checkbox',
      },
      {
        classify: 'date',
        label: '日期',
        value: 'date',
      },
    ]
    // 编辑器实例
    const editor = useEditor({
      editorProps: {
        attributes: {
          class: 'divide-y divide-black-600',
        },
      },
      content: pageContent, // 初始化编辑器内容
      injectCSS: false,
      extensions: [
        CassieKit.configure({
          textAlign: { types: ['heading', 'paragraph'] },
          mention: {
            HTMLAttributes: {
              class: 'bg-gray-300',
            },
            clickSuggestion: BuildRender(menulist), // 编辑器右键菜单
          },
          page: {
            bodyPadding: 10,
            bodyWidth: w,
            headerHeight: 100,
            footerHeight: 60,
            bodyHeight: h,
            headerData: headerlist,
            footerData: footerlist,
          },
          focus: false,
        }),
        DiffExtension,
      ],
    })
    const menus = reactive([
      [
        {
          icon: 'save',
          text: '保存',
          title: '保存页眉页脚',
          click() {
            console.log('')
          },
        },
      ],
    ])
    return {
      editor,
      menus,
    }
  },
}
</script>

<template>
  <div class="flex place-content-center bg-gray-200">
    <EditorContent :editor="editor" class="my-2" />
  </div>
</template>

<style scoped>
.ProseMirror-focused {
}
</style>
