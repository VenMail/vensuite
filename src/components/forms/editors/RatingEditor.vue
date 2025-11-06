<template>
  <div class="rating-editor">
    <h3>Rating Properties</h3>
    <label>
      Min Rating:
      <input type="number" :value="min" min="0" @input="onMinInput" />
    </label>
    <label>
      Max Rating:
      <input type="number" :value="max" min="1" @input="onMaxInput" />
    </label>
    <label>
      Icon Type:
      <select :value="iconType" @change="onIconTypeChange">
        <option value="star">Star</option>
        <option value="heart">Heart</option>
        <option value="thumb">Thumb</option>
      </select>
    </label>
    <label>
      Allow Half Ratings:
      <input type="checkbox" :checked="allowHalf" @change="onAllowHalfToggle" />
    </label>
  </div>
</template>

<script setup lang="ts">
import type { FormRatingQuestion } from "@/types";

const props = defineProps<{
  modelValue: FormRatingQuestion;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: FormRatingQuestion): void;
}>();

const updateModel = (patch: Partial<FormRatingQuestion>) => {
  emit("update:modelValue", {
    ...props.modelValue,
    ...patch,
  });
};

const iconType = props.modelValue.icon_type ?? "star";
const allowHalf = Boolean(props.modelValue.allow_half);
const min = props.modelValue.min ?? 1;
const max = props.modelValue.max ?? 5;

const onIconTypeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  updateModel({ icon_type: target.value as FormRatingQuestion["icon_type"] });
};

const onAllowHalfToggle = (event: Event) => {
  const target = event.target as HTMLInputElement;
  updateModel({ allow_half: target.checked });
};

const onMinInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = Number.parseInt(target.value, 10);
  updateModel({ min: Number.isNaN(value) ? undefined : value });
};

const onMaxInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = Number.parseInt(target.value, 10);
  updateModel({ max: Number.isNaN(value) ? undefined : value });
};
</script>

<style scoped>
.rating-editor {
  margin-top: 20px;
}

label {
  display: block;
  margin-bottom: 10px;
}

input[type="number"],
select {
  width: 100%;
  padding: 5px;
  margin-top: 5px;
}

input[type="checkbox"] {
  margin-right: 5px;
}
</style>