<script setup lang="ts">
import UniverSheet from './components/UniverSheet.vue'
import * as defaultIcons from '@iconify-prerendered/vue-file-icons'
import { DEFAULT_WORKBOOK_DATA } from './assets/default-workbook-data'
import type { Ref } from 'vue'
import { nextTick, onMounted, ref, watchEffect } from 'vue'

import './assets/index.css'
import { PencilIcon } from 'lucide-vue-next'
import { useFavicon } from '@vueuse/core'
import type { IWorkbookData, Univer } from '@univerjs/core'
import { useRoute, useRouter } from 'vue-router'
import SheetMenu from './components/menu/SheetMenu.vue'

// Router setup
const router = useRouter()
const route = useRoute()

// Reactive references
const data = ref<Partial<IWorkbookData> | null>(null)
const univerRef: Ref<InstanceType<typeof UniverSheet> | null> = ref(null)
const univerCoreRef = ref<Univer | null>(null)
const title = ref('New Spreadsheet')
const isTitleEdit = ref(false)

// Handler for univerRefChange event
function onUniverRefChange(childUniverRef: Univer | null) {
  univerCoreRef.value = childUniverRef
}

// Load data function
function loadData(id: string) {
  const savedData = localStorage.getItem(id)
  return savedData ? JSON.parse(savedData) : DEFAULT_WORKBOOK_DATA
}

// Update data handler
function updateData(newData: IWorkbookData) {
  data.value = newData
}

const titleRef = ref<HTMLElement | null>(null)

function editTitle() {
  isTitleEdit.value = true
  nextTick(() => {
    const titleEl = titleRef.value
    if (titleEl) {
      titleEl.focus()
    }
  })
}

function updateTitle(event: Event) {
  const target = event.target as HTMLElement
  title.value = target.innerText
}

function saveTitle() {
  isTitleEdit.value = false
  document.title = title.value || 'New Spreadsheet'
  univerRef.value?.setName?.(title.value)
}

function togglePencil(v: boolean) {
  isTitleEdit.value = v
  if (v) {
    editTitle()
  }
}

// Icon reference and favicon setup
const iconRef = ref<HTMLElement | null>(null)
onMounted(() => {
  watchEffect(() => {
    if (route.params.id && title.value == 'New Spreadsheet') {
      console.log('efffect change', route.params.id)
      // Load data after route is initialized
      data.value = loadData(route.params.id as string)

      const sheetId = data.value?.id
      if (route.params.id !== sheetId) {
        router.replace({ path: `/sheets/${sheetId}` })
      }
      document.title = data.value?.name || 'New Spreadsheet'
      title.value = document.title

      const iconHTML = iconRef.value?.outerHTML.replace(/currentColor/g, '#38a169').replace(/1em/g, '')
      const iconDataURL = `data:image/svg+xml,${encodeURIComponent(iconHTML || '')}`
      useFavicon(iconDataURL)
    }
  })
})
</script>

<template>
  <div id="app" class="h-screen flex flex-col">
    <div class="flex items-center gap-2 pl-2">
      <defaultIcons.IconMicrosoftExcel
        ref="iconRef" class="w-[1.5rem] h-[3rem] text-green-600"
        xmlns="http://www.w3.org/2000/svg"
      />
      <div class="flex flex-col">
        <div class="flex" @mouseover="togglePencil(true)" @mouseleave="togglePencil(false)">
          <div
            :contenteditable="isTitleEdit" ref="titleRef" class="mt-2 ml-3 font-bold border-b border-dotted border-gray-300"
            :class="{ 'cursor-text': isTitleEdit }"
            @input="updateTitle"
            @blur="saveTitle" @keydown.enter.prevent="saveTitle" @click="editTitle"
          >
            {{ title }}
          </div>
          <PencilIcon v-if="isTitleEdit" class="mt-3.5 ml-2 h-3 w-3" />
        </div>
        <SheetMenu :univer-ref="univerRef" :core-ref="univerCoreRef as Univer | null" @update-data="updateData" />
      </div>
    </div>
    <UniverSheet id="sheet" ref="univerRef" :data="(data as any)" @univer-ref-change="onUniverRefChange" />
  </div>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

#sheet {
  /** The height of the Union uses the height of the parent container */
  flex: 1;
}

[contenteditable='true'] {
  outline: 2px dotted #38a160;
}
</style>
