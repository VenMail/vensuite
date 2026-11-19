<script setup lang="ts">
import { Plus } from 'lucide-vue-next';
import Button from '@/components/ui/button/Button.vue';
import { t } from '@/i18n';
import type { FormTemplate } from '@/composables/useFormTemplates';

interface Props {
  templates: FormTemplate[];
}

interface Emits {
  (e: 'select-template', template: FormTemplate): void;
  (e: 'create-blank'): void;
}

const { templates } = defineProps<Props>();
const emit = defineEmits<Emits>();

const handleTemplateSelect = (template: FormTemplate) => {
  emit('select-template', template);
};

const handleCreateBlank = () => {
  emit('create-blank');
};
</script>

<template>
  <div
    class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/70 backdrop-blur shadow-sm overflow-hidden group hover:shadow-lg transition-all duration-300"
  >
    <div class="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200/70 dark:border-gray-700/70">
      <div>
        <p class="text-xs uppercase tracking-wide text-primary-600 dark:text-primary-400 font-semibold">
          {{$t('Components.Forms.text.start_a_new_form')}}
        </p>
      </div>
      <Button variant="ghost" size="sm" class="text-primary-600" @click="handleCreateBlank">
        <Plus class="h-4 w-4 mr-1" /> {{ t('Commons.button.blank') }}
      </Button>
    </div>
    <div class="relative">
      <div class="absolute inset-0 bg-gradient-to-r from-gray-50/90 via-white/70 to-gray-50/90 dark:from-gray-900/80 dark:via-gray-900/40 dark:to-gray-900/80 blur-xl opacity-70 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none"></div>
      <div class="template-preview-scroll overflow-x-auto px-3 sm:px-5 py-4 space-x-4 flex">
        <button
          v-for="template in templates"
          :key="template.slug"
          type="button"
          class="w-44 min-w-[11rem] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          @click="handleTemplateSelect(template)"
        >
          <div
            class="h-32 relative overflow-hidden"
            :style="template.previewStyle"
          >
            <div class="absolute inset-0 bg-gradient-to-br from-white/20 to-black/10"></div>
            <div class="absolute inset-x-5 top-5 rounded-lg bg-white/95 p-3 shadow-lg" aria-hidden="true">
              <div class="mb-2 h-1.5 w-2/3 rounded-full bg-slate-700/70"></div>
              <div class="mb-3 h-1 w-4/5 rounded-full bg-slate-200"></div>
              <div class="mb-2 h-4 rounded border border-slate-200"></div>
              <div class="h-4 rounded border border-slate-200"></div>
            </div>
          </div>
          <div class="px-3 py-3 space-y-1">
            <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{{ template.name }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ template.subtitle }}</p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
