<template>
  <QuillEditor v-model="editorContent" :modules="modules" handler toolbar="full" />
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import QuillCursors from 'quill-cursors';
import MagicUrl from 'quill-magic-url';
import BlotFormatter from 'quill-blot-formatter-mobile';
import BetterTable from 'quill-better-table';

export default defineComponent({
  components: {
    QuillEditor,
  },
  setup() {
    const editorContent = ref('');

    const modules = [{
      name: 'blotFormatter',  
      module: BlotFormatter, 
      options: {/* options */}
    }]
    
    // Register quill modules
    onMounted(() => {
      // Quill.register('modules/blotFormatter', BlotFormatter);
      // Quill.register('modules/cursors', QuillCursors);
      // Quill.register('modules/magicUrl', MagicUrl);
//      Quill.register('modules/better-table', BetterTable);

    });

    return { editorContent, modules };
  },
});
</script>
