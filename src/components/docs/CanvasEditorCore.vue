<template>
  <div ref="containerRef" class="canvas-editor-host" :style="hostStyle" />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import type { CanvasDocPageSettings, CanvasRangeStyle } from '@/composables/useCanvasDocsEditor';
import { buildCanvasEditorOptions, extractBaseFontFromHtml, parseDocContentForCanvas } from '@/composables/useCanvasDocsEditor';
import { normalizeHtmlForCanvas } from '@/lib/normalizeHtmlForCanvas';

// canvas-editor is a vanilla JS class — dynamic import to avoid SSR issues
type CanvasEditorInstance = any;

const props = defineProps<{
  content: any;
  settings: CanvasDocPageSettings;
  editable?: boolean;
  zoom?: number;
}>();

const emit = defineEmits<{
  (e: 'ready', instance: CanvasEditorInstance): void;
  (e: 'contentChange'): void;
  (e: 'rangeStyleChange', style: CanvasRangeStyle): void;
  (e: 'pageSizeChange', count: number): void;
  (e: 'pageChange', page: number): void;
  (e: 'saved', value: any): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
let editorInstance: CanvasEditorInstance = null;

const hostStyle = computed(() => {
  const zoom = props.zoom ?? 100;
  return zoom !== 100
    ? { transformOrigin: 'top left', transform: `scale(${zoom / 100})` }
    : {};
});

async function initEditor() {
  if (!containerRef.value) return;

  // Destroy previous instance if re-initialising
  if (editorInstance) {
    try { editorInstance.destroy(); } catch {}
    editorInstance = null;
    containerRef.value.innerHTML = '';
  }

  const { default: Editor } = await import('@hufe921/canvas-editor');

  const parsed = parseDocContentForCanvas(props.content);

  // Use the document's primary font-family as the editor default font, because
  // canvas-editor's HTML parser does not read font-family from inline styles.
  const defaultFont = parsed.mode === 'html' && parsed.payload
    ? extractBaseFontFromHtml(parsed.payload) || undefined
    : undefined;

  const options = {
    ...buildCanvasEditorOptions(props.settings, defaultFont),
    mode: props.editable === false ? 'ReadOnly' : 'Edit',
  };

  // canvas-editor constructor: new Editor(container, data, options)
  // data can be IEditorData { main: IElement[] } or IElement[]
  const initialData = parsed.mode === 'value' && parsed.payload?.data
    ? parsed.payload.data
    : { main: [{ value: '' }] };

  editorInstance = new Editor(containerRef.value as HTMLDivElement, initialData, options as any);

  // Attach listeners
  editorInstance.listener.contentChange = () => {
    emit('contentChange');
  };

  editorInstance.listener.rangeStyleChange = (style: CanvasRangeStyle) => {
    emit('rangeStyleChange', style);
  };

  editorInstance.listener.pageSizeChange = (count: number) => {
    emit('pageSizeChange', count);
  };

  editorInstance.listener.intersectionPageNoChange = (page: number) => {
    emit('pageChange', page);
  };

  editorInstance.listener.saved = (value: any) => {
    emit('saved', value);
  };

  // If content is HTML (old Tiptap docs), load it via setHTML
  if (parsed.mode === 'html' && parsed.payload) {
    try {
      await nextTick();
      const normalizedHtml = normalizeHtmlForCanvas(parsed.payload);
      editorInstance.command.executeSetHTML({ main: normalizedHtml });
    } catch (err) {
      console.warn('[canvas-editor] executeSetHTML failed, starting blank', err);
    }
  }

  emit('ready', editorInstance);
}

// Re-initialise when page settings change (paper size, orientation)
watch(
  () => [props.settings.pageSize, props.settings.pageOrientation],
  async () => {
    if (!editorInstance) return;
    try {
      const { width, height } = (() => {
        const PAGE_DIM_PX: Record<string, { w: number; h: number }> = {
          a4:     { w: 794,  h: 1123 },
          a3:     { w: 1123, h: 1587 },
          letter: { w: 816,  h: 1056 },
          legal:  { w: 816,  h: 1344 },
        };
        const dim = PAGE_DIM_PX[props.settings.pageSize] ?? PAGE_DIM_PX.a4;
        return props.settings.pageOrientation === 'landscape'
          ? { width: dim.h, height: dim.w }
          : { width: dim.w, height: dim.h };
      })();
      editorInstance.command.executePaperSize({ width, height });
    } catch {}
  },
);

watch(
  () => props.settings.pageOrientation,
  async (val) => {
    if (!editorInstance) return;
    try {
      editorInstance.command.executePaperDirection(
        val === 'landscape' ? 'horizontal' : 'vertical',
      );
    } catch {}
  },
);

watch(
  () => props.settings.marginTop,
  () => syncMargins(),
);

function syncMargins() {
  if (!editorInstance) return;
  try {
    editorInstance.command.executeSetPaperMargin([
      props.settings.marginTop,
      props.settings.marginRight,
      props.settings.marginBottom,
      props.settings.marginLeft,
    ]);
  } catch {}
}

watch(() => props.editable, (val) => {
  if (!editorInstance) return;
  try {
    editorInstance.command.executeMode(val === false ? 'ReadOnly' : 'Edit');
  } catch {}
});

// Expose the raw instance for parent commands
defineExpose({
  getEditorInstance: () => editorInstance,
  reinit: initEditor,
});

onMounted(async () => {
  await nextTick();
  await initEditor();
});

onUnmounted(() => {
  if (editorInstance) {
    try { editorInstance.destroy(); } catch {}
    editorInstance = null;
  }
});
</script>

<style scoped>
.canvas-editor-host {
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* canvas-editor renders into a #editor div inside the host */
:deep(#editor) {
  display: block !important;
}
</style>
