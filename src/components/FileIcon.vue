<script setup lang="ts">
import { computed, defineProps, useAttrs } from 'vue';
import * as defaultIcons from '@iconify-prerendered/vue-file-icons';
import { Folder } from 'lucide-vue-next';

// Props definition
const props = defineProps<{
  fileType?: string | null;
}>();

// Attributes from parent component
const attrs = useAttrs();

// Icon component mapping
const iconComponents: Record<string, any> = {
  'xlsx': defaultIcons.IconMicrosoftExcel,
  'docx': defaultIcons.IconMicrosoftWord,
  'pdf': defaultIcons.IconAdobeAcrobat,
  'png': defaultIcons.IconImage,
  'jpg': defaultIcons.IconImage,
  'webp': defaultIcons.IconImage,
  'folder': Folder,
  null: Folder,
  // ... other mappings
};

const iconComponent = computed(() => iconComponents[props.fileType || ""] || defaultIcons.IconDefault);

// Define color using inline styles for all cases
const iconStyle = computed(() => {
  switch (props.fileType) {
    case "xlsx":
      return { color: '#10b981' }; // Tailwind 'text-green-500'
    case "pdf":
      return { color: '#ef4444' }; // Tailwind 'text-red-500'
    case "docx":
      return { color: '#3b82f6' }; // Tailwind 'text-blue-500'
    case "png":
    case "jpg":
    case "webp":
      return { color: '#6b7280' }; // Tailwind 'text-gray-500'
    case "folder":
    case null:
      return { color: '#47484b' }; // Custom color
    default:
      return { color: '#64748b' }; // Tailwind 'text-slate-500'
  }
});

// Icon class for size
const iconClass = 'w-[3rem] h-[3rem]';
</script>

<template>
  <!-- Render the dynamic icon component with inline styles for colors -->
  <component :is="iconComponent" :class="iconClass" :style="iconStyle" v-bind="attrs" />
</template>

<style scoped>
/* Optional: Additional Apple-inspired typography */
</style>
