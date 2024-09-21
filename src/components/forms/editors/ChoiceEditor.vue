<template>
  <div class="choice-editor">
    <h3>Options</h3>
    <div
      v-if="modelValue.category == 'choice' || modelValue.category == 'choices'"
    >
      <div
        v-for="(option, index) in modelValue.options"
        :key="index"
        class="option"
      >
        <input v-model="option.label" type="text" placeholder="Label" />
        <input v-model="option.value" type="text" placeholder="Value" />
        <button @click="removeOption(index)">Remove</button>
      </div>
    </div>
    <button @click="addOption">Add Option</button>

    <div
      v-if="modelValue.type == 'slider' || modelValue.type == 'range'"
      class="range-properties"
    >
      <label>
        Min:
        <input v-model.number="modelValue.min" type="number" />
      </label>
      <label>
        Max:
        <input v-model.number="modelValue.max" type="number" />
      </label>
      <label>
        Step:
        <input v-model.number="modelValue.step" type="number" />
      </label>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { Question } from "@/types";

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
    const addOption = () => {
      if (props.modelValue.category == "choices" && props.modelValue.options) {
        props.modelValue.options.push({ value: "", label: "" });
        emit("update:modelValue", { ...props.modelValue });
      }
    };

    const removeOption = (index: number) => {
      if (props.modelValue.category == "choices" && props.modelValue.options) {
        props.modelValue.options.splice(index, 1);
        emit("update:modelValue", { ...props.modelValue });
      }
    };

    return {
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
