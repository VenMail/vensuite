<template>
  <div class="space-y-4">
    <!-- API Configuration Section -->
    <div class="flex items-center justify-between gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <Key class="w-4 h-4 text-blue-600" />
          <span class="text-sm font-medium text-blue-900 dark:text-blue-100">{{$t('Commons.heading.api_configuration')}}</span>
        </div>
        <div class="text-xs text-blue-700 dark:text-blue-300 mt-1">
          Allow external applications to submit data to this {{ type }}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="isUpdatingApi || !id"
          @click="handleRotateApiKey"
        >
          <RefreshCw class="w-3 h-3 mr-1" />
          {{$t('Commons.button.refresh_key')}}
        </Button>
        <Switch
          :checked="apiEnabled"
          :disabled="isUpdatingApi"
          @update:checked="handleSetApiEnabled"
        />
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-2 gap-2">
      <Button size="sm" variant="outline" @click="copyToClipboard(publicUrl, 'URL copied')" class="justify-start">
        <Share class="w-3 h-3 mr-2" />
        {{$t('Components.Forms.IntegrationDialog.button.copy_public_url')}}
      </Button>
      <Button size="sm" variant="outline" @click="copyToClipboard(embedSnippet, 'Embed code copied')" class="justify-start">
        <Code class="w-3 h-3 mr-2" />
        {{$t('Components.Forms.IntegrationDialog.button.copy_embed_code')}}
      </Button>
    </div>

    <!-- API Integration Section -->
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <Code class="w-4 h-4 text-purple-600" />
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{$t('Commons.heading.api_integration')}}</span>
        </div>
        <div class="text-xs text-gray-500">
          {{ apiEnabled ? $t('Commons.text.api_enabled') : $t('Commons.text.api_disabled') }}
        </div>
      </div>
      
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
      <div v-if="!apiEnabled" class="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
        <AlertCircle class="w-3 h-3 inline mr-1" />
        {{$t('Components.Forms.IntegrationDialog.text.enable_api_to_use')}}
      </div>

      <!-- Integration Examples -->
      <Collapsible v-model:open="examplesOpen">
        <CollapsibleTrigger class="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
          <ChevronRight class="w-3 h-3 transition-transform" :class="{ 'rotate-90': examplesOpen }" />
          {{$t('Commons.text.integration_examples')}}
        </CollapsibleTrigger>
        <CollapsibleContent class="mt-2">
          <!-- Integration Type Tabs -->
          <div class="flex flex-wrap gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-3">
            <button
              v-for="tab in integrationTabs"
              :key="tab.id"
              class="px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1"
              :class="activeIntegrationTab === tab.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'"
              @click="activeIntegrationTab = tab.id"
            >
              <component :is="tab.icon" class="w-3 h-3" />
              {{ tab.label }}
            </button>
          </div>

          <!-- Tab Content -->
          <div class="space-y-3">
            <!-- JavaScript/TypeScript -->
            <div v-if="activeIntegrationTab === 'javascript'" class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-xs font-medium text-gray-700 dark:text-gray-300">{{$t('Commons.text.javascript_example')}}</div>
                <select v-model="jsFramework" class="text-xs border rounded px-2 py-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <option value="fetch">{{$t('Commons.text.fetch_api')}}</option>
                  <option value="axios">{{$t('Commons.text.axios')}}</option>
                  <option value="node">Node.js</option>
                </select>
              </div>
              <div class="relative">
                <pre class="text-xs rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 overflow-auto"><code>{{ javascriptExample }}</code></pre>
                <Button size="sm" variant="outline" class="absolute top-2 right-2" @click="copyToClipboard(javascriptExample, 'Code copied')">
                  <Copy class="w-3 h-3" />
                </Button>
              </div>
            </div>

            <!-- Postman Collection -->
            <div v-if="activeIntegrationTab === 'postman'" class="space-y-2">
              <div class="text-xs font-medium text-gray-700 dark:text-gray-300">{{$t('Commons.text.postman_collection')}}</div>
              <div class="relative">
                <pre class="text-xs rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 overflow-auto"><code>{{ postmanCollection }}</code></pre>
                <Button size="sm" variant="outline" class="absolute top-2 right-2" @click="downloadPostmanCollection">
                  <Download class="w-3 h-3 mr-1" />
                  {{$t('Commons.button.export')}}
                </Button>
              </div>
            </div>

            <!-- OpenAPI Spec -->
            <div v-if="activeIntegrationTab === 'openapi'" class="space-y-2">
              <div class="text-xs font-medium text-gray-700 dark:text-gray-300">{{$t('Commons.text.openapi_specification')}}</div>
              <div class="relative">
                <pre class="text-xs rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 overflow-auto max-h-60 overflow-auto"><code>{{ openApiSpec }}</code></pre>
                <Button size="sm" variant="outline" class="absolute top-2 right-2" @click="copyToClipboard(openApiSpec, 'OpenAPI spec copied')">
                  <Copy class="w-3 h-3" />
                </Button>
              </div>
            </div>

            <!-- cURL -->
            <div v-if="activeIntegrationTab === 'curl'" class="space-y-2">
              <div class="text-xs font-medium text-gray-700 dark:text-gray-300">{{$t('Commons.text.curl_command')}}</div>
              <div class="relative">
                <pre class="text-xs rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 overflow-auto"><code>{{ curlCommand }}</code></pre>
                <Button size="sm" variant="outline" class="absolute top-2 right-2" @click="copyToClipboard(curlCommand, 'cURL command copied')">
                  <Copy class="w-3 h-3" />
                </Button>
              </div>
            </div>

            <!-- Python -->
            <div v-if="activeIntegrationTab === 'python'" class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-xs font-medium text-gray-700 dark:text-gray-300">{{$t('Commons.text.python_example')}}</div>
                <select v-model="pythonLibrary" class="text-xs border rounded px-2 py-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <option value="requests">{{$t('Commons.text.requests')}}</option>
                  <option value="httpx">HTTPX</option>
                </select>
              </div>
              <div class="relative">
                <pre class="text-xs rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 overflow-auto"><code>{{ pythonExample }}</code></pre>
                <Button size="sm" variant="outline" class="absolute top-2 right-2" @click="copyToClipboard(pythonExample, 'Python code copied')">
                  <Copy class="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>

    <!-- API Key Section -->
    <Collapsible v-model:open="apiKeyOpen">
      <CollapsibleTrigger class="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
        <Eye class="w-3 h-3" />
        {{$t('Commons.heading.api_key')}}
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
  Copy, 
  RefreshCw, 
  ChevronRight, 
  AlertCircle, 
  Eye,
  Download,
  Terminal,
  FileJson,
  Globe
} from 'lucide-vue-next'
import { toast } from '@/composables/useToast'
import { t } from '@/i18n';

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

const examplesOpen = ref(false)
const apiKeyOpen = ref(false)
const activeIntegrationTab = ref('javascript')
const jsFramework = ref('fetch')
const pythonLibrary = ref('requests')

const integrationTabs = [
  { id: 'javascript', label: 'JavaScript', icon: Code },
  { id: 'python', label: 'Python', icon: Terminal },
  { id: 'curl', label: 'cURL', icon: Globe },
  { id: 'postman', label: 'Postman', icon: FileJson },
  { id: 'openapi', label: 'OpenAPI', icon: FileJson }
]

// Generate sample data for examples
const generateSampleData = () => {
  return props.fields.map((field, index) => {
    if (field.toLowerCase().includes('email')) return 'john@example.com'
    if (field.toLowerCase().includes('name')) return 'John Doe'
    if (field.toLowerCase().includes('date')) return new Date().toISOString().split('T')[0]
    if (field.toLowerCase().includes('phone')) return '+1-555-0123'
    if (field.toLowerCase().includes('message') || field.toLowerCase().includes('comment')) return 'Sample message text'
    return `Sample ${field} ${index + 1}`
  })
}

const sampleData = computed(() => generateSampleData())

// JavaScript Examples
const javascriptExample = computed(() => {
  const data = sampleData.value
  
  if (jsFramework.value === 'fetch') {
    return `// Submit data using Fetch API
const response = await fetch('${props.endpoint}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${props.apiKey}'
  },
  body: JSON.stringify({
    row: [${data.map(d => `'${d}'`).join(', ')}]
    // or use header-mapped format:
    // data: {
    //   ${props.fields.map((field, i) => `${field}: '${data[i]}'`).join(',\n    //   ')}
    // }
  })
})

const result = await response.json()
console.log('Success:', result)`
  } else if (jsFramework.value === 'axios') {
    return `// Submit data using Axios
import axios from 'axios'

const response = await axios.post('${props.endpoint}', {
  row: [${data.map(d => `'${d}'`).join(', ')}]
  // or use header-mapped format:
  // data: {
  //   ${props.fields.map((field, i) => `${field}: '${data[i]}'`).join(',\n  //   ')}
  // }
}, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${props.apiKey}'
  }
})

console.log('Success:', response.data)`
  } else {
    return `// Submit data using Node.js
const https = require('https')
const data = JSON.stringify({
  row: [${data.map(d => `'${d}'`).join(', ')}]
})

const options = {
  hostname: 'your-domain.com',
  path: '/api/forms/${props.id}/responses',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': 'Bearer ${props.apiKey}'
  }
}

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode)
  res.on('data', (chunk) => console.log('Response:', chunk.toString()))
})

req.on('error', (error) => console.error('Error:', error))
req.write(data)
req.end()`
  }
})

// Python Examples
const pythonExample = computed(() => {
  const data = sampleData.value
  
  if (pythonLibrary.value === 'requests') {
    return `import requests
import json

# Submit data using requests
url = '${props.endpoint}'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${props.apiKey}'
}

payload = {
    "row": [${data.map(d => `"${d}"`).join(', ')}]
    # or use header-mapped format:
    # "data": {
    #     ${props.fields.map((field, i) => `"${field}": "${data[i]}"`).join(',\n    #     ')}
    # }
}

response = requests.post(url, headers=headers, json=payload)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")`
  } else {
    return `import httpx
import json

# Submit data using HTTPX
url = '${props.endpoint}'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${props.apiKey}'
}

payload = {
    "row": [${data.map(d => `"${d}"`).join(', ')}]
    # or use header-mapped format:
    # "data": {
    #     ${props.fields.map((field, i) => `"${field}": "${data[i]}"`).join(',\n    #     ')}
    # }
}

async with httpx.AsyncClient() as client:
    response = await client.post(url, headers=headers, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")`
  }
})

// cURL Command
const curlCommand = computed(() => {
  const data = sampleData.value
  const rowData = data.map(d => `'${d}'`).join(', ')
  
  return `curl -X POST '${props.endpoint}' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ${props.apiKey}' \
  -d '{
    "row": [${rowData}]
    // or use header-mapped format:
    // "data": {
    //   ${props.fields.map((field, i) => `"${field}": "${data[i]}"`).join(',\n    //   ')}
    // }
  }'`
})

// Postman Collection
const postmanCollection = computed(() => {
  const data = sampleData.value
  
  return JSON.stringify({
    info: {
      name: `${props.type.charAt(0).toUpperCase() + props.type.slice(1)} Integration`,
      description: `Postman collection for ${props.type} submissions`,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: [
      {
        name: "Submit Response",
        request: {
          method: "POST",
          header: [
            {
              key: "Content-Type",
              value: "application/json"
            },
            {
              key: "Authorization",
              value: `Bearer ${props.apiKey}`
            }
          ],
          body: {
            mode: "raw",
            raw: JSON.stringify({
              row: data
            }, null, 2)
          },
          url: {
            raw: props.endpoint,
            host: [new URL(props.endpoint).hostname],
            path: new URL(props.endpoint).pathname.split('/').filter(Boolean)
          }
        }
      }
    ]
  }, null, 2)
})

// OpenAPI Specification
const openApiSpec = computed(() => {
  const data = sampleData.value
  
  return JSON.stringify({
    openapi: "3.0.0",
    info: {
      title: `${props.type.charAt(0).toUpperCase() + props.type.slice(1)} API`,
      description: `API for submitting responses to ${props.type}`,
      version: "1.0.0"
    },
    servers: [
      {
        url: new URL(props.endpoint).origin,
        description: t('Commons.text.api_server')
      }
    ],
    paths: {
      [new URL(props.endpoint).pathname]: {
        post: {
          summary: "Submit response",
          description: t('Components.Forms.IntegrationDialog.text.submit_a_new_response'),
          tags: ["responses"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  oneOf: [
                    {
                      type: "object",
                      properties: {
                        row: {
                          type: "array",
                          items: {
                            type: "string"
                          },
                          example: data
                        }
                      }
                    },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: props.fields.reduce((acc, field, index) => {
                            acc[field] = {
                              type: "string",
                              example: data[index]
                            }
                            return acc
                          }, {} as Record<string, any>)
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          responses: {
            200: {
              description: t('Components.Forms.IntegrationDialog.text.response_submitted_successfully'),
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      id: { type: "string" }
                    }
                  }
                }
              }
            },
            401: {
              description: t('Commons.text.unauthorized')
            },
            400: {
              description: t('Commons.text.bad_request')
            }
          },
          security: [
            {
              bearerAuth: []
            }
          ]
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  }, null, 2)
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

const downloadPostmanCollection = () => {
  const data = postmanCollection.value
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.type}-collection.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast.success('Postman collection downloaded')
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
