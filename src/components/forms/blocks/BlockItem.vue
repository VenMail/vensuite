<template>
  <div
    class="block-item group relative"
    :class="{
      'block-item--focused': isFocused,
      'block-item--dragging': isDragging,
    }"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragover.prevent="handleDragOver"
    @drop="handleDrop"
  >
     
    <div class="block-item__handle-container absolute left-0 top-0 -ml-12 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-3">
      <button
        class="block-item__drag-handle p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
        @mousedown="isDragging = true"
      >
        <GripVertical class="w-4 h-4" />
      </button>
      <button
        class="block-item__add-button p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        title="Add block below"
        @click="$emit('insert-below', block.id)"
      >
        <Plus class="w-4 h-4" />
      </button>
    </div>

     
    <div
      class="block-item__content relative rounded-lg border-2 transition-all"
      :class="[
        isFocused
          ? 'border-blue-500 dark:border-blue-400 bg-white dark:bg-gray-800'
          : 'border-transparent bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800',
      ]"
    >
      <div class="block-item__inner p-4">
         
        <div class="block-item__question mb-3">
          <input
            ref="questionInput"
            v-model="localBlock.question"
            type="text"
            :placeholder="getPlaceholder()"
            class="block-item__question-input w-full text-base font-medium bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            @focus="handleFocus"
            @blur="handleBlur"
            @input="handleQuestionInput"
            @keydown="handleKeyDown"
          />
        </div>

         
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span
              class="block-item__type-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <component :is="getBlockIcon()" class="w-3.5 h-3.5" />
              {{ getBlockLabel() }}
            </span>
            <button
              v-if="isFocused"
              class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
              @click="showTypeMenu = !showTypeMenu"
            >
              Change type
            </button>
          </div>
          <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              v-model="localBlock.required"
              type="checkbox"
              class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
              @change="handleUpdate"
            />
            <span>Required</span>
          </label>
        </div>

         
        <div class="block-item__type-content">
           
          <div v-if="localBlock.category === 'text'" class="space-y-2">
            <input
              v-if="localBlock.type === 'short' || localBlock.type === 'email' || localBlock.type === 'phone'"
              type="text"
              :placeholder="getInputPlaceholder()"
              disabled
              class="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm"
            />
            <textarea
              v-else-if="localBlock.type === 'long'"
              rows="3"
              placeholder="Long answer text..."
              disabled
              class="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm resize-none"
            />
            <input
              v-else-if="localBlock.type === 'date'"
              type="date"
              disabled
              class="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm"
            />
            <input
              v-else-if="localBlock.type === 'time'"
              type="time"
              disabled
              class="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm"
            />
          </div>

           
          <div v-else-if="localBlock.category === 'choice' || localBlock.category === 'choices'" class="space-y-2">
            <div
              v-for="(_, index) in localBlock.options"
              :key="index"
              class="flex items-center gap-2"
            >
              <component
                :is="localBlock.type === 'checkbox' ? CheckSquare : CircleDot"
                class="w-4 h-4 text-gray-400 dark:text-gray-500"
              />
              <input
                v-model="localBlock.options![index]"
                type="text"
                :placeholder="`Option ${index + 1}`"
                class="flex-1 px-2 py-1 text-sm bg-transparent border-none outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
                @input="handleUpdate"
                @keydown.enter.prevent="addOption(index + 1)"
                @keydown.backspace="handleOptionBackspace(index, $event)"
              />
              <button
                v-if="localBlock.options!.length > 1"
                class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                @click="removeOption(index)"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              class="flex items-center gap-2 px-2 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              @click="addOption()"
            >
              <Plus class="w-3.5 h-3.5" />
              Add option
            </button>
          </div>

           
          <div v-else-if="localBlock.category === 'rating'" class="flex items-center gap-2">
            <Star
              v-for="n in (localBlock.max || 5)"
              :key="n"
              class="w-6 h-6 text-gray-300 dark:text-gray-600"
            />
          </div>

           
          <div v-else-if="localBlock.category === 'file'" class="space-y-2">
            <div class="flex items-center justify-center px-4 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div class="text-center">
                <Upload class="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                <p class="text-sm text-gray-500 dark:text-gray-400">{{$t('Forms.Blocks.BlockItem.text.click_or_drag_files')}}</p>
              </div>
            </div>
          </div>

           
          <div v-else-if="localBlock.category === 'switch'" class="flex gap-3">
            <button class="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm">
              Yes
            </button>
            <button class="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm">
              No
            </button>
          </div>
        </div>
      </div>

       
      <div
        v-if="isFocused"
        class="block-item__actions absolute right-2 top-2 flex items-center gap-1"
      >
        <button
          class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          title="Move up"
          @click="$emit('move-up', block.id)"
        >
          <ChevronUp class="w-4 h-4" />
        </button>
        <button
          class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          title="Move down"
          @click="$emit('move-down', block.id)"
        >
          <ChevronDown class="w-4 h-4" />
        </button>
        <button
          class="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          title="Delete block"
          @click="handleDelete"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>

     
    <SlashMenu
      v-if="showSlashMenu"
      :filter="slashMenuFilter"
      :position="slashMenuPosition"
      @select="handleSlashMenuSelect"
      @close="$emit('close-slash-menu')"
    />

     
    <TypeChangeMenu
      v-if="showTypeMenu"
      :current-type="localBlock.type"
      @select="handleTypeChange"
      @close="showTypeMenu = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import {
  GripVertical,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Trash2,
  Type,
  AlignLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  CircleDot,
  CheckSquare,
  ChevronDown as ChevronDownIcon,
  Star,
  SlidersHorizontal,
  Upload,
  ToggleLeft,
} from "lucide-vue-next";
import type { FormBlock, BlockType } from "@/components/forms/blocks/types";
import SlashMenu from "./SlashMenu.vue";
import TypeChangeMenu from "./TypeChangeMenu.vue";

const props = defineProps<{
  block: FormBlock;
  index: number;
  isFocused: boolean;
  showSlashMenu: boolean;
  slashMenuFilter: string;
}>();

const emit = defineEmits<{
  (e: "focus"): void;
  (e: "blur"): void;
  (e: "update", block: FormBlock): void;
  (e: "delete", blockId: string): void;
  (e: "insert-below", blockId: string): void;
  (e: "move-up", blockId: string): void;
  (e: "move-down", blockId: string): void;
  (e: "slash-command", data: { blockId: string; show: boolean; filter: string }): void;
  (e: "close-slash-menu"): void;
}>();

const localBlock = ref<FormBlock>({ ...props.block });
const questionInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const showTypeMenu = ref(false);
const slashMenuPosition = ref({ top: 0, left: 0 });

watch(
  () => props.block,
  (newBlock) => {
    localBlock.value = { ...newBlock };
  },
  { deep: true }
);

// Initialize options for choice blocks
if (
  (localBlock.value.category === "choice" || localBlock.value.category === "choices") &&
  (!localBlock.value.options || localBlock.value.options.length === 0)
) {
  localBlock.value.options = ["Option 1"];
}

const getPlaceholder = () => {
  const placeholders: Record<BlockType, string> = {
    short: "Type your question here...",
    long: "Type your question here...",
    email: "What's your email address?",
    phone: "What's your phone number?",
    date: "Select a date",
    time: "Select a time",
    radio: "Choose one option",
    checkbox: "Select all that apply",
    select: "Select from dropdown",
    rating: "Rate from 1 to 5",
    slider: "Slide to select",
    file: "Upload a file",
    yesno: "Yes or No?",
  };
  return placeholders[localBlock.value.type] || "Type your question...";
};

const getInputPlaceholder = () => {
  const placeholders: Record<string, string> = {
    short: "Short answer text",
    email: "email@example.com",
    phone: "+1 (555) 000-0000",
  };
  return placeholders[localBlock.value.type] || "Your answer";
};

const getBlockLabel = () => {
  const labels: Record<BlockType, string> = {
    short: "Short Text",
    long: "Long Text",
    email: "Email",
    phone: "Phone",
    date: "Date",
    time: "Time",
    radio: "Multiple Choice",
    checkbox: "Checkboxes",
    select: "Dropdown",
    rating: "Rating",
    slider: "Slider",
    file: "File Upload",
    yesno: "Yes/No",
  };
  return labels[localBlock.value.type];
};

const getBlockIcon = () => {
  const icons: Record<BlockType, any> = {
    short: Type,
    long: AlignLeft,
    email: Mail,
    phone: Phone,
    date: Calendar,
    time: Clock,
    radio: CircleDot,
    checkbox: CheckSquare,
    select: ChevronDownIcon,
    rating: Star,
    slider: SlidersHorizontal,
    file: Upload,
    yesno: ToggleLeft,
  };
  return icons[localBlock.value.type];
};

const handleFocus = () => {
  emit("focus");
};

const handleBlur = () => {
  emit("blur");
};

const handleQuestionInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const value = input.value;
  
  // Check for slash command
  if (value.endsWith("/")) {
    const rect = input.getBoundingClientRect();
    slashMenuPosition.value = {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    };
    emit("slash-command", {
      blockId: localBlock.value.id,
      show: true,
      filter: "",
    });
  } else if (value.includes("/")) {
    const slashIndex = value.lastIndexOf("/");
    const filter = value.substring(slashIndex + 1);
    emit("slash-command", {
      blockId: localBlock.value.id,
      show: true,
      filter,
    });
  } else {
    emit("slash-command", {
      blockId: localBlock.value.id,
      show: false,
      filter: "",
    });
  }
  
  handleUpdate();
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    emit("insert-below", localBlock.value.id);
  } else if (event.key === "Backspace" && localBlock.value.question === "") {
    event.preventDefault();
    handleDelete();
  } else if (event.key === "Escape") {
    emit("close-slash-menu");
    questionInput.value?.blur();
  }
};

const handleUpdate = () => {
  emit("update", localBlock.value);
};

const handleDelete = () => {
  emit("delete", localBlock.value.id);
};

const addOption = (atIndex?: number) => {
  if (!localBlock.value.options) {
    localBlock.value.options = [];
  }
  const index = atIndex ?? localBlock.value.options.length;
  localBlock.value.options.splice(index, 0, `Option ${localBlock.value.options.length + 1}`);
  handleUpdate();
};

const removeOption = (index: number) => {
  if (localBlock.value.options && localBlock.value.options.length > 1) {
    localBlock.value.options.splice(index, 1);
    handleUpdate();
  }
};

const handleOptionBackspace = (index: number, event: KeyboardEvent) => {
  const input = event.target as HTMLInputElement;
  if (input.value === "" && localBlock.value.options && localBlock.value.options.length > 1) {
    event.preventDefault();
    removeOption(index);
  }
};

const handleSlashMenuSelect = (type: BlockType) => {
  // Remove the slash command from question
  const slashIndex = localBlock.value.question.lastIndexOf("/");
  if (slashIndex !== -1) {
    localBlock.value.question = localBlock.value.question.substring(0, slashIndex);
  }
  
  handleTypeChange(type);
  emit("close-slash-menu");
};

const handleTypeChange = (newType: BlockType) => {
  const oldCategory = localBlock.value.category;
  localBlock.value.type = newType;
  localBlock.value.category = getBlockCategory(newType);
  
  // Initialize options for choice blocks
  if (
    (localBlock.value.category === "choice" || localBlock.value.category === "choices") &&
    oldCategory !== "choice" &&
    oldCategory !== "choices"
  ) {
    localBlock.value.options = ["Option 1"];
  }
  
  showTypeMenu.value = false;
  handleUpdate();
  
  nextTick(() => {
    questionInput.value?.focus();
  });
};

const getBlockCategory = (type: BlockType): FormBlock["category"] => {
  const categoryMap: Record<string, FormBlock["category"]> = {
    short: "text",
    long: "text",
    email: "text",
    phone: "text",
    date: "text",
    time: "text",
    radio: "choice",
    checkbox: "choices",
    select: "choice",
    rating: "rating",
    slider: "rating",
    file: "file",
    yesno: "switch",
  };
  return categoryMap[type] || "text";
};

const handleDragStart = (event: DragEvent) => {
  isDragging.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", localBlock.value.id);
  }
};

const handleDragEnd = () => {
  isDragging.value = false;
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  // Handle drop logic in parent component
};
</script>

<style scoped>
.block-item {
  position: relative;
  padding-left: 0;
}

.block-item--focused {
  z-index: 10;
}

.block-item--dragging {
  opacity: 0.5;
}

.block-item__drag-handle:active {
  cursor: grabbing;
}

.block-item__question-input::placeholder {
  font-weight: 500;
}
</style>
