<script lang="ts">
import { defineComponent } from 'vue'
import Bar from 'vue-file-toolbar-menu'
import { Editor } from '@tiptap/vue-3'
import { saveAs } from 'file-saver'

import * as printJS from 'print-js'
import { defaultDocxSerializer, writeDocxForBlob } from './../../docx'

declare type Level = 1 | 2 | 3 | 4 | 5 | 6

export default defineComponent({
  components: { Bar },
  props: {
    editor: {
      type: Editor,
      required: true,
    },
  },
  data() {
    return {
      opts: {
        getImageBuffer(src: string) {
          return Buffer.from(src)
        },
      },

      color: 'rgb(74, 238, 164)',
      font: 'Avenir',
      fontValue: 'Avenir, sans-serif',
      heading: 'Normal',
      headingValue: 1 as Level,
      theme: 'default',
      fontList: [
        { label: 'Arial', value: 'Arial, sans-serif' },
        { label: 'Arial Black', value: 'Arial Black, sans-serif' },
        { label: 'Avenir', value: 'Avenir, sans-serif' },
        { label: 'Verdana', value: 'Verdana, sans-serif' },
        { label: 'Tahoma', value: 'Tahoma, sans-serif' },
        { label: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
        { label: 'Impact', value: 'Impact, sans-serif' },
        { label: 'Times New Roman', value: 'Times New Roman, serif' },
        { label: 'Georgia', value: 'Georgia, serif' },
        { label: 'Garamond', value: 'Garamond, serif' },
        { label: 'Courier New', value: 'Courier New, monospace' },
        { label: 'Brush Script MT', value: 'Brush Script MT, cursive' },
        { label: 'Lucida Sans', value: 'Lucida Sans, sans-serif' },
        { label: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
        { label: 'Palatino Linotype', value: 'Palatino Linotype, serif' },
        { label: 'Lucida Console', value: 'Lucida Console, monospace' },
      ],
      headingList: [
        { value: 0, label: 'Normal text' },
        { value: 1, label: 'Heading 1' },
        { value: 2, label: 'Heading 2' },
        { value: 3, label: 'Heading 3' },
        { value: 4, label: 'Heading 4' },
        { value: 5, label: 'Heading 5' },
        { value: 6, label: 'Heading 6' },
      ],
      editMode: true,
      check1: false,
    }
  },
  computed: {
    barsContent() {
      return [
        [
          {
            icon: 'undo',
            title: 'Undo',
            click: () => {
              this.editor.chain().focus().undo().run()
            },
          },
          {
            icon: 'redo',
            title: 'Redo',
            click: () => {
              this.editor.chain().focus().redo().run()
            },
          },
          {
            icon: 'print',
            title: 'Print',
            click: () => {
              let pageId = this.editor.storage.PrintExtension.pageId
              if (!pageId) {
                pageId = this.editor.state.doc.firstChild?.attrs.id
              }
              printJS({
                printable: pageId,
                type: 'html',
                targetStyles: ['*'],
                style: `@page {margin:0 10mm};`,
              })
            },
          },
          {
            icon: 'save',
            title: 'Save As',
            click: () => {
              const doc = this.editor?.state.doc
              if (doc) {
                const wordDocument = defaultDocxSerializer.serialize(doc, this.opts)
                writeDocxForBlob(wordDocument, (blob) => {
                  console.log(blob)
                  saveAs(blob, 'example.docx')
                  console.log('Document created successfully')
                })
              }
            },
          },
          { is: 'separator' },
          {
            html: `<div class="ellipsis" style="width: 80px; font-size: 95%;">${this.font}</div>`,
            title: 'Font',
            chevron: true,
            menu: this.fontMenu,
            menu_height: 200,
          },
          {
            html: `<div class="ellipsis" style="width: 80px; font-size: 95%;">${this.heading}</div>`,
            title: 'Heading',
            chevron: true,
            menu: this.headingMenu,
            menu_height: 200,
          },
          {
            icon: 'format_align_left',
            title: 'Align Left',
            click: () => {
              this.editor.chain().focus().setTextAlign('left').run()
            },
          },
          {
            icon: 'format_align_center',
            title: 'Center',
            click: () => {
              this.editor.chain().focus().setTextAlign('center').run()
            },
          },
          {
            icon: 'format_align_right',
            title: 'Align Right',
            click: () => {
              this.editor.chain().focus().setTextAlign('right').run()
            },
          },
          {
            icon: 'format_align_justify',
            title: 'Justify',
            click: () => {
              this.editor.chain().focus().setTextAlign('justify').run()
            },
          },
          { is: 'separator' },
          {
            icon: 'format_bold',
            title: 'Bold',
            click: () => {
              this.editor.chain().focus().toggleBold().run()
            },
          },
          {
            icon: 'format_italic',
            title: 'Italic',
            click: () => {
              this.editor.chain().focus().toggleItalic().run()
            },
          },
          {
            icon: 'format_underline',
            title: 'Underline',
            click: () => {
              this.editor.chain().focus().toggleUnderline().run()
            },
          },
          {
            icon: 'format_strikethrough',
            title: 'Strikethrough',
            click: () => {
              this.editor.chain().focus().toggleStrike().run()
            },
          },
          {
            icon: 'superscript',
            title: 'Superscript',
            click: () => {
              this.editor.chain().focus().toggleSuperscript().run()
            },
          },
          {
            icon: 'subscript',
            title: 'Subscript',
            click: () => {
              this.editor.chain().focus().toggleSubscript().run()
            },
          },
          { is: 'separator' },
          {
            icon: 'format_list_bulleted',
            title: 'Bullet List',
            click: () => {
              this.editor.chain().focus().toggleBulletList().run()
            },
          },
          {
            icon: 'format_list_numbered',
            title: 'Numbered List',
            click: () => {
              this.editor.chain().focus().toggleOrderedList().run()
            },
          },
          {
            icon: 'format_quote',
            title: 'Blockquote',
            click: () => {
              this.editor.chain().focus().toggleBlockquote().run()
            },
          },
          {
            icon: 'format_indent_increase',
            title: 'Increase Indent',
            click: () => {
              this.editor.chain().focus().indent().run()
            },
          },
          {
            icon: 'format_indent_decrease',
            title: 'Decrease Indent',
            click: () => {
              this.editor.chain().focus().outdent().run()
            },
          },
          { is: 'separator' },
          {
            icon: 'link',
            title: 'Add Link',
            click: () => {
              const url = window.prompt('Enter URL')
              if (url) {
                this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
              }
            },
          },
          {
            icon: 'link_off',
            title: 'Remove Link',
            click: () => {
              this.editor.chain().focus().unsetLink().run()
            },
          },
        ],
      ]
    },
    fontMenu() {
      return this.fontList.map((font) => {
        return {
          html: `<span class="ellipsis" style="font-family:${font.value}">${font.label}</span>`,
          icon: (this.theme != 'default' && this.fontValue == font.value) ? 'check' : false,
          active: (this.font == font.value),
          height: 20,
          click: () => {
            this.font = font.label
            this.fontValue = font.value
            this.editor.chain().focus().setFontFamily(this.fontValue).run()
          },
        }
      })
    },
    headingMenu() {
      return this.headingList.map((heading) => {
        return {
          html: `<span class="ellipsis">${heading.label}</span>`,
          icon: (this.theme != 'default' && this.headingValue == heading.value) ? 'check' : false,
          active: (this.headingValue == heading.value),
          height: 20,
          click: () => {
            this.heading = heading.label
            this.headingValue = heading.value as Level
            if (heading.value == 0) {
              const selectedLevel = this.editor?.getAttributes('heading').level
              return this.editor?.chain().focus().toggleHeading({ level: selectedLevel }).run()
            }
            else {
              return this.editor?.chain().focus().setHeading({ level: this.headingValue }).run()
            }
          },
        }
      })
    },
  },
})
</script>

<template>
  <div class="main">
    <div class="bars">
      <Bar v-for="(content, index) in barsContent" :key="`bar-${index}`" :content="content" />
    </div>
  </div>
</template>

<style scoped>
body {
  box-shadow: none;
}

::selection {
  background-color: rgb(186, 212, 253);
}

:root {
  --demo-font-color: #222;
  --demo-bars-bkg: rgb(255, 255, 255);
  --demo-bars-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15);
  --demo-bars-padding: 5px;
  --demo-bars-border-radius: 1px;
  --demo-text-bkg-color: white;
  --demo-text-box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15);
  --bar-font-color: rgb(32, 33, 36);
  --bar-font-family: Roboto, RobotoDraft, Helvetica, Arial, sans-serif;
  --bar-font-size: 15px;
  --bar-font-weight: 500;
  --bar-letter-spacing: 0.2px;
  --bar-padding: 3px;
  --bar-button-icon-size: 20px;
  --bar-button-padding: 4px 6px;
  --bar-button-radius: 4px;
  --bar-button-hover-bkg: rgb(241, 243, 244);
  --bar-button-active-color: rgb(26, 115, 232);
  --bar-button-active-bkg: rgb(232, 240, 254);
  --bar-button-open-color: rgb(32, 33, 36);
  --bar-button-open-bkg: rgb(232, 240, 254);
  --bar-menu-bkg: white;
  --bar-menu-border-radius: 0 0 3px 3px;
  --bar-menu-item-chevron-margin: 0;
  --bar-menu-item-hover-bkg: rgb(241, 243, 244);
  --bar-menu-item-padding: 5px 8px 5px 35px;
  --bar-menu-item-icon-size: 15px;
  --bar-menu-item-icon-margin: 0 9px 0 -25px;
  --bar-menu-padding: 6px 1px;
  --bar-menu-shadow: 0 2px 6px 2px rgba(60, 64, 67, 0.15);
  --bar-menu-separator-height: 1px;
  --bar-menu-separator-margin: 5px 0 5px 34px;
  --bar-menu-separator-color: rgb(227, 229, 233);
  --bar-separator-color: rgb(218, 220, 224);
  --bar-separator-width: 1px;
  --bar-sub-menu-border-radius: 3px;
}

.bars > .bar:first-child {
  border-bottom: 1px solid rgb(218, 220, 224);
  margin-bottom: 3px;
}
</style>