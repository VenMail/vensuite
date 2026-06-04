<template>
  <div class="stb">
    <!-- Row 1: main bar -->
    <div class="stb-main">
      <div class="stb-main__left">
        <button class="stb-icon-btn" title="Back" @click="$emit('back')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="stb-logo" title="VenMail">
          <img src="/manifest-icon-512.maskable.png" alt="VenMail" class="stb-logo__img" />
        </div>
        <div class="stb-title-block">
          <span
            ref="titleEl"
            class="stb-title"
            :contenteditable="!props.readOnly"
            spellcheck="false"
            @blur="onTitleBlur"
            @keydown.enter.prevent="(titleEl as HTMLElement)?.blur()"
          />
          <span class="stb-status" :class="statusClass">{{ statusText }}</span>
        </div>
      </div>
      <div class="stb-main__right">
        <button v-if="props.showShare" class="stb-btn stb-btn--outline" @click="$emit('share')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share
        </button>
        <button v-if="props.showChat" class="stb-btn stb-btn--outline relative" @click="$emit('toggle-chat')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          Chat
          <span v-if="(props.unreadCount ?? 0) > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {{ props.unreadCount }}
          </span>
        </button>
        <button class="stb-btn stb-btn--outline" :disabled="props.isSaving || props.readOnly" @click="$emit('save')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Save
        </button>
        <button class="stb-btn stb-btn--primary" @click="$emit('present')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Present
        </button>
      </div>
    </div>

    <!-- Row 2: menu bar -->
    <div class="stb-menubar">
      <button
        v-for="(m, i) in MENUS"
        :key="m.id"
        :ref="(el) => { if (el) triggerEls[i] = el as HTMLButtonElement }"
        class="stb-menubar__item"
        :class="{ 'stb-menubar__item--active': activeMenu === m.id }"
        @click="toggleMenu(m.id, i)"
        @mouseenter="hoverMenu(m.id, i)"
      >{{ m.label }}</button>
    </div>
  </div>

  <!-- Dropdown + backdrop (teleported to body) -->
  <Teleport to="body">
    <div v-if="activeMenu" class="stb-bd" @click="closeMenu" />
    <div
      v-if="activeMenu"
      class="stb-dd"
      :style="{ top: ddY + 'px', left: ddX + 'px' }"
      @mouseenter="ddHovered = true"
      @mouseleave="ddHovered = false"
    >
      <template v-for="item in currentItems" :key="'sep' in item ? 'sep-' + Math.random() : item.id">
        <div v-if="'sep' in item" class="stb-dd__sep" />
        <button
          v-else
          class="stb-dd__item"
          @click="handleAction(item.id)"
        >
          <span class="stb-dd__label">{{ item.label }}</span>
          <span v-if="item.shortcut" class="stb-dd__shortcut">{{ item.shortcut }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  title: string
  isSaving?: boolean
  hasUnsaved?: boolean
  showShare?: boolean
  showChat?: boolean
  unreadCount?: number
  readOnly?: boolean
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'title-change', title: string): void
  (e: 'save'): void
  (e: 'present'): void
  (e: 'share'): void
  (e: 'toggle-chat'): void
  (e: 'new-deck'): void
  (e: 'import-pptx'): void
  (e: 'export-pptx'): void
  (e: 'select-all'): void
  (e: 'zoom', pct: number): void
  (e: 'fit'): void
  (e: 'canvas-size', size: { width: number; height: number; label: string }): void
  (e: 'add-text'): void
  (e: 'add-image'): void
  (e: 'add-shape', kind: string): void
  (e: 'insert-smart-object', kind: string): void
  (e: 'add-slide'): void
  (e: 'duplicate-slide'): void
  (e: 'delete-slide'): void
  (e: 'toggle-notes'): void
  (e: 'undo'): void
  (e: 'redo'): void
}>()

// ─── Title ──────────────────────────────────────────────────────────────────
const titleEl = ref<HTMLElement | null>(null)

onMounted(() => {
  if (titleEl.value) titleEl.value.innerText = props.title
})

watch(() => props.title, (v) => {
  if (titleEl.value && titleEl.value.innerText !== v) titleEl.value.innerText = v
})

function onTitleBlur() {
  if (props.readOnly) return
  const v = titleEl.value?.innerText.trim() || 'Untitled Presentation'
  emit('title-change', v)
}

function focusTitle() {
  titleEl.value?.focus()
  const sel = window.getSelection()
  const range = document.createRange()
  if (titleEl.value) {
    range.selectNodeContents(titleEl.value)
    sel?.removeAllRanges()
    sel?.addRange(range)
  }
}

// ─── Status ─────────────────────────────────────────────────────────────────
const statusText = computed(() => {
  if (props.isSaving) return 'Saving…'
  if (props.hasUnsaved) return 'Unsaved'
  return 'Saved'
})

const statusClass = computed(() => ({
  'stb-status--saving': props.isSaving,
  'stb-status--unsaved': props.hasUnsaved && !props.isSaving,
  'stb-status--saved': !props.isSaving && !props.hasUnsaved,
}))

// ─── Menu definitions ────────────────────────────────────────────────────────
type MenuSep = { sep: true }
type MenuAction = { id: string; label: string; shortcut?: string }
type MenuItem = MenuSep | MenuAction

const MENUS: Array<{ id: string; label: string; items: MenuItem[] }> = [
  {
    id: 'file',
    label: 'File',
    items: [
      { id: 'new-deck', label: 'New deck' },
      { sep: true },
      { id: 'import-pptx', label: 'Import PPTX…' },
      { id: 'export-pptx', label: 'Download PPTX' },
      { sep: true },
      { id: 'rename', label: 'Rename' },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    items: [
      { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z' },
      { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y' },
      { sep: true },
      { id: 'select-all', label: 'Select all', shortcut: 'Ctrl+A' },
    ],
  },
  {
    id: 'view',
    label: 'View',
    items: [
      { id: 'zoom-50', label: '50%' },
      { id: 'zoom-75', label: '75%' },
      { id: 'zoom-100', label: '100%' },
      { id: 'zoom-125', label: '125%' },
      { id: 'zoom-150', label: '150%' },
      { sep: true },
      { id: 'fit', label: 'Fit to window' },
      { sep: true },
      { id: 'toggle-notes', label: 'Speaker notes', shortcut: 'Ctrl+Alt+N' },
    ],
  },
  {
    id: 'design',
    label: 'Design',
    items: [
      { id: 'size-wide', label: 'Widescreen 16:9' },
      { id: 'size-standard', label: 'Standard 4:3' },
      { id: 'size-square', label: 'Square 1:1' },
      { id: 'size-portrait', label: 'Portrait 9:16' },
      { id: 'size-a4', label: 'A4 landscape' },
    ],
  },
  {
    id: 'insert',
    label: 'Insert',
    items: [
      { id: 'add-text', label: 'Text box' },
      { id: 'add-image', label: 'Image' },
      { sep: true },
      { id: 'add-rect', label: 'Rectangle' },
      { id: 'add-ellipse', label: 'Ellipse' },
      { id: 'add-polygon', label: 'Polygon' },
      { id: 'add-star', label: 'Star' },
      { id: 'add-line', label: 'Line' },
      { id: 'add-arrow', label: 'Arrow' },
      { sep: true },
      { id: 'smart-pyramid', label: 'Smart object: Pyramid' },
      { id: 'smart-funnel', label: 'Smart object: Funnel' },
      { id: 'smart-timeline-h', label: 'Smart object: Timeline' },
      { id: 'smart-cycle', label: 'Smart object: Cycle' },
      { id: 'smart-matrix-2x2', label: 'Smart object: 2x2 matrix' },
      { id: 'smart-flowchart', label: 'Smart object: Flowchart' },
      { id: 'smart-organogram', label: 'Smart object: Org chart' },
      { sep: true },
      { id: 'add-slide', label: 'New slide' },
    ],
  },
  {
    id: 'slide',
    label: 'Slide',
    items: [
      { id: 'add-slide', label: 'New slide' },
      { id: 'dup-slide', label: 'Duplicate slide' },
      { id: 'del-slide', label: 'Delete slide' },
    ],
  },
]

// ─── Dropdown state ──────────────────────────────────────────────────────────
const activeMenu = ref<string | null>(null)
const ddX = ref(0)
const ddY = ref(0)
const ddHovered = ref(false)
const triggerEls: HTMLButtonElement[] = []

const currentItems = computed<MenuItem[]>(() => {
  if (!activeMenu.value) return []
  return MENUS.find(m => m.id === activeMenu.value)?.items ?? []
})

function openMenu(id: string, index: number) {
  const el = triggerEls[index]
  if (!el) return
  const r = el.getBoundingClientRect()
  ddX.value = r.left
  ddY.value = r.bottom + 2
  activeMenu.value = id
  ddHovered.value = false
}

function toggleMenu(id: string, index: number) {
  if (activeMenu.value === id) { closeMenu(); return }
  openMenu(id, index)
}

function hoverMenu(id: string, index: number) {
  if (activeMenu.value && activeMenu.value !== id) openMenu(id, index)
}

function closeMenu() {
  activeMenu.value = null
}

// Close on Escape
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenu()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// ─── Action dispatch ─────────────────────────────────────────────────────────
function handleAction(id: string) {
  closeMenu()
  const mutatingActions = new Set([
    'undo',
    'redo',
    'new-deck',
    'import-pptx',
    'rename',
    'size-wide',
    'size-standard',
    'size-square',
    'size-portrait',
    'size-a4',
    'add-text',
    'add-image',
    'add-slide',
    'add-rect',
    'add-ellipse',
    'add-polygon',
    'add-star',
    'add-line',
    'add-arrow',
    'smart-pyramid',
    'smart-funnel',
    'smart-timeline-h',
    'smart-cycle',
    'smart-matrix-2x2',
    'smart-flowchart',
    'smart-organogram',
    'dup-slide',
    'del-slide',
  ])
  if (props.readOnly && mutatingActions.has(id)) return
  switch (id) {
    case 'undo':        emit('undo'); break
    case 'redo':        emit('redo'); break
    case 'new-deck':    emit('new-deck'); break
    case 'import-pptx': emit('import-pptx'); break
    case 'export-pptx': emit('export-pptx'); break
    case 'rename':      focusTitle(); break
    case 'select-all':  emit('select-all'); break
    case 'zoom-50':     emit('zoom', 50); break
    case 'zoom-75':     emit('zoom', 75); break
    case 'zoom-100':    emit('zoom', 100); break
    case 'zoom-125':    emit('zoom', 125); break
    case 'zoom-150':    emit('zoom', 150); break
    case 'fit':          emit('fit'); break
    case 'size-wide':     emit('canvas-size', { width: 4000, height: 2250, label: 'Widescreen 16:9' }); break
    case 'size-standard': emit('canvas-size', { width: 4000, height: 3000, label: 'Standard 4:3' }); break
    case 'size-square':   emit('canvas-size', { width: 3000, height: 3000, label: 'Square 1:1' }); break
    case 'size-portrait': emit('canvas-size', { width: 2250, height: 4000, label: 'Portrait 9:16' }); break
    case 'size-a4':       emit('canvas-size', { width: 3508, height: 2480, label: 'A4 landscape' }); break
    case 'toggle-notes': emit('toggle-notes'); break
    case 'add-text':    emit('add-text'); break
    case 'add-image':   emit('add-image'); break
    case 'add-rect':    emit('add-shape', 'rect'); break
    case 'add-ellipse': emit('add-shape', 'ellipse'); break
    case 'add-polygon': emit('add-shape', 'polygon'); break
    case 'add-star':    emit('add-shape', 'star'); break
    case 'add-line':    emit('add-shape', 'line'); break
    case 'add-arrow':   emit('add-shape', 'arrow'); break
    case 'smart-pyramid':    emit('insert-smart-object', 'pyramid'); break
    case 'smart-funnel':     emit('insert-smart-object', 'funnel'); break
    case 'smart-timeline-h': emit('insert-smart-object', 'timeline-h'); break
    case 'smart-cycle':      emit('insert-smart-object', 'cycle'); break
    case 'smart-matrix-2x2': emit('insert-smart-object', 'matrix-2x2'); break
    case 'smart-flowchart':  emit('insert-smart-object', 'flowchart'); break
    case 'smart-organogram': emit('insert-smart-object', 'organogram'); break
    case 'add-slide':   emit('add-slide'); break
    case 'dup-slide':   emit('duplicate-slide'); break
    case 'del-slide':   emit('delete-slide'); break
  }
}
</script>

<style scoped>
.stb {
  width: 100%;
  flex-shrink: 0;
  background: #fff;
  border-bottom: 1px solid var(--border, #e4e4e7);
  user-select: none;
}

/* ── Row 1: main ── */
.stb-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 10px;
}

.stb-main__left,
.stb-main__right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stb-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--fg-muted, #71717a);
  flex-shrink: 0;
}

.stb-icon-btn:hover { background: var(--bg-subtle, #f4f4f5); color: var(--fg, #18181b); }

.stb-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
}

.stb-logo__img {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  object-fit: cover;
}

.stb-title-block {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stb-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg, #18181b);
  outline: none;
  border-radius: 4px;
  padding: 2px 5px;
  min-width: 80px;
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stb-title:focus {
  background: var(--bg-subtle, #f4f4f5);
  text-overflow: clip;
}

.stb-status {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 10px;
  font-weight: 500;
}

.stb-status--saving  { color: #2563eb; background: #eff6ff; }
.stb-status--unsaved { color: #d97706; background: #fffbeb; }
.stb-status--saved   { color: #16a34a; background: #f0fdf4; }

.stb-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.stb-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.stb-btn--outline {
  border: 1px solid var(--border, #e4e4e7);
  background: #fff;
  color: var(--fg, #18181b);
}

.stb-btn--outline:hover:not(:disabled) { background: var(--bg-subtle, #f4f4f5); }

.stb-btn--primary {
  border: none;
  background: #6366f1;
  color: #fff;
}

.stb-btn--primary:hover { background: #4f46e5; }

/* ── Row 2: menu bar ── */
.stb-menubar {
  display: flex;
  align-items: center;
  padding: 0 14px;
  height: 28px;
  border-top: 1px solid var(--border, #e4e4e7);
  gap: 2px;
}

.stb-menubar__item {
  height: 24px;
  padding: 0 8px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--fg, #18181b);
  cursor: pointer;
  white-space: nowrap;
}

.stb-menubar__item:hover,
.stb-menubar__item--active {
  background: var(--bg-subtle, #f4f4f5);
}
</style>

<style>
/* Non-scoped: dropdown lives in body via Teleport */
.stb-bd {
  position: fixed;
  inset: 0;
  z-index: 9990;
}

.stb-dd {
  position: fixed;
  z-index: 9991;
  min-width: 180px;
  background: #fff;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
  padding: 4px;
  display: flex;
  flex-direction: column;
}

.stb-dd__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: 5px;
  font-size: 13px;
  color: #18181b;
  cursor: pointer;
  text-align: left;
  gap: 16px;
}

.stb-dd__item:hover { background: #f4f4f5; }

.stb-dd__label { flex: 1; }

.stb-dd__shortcut {
  font-size: 11px;
  color: #a1a1aa;
  white-space: nowrap;
}

.stb-dd__sep {
  height: 1px;
  background: #e4e4e7;
  margin: 3px 4px;
}
</style>
