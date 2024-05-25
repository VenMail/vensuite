<template>
  <div class="grid flex-grow card bg-base-300 rounded-box place-items-center">
    <div>
      <FileTools :editor="editor" v-if="editor"></FileTools>
    </div>
    <editor-content class="my-2" :editor="editor" />
  </div>
</template>

<script lang="ts">
import { pageContent, headerlist, footerlist, pageContentHtml } from "./content";
import { UnitConversion } from "@/extension/page/core";
import { EditorContent, Editor } from "@tiptap/vue-3";
import { onBeforeUnmount, onMounted, shallowRef } from "vue";
import { BuildRender } from "./../default";
import { CassieKit } from "@/extension";
import FileTools from "./filetools/FileTools.vue";

const unitConversion = new UnitConversion();

export default {
  components: {
    EditorContent,
    FileTools,
  },
  setup() {
    const bodyWidth = unitConversion.mmConversionPx(210);
    const pageHeight = unitConversion.mmConversionPx(297);

    const menulist = [
      { classify: "radio", label: "Single Choice", value: "radio" },
      { classify: "checkbox", label: "Multiple Choice", value: "checkbox" },
      { classify: "date", label: "Date", value: "date" },
    ];

    const editor = shallowRef<Editor>();

    onMounted(() => {
      editor.value = new Editor({
        onUpdate({ editor }) {
          // Handle update
        },
        editable: true,
        content: pageContentHtml,
        editorProps: {
          attributes: {
            class: "",
          },
        },
        injectCSS: false,
        extensions: [
          CassieKit.configure({
            textAlign: { types: ["heading", "paragraph"] },
            mention: {
              clickSuggestion: BuildRender(menulist), // Editor context menu
            },
            highlight: {
              multicolor: true,
            },
            table: {
              resizable: true,
              HTMLAttributes: {
                class: "border-collapse border border-slate-400",
              },
            },
            tableCell: {
              HTMLAttributes: {
                class: "border border-slate-300",
              },
            },
            tableHeader: {
              HTMLAttributes: {
                class: "border border-slate-300",
              },
            },
            page: {
              bodyPadding: 10,
              bodyWidth: bodyWidth,
              headerHeight: 100,
              footerHeight: 60,
              bodyHeight: pageHeight - 100,
              headerData: headerlist,
              footerData: footerlist,
              isPaging: true,
            },
            focus: false, // Selection style
            history: false, // Disable history in collaborative mode
          }),
        ],
      });

      setTimeout(() => {
        editor.value?.view.dispatch(editor.value?.state.tr.setMeta("splitPage", true));
      }, 1000);
    });

    onBeforeUnmount(() => {
      editor.value?.destroy();
    });

    return { pageContent, menulist, headerlist, footerlist, editor, bodyWidth };
  },
};
</script>

<style scoped>
.tiptap {
  table {
    border-collapse: collapse;
    table-layout: fixed;
    width: 100%;
    margin: 0;
    overflow: hidden;

    td,
    th {
      min-width: 1em;
      border: 2px solid #ced4da;
      padding: 3px 5px;
      vertical-align: top;
      box-sizing: border-box;
      position: relative;

      > * {
        margin-bottom: 0;
      }
    }

    th {
      font-weight: bold;
      text-align: left;
      background-color: #f1f3f5;
    }

    .selectedCell:after {
      z-index: 2;
      position: absolute;
      content: "";
      left: 0; right: 0; top: 0; bottom: 0;
      background: rgba(200, 200, 255, 0.4);
      pointer-events: none;
    }

    .column-resize-handle {
      position: absolute;
      right: -2px;
      top: 0;
      bottom: -2px;
      width: 4px;
      background-color: #adf;
      pointer-events: none;
    }

    p {
      margin: 0;
    }
  }
}

.tableWrapper {
  padding: 1rem 0;
  overflow-x: auto;
}

.resize-cursor {
  cursor: ew-resize;
  cursor: col-resize;
}
</style>