<template>
  <div class="space-y-6">
    <!-- API Configuration Section -->
    <div class="space-y-4">
      <div class="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Key class="w-4 h-4 text-blue-600" />
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">{{$t('Commons.heading.api_configuration')}}</h3>
      </div>
      
      <div class="space-y-3">
        <div class="flex items-center justify-between gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div class="flex-1">
            <div class="text-sm font-medium text-blue-900 dark:text-blue-100">{{$t('Components.Forms.IntegrationDialog.text.enable_public_api')}}</div>
            <div class="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Allow external applications to submit data to this {{ type }}
            </div>
          </div>
          <Switch
            :checked="apiEnabled"
            :disabled="isUpdatingApi"
            @update:checked="handleSetApiEnabled"
          />
        </div>
        
        <div class="flex items-center justify-between gap-2">
          <div class="text-xs text-gray-500">{{$t('Components.Forms.IntegrationDialog.text.generate_new_api_key')}}</div>
          <Button
            variant="outline"
            size="sm"
            :disabled="isUpdatingApi || !id"
            @click="handleRotateApiKey"
          >
            <RefreshCw class="w-3 h-3 mr-1" />
            {{$t('Commons.button.refresh')}}
          </Button>
        </div>
      </div>
    </div>

    <!-- Sharing & Embedding Section -->
    <div class="space-y-4">
      <div class="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Share class="w-4 h-4 text-green-600" />
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">{{$t('Components.Forms.IntegrationDialog.heading.share_embed')}}</h3>
      </div>
      
      <div class="space-y-3">
        <div>
          <label class="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-2">
            {{$t('Commons.label.public_url')}}
          </label>
          <div class="flex gap-2">
            <input
              class="flex-1 border rounded px-3 py-2 text-sm bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
              :value="publicUrl"
              readonly
              @focus="(e: FocusEvent) => {
                const target = e.target as HTMLInputElement;
                target?.select?.();
              }"
            />
            <Button size="sm" variant="outline" @click="copyToClipboard(publicUrl, 'URL copied')">
              <Copy class="w-3 h-3" />
            </Button>
          </div>
        </div>

        <Collapsible>
          <CollapsibleTrigger class="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
            <ChevronRight class="w-3 h-3 transition-transform" :class="{ 'rotate-90': isOpen }" />
            {{$t('Components.Forms.IntegrationDialog.text.embed_as_iframe')}}
          </CollapsibleTrigger>
          <CollapsibleContent class="mt-2">
            <div class="space-y-2">
              <textarea
                class="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 font-mono"
                :value="embedSnippet"
                rows="3"
                readonly
                @focus="(e: FocusEvent) => (e?.target as HTMLTextAreaElement)?.select?.()"
              />
              <Button size="sm" variant="outline" @click="copyToClipboard(embedSnippet, 'Embed code copied')">
                <Copy class="w-3 h-3 mr-1" />
                {{$t('Components.Forms.IntegrationDialog.button.copy_embed_code')}}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>

    <!-- API Integration Section -->
    <div class="space-y-4">
      <div class="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Code class="w-4 h-4 text-purple-600" />
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">{{$t('Commons.heading.api_integration')}}</h3>
      </div>
      
      <div class="space-y-3">
        <div>
          <label class="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-2">
            {{$t('Commons.label.api_endpoint')}}
          </label>
          <div class="flex gap-2">
            <input
              class="flex-1 border rounded px-3 py-2 text-sm bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 font-mono"
              :value="endpoint"
              readonly
              @focus="(e: FocusEvent) => {
                const target = e.target as HTMLInputElement;
                target?.select?.();
              }"
            />
            <Button size="sm" variant="outline" :disabled="!endpoint" @click="copyToClipboard(endpoint, 'Endpoint copied')">
              <Copy class="w-3 h-3" />
            </Button>
          </div>
          <div v-if="!apiEnabled" class="mt-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
            <AlertCircle class="w-3 h-3 inline mr-1" />
            {{$t('Components.Forms.IntegrationDialog.text.enable_public_api_to')}}
          </div>
        </div>

        <!-- Dynamic Field Examples -->
        <Collapsible>
          <CollapsibleTrigger class="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
            <ChevronRight class="w-3 h-3 transition-transform" :class="{ 'rotate-90': examplesOpen }" />
            {{$t('Components.Forms.IntegrationDialog.text.view_integration_examples')}}
          </CollapsibleTrigger>
          <CollapsibleContent class="mt-3 space-y-4">
            <!-- Tab Navigation -->
            <div class="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <button
                class="flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors"
                :class="activeTab === 'row' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'"
                @click="activeTab = 'row'"
              >
                {{$t('Commons.button.row_array')}}
              </button>
              <button
                class="flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors"
                :class="activeTab === 'mapped' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'"
                @click="activeTab = 'mapped'"
              >
                {{$t('Commons.button.header_mapped')}}
              </button>
              <button
                class="flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors"
                :class="activeTab === 'code' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'"
                @click="activeTab = 'code'"
              >
                {{$t('Commons.button.code_example')}}
              </button>
            </div>

            <!-- Tab Content -->
            <div class="space-y-3">
              <!-- Row Array Tab -->
              <div v-if="activeTab === 'row'" class="space-y-2">
                <div class="text-xs font-medium text-gray-700 dark:text-gray-300">{{$t('Commons.text.request_body')}}</div>
                <pre class="text-xs rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 overflow-auto"><code>{{ rowArrayExample }}</code></pre>
                <div class="text-xs text-gray-500">
                  Fields are submitted in the same order as they appear in your {{ type }}.
                </div>
              </div>

              <!-- Header Mapped Tab -->
              <div v-if="activeTab === 'mapped'" class="space-y-2">
                <div class="text-xs font-medium text-gray-700 dark:text-gray-300">{{$t('Commons.text.request_body')}}</div>
                <pre class="text-xs rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 overflow-auto"><code>{{ headerMappedExample }}</code></pre>
                <div class="text-xs text-gray-500">
                  Use field names as keys. More readable and maintainable.
                </div>
              </div>

              <!-- Code Example Tab -->
              <div v-if="activeTab === 'code'" class="space-y-2">
                <div class="text-xs font-medium text-gray-700 dark:text-gray-300">{{$t('Commons.text.javascript_example')}}</div>
                <pre class="text-xs rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 overflow-auto"><code>{{ codeExample }}</code></pre>
                <div class="text-xs text-gray-500">
                  {{$t('Components.Forms.IntegrationDialog.text.copy_and_paste_this')}}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>

    <!-- API Key Section -->
    <div class="space-y-4">
      <div class="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Shield class="w-4 h-4 text-orange-600" />
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">{{$t('Commons.heading.api_key')}}</h3>
      </div>
      
      <Collapsible>
        <CollapsibleTrigger class="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
          <Eye class="w-3 h-3" />
          {{$t('Components.Forms.IntegrationDialog.text.reveal_api_key')}}
        </CollapsibleTrigger>
        <CollapsibleContent class="mt-2">
          <div class="flex gap-2">
            <input
              class="flex-1 border rounded px-3 py-2 text-sm bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 font-mono"
              :value="apiKey"
              readonly
              @focus="(e: FocusEvent) => {
                const target = e.target as HTMLInputElement;
                target?.select?.();
              }"
            />
            <Button size="sm" variant="outline" :disabled="!apiKey" @click="copyToClipboard(apiKey, 'API key copied')">
              <Copy class="w-3 h-3" />
            </Button>
          </div>
          <div class="mt-2 text-xs text-amber-600">
            Keep this key secure. Anyone with this key can submit data to your {{ type }}.
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Key, 
  Share, 
  Code, 
  Shield, 
  Copy, 
  RefreshCw, 
  ChevronRight, 
  AlertCircle, 
  Eye 
} from 'lucide-vue-next'
import { toast } from '@/composables/useToast'

interface Props {
  type: 'sheet' | 'form'
  id: string
  apiEnabled: boolean
  apiKey: string
  isUpdatingApi: boolean
  publicUrl: string
  endpoint: string
  fields?: string[]
}

interface Emits {
  (e: 'set-api-enabled', enabled: boolean): void
  (e: 'rotate-api-key'): void
}

const props = withDefaults(defineProps<Props>(), {
  fields: () => ['Email', 'Name', 'Date']
})

const emit = defineEmits<Emits>()

const isOpen = ref(false)
const examplesOpen = ref(false)
const activeTab = ref<'row' | 'mapped' | 'code'>('row')

// Generate dynamic examples based on actual fields
const rowArrayExample = computed(() => {
  const sampleData = props.fields.map((field, index) => {
    if (field.toLowerCase().includes('email')) return 'john@example.com'
    if (field.toLowerCase().includes('name')) return 'John Doe'
    if (field.toLowerCase().includes('date')) return new Date().toISOString().split('T')[0]
    if (field.toLowerCase().includes('phone')) return '+1-555-0123'
    if (field.toLowerCase().includes('message') || field.toLowerCase().includes('comment')) return 'Sample message text'
    return `Sample ${field} ${index + 1}`
  })
  
  return JSON.stringify({
    row: sampleData
  }, null, 2)
})

const headerMappedExample = computed(() => {
  const data: Record<string, string> = {}
  props.fields.forEach((field, index) => {
    if (field.toLowerCase().includes('email')) data[field] = 'john@example.com'
    else if (field.toLowerCase().includes('name')) data[field] = 'John Doe'
    else if (field.toLowerCase().includes('date')) data[field] = new Date().toISOString().split('T')[0]
    else if (field.toLowerCase().includes('phone')) data[field] = '+1-555-0123'
    else if (field.toLowerCase().includes('message') || field.toLowerCase().includes('comment')) data[field] = 'Sample message text'
    else data[field] = `Sample ${field} ${index + 1}`
  })
  
  return JSON.stringify({
    data
  }, null, 2)
})

const codeExample = computed(() => {
  const sampleData = props.fields.map((field, index) => {
    if (field.toLowerCase().includes('email')) return 'john@example.com'
    if (field.toLowerCase().includes('name')) return 'John Doe'
    if (field.toLowerCase().includes('date')) return new Date().toISOString().split('T')[0]
    if (field.toLowerCase().includes('phone')) return '+1-555-0123'
    if (field.toLowerCase().includes('message') || field.toLowerCase().includes('comment')) return 'Sample message text'
    return `Sample ${field} ${index + 1}`
  }).join(', ')

  return `// Submit data to ${props.type}
const response = await fetch('${props.endpoint}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    row: [${sampleData}]
    // or use header-mapped format:
    // data: {
    //   ${props.fields.map((field, i) => `${field}: '${sampleData.split(', ')[i]}'`).join(',\n    //   ')}
    // }
  })
})

const result = await response.json()
console.log('Success:', result)`
})

const embedSnippet = computed(() => {
  return `<iframe src="${props.publicUrl}" style="width:100%;height:700px;border:0" loading="lazy" referrerpolicy="no-referrer"></iframe>`
})

const handleSetApiEnabled = (enabled: boolean) => {
  emit('set-api-enabled', enabled)
}

const handleRotateApiKey = () => {
  emit('rotate-api-key')
}

const copyToClipboard = async (value: string, successMessage: string) => {
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    toast.success(successMessage)
  } catch {
    toast.error('Unable to copy. Try copying manually.')
  }
}
</script>
