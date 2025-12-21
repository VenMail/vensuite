<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from '@/components/ui/button/Button.vue'
import UserProfile from '@/components/layout/UserProfile.vue'
import { useFileStore } from '@/store/files'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/composables/useToast'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const fileStore = useFileStore()
const authStore = useAuthStore()

const isLoading = ref(false)
const file = ref<any | null>(null)
const pdfBlobUrl = ref<string | null>(null)
const importing = ref(false)

// Access interstitial state
const accessDenied = ref(false)
const requestEmail = ref(authStore.email || '')
const accessLevel = ref<'v'|'c'|'e'>('v')
const requestMessage = ref('')
const requestSubmitting = ref(false)
const requestSuccess = ref<string | null>(null)

const fileType = computed(() => (file.value?.file_type || '').toLowerCase())
const fileUrl = computed(() => file.value?.file_url || '')
const filePublicUrl = computed(() => file.value?.file_public_url || '')
const downloadUrl = computed(() => file.value?.download_url || '')
const openOriginalUrl = computed(() => filePublicUrl.value || fileUrl.value)
const title = computed(() => file.value?.title || file.value?.file_name || 'File')

const isPdf = computed(() => fileType.value === 'pdf')

function goBack() {
  router.back()
}

function goToLogin() {
  router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
}

async function loadFile(id: string) {
  isLoading.value = true
  try {
    const f = await fileStore.loadDocument(id)
    if (f) {
      file.value = f
      document.title = title.value
      await loadPdfPreviewIfNeeded()
    } else {
      if (!authStore.isAuthenticated) {
        accessDenied.value = true
        requestEmail.value = authStore.email || ''
        return
      }
      toast.error('File not found')
    }
  } catch (e) {
    toast.error('Failed to load file')
  } finally {
    isLoading.value = false
  }
}

async function loadPdfPreviewIfNeeded() {
  if (!isPdf.value) return
  if (pdfBlobUrl.value) {
    try {
      URL.revokeObjectURL(pdfBlobUrl.value)
    } catch {
      // ignore
    }
    pdfBlobUrl.value = null
  }

  const url = downloadUrl.value || filePublicUrl.value || fileUrl.value
  if (!url) return

  try {
    const token = fileStore.getToken()
    const isApiDownload = typeof url === 'string' && url.includes('/app-files/') && url.includes('/download')
    const res = await axios.get(url, {
      responseType: 'blob',
      headers: token && isApiDownload ? { Authorization: `Bearer ${token}` } : undefined,
    })
    pdfBlobUrl.value = URL.createObjectURL(res.data as Blob)
  } catch {
    pdfBlobUrl.value = null
  }
}

async function downloadFile() {
  const url = downloadUrl.value || filePublicUrl.value || fileUrl.value
  if (!url) return

  const token = fileStore.getToken()
  const isApiDownload = typeof url === 'string' && url.includes('/app-files/') && url.includes('/download')

  if (token && isApiDownload) {
    try {
      const res = await axios.get(url, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` },
      })
      const blobUrl = URL.createObjectURL(res.data as Blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = file.value?.file_name || title.value
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      toast.error('Failed to download file')
    }
    return
  }

  const link = document.createElement('a')
  link.href = url
  link.download = file.value?.file_name || title.value
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function importPdfToDocument() {
  if (!isPdf.value || !file.value?.id) return
  importing.value = true
  try {
    const converted = await fileStore.convertAttachmentClientSide(file.value, 'pdf')
    if (converted?.id) {
      await router.push({ name: 'docs-edit', params: { appFileId: converted.id } })
    } else {
      toast.error('Failed to import file')
    }
  } catch {
    toast.error('Failed to import file')
  } finally {
    importing.value = false
  }
}

function isImage() {
  return ['jpg','jpeg','png','gif','webp','svg','bmp'].includes(fileType.value)
}
function isVideo() {
  return ['mp4','webm','ogg','avi','mov','wmv','flv','mkv'].includes(fileType.value)
}
function isAudio() {
  return ['mp3','wav','ogg','aac','flac','m4a','wma'].includes(fileType.value)
}

async function submitAccessRequest() {
  if (!route.params.id) return
  requestSubmitting.value = true
  requestSuccess.value = null
  try {
    const API_BASE_URI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
    const res = await fetch(`${API_BASE_URI}/app-files/${route.params.id}/request-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: requestEmail.value,
        access_level: accessLevel.value,
        message: requestMessage.value || undefined,
      }),
    })
    const data = await res.json()
    if (res.ok && (data?.requested || data?.success)) {
      requestSuccess.value = 'Access request sent. You will receive an email when approved.'
      toast.success('Access request sent')
    } else {
      requestSuccess.value = data?.message || 'Request sent (if the email is valid).'
      toast.info(requestSuccess.value || '')
    }
  } catch (e) {
    requestSuccess.value = 'Request submitted. Please check your email later.'
    toast.info(requestSuccess.value || '')
  } finally {
    requestSubmitting.value = false
  }
}

onMounted(() => {
  const id = route.params.id as string
  if (id) loadFile(id)
})

watch(
  () => file.value?.id,
  async () => {
    await loadPdfPreviewIfNeeded()
  }
)

onUnmounted(() => {
  if (pdfBlobUrl.value) {
    try {
      URL.revokeObjectURL(pdfBlobUrl.value)
    } catch {
      // ignore
    }
    pdfBlobUrl.value = null
  }
})
</script>

<template>
  <div id="app" class="h-screen flex flex-col">
     
    <div v-if="isLoading" class="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50 overflow-hidden">
      <div class="h-full bg-primary-600 w-1/3 animate-pulse"></div>
    </div>

     
    <div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" @click="goBack">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </Button>
        <div class="font-bold px-2 py-1">{{ title }}</div>
      </div>
      <div class="flex items-center gap-3">
        <Button v-if="isPdf" variant="outline" size="sm" @click="importPdfToDocument" :disabled="importing">
          {{$t('Commons.button.import_to_document')}}
        </Button>
        <Button v-if="downloadUrl || fileUrl || filePublicUrl" variant="outline" size="sm" @click="downloadFile">
          {{$t('Commons.button.download')}}
        </Button>
        <a v-if="openOriginalUrl" :href="openOriginalUrl" target="_blank" rel="noopener" class="text-sm text-blue-600">{{$t('Commons.link.open_original')}}</a>
        <UserProfile :isMobile="false" />
      </div>
    </div>

     
    <div v-if="accessDenied" class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow p-6">
        <div class="mb-4">
          <h2 class="text-lg font-semibold">{{$t('Views.MediaViewer.heading.request_access_to_this')}}</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{{$t('Views.MediaViewer.text.this_file_is_private')}}</p>
        </div>
        <form @submit.prevent="submitAccessRequest" class="space-y-3">
          <div>
            <label class="block text-sm font-medium mb-1">Email</label>
            <input v-model="requestEmail" type="email" required class="w-full border rounded px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700" placeholder="you@example.com" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">{{$t('Commons.label.requested_access')}}</label>
            <select v-model="accessLevel" class="w-full border rounded px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700">
              <option value="v">{{$t('Commons.text.view')}}</option>
              <option value="c">{{$t('Commons.text.comment')}}</option>
              <option value="e">{{$t('Commons.heading.edit')}}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Message (optional)</label>
            <textarea v-model="requestMessage" rows="3" class="w-full border rounded px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700" placeholder="Add a note to the owner"></textarea>
          </div>
          <div class="flex items-center justify-between pt-2">
            <Button type="submit" :disabled="requestSubmitting || !requestEmail" variant="default">
              <span v-if="!requestSubmitting">{{$t('Commons.button.request_access')}}</span>
              <span v-else>{{$t('Views.MediaViewer.text.sending')}}</span>
            </Button>
            <div class="flex items-center gap-3">
              <span v-if="requestSuccess" class="text-sm text-green-600">{{ requestSuccess }}</span>
              <Button type="button" variant="outline" @click="goToLogin">{{$t('Commons.button.sign_in')}}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>

     
    <div v-else class="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div class="max-w-6xl w-full p-4 flex items-center justify-center">
        <iframe v-if="isPdf && pdfBlobUrl" :src="pdfBlobUrl" class="w-full h-[80vh] rounded shadow bg-white" title="PDF Preview" />
        <img v-else-if="isImage() && fileUrl" :src="fileUrl" :alt="title" class="max-h-[80vh] max-w-full object-contain rounded shadow" />
        <video v-else-if="isVideo() && fileUrl" :src="fileUrl" controls class="max-h-[80vh] max-w-full rounded shadow"></video>
        <audio v-else-if="isAudio() && fileUrl" :src="fileUrl" controls class="w-full"></audio>
        <div v-else class="text-center">
          <p class="mb-3">{{$t('Views.MediaViewer.text.cannot_preview_this_file')}}</p>
          <Button v-if="downloadUrl || fileUrl || filePublicUrl" variant="outline" size="sm" @click="downloadFile">
            {{$t('Views.MediaViewer.link.download_open_original')}}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
