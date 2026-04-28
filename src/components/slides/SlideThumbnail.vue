<template>
  <div
    class="avthumb"
    :class="{ 'avthumb--active': active }"
    @click="$emit('click')"
    @contextmenu.prevent="openMenu"
  >
    <img v-if="dataUrl" :src="dataUrl" class="avthumb__img" alt="" draggable="false" />
    <div v-else class="avthumb__blank">
      <div v-if="loading" class="avthumb__spin" />
      <span v-else class="avthumb__num">{{ index + 1 }}</span>
    </div>
    <span class="avthumb__label">{{ index + 1 }}</span>
  </div>

  <Teleport to="body">
    <div v-if="menuOpen" class="avthumb-ctx-bd" @click="menuOpen = false" @contextmenu.prevent="menuOpen = false" />
    <div v-if="menuOpen" class="avthumb-ctx" :style="{ top: menuY + 'px', left: menuX + 'px' }">
      <button class="avthumb-ctx__item" @click="act('duplicate')">Duplicate</button>
      <button class="avthumb-ctx__item" :disabled="!canDelete" @click="act('delete')">Delete</button>
      <div class="avthumb-ctx__sep" />
      <button class="avthumb-ctx__item" :disabled="index === 0" @click="act('move-up')">Move up</button>
      <button class="avthumb-ctx__item" :disabled="isLast" @click="act('move-down')">Move down</button>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import type { AvnacDocumentV1 } from '@avnac/lib/avnac-document'

const props = defineProps<{
  doc: AvnacDocumentV1
  index: number
  active: boolean
  persistId?: string
  canDelete?: boolean
  isLast?: boolean
}>()

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'duplicate'): void
  (e: 'delete'): void
  (e: 'move-up'): void
  (e: 'move-down'): void
}>()

const dataUrl = ref<string | null>(null)
const loading = ref(false)
const menuOpen = ref(false)
const menuX = ref(0)
const menuY = ref(0)

let renderVersion = 0
let debTimer: ReturnType<typeof setTimeout> | null = null

async function renderPreview() {
  loading.value = true
  const v = ++renderVersion
  try {
    const { renderAvnacDocumentPreviewDataUrl } = await import('@avnac/lib/avnac-document-preview')
    const dpr = Math.ceil(window.devicePixelRatio || 1)
    const url = await renderAvnacDocumentPreviewDataUrl(
      props.doc,
      props.persistId ?? 'preview',
      { maxCssPx: 160 * dpr },
    )
    if (v === renderVersion) dataUrl.value = url
  } catch {
    /* ignore */
  } finally {
    if (v === renderVersion) loading.value = false
  }
}

function schedule() {
  if (debTimer) clearTimeout(debTimer)
  debTimer = setTimeout(renderPreview, 500)
}

watch(() => props.doc, schedule)
onMounted(renderPreview)
onBeforeUnmount(() => {
  if (debTimer) clearTimeout(debTimer)
  renderVersion++
})

function openMenu(e: MouseEvent) {
  menuX.value = e.clientX
  menuY.value = e.clientY
  menuOpen.value = true
}

function act(ev: 'duplicate' | 'delete' | 'move-up' | 'move-down') {
  menuOpen.value = false
  if (ev === 'duplicate') emit('duplicate')
  else if (ev === 'delete') emit('delete')
  else if (ev === 'move-up') emit('move-up')
  else emit('move-down')
}
</script>

<style scoped>
.avthumb {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 6px;
  border: 2px solid transparent;
  background: var(--bg-subtle, #f9f9f9);
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.12s;
  flex-shrink: 0;
}

.avthumb:hover { border-color: var(--accent, #6366f1); }
.avthumb--active {
  border-color: var(--accent, #6366f1);
  background: var(--accent-subtle, #eef2ff);
}

.avthumb__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avthumb__blank {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avthumb__spin {
  width: 14px;
  height: 14px;
  border: 2px solid #e4e4e7;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: avthumb-spin 0.7s linear infinite;
}

@keyframes avthumb-spin { to { transform: rotate(360deg); } }

.avthumb__num {
  font-size: 11px;
  font-weight: 600;
  color: var(--fg-muted, #71717a);
}

.avthumb__label {
  position: absolute;
  bottom: 2px;
  left: 3px;
  font-size: 9px;
  font-weight: 600;
  color: rgba(0,0,0,0.4);
  line-height: 1;
  pointer-events: none;
}
</style>

<style>
.avthumb-ctx-bd {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

.avthumb-ctx {
  position: fixed;
  z-index: 9999;
  min-width: 160px;
  background: #fff;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  padding: 4px;
  display: flex;
  flex-direction: column;
}

.avthumb-ctx__item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 7px 12px;
  border: none;
  background: transparent;
  border-radius: 5px;
  font-size: 13px;
  color: #18181b;
  cursor: pointer;
}

.avthumb-ctx__item:hover:not(:disabled) { background: #f4f4f5; }
.avthumb-ctx__item:disabled { color: #a1a1aa; cursor: not-allowed; }

.avthumb-ctx__sep {
  height: 1px;
  background: #e4e4e7;
  margin: 3px 4px;
}
</style>
