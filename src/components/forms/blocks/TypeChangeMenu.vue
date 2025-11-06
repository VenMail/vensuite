<template>
  <div
    ref="menuRef"
    class="type-change-menu absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
  >
    <div class="type-change-menu__header px-3 py-2 border-b border-gray-200 dark:border-gray-700">
      <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Change Block Type
      </h3>
    </div>
    <div class="type-change-menu__items max-h-80 overflow-y-auto">
      <button
        v-for="item in slashMenuItems"
        :key="item.id"
        class="type-change-menu__item w-full px-3 py-2 text-left transition-colors"
        :class="{
          'bg-blue-50 dark:bg-blue-900/20': item.type === currentType,
          'hover:bg-gray-50 dark:hover:bg-gray-700': item.type !== currentType,
        }"
        @click="selectType(item.type)"
      >
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-700">
            <component :is="getIcon(item.icon)" class="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ item.label }}
            </div>
          </div>
          <Check v-if="item.type === currentType" class="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import {
  Type,
  AlignLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  CircleDot,
  CheckSquare,
  ChevronDown,
  Star,
  SlidersHorizontal,
  Upload,
  ToggleLeft,
  Check,
} from "lucide-vue-next";
import { slashMenuItems, type BlockType } from "./types";

defineProps<{
  currentType: BlockType;
}>();

const emit = defineEmits<{
  (e: "select", type: BlockType): void;
  (e: "close"): void;
}>();

const menuRef = ref<HTMLElement | null>(null);

const iconMap: Record<string, any> = {
  Type,
  AlignLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  CircleDot,
  CheckSquare,
  ChevronDown,
  Star,
  SlidersHorizontal,
  Upload,
  ToggleLeft,
};

const getIcon = (iconName: string) => {
  return iconMap[iconName] || Type;
};

const selectType = (type: BlockType) => {
  emit("select", type);
};

const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit("close");
  }
};

onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", handleClickOutside);
});
</script>

<style scoped>
.type-change-menu {
  animation: slideIn 0.15s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.type-change-menu__items::-webkit-scrollbar {
  width: 6px;
}

.type-change-menu__items::-webkit-scrollbar-track {
  background: transparent;
}

.type-change-menu__items::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.3);
  border-radius: 3px;
}

.type-change-menu__items::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.5);
}
</style>
