<script setup lang="ts">
import { computed, defineProps } from 'vue'
import * as defaultIcons from '@iconify-prerendered/vue-file-icons'

const props = defineProps({
    fileType: String,
})

const iconComponents: Record<string, any> = {
  'application/vnd.ms-excel': defaultIcons.IconMicrosoftExcel,
  'application/pdf': defaultIcons.IconAdobeAcrobat,
  // ... other mappings
}
const iconComponent = computed(() => iconComponents[props.fileType || ""] || defaultIcons.IconMicrosoftExcel)
const iconClass = 'w-[3rem] h-[3rem]'
</script>

<template>
    <component :is="iconComponent" :class="iconClass" />
</template>