<template>
    <div class="slider-editor">
      <h3>{{ modelValue.type === 'slider' ? 'Slider' : 'Range' }} Properties</h3>
      <label>
        Min Value:
        <input v-model.number="modelValue.min" type="number" @input="updateOptions" />
      </label>
      <label>
        Max Value:
        <input v-model.number="modelValue.max" type="number" @input="updateOptions" />
      </label>
      <label>
        Step:
        <input v-model.number="modelValue.step" type="number" />
      </label>
      <label>
        Show Labels:
        <input v-model="modelValue.showLabels" type="checkbox" />
      </label>
      
      <div v-if="modelValue.showLabels">
        <h4>Customize Labels</h4>
        <div v-for="(option, index) in modelValue.options" :key="index" class="label-option">
          <input v-model.number="option.value" type="number" @input="validateOptionValue(index)" />
          <input v-model="option.label" type="text" placeholder="Label" />
          <button @click="removeOption(index)" :disabled="modelValue.options && modelValue.options.length <= 2">Remove</button>
        </div>
        <button @click="addOption" :disabled="!canAddOption">Add Label</button>
      </div>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent, PropType, computed } from 'vue';
  import { SliderQuestion, Option } from '@/types';
  
  export default defineComponent({
    name: 'SliderEditor',
    props: {
      modelValue: {
        type: Object as PropType<SliderQuestion>,
        required: true,
      },
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      const updateOptions = () => {
        if (!props.modelValue.options || props.modelValue.options.length === 0) {
          props.modelValue.options = [
            { value: props.modelValue.min.toString(10), label: props.modelValue.min.toString() },
            { value: props.modelValue.max.toString(10), label: props.modelValue.max.toString() }
          ];
        } else {
          props.modelValue.options[0].value = props.modelValue.min.toString(10);
          props.modelValue.options[props.modelValue.options.length - 1].value = props.modelValue.max.toString(10);
        }
        emit('update:modelValue', { ...props.modelValue });
      };
  
      const validateOptionValue = (index: number) => {
        const options = props.modelValue.options;
        if (!options) return;
  
        options[index].value = Math.max(props.modelValue.min, Math.min(props.modelValue.max, Number.parseInt(options[index].value))).toString(10);
        
        if (index > 0) {
          options[index].value = Math.max(Number.parseInt(options[index - 1].value) + props.modelValue.step, Number.parseInt(options[index].value)).toString(10);
        }
        if (index < options.length - 1) {
          options[index].value = Math.min(Number.parseInt(options[index + 1].value) - props.modelValue.step, Number.parseInt(options[index].value)).toString(10);
        }
  
        emit('update:modelValue', { ...props.modelValue });
      };
  
      const addOption = () => {
        if (!props.modelValue.options) return;
        const lastOption = props.modelValue.options[props.modelValue.options.length - 1];
        const newValue = Math.min(props.modelValue.max, Number.parseInt(lastOption.value) + props.modelValue.step);
        props.modelValue.options.push({ value: newValue.toString(10), label: newValue.toString() });
        emit('update:modelValue', { ...props.modelValue });
      };
  
      const removeOption = (index: number) => {
        if (!props.modelValue.options) return;
        props.modelValue.options.splice(index, 1);
        emit('update:modelValue', { ...props.modelValue });
      };
  
      const canAddOption = computed(() => {
        if (!props.modelValue.options) return false;
        const lastOption = props.modelValue.options[props.modelValue.options.length - 1];
        return Number.parseInt(lastOption.value) < props.modelValue.max;
      });
  
      return {
        updateOptions,
        validateOptionValue,
        addOption,
        removeOption,
        canAddOption,
      };
    },
  });
  </script>
  
  <style scoped>
  .slider-editor {
    margin-top: 20px;
  }
  
  label {
    display: block;
    margin-bottom: 10px;
  }
  
  input[type="number"], input[type="text"] {
    width: 100%;
    padding: 5px;
    margin-top: 5px;
  }
  
  input[type="checkbox"] {
    margin-right: 5px;
  }
  
  .label-option {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .label-option input {
    margin-right: 10px;
  }
  
  button {
    margin-left: 10px;
  }
  </style>