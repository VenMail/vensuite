<template>
  <div class="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 p-8">
    <div v-if="status === 'loading'" class="flex flex-col items-center gap-4 text-center">
      <div class="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
      <p class="text-lg font-medium text-gray-700 dark:text-gray-200">Importing document...</p>
      <p class="text-sm text-gray-500 dark:text-gray-400">Converting and opening in VenSuite</p>
    </div>

    <div v-else-if="status === 'error'" class="flex flex-col items-center gap-4 text-center max-w-md">
      <div class="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
        </svg>
      </div>
      <p class="text-lg font-medium text-gray-800 dark:text-gray-100">Failed to import document</p>
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ errorMsg }}</p>
      <div class="flex gap-3 mt-2">
        <a
          v-if="fileUrl"
          :href="fileUrl"
          download
          class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Download file
        </a>
        <button
          @click="router.push('/home')"
          class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Go to home
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFileStore } from '@/store/files'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const fileStore = useFileStore()

const status = ref<'loading' | 'error'>('loading')
const errorMsg = ref('')
const fileUrl = ref('')

onMounted(async () => {
  fileUrl.value = (route.query.fileUrl as string) || ''
  const rawFileName = (route.query.fileName as string) || 'document.docx'
  const title = rawFileName.replace(/\.[^.]+$/, '')

  if (!fileUrl.value) {
    status.value = 'error'
    errorMsg.value = 'No file URL was provided.'
    return
  }

  try {
    const response = await axios.get(fileUrl.value, { responseType: 'arraybuffer' })
    const buf: ArrayBuffer = response.data

    // mammoth is loaded globally before app bootstrap (see main.ts)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mammoth = (window as any).mammoth
    if (!mammoth) {
      status.value = 'error'
      errorMsg.value = 'Document converter not available. Please try again later.'
      return
    }

    const result = await mammoth.convertToHtml({ arrayBuffer: buf })
    const html: string = result?.value || ''

    if (!html) {
      status.value = 'error'
      errorMsg.value = 'The document appears to be empty or in an unsupported format.'
      return
    }

    // Single API call: create the doc with content and title directly
    // saveToAPI creates a new document when id is absent (uses POST /app-files)
    const saved = await fileStore.saveToAPI({
      id: undefined,
      title,
      file_name: rawFileName,
      file_type: 'docx',
      is_folder: false,
      content: html,
    } as any)

    if (!saved?.id) {
      status.value = 'error'
      errorMsg.value = 'Failed to save document to VenSuite.'
      return
    }

    router.replace(`/docs/${saved.id}`)
  } catch (e: any) {
    status.value = 'error'
    const isNetworkError = e?.code === 'ERR_NETWORK' || e?.message === 'Network Error'
    const isCors = e?.response === undefined && isNetworkError
    if (isCors) {
      errorMsg.value = 'Could not fetch the file due to a network or permission error. Download it below.'
    } else {
      errorMsg.value = 'An unexpected error occurred while importing the document.'
    }
  }
})
</script>
