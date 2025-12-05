<template>
  <div class="block-editor w-full h-full">
    <div class="block-editor__container max-w-3xl mx-auto px-6 py-8">
       
      <div class="block-editor__title-section mb-8">
        <input
          v-model="formTitle"
          type="text"
          placeholder="Untitled Form"
          class="block-editor__title-input text-4xl font-bold w-full bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          @input="handleTitleChange"
        />
        <input
          v-model="formDescription"
          type="text"
          placeholder="Add a description..."
          class="block-editor__description-input mt-2 text-lg w-full bg-transparent border-none outline-none text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
          @input="handleDescriptionChange"
        />
      </div>

       
      <div class="block-editor__blocks space-y-2">
        <TransitionGroup name="block-list">
          <BlockItem
            v-for="(block, index) in blocks"
            :key="block.id"
            :block="block"
            :index="index"
            :is-focused="focusedBlockId === block.id"
            :show-slash-menu="showSlashMenu && focusedBlockId === block.id"
            :slash-menu-filter="slashMenuFilter"
            @focus="handleBlockFocus(block.id)"
            @blur="handleBlockBlur"
            @update="handleBlockUpdate"
            @delete="handleBlockDelete"
            @insert-below="handleInsertBelow"
            @move-up="handleMoveUp"
            @move-down="handleMoveDown"
            @slash-command="handleSlashCommand"
            @close-slash-menu="closeSlashMenu"
          />
        </TransitionGroup>
      </div>

       
      <button
        v-if="blocks.length === 0 || !showSlashMenu"
        class="block-editor__add-button mt-4 flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors w-full"
        @click="handleAddBlock"
      >
        <Plus class="w-5 h-5" />
        <span>{{$t('Forms.Blocks.BlockEditor.text.add_a_question')}}</span>
      </button>

       
      <div
        v-if="blocks.length === 0"
        class="block-editor__empty-state mt-12 text-center"
      >
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <FileQuestion class="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {{$t('Forms.Blocks.BlockEditor.heading.start_building_your_form')}}
        </h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          {{$t('Commons.button.type')}} <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 text-sm font-mono">/</kbd> {{$t('Forms.Blocks.BlockEditor.text.for_commands_or_click')}}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { Plus, FileQuestion } from "lucide-vue-next";
import BlockItem from "./BlockItem.vue";
import type { FormBlock } from "@/components/forms/blocks/types";

const props = defineProps<{
  initialBlocks?: FormBlock[];
  initialTitle?: string;
  initialDescription?: string;
}>();

const emit = defineEmits<{
  (e: "update:blocks", blocks: FormBlock[]): void;
  (e: "update:title", title: string): void;
  (e: "update:description", description: string): void;
}>();

const formTitle = ref(props.initialTitle || "");
const formDescription = ref(props.initialDescription || "");
const blocks = ref<FormBlock[]>(props.initialBlocks || []);
const focusedBlockId = ref<string | null>(null);
const showSlashMenu = ref(false);
const slashMenuFilter = ref("");

const handleTitleChange = () => {
  emit("update:title", formTitle.value);
};

const handleDescriptionChange = () => {
  emit("update:description", formDescription.value);
};

const generateBlockId = () => {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const createNewBlock = (type: FormBlock["type"] = "short"): FormBlock => {
  return {
    id: generateBlockId(),
    type,
    question: "",
    required: false,
    category: getBlockCategory(type),
    options: type === "radio" || type === "checkbox" || type === "select" ? [] : undefined,
  };
};

const getBlockCategory = (type: FormBlock["type"]): FormBlock["category"] => {
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

const handleAddBlock = () => {
  const newBlock = createNewBlock();
  blocks.value.push(newBlock);
  focusedBlockId.value = newBlock.id;
  emit("update:blocks", blocks.value);
};

const handleBlockFocus = (blockId: string) => {
  focusedBlockId.value = blockId;
};

const handleBlockBlur = () => {
  // Don't immediately clear focus to allow slash menu interaction
  setTimeout(() => {
    if (!showSlashMenu.value) {
      focusedBlockId.value = null;
    }
  }, 150);
};

const handleBlockUpdate = (updatedBlock: FormBlock) => {
  const index = blocks.value.findIndex((b: FormBlock) => b.id === updatedBlock.id);
  if (index !== -1) {
    blocks.value[index] = updatedBlock;
    emit("update:blocks", blocks.value);
  }
};

const handleBlockDelete = (blockId: string) => {
  const index = blocks.value.findIndex((b: FormBlock) => b.id === blockId);
  if (index !== -1) {
    blocks.value.splice(index, 1);
    emit("update:blocks", blocks.value);
    
    // Focus next or previous block
    if (blocks.value.length > 0) {
      const nextBlock = blocks.value[index] || blocks.value[index - 1];
      if (nextBlock) {
        focusedBlockId.value = nextBlock.id;
      }
    }
  }
};

const handleInsertBelow = (blockId: string) => {
  const index = blocks.value.findIndex((b: FormBlock) => b.id === blockId);
  if (index !== -1) {
    const newBlock = createNewBlock();
    blocks.value.splice(index + 1, 0, newBlock);
    focusedBlockId.value = newBlock.id;
    emit("update:blocks", blocks.value);
  }
};

const handleMoveUp = (blockId: string) => {
  const index = blocks.value.findIndex((b: FormBlock) => b.id === blockId);
  if (index > 0) {
    const block = blocks.value[index];
    blocks.value.splice(index, 1);
    blocks.value.splice(index - 1, 0, block);
    emit("update:blocks", blocks.value);
  }
};

const handleMoveDown = (blockId: string) => {
  const index = blocks.value.findIndex((b: FormBlock) => b.id === blockId);
  if (index < blocks.value.length - 1) {
    const block = blocks.value[index];
    blocks.value.splice(index, 1);
    blocks.value.splice(index + 1, 0, block);
    emit("update:blocks", blocks.value);
  }
};

const handleSlashCommand = (data: { blockId: string; show: boolean; filter: string }) => {
  showSlashMenu.value = data.show;
  slashMenuFilter.value = data.filter;
  if (data.show) {
    focusedBlockId.value = data.blockId;
  }
};

const closeSlashMenu = () => {
  showSlashMenu.value = false;
  slashMenuFilter.value = "";
};

// Watch for prop changes
watch(
  () => props.initialBlocks,
  (newBlocks) => {
    if (newBlocks) {
      blocks.value = newBlocks;
    }
  },
  { deep: true }
);

watch(
  () => props.initialTitle,
  (newTitle) => {
    if (newTitle !== undefined) {
      formTitle.value = newTitle;
    }
  }
);

watch(
  () => props.initialDescription,
  (newDescription) => {
    if (newDescription !== undefined) {
      formDescription.value = newDescription;
    }
  }
);
</script>

<style scoped>
.block-editor__title-input:focus,
.block-editor__description-input:focus {
  outline: none;
}

.block-list-move {
  transition: transform 0.3s ease;
}

.block-list-enter-active,
.block-list-leave-active {
  transition: all 0.3s ease;
}

.block-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.block-list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
