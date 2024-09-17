<script setup lang="ts">
import * as defaultIcons from '@iconify-prerendered/vue-file-icons'
import { nextTick, onMounted, ref, watchEffect } from 'vue'

import '@/assets/index.css'
import { PencilIcon } from 'lucide-vue-next'
import { useFavicon } from '@vueuse/core'
import { useRoute } from 'vue-router'
//@ts-ignore 
import { UmoEditor } from '@umoteam/editor'
import { useFileStore } from '@/store/files'

// Router setup
const route = useRoute()
const docStore = useFileStore()

// Reactive references

const title = ref('New Document')
const isTitleEdit = ref(false)
const titleEditTimeout = ref<NodeJS.Timeout | null>(null)

const options = ref({
  document: {
    title: 'Untitled Document',
    content: '',
    placeholder: {
      en_US: 'Write something...',
    },
    enableSpellcheck: true,
    enableMarkdown: true,
    enableBubbleMenu: true,    
    enableBlockMenu: true,
    readOnly: false,
    autofocus: true,
    characterLimit: 0,
    typographyRules: {},
    editorProps: {},
    parseOptions: {
      preserveWhitespace: 'full',
    },
  },
  locale: 'en-US',
  toolbar: {
    defaultMode: 'ribbon',
    enableSourceEditor: true,
    menus: ['base', 'table', 'tools', 'page', 'export'],
    disableMenuItems: ['chineseDate', 'chineseCase'],
    importWord: {
      enabled: true,
      options: {},
      useCustomMethod: false,
    },
  },
})

// Load data function
async function loadData(id: string) {
  const savedData = await docStore.loadFromCacheOrAPI(id, "docx")
  if (savedData) {
    console.log('Loaded doc', savedData)
    options.value.document = {
      ...options.value.document,
      content: savedData.contents || savedData.content || "",
      title: savedData.title || ""
    }
    editorRef.value?.setDocument(options.value.document);
    editorRef.value?.setContent(savedData?.contents || savedData?.content);
    title.value = savedData?.title
    saveTitle()
    return savedData
  } else {
    console.error('Error fetching document from API')
    return ""
  }
}
const titleRef = ref<HTMLElement | null>(null)
const editorRef = ref<any>(null);

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
  
  // Clear existing timeout and set a new one
  if (titleEditTimeout.value) {
    clearTimeout(titleEditTimeout.value)
  }
  titleEditTimeout.value = setTimeout(saveTitle, 5000)
}

function saveTitle() {
  isTitleEdit.value = false
  document.title = title.value || 'New Document'
  options.value.document.title = document.title;
  
  // Clear the timeout
  if (titleEditTimeout.value) {
    clearTimeout(titleEditTimeout.value)
    titleEditTimeout.value = null
  }
}

function startEditing() {
  if (!isTitleEdit.value) {
    editTitle()
  }
}

// Icon reference and favicon setup
const iconRef = ref<HTMLElement | null>(null)

onMounted(() => {
  console.log("mounted", route.params)
  watchEffect(async () => {
    if (route.params.id && title.value == "New Document") {
      console.log('effect change', route.params.id)
      // Load data after route is initialized
      const docId = route.params?.id as string
      await loadData(docId)

      const iconHTML = iconRef.value?.outerHTML.replace(/currentColor/g, '#4d7cfe').replace(/1em/g, '')
      const iconDataURL = `data:image/svg+xml,${encodeURIComponent(iconHTML || '')}`
      useFavicon(iconDataURL)
    }
  })
})
</script>

<template>
  <div id="app" class="h-screen flex flex-col">
    <div class="flex items-center gap-2 pl-2">
      <defaultIcons.IconMicrosoftWord
        ref="iconRef" class="w-[1.5rem] h-[3rem] text-blue-600"
        xmlns="http://www.w3.org/2000/svg"
      />
      <div class="flex flex-col">
        <div class="flex">
          <div
            id="docHead"
            :contenteditable="isTitleEdit"
            ref="titleRef"
            class="mt-2 ml-3 font-bold border-b border-dotted border-gray-300"
            :class="{ 'cursor-text': isTitleEdit }"
            @input="updateTitle"
            @blur="saveTitle"
            @keydown.enter.prevent="saveTitle"
            @click="startEditing"
          >
            {{ title }}
          </div>
          <PencilIcon v-if="!isTitleEdit" @click="startEditing" class="mt-3.5 ml-2 h-3 w-3 cursor-pointer" />
        </div>
      </div>
    </div>
    <umo-editor ref="editorRef" v-bind="options" />
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

#doc {
  flex: 1;
}

#docHead > [contenteditable='true'] {
  outline: 2px dotted #1e3a8a;
}
</style>