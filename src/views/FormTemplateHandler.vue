<template>
  <div class="p-6 text-center">
    <p class="text-sm text-gray-600">Preparing your form...</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFormStore } from '@/store/forms'
import { t } from '@/i18n';

const route = useRoute()
const router = useRouter()
const formStore = useFormStore()

function normalize(name: string | undefined): string {
  return (name || '').toLowerCase().replace(/\s+/g, '-')
}

async function createFromTemplate() {
  const raw = String(route.params.template || '')
  const key = normalize(raw)

  let payload: Record<string, unknown> = { title: 'New Form' }

  if (key.includes('blank')) {
    payload = { title: 'Blank Form' }
  } else if (key.includes('signup')) {
    payload = {
      title: 'Signup Form',
      description: t('Views.FormTemplateHandler.text.collect_user_signups'),
      definition: {
        questions: [
          { id: 'q1', type: 'short_text', label: 'Full name', required: true },
          { id: 'q2', type: 'email', label: 'Email address', required: true },
          { id: 'q3', type: 'short_text', label: 'Company', required: false },
        ]
      }
    }
  } else if (key.includes('survey')) {
    payload = {
      title: 'Survey Form',
      description: t('Views.FormTemplateHandler.text.quick_feedback_survey'),
      definition: {
        questions: [
          { id: 'q1', type: 'rating', label: 'How satisfied are you?', required: true, scale: 5 },
          { id: 'q2', type: 'long_text', label: 'What can we improve?', required: false },
        ]
      }
    }
  }

  const form = await formStore.createForm(payload as any)
  if (form?.id) {
    await router.replace({ name: 'form-edit', params: { id: form.id } })
  } else {
    await router.replace({ name: 'forms' })
  }
}

onMounted(() => {
  void createFromTemplate()
})
</script>
