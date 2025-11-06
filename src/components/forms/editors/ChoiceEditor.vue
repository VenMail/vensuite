<template>
  <div class="choice-editor">
    <h3>Options</h3>
    <div v-if="isChoice">
      <div v-for="(option, index) in optionOptions" :key="index" class="option">
        <input v-model="option.label" type="text" placeholder="Label" />
        <input v-model="option.value" type="text" placeholder="Value" />
        <button @click="removeOption(index)">Remove</button>
      </div>
    </div>
    <button @click="addOption">Add Option</button>

    <div v-if="isRangeLike" class="range-properties">
      <label>
        Min:
        <input v-model.number="(modelValue as any).min" type="number" />
      </label>
      <label>
        Max:
        <input v-model.number="(modelValue as any).max" type="number" />
      </label>
      <label>
        Step:
        <input v-model.number="(modelValue as any).step" type="number" />
      </label>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from "vue";
import type { Question, Option } from "@/types";

export default defineComponent({
  name: "ChoicePropertyEditor",
  props: {
    modelValue: {
      type: Object as PropType<Question>,
      required: true,
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const isChoice = computed(() => props.modelValue.category === 'choice' || props.modelValue.category === 'choices');
    const isRangeLike = computed(() => (props.modelValue as any).type === 'slider' || (props.modelValue as any).type === 'range');

    const optionOptions = computed<Option[]>(() => {
      const anyModel = props.modelValue as any;
      if (isChoice.value && Array.isArray(anyModel.options)) return anyModel.options as Option[];
      return [];
    });

    const addOption = () => {
      const anyModel = props.modelValue as any;
      if (isChoice.value) {
        anyModel.options = Array.isArray(anyModel.options) ? anyModel.options : [];
        anyModel.options.push({ value: "", label: "" });
        emit("update:modelValue", { ...props.modelValue });
      }
    };

    const removeOption = (index: number) => {
      const anyModel = props.modelValue as any;
      if (isChoice.value && Array.isArray(anyModel.options)) {
        anyModel.options.splice(index, 1);
        emit("update:modelValue", { ...props.modelValue });
      }
    };

    return {
      isChoice,
      isRangeLike,
      optionOptions,
      addOption,
      removeOption,
    };
  },
});
</script>

<style scoped>
.choice-editor {
  margin-top: 20px;
}

.option {
  margin-bottom: 10px;
}

.range-properties {
  margin-top: 20px;
}

label {
  display: block;
  margin-bottom: 5px;
}

input {
  margin-right: 10px;
}
</style>
