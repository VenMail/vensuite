<template>
  <div
    v-if="state.visible"
    id="context-menu"
    :class="[
      'fixed z-50 border rounded-md shadow-lg context-menu',
      'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700',
    ]"
    :style="{ left: state.x + 'px', top: state.y + 'px' }"
  >
    <ul class="py-1">
      <li
        v-for="action in actions"
        :key="action.label"
        :class="[
          'px-3 py-2 cursor-pointer flex items-center space-x-2 text-sm',
          'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700',
          action.disabled ? 'opacity-60 pointer-events-none' : '',
        ]"
        @click="handleAction(action)"
      >
        <component
          v-if="action.icon"
          :is="resolveIcon(action.icon)"
          class="h-4 w-4"
        />
        <span>{{ action.label }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { resolveDynamicComponent } from "vue";
import type {
  ContextMenuAction,
  FileContextMenuState,
} from "@/composables/useFileExplorer";

defineProps<{
  state: FileContextMenuState;
  actions: ContextMenuAction[];
}>();

function resolveIcon(icon: ContextMenuAction["icon"]) {
  if (typeof icon === "string") {
    return resolveDynamicComponent(icon);
  }
  return icon;
}

function handleAction(action: ContextMenuAction) {
  if (action.disabled) return;
  action.action?.();
}
</script>
