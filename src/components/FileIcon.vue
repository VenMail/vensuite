<script setup lang="ts">
import { computed, defineProps, useAttrs } from 'vue';
import * as defaultIcons from '@iconify-prerendered/vue-file-icons';
import { FolderIcon } from 'lucide-vue-next';

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
  'folder': FolderIcon,
  null: FolderIcon,
  // ... other mappings
};

const iconComponent = computed(() => iconComponents[props.fileType || ""] || defaultIcons.IconDefault);

// Improved color selection (Apple-inspired subtle colors)
const iconColor = computed(() => {
  switch (props.fileType) {
    case "xlsx":
      return 'text-green-500';
    case "pdf":
      return 'text-red-500';
    case "docx":
      return 'text-blue-500';
    case "png":
    case "jpg":
    case "webp":
      return 'text-gray-500';
    case "folder":
    case null:
      return 'text-color-[#f7b84b]';
    default:
      return 'text-slate-500';
  }
});

// Icon class with dynamic coloring
const iconClass = computed(() => `w-[3rem] h-[3rem] ${iconColor.value}`);
</script>

<template>
  <!-- Render the dynamic icon component with dynamic classes -->
  <component :is="iconComponent" :class="iconClass" v-bind="attrs" />
  <div class="hidden">
    <div class="text-green-500 text-red-500 text-blue-500 text-gray-500 text-color-[#f7b84b] text-slate-500"></div>
  </div>
</template>

<style scoped>
/* Optional: Additional Apple-inspired typography */
</style>
