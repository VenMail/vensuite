<script lang="ts">
import { defineComponent } from 'vue'
import * as LucideIcons from 'lucide-vue-next'

export default defineComponent({
  props: {
    name: {
      type: String,
      required: true,
    },
  },
  computed: {
    iconComponent() {
      const iconName = this.name as keyof typeof LucideIcons
      const iconComponent = LucideIcons[iconName]
      if (!iconComponent) {
        console.error(`Lucide icon '${iconName}' not found.`)
        return null
      }
      return iconComponent
    },
  },
})
</script>

<template>
  <component :is="iconComponent" />
</template>
