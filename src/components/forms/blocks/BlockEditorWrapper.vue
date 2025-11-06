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
import { ref, watch } from "vue";
import BlockEditor from "./BlockEditor.vue";
import type { FormBlock } from "@/components/forms/blocks/types";
import type { FormQuestion, FormQuestionType, Option } from "@/types";

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

const SUPPORTED_BLOCK_TYPES: FormBlock["type"][] = [
  "short",
  "long",
  "email",
  "phone",
  "date",
  "time",
  "radio",
  "checkbox",
  "select",
  "rating",
  "slider",
  "file",
  "yesno",
];

const mapQuestionTypeToBlockType = (type: FormQuestionType): FormBlock["type"] => {
  if (SUPPORTED_BLOCK_TYPES.includes(type as FormBlock["type"])) {
    return type as FormBlock["type"];
  }
  switch (type) {
    case "fname":
    case "lname":
    case "fullName":
    case "website":
    case "number":
      return "short";
    case "address":
    case "statement":
      return "long";
    case "tags":
      return "checkbox";
    case "range":
      return "slider";
    default:
      return "short";
  }
};

const getBlockCategory = (type: FormBlock["type"]): FormBlock["category"] => {
  const categoryMap: Record<FormBlock["type"], FormBlock["category"]> = {
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
  return categoryMap[type];
};

// Convert FormQuestion to FormBlock
const convertQuestionToBlock = (question: FormQuestion): FormBlock => {
  const blockType = mapQuestionTypeToBlockType(question.type);
  const block: FormBlock = {
    id: question.id,
    type: blockType,
    category: getBlockCategory(blockType),
    question: question.question || "",
    description: question.description,
    placeholder: question.placeholder,
    required: Boolean(question.required),
    optionValues: undefined,
    options: undefined,
    validation: undefined,
    iconType: undefined,
    allowHalf: undefined,
    min: undefined,
    max: undefined,
    step: undefined,
    showLabels: undefined,
    allowedTypes: undefined,
    maxSize: undefined,
    multiple: undefined,
  };

  if ("options" in question && Array.isArray((question as any).options)) {
    const opts = (question as any).options as Option[];
    block.optionValues = opts;
    block.options = opts.map((opt) => opt.label ?? opt.value ?? "");
  }

  if ("validation" in question && (question as any).validation) {
    const { min, max, pattern } = (question as any).validation as Record<string, number | string | undefined>;
    block.validation = { min: min as number | undefined, max: max as number | undefined, pattern: pattern as string | undefined };
  }

  if (question.type === "rating") {
    block.iconType = (question as any).icon_type ?? "star";
    block.allowHalf = (question as any).allow_half ?? false;
    block.min = (question as any).min ?? 1;
    block.max = (question as any).max ?? 5;
  }

  if (question.type === "slider" || question.type === "range") {
    block.min = (question as any).min ?? 0;
    block.max = (question as any).max ?? 100;
    block.step = (question as any).step ?? 1;
    block.showLabels = Boolean((question as any).show_labels);
  }

  if (question.type === "file") {
    block.allowedTypes = (question as any).allowed_types ?? [];
    block.maxSize = (question as any).max_size_mb ?? 10;
    block.multiple = Boolean((question as any).multiple);
  }

  return block;
};

// Convert FormBlock to FormQuestion
const convertBlockToQuestion = (block: FormBlock): FormQuestion => {
  const question = {
    id: block.id,
    type: block.type,
    category: block.category,
    question: block.question,
    description: block.description,
    placeholder: block.placeholder,
    required: block.required,
  } as unknown as FormQuestion;

  if (block.optionValues && block.optionValues.length) {
    (question as any).options = block.optionValues;
  } else if (block.options && block.options.length) {
    const opts: Option[] = block.options.map((label) => ({
      label,
      value: label.toLowerCase().replace(/\s+/g, "_"),
    }));
    (question as any).options = opts;
  }

  if (block.validation) {
    (question as any).validation = {
      min: block.validation.min,
      max: block.validation.max,
      pattern: block.validation.pattern,
      inputType: "text",
    };
  }

  if (block.type === "rating") {
    (question as any).icon_type = block.iconType ?? "star";
    (question as any).allow_half = Boolean(block.allowHalf);
    (question as any).min = block.min ?? 1;
    (question as any).max = block.max ?? 5;
  }

  if (block.type === "slider") {
    (question as any).min = block.min ?? 0;
    (question as any).max = block.max ?? 100;
    (question as any).step = block.step ?? 1;
    (question as any).show_labels = block.showLabels ?? false;
  }

  if (block.type === "file") {
    (question as any).allowed_types = block.allowedTypes ?? [];
    (question as any).max_size_mb = block.maxSize ?? 10;
    (question as any).multiple = block.multiple ?? false;
  }

  if (block.type === "yesno") {
    const yesNoOptions: Option[] = block.optionValues ?? [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ];
    (question as any).options = yesNoOptions;
  }

  return question;
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
