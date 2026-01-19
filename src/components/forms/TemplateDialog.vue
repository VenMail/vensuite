<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Button from '@/components/ui/button/Button.vue';
import type { FormTemplate } from '@/composables/useFormTemplates';

interface Props {
  isOpen: boolean;
  templates: FormTemplate[];
}

interface Emits {
  (e: 'close'): void;
  (e: 'select-template', template: FormTemplate): void;
  (e: 'create-blank'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const handleTemplateSelect = (template: FormTemplate) => {
  emit('select-template', template);
  emit('close');
};

const handleClose = () => {
  emit('close');
};
</script>

<template>
  <Dialog :open="isOpen" @update:open="handleClose">
    <DialogContent
      :class="[
        'rounded-lg shadow-2xl border',
        'bg-white border-gray-200',
        'dark:bg-gray-800 dark:border-gray-700'
      ]"
    >
      <DialogHeader>
        <DialogTitle
          :class="[
            'text-xl font-semibold',
            'text-gray-800 dark:text-gray-100'
          ]"
        >
          Create New Form
        </DialogTitle>
      </DialogHeader>
      <div class="grid grid-cols-2 gap-4 p-2">
        <Button
          v-for="template in templates"
          :key="template.name"
          variant="outline"
          :class="[
            'h-24 flex flex-col items-center justify-center transition-all',
            'hover:bg-gray-50 hover:border-primary-400',
            'dark:hover:bg-gray-700 dark:hover:border-primary-400'
          ]"
          @click="handleTemplateSelect(template)"
        >
          <component :is="template.icon" class="w-8 h-8 text-primary-600" />
          <span class="mt-2 text-sm font-medium">{{ template.name }}</span>
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
