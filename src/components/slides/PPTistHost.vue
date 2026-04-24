<template>
  <div class="pptist-host">
    <Screen v-if="screening" />
    <Editor v-else-if="ready" />
    <div v-else class="pptist-loading">
      <div class="pptist-loading__spinner" />
      <span>Loading editor…</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onBeforeUnmount, provide } from 'vue'
import { storeToRefs } from 'pinia'
import { nanoid } from 'nanoid'
import { I18nInjectionKey } from 'vue-i18n'

import { useMainStore, useScreenStore, useSnapshotStore, useSlidesStore } from '@pptist/store'
import { deleteDiscardedDB } from '@pptist/utils/database'
import { LOCALSTORAGE_KEY_DISCARDED_DB } from '@pptist/configs/storage'
import { i18n } from '@pptist/i18n'
import Editor from '@pptist/views/Editor/index.vue'
import Screen from '@pptist/views/Screen/index.vue'
import type { Slide, SlideTheme } from '@pptist/types/slides'

// Provide PPTist's i18n instance scoped to this component tree.
// This makes useI18n() work inside PPTist Editor/Screen without touching the global app.
;(i18n.global.locale as any).value = 'en'
provide(I18nInjectionKey, i18n)

interface Props {
  initialSlides?: Slide[]
  initialTheme?: Partial<SlideTheme>
  viewportSize?: number
  viewportRatio?: number
}

const props = withDefaults(defineProps<Props>(), {
  initialSlides: () => [],
  viewportSize: 1000,
  viewportRatio: 0.5625,
})

const emit = defineEmits<{
  (e: 'change', slides: Slide[]): void
  (e: 'ready'): void
}>()

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const snapshotStore = useSnapshotStore()
const screenStore = useScreenStore()

const { databaseId } = storeToRefs(mainStore)
const { slides } = storeToRefs(slidesStore)
const { screening } = storeToRefs(screenStore)

const ready = ref(false)
let changeTimer: ReturnType<typeof setTimeout> | null = null

function markDbDiscarded() {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY_DISCARDED_DB)
    const list: string[] = raw ? JSON.parse(raw) : []
    list.push(databaseId.value)
    localStorage.setItem(LOCALSTORAGE_KEY_DISCARDED_DB, JSON.stringify(list))
  }
  catch { /* non-critical */ }
}

onMounted(async () => {
  await deleteDiscardedDB()

  slidesStore.setViewportSize(props.viewportSize)
  slidesStore.setViewportRatio(props.viewportRatio)

  const initialSlides: Slide[] = props.initialSlides?.length
    ? props.initialSlides
    : [{ id: nanoid(10), elements: [], background: { type: 'solid', color: '#ffffff' } }]

  if (props.initialTheme) slidesStore.setTheme(props.initialTheme as SlideTheme)
  slidesStore.setSlides(initialSlides)

  await snapshotStore.initSnapshotDatabase()

  ready.value = true
  emit('ready')

  window.addEventListener('beforeunload', markDbDiscarded)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', markDbDiscarded)
  if (changeTimer) clearTimeout(changeTimer)
})

watch(
  slides,
  () => {
    if (!ready.value) return
    if (changeTimer) clearTimeout(changeTimer)
    changeTimer = setTimeout(() => {
      emit('change', JSON.parse(JSON.stringify(slides.value)))
    }, 2000)
  },
  { deep: true },
)

defineExpose({
  getSlides: (): Slide[] => JSON.parse(JSON.stringify(slides.value)),
  getTheme: (): SlideTheme => ({ ...slidesStore.theme }),
  setSlides: (s: Slide[]) => slidesStore.setSlides(s),
  setTheme: (t: Partial<SlideTheme>) => slidesStore.setTheme(t as SlideTheme),
})
</script>

<style scoped>
.pptist-host {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Hide pptist's built-in EditorHeader — SlidesEditor.vue provides its own */
:deep(.layout-header) {
  display: none !important;
}
/* layout-content normally uses calc(100% - 40px) to account for the header.
   Since we hide the header, override to fill the full height. */
:deep(.pptist-editor .layout-content) {
  height: 100% !important;
}
:deep(.layout-content-center) {
  height: 100%;
}

.pptist-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #6b7280;
  font-size: 14px;
}

.pptist-loading__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #d14424;
  border-radius: 50%;
  animation: pptist-spin 0.7s linear infinite;
}

@keyframes pptist-spin {
  to { transform: rotate(360deg); }
}
</style>

<!-- Third-party CSS required by PPTist (not scoped — must be global) -->
<style>
@import 'prosemirror-view/style/prosemirror.css';
@import 'animate.css';
</style>

<!-- PPTist base styles — global so they apply to dynamically mounted elements -->
<style lang="scss">
@import '@pptist/assets/styles/global.scss';
@import '@pptist/assets/styles/font.scss';
</style>
