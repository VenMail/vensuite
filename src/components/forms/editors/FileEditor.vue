<template>
  <div class="file-editor">
    <h3>{{$t('Forms.Editors.FileEditor.heading.file_upload_properties')}}</h3>
    <label>
      {{$t('Forms.Editors.FileEditor.label.allow_multiple_files')}}
      <input type="checkbox" :checked="multiple" @change="onToggleMultiple" />
    </label>
    <label>
      {{$t('Forms.Editors.FileEditor.label.allowed_file_types')}}
      <input
        type="text"
        :value="allowedTypesInput"
        placeholder="e.g., .pdf,.doc,.jpg"
        @input="onAllowedTypesInput"
      />
    </label>
    <label>
      {{$t('Components.Forms.Editors.FileEditor.label.max_file_size_mb')}}
      <input type="number" :value="maxSize" min="1" @input="onMaxSizeInput" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { FormFileQuestion } from "@/types";

const props = defineProps<{
  modelValue: FormFileQuestion;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: FormFileQuestion): void;
}>();

const updateModel = (patch: Partial<FormFileQuestion>) => {
  emit("update:modelValue", {
    ...props.modelValue,
    ...patch,
  });
};

const multiple = computed(() => Boolean(props.modelValue.multiple));

const allowedTypesInput = computed(() => (props.modelValue.allowed_types ?? []).join(","));

const maxSize = computed(() => props.modelValue.max_size_mb ?? 10);

const onToggleMultiple = (event: Event) => {
  const target = event.target as HTMLInputElement;
  updateModel({ multiple: target.checked });
};

const onAllowedTypesInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const values = target.value
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  updateModel({ allowed_types: values });
};

const onMaxSizeInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = Number.parseFloat(target.value);
  updateModel({ max_size_mb: Number.isNaN(value) ? undefined : value });
};
</script>

<style scoped>
.file-editor {
  margin-top: 20px;
}

label {
  display: block;
  margin-bottom: 10px;
}

input[type="text"],
input[type="number"] {
  width: 100%;
  padding: 5px;
  margin-top: 5px;
}

input[type="checkbox"] {
  margin-right: 5px;
}
</style>