<template>
  <div
    ref="menuRef"
    class="slash-menu fixed z-50 w-80 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
    :style="menuStyle"
  >
    <div class="slash-menu__header px-3 py-2 border-b border-gray-200 dark:border-gray-700">
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        placeholder="Search blocks..."
        class="w-full px-2 py-1 text-sm bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        @keydown="handleKeyDown"
      />
    </div>
    <div class="slash-menu__items">
      <div
        v-for="(item, index) in filteredItems"
        :key="item.id"
        class="slash-menu__item px-3 py-2 cursor-pointer transition-colors"
        :class="{
          'bg-blue-50 dark:bg-blue-900/20': index === selectedIndex,
          'hover:bg-gray-50 dark:hover:bg-gray-700': index !== selectedIndex,
        }"
        @click="selectItem(item)"
        @mouseenter="selectedIndex = index"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-700">
            <component :is="getIcon(item.icon)" class="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ item.label }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
              {{ item.description }}
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="filteredItems.length === 0"
        class="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        No blocks found
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
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
} from "lucide-vue-next";
import { slashMenuItems, type BlockType } from "./types";

const props = defineProps<{
  filter: string;
  position?: { top: number; left: number };
}>();

const emit = defineEmits<{
  (e: "select", type: BlockType): void;
  (e: "close"): void;
}>();

const menuRef = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const searchQuery = ref(props.filter);
const selectedIndex = ref(0);

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

const filteredItems = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) return slashMenuItems;

  return slashMenuItems.filter((item) => {
    return (
      item.label.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.keywords.some((keyword) => keyword.toLowerCase().includes(query))
    );
  });
});

const menuStyle = computed(() => {
  if (props.position) {
    return {
      top: `${props.position.top}px`,
      left: `${props.position.left}px`,
    };
  }
  return {};
});

const selectItem = (item: typeof slashMenuItems[0]) => {
  emit("select", item.type);
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    selectedIndex.value = Math.min(selectedIndex.value + 1, filteredItems.value.length - 1);
    scrollToSelected();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
    scrollToSelected();
  } else if (event.key === "Enter") {
    event.preventDefault();
    if (filteredItems.value[selectedIndex.value]) {
      selectItem(filteredItems.value[selectedIndex.value]);
    }
  } else if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
  }
};

const scrollToSelected = () => {
  nextTick(() => {
    const menu = menuRef.value;
    if (!menu) return;

    const items = menu.querySelectorAll(".slash-menu__item");
    const selectedItem = items[selectedIndex.value] as HTMLElement;
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });
};

const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit("close");
  }
};

watch(
  () => props.filter,
  (newFilter) => {
    searchQuery.value = newFilter;
    selectedIndex.value = 0;
  }
);

watch(filteredItems, () => {
  selectedIndex.value = 0;
});

onMounted(() => {
  nextTick(() => {
    searchInput.value?.focus();
  });
  document.addEventListener("mousedown", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", handleClickOutside);
});
</script>

<style scoped>
.slash-menu {
  animation: slideIn 0.15s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slash-menu__items {
  max-height: 320px;
  overflow-y: auto;
}

.slash-menu__items::-webkit-scrollbar {
  width: 6px;
}

.slash-menu__items::-webkit-scrollbar-track {
  background: transparent;
}

.slash-menu__items::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.3);
  border-radius: 3px;
}

.slash-menu__items::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.5);
}
</style>
