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

<style scoped></style>
