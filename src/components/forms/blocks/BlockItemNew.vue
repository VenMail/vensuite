<template>
  <div
    class="block-item-new group relative"
    :class="{
      'ring-2 ring-blue-500 dark:ring-blue-400': isFocused,
    }"
  >
    <!-- Hover Actions -->
    <div class="absolute -left-12 top-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical class="w-4 h-4" />
      </button>
      <button
        class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        title="Add below"
        @click="$emit('insert-below', block.id)"
      >
        <Plus class="w-4 h-4" />
      </button>
    </div>

    <!-- Block Content -->
    <div
      class="block-item-new__content bg-white dark:bg-gray-800 rounded-xl border-2 transition-all p-6"
      :class="[
        isFocused
          ? 'border-blue-500 dark:border-blue-400 shadow-lg'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
      ]"
    >
      <!-- Question Input -->
      <div class="mb-4">
        <input
          ref="questionInput"
          v-model="localBlock.question"
          type="text"
          :placeholder="getPlaceholder()"
          class="w-full text-lg font-medium bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          @focus="$emit('focus')"
          @blur="$emit('blur')"
          @input="handleUpdate"
        />
      </div>

      <!-- Type and Required -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <button
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            @click="showTypeMenu = !showTypeMenu"
          >
            <component :is="getBlockIcon()" class="w-4 h-4" />
            {{ getBlockLabel() }}
            <ChevronDown class="w-3 h-3" />
          </button>
          
          <!-- Type Change Menu -->
          <div
            v-if="showTypeMenu"
            class="absolute z-10 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2"
            style="top: 100%"
          >
            <button
              v-for="item in slashMenuItems"
              :key="item.id"
              class="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
              @click="changeType(item.type)"
            >
              <component :is="getIcon(item.icon)" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span class="text-sm text-gray-900 dark:text-gray-100">{{ item.label }}</span>
            </button>
          </div>
        </div>
        
        <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            v-model="localBlock.required"
            type="checkbox"
            class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
            @change="handleUpdate"
          />
          <span>Required</span>
        </label>
      </div>

      <!-- Type-Specific Content -->
      <div class="block-item-new__preview">
        <!-- Text Inputs -->
        <div v-if="localBlock.category === 'text'" class="space-y-2">
          <input
            v-if="localBlock.type === 'short' || localBlock.type === 'email' || localBlock.type === 'phone'"
            type="text"
            :placeholder="getInputPlaceholder()"
            disabled
            class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm"
          />
          <textarea
            v-else-if="localBlock.type === 'long'"
            rows="3"
            placeholder="Long answer text..."
            disabled
            class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm resize-none"
          />
          <input
            v-else-if="localBlock.type === 'date'"
            type="date"
            disabled
            class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm"
          />
          <input
            v-else-if="localBlock.type === 'time'"
            type="time"
            disabled
            class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm"
          />
        </div>

        <!-- Choice Inputs -->
        <div v-else-if="localBlock.category === 'choice' || localBlock.category === 'choices'" class="space-y-2">
          <div
            v-for="(_, index) in localBlock.options"
            :key="index"
            class="flex items-center gap-3"
          >
            <component
              :is="localBlock.type === 'checkbox' ? CheckSquare : CircleDot"
              class="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
            />
            <input
              v-model="localBlock.options![index]"
              type="text"
              :placeholder="`Option ${index + 1}`"
              class="flex-1 px-3 py-2 text-sm bg-transparent border-b border-gray-200 dark:border-gray-700 outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400"
              @input="handleUpdate"
            />
            <button
              v-if="localBlock.options!.length > 1"
              class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              @click="removeOption(index)"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          <button
            class="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            @click="addOption()"
          >
            <Plus class="w-4 h-4" />
            Add option
          </button>
        </div>

        <!-- Rating -->
        <div v-else-if="localBlock.category === 'rating'" class="flex items-center gap-2">
          <Star
            v-for="n in (localBlock.max || 5)"
            :key="n"
            class="w-7 h-7 text-gray-300 dark:text-gray-600"
          />
        </div>

        <!-- File Upload -->
        <div v-else-if="localBlock.category === 'file'">
          <div class="flex items-center justify-center px-6 py-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
            <div class="text-center">
              <Upload class="w-10 h-10 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
              <p class="text-sm text-gray-500 dark:text-gray-400">Click or drag files here</p>
            </div>
          </div>
        </div>

        <!-- Yes/No -->
        <div v-else-if="localBlock.category === 'switch'" class="flex gap-3">
          <button class="flex-1 px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium">
            Yes
          </button>
          <button class="flex-1 px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium">
            No
          </button>
        </div>
      </div>

      <!-- Action Buttons (visible on focus) -->
      <div
        v-if="isFocused"
        class="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
      >
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          title="Move up"
          @click="$emit('move-up', block.id)"
        >
          <ChevronUp class="w-4 h-4" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          title="Move down"
          @click="$emit('move-down', block.id)"
        >
          <ChevronDown class="w-4 h-4" />
        </button>
        <button
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          title="Duplicate"
          @click="$emit('duplicate', block.id)"
        >
          <Copy class="w-4 h-4" />
        </button>
        <div class="flex-1"></div>
        <button
          class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          title="Delete"
          @click="$emit('delete', block.id)"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import {
  GripVertical,
  Plus,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  X,
  Star,
  Upload,
  CircleDot,
  CheckSquare,
  Type,
  AlignLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  SlidersHorizontal,
  ToggleLeft,
} from "lucide-vue-next";
import type { FormBlock } from "./types";
import { slashMenuItems } from "./types";

const props = defineProps<{
  block: FormBlock;
  index: number;
  isFocused: boolean;
}>();

const emit = defineEmits<{
  (e: "focus"): void;
  (e: "blur"): void;
  (e: "update", block: FormBlock): void;
  (e: "delete", id: string): void;
  (e: "duplicate", id: string): void;
  (e: "move-up", id: string): void;
  (e: "move-down", id: string): void;
  (e: "insert-below", id: string): void;
}>();

const localBlock = ref<FormBlock>({ ...props.block });
const showTypeMenu = ref(false);
const questionInput = ref<HTMLInputElement | null>(null);

watch(
  () => props.block,
  (newBlock) => {
    localBlock.value = { ...newBlock };
  },
  { deep: true }
);

// Auto-focus input when block becomes focused
watch(
  () => props.isFocused,
  (focused) => {
    if (focused && questionInput.value) {
      nextTick(() => {
        questionInput.value?.focus();
        // Move cursor to end
        const length = questionInput.value?.value.length || 0;
        questionInput.value?.setSelectionRange(length, length);
      });
    }
  }
);

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

const getBlockIcon = () => {
  const item = slashMenuItems.find(i => i.type === localBlock.value.type);
  return getIcon(item?.icon || "Type");
};

const getBlockLabel = () => {
  const item = slashMenuItems.find(i => i.type === localBlock.value.type);
  return item?.label || "Text";
};

const getPlaceholder = () => {
  return "Type your question here...";
};

const getInputPlaceholder = () => {
  const placeholders: Record<string, string> = {
    short: "Short answer text",
    email: "email@example.com",
    phone: "+1 (555) 000-0000",
  };
  return placeholders[localBlock.value.type] || "Your answer";
};

const handleUpdate = () => {
  emit("update", localBlock.value);
};

const changeType = (newType: FormBlock["type"]) => {
  localBlock.value.type = newType;
  
  // Update category based on type
  const categoryMap: Record<string, FormBlock["category"]> = {
    short: "text",
    long: "text",
    email: "text",
    phone: "text",
    date: "text",
    time: "text",
    radio: "choice",
    checkbox: "choices",
    dropdown: "choice",
    rating: "rating",
    slider: "rating",
    file: "file",
    yesno: "switch",
  };
  localBlock.value.category = categoryMap[newType] || "text";
  
  // Add default options for choice types
  if (newType === "radio" || newType === "checkbox" || newType === "select") {
    if (!localBlock.value.options || localBlock.value.options.length === 0) {
      localBlock.value.options = ["Option 1", "Option 2", "Option 3"];
    }
  }
  
  showTypeMenu.value = false;
  handleUpdate();
};

const addOption = (afterIndex?: number) => {
  if (!localBlock.value.options) {
    localBlock.value.options = [];
  }
  const newOption = `Option ${localBlock.value.options.length + 1}`;
  if (afterIndex !== undefined) {
    localBlock.value.options.splice(afterIndex + 1, 0, newOption);
  } else {
    localBlock.value.options.push(newOption);
  }
  handleUpdate();
};

const removeOption = (index: number) => {
  if (localBlock.value.options && localBlock.value.options.length > 1) {
    localBlock.value.options.splice(index, 1);
    handleUpdate();
  }
};
</script>

<style scoped>
.block-item-new {
  position: relative;
}
</style>
