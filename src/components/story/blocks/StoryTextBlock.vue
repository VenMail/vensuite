<script setup lang="ts">
import { computed, watch, nextTick, onBeforeUnmount } from 'vue';
import type { StoryTextContent } from '@/types/story';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';

const props = defineProps<{
  content: StoryTextContent;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  'update:content': [payload: Partial<StoryTextContent>];
  'stop-editing': [];
}>();

const textStyles = computed(() => ({
  fontSize: props.content.fontSize ? `${props.content.fontSize}px` : undefined,
  fontFamily: props.content.fontFamily || undefined,
  fontWeight: props.content.fontWeight || undefined,
  color: props.content.color || undefined,
  textAlign: props.content.textAlign || undefined,
  lineHeight: props.content.lineHeight ? String(props.content.lineHeight) : undefined,
  letterSpacing: props.content.letterSpacing != null ? `${props.content.letterSpacing}px` : undefined,
}));

const editor = useEditor({
  content: props.content.html || '',
  editable: props.isEditing,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
    }),
    TextStyle,
    Color,
    FontFamily,
  ],
  onUpdate({ editor: ed }) {
    emit('update:content', { html: ed.getHTML() });
  },
});

watch(
  () => props.isEditing,
  (editing) => {
    editor.value?.setEditable(editing);
    if (editing) {
      // Focus the Tiptap editor when entering edit mode
      nextTick(() => {
        editor.value?.commands.focus('end');
      });
    }
  },
);

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    emit('stop-editing');
  }
}

watch(
  () => props.content.html,
  (newHtml) => {
    if (!editor.value) return;
    const current = editor.value.getHTML();
    if (current !== newHtml) {
      editor.value.commands.setContent(newHtml || '', false);
    }
  },
);

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<template>
  <div class="story-text-block w-full h-full" @keydown="handleKeydown">
    <!-- Static render when not editing -->
    <div
      v-if="!isEditing"
      class="w-full h-full"
      :style="textStyles"
      v-html="content.html"
    />

    <!-- Tiptap editor when editing -->
    <EditorContent
      v-else
      :editor="editor"
      class="story-text-editor w-full h-full"
      :style="textStyles"
    />
  </div>
</template>

<style scoped>
.story-text-block {
  min-height: 1em;
  word-break: break-word;
}

.story-text-editor :deep(.tiptap) {
  outline: none;
  border: none;
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
}

.story-text-editor :deep(.tiptap p) {
  margin: 0;
}

.story-text-editor :deep(.tiptap:focus) {
  outline: none;
}

.story-text-editor :deep(.tiptap h1),
.story-text-editor :deep(.tiptap h2),
.story-text-editor :deep(.tiptap h3),
.story-text-editor :deep(.tiptap h4) {
  margin: 0;
  line-height: 1.2;
}

.story-text-editor :deep(.tiptap a) {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: currentColor;
  text-underline-offset: 2px;
}
</style>
