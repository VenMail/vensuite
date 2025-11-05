<template>
  <div class="block-editor-wrapper">
    <BlockEditor
      :initial-blocks="formBlocks"
      :initial-title="formTitle"
      :initial-description="formDescription"
      @update:blocks="handleBlocksUpdate"
      @update:title="handleTitleUpdate"
      @update:description="handleDescriptionUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import BlockEditor from "./BlockEditor.vue";
import type { FormBlock } from "./types";
import type { FormQuestion } from "@/types";

const props = defineProps<{
  questions?: FormQuestion[];
  title?: string;
  description?: string;
}>();

const emit = defineEmits<{
  (e: "update:questions", questions: FormQuestion[]): void;
  (e: "update:title", title: string): void;
  (e: "update:description", description: string): void;
}>();

const formTitle = ref(props.title || "");
const formDescription = ref(props.description || "");
const formBlocks = ref<FormBlock[]>([]);

// Convert FormQuestion to FormBlock
const convertQuestionToBlock = (question: FormQuestion): FormBlock => {
  return {
    id: question.id,
    type: question.type as FormBlock["type"],
    category: question.category as FormBlock["category"],
    question: question.question || "",
    description: question.description,
    placeholder: question.placeholder,
    required: question.required || false,
    options: question.options?.map((opt) => 
      typeof opt === "string" ? opt : opt.label || opt.value
    ),
    validation: question.validation,
    iconType: (question as any).iconType,
    allowHalf: (question as any).allowHalf,
    min: (question as any).min,
    max: (question as any).max,
    allowedTypes: (question as any).allowedTypes,
    maxSize: (question as any).maxSize,
    multiple: (question as any).multiple,
  };
};

// Convert FormBlock to FormQuestion
const convertBlockToQuestion = (block: FormBlock): FormQuestion => {
  const baseQuestion: FormQuestion = {
    id: block.id,
    type: block.type as any,
    category: block.category as any,
    question: block.question,
    description: block.description,
    placeholder: block.placeholder,
    required: block.required,
    validation: block.validation,
  };

  // Add type-specific properties
  if (block.category === "choice" || block.category === "choices") {
    (baseQuestion as any).options = block.options?.map((opt) => ({
      value: opt.toLowerCase().replace(/\s+/g, "_"),
      label: opt,
    }));
  }

  if (block.category === "rating") {
    (baseQuestion as any).iconType = block.iconType || "star";
    (baseQuestion as any).allowHalf = block.allowHalf || false;
    (baseQuestion as any).min = block.min || 1;
    (baseQuestion as any).max = block.max || 5;
  }

  if (block.category === "file") {
    (baseQuestion as any).allowedTypes = block.allowedTypes || [];
    (baseQuestion as any).maxSize = block.maxSize || 10;
    (baseQuestion as any).multiple = block.multiple || false;
  }

  return baseQuestion;
};

// Initialize blocks from questions
watch(
  () => props.questions,
  (newQuestions) => {
    if (newQuestions && newQuestions.length > 0) {
      formBlocks.value = newQuestions.map(convertQuestionToBlock);
    }
  },
  { immediate: true }
);

watch(
  () => props.title,
  (newTitle) => {
    if (newTitle !== undefined) {
      formTitle.value = newTitle;
    }
  }
);

watch(
  () => props.description,
  (newDescription) => {
    if (newDescription !== undefined) {
      formDescription.value = newDescription;
    }
  }
);

const handleBlocksUpdate = (blocks: FormBlock[]) => {
  const questions = blocks.map(convertBlockToQuestion);
  emit("update:questions", questions);
};

const handleTitleUpdate = (title: string) => {
  emit("update:title", title);
};

const handleDescriptionUpdate = (description: string) => {
  emit("update:description", description);
};
</script>

<style scoped>
.block-editor-wrapper {
  width: 100%;
  height: 100%;
}
</style>
