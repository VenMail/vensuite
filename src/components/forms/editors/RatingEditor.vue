<template>
    <div class="rating-editor">
      <h3>Rating Properties</h3>
      <label>
        Max Rating:
        <input v-model.number="modelValue.max" type="number" min="1" />
      </label>
      <label>
        Icon Type:
        <select v-model="modelValue.iconType">
          <option value="star">Star</option>
          <option value="heart">Heart</option>
          <option value="thumb">Thumb</option>
        </select>
      </label>
      <label>
        Allow Half Ratings:
        <input v-model="modelValue.allowHalf" type="checkbox" />
      </label>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent, PropType } from 'vue';
  import { RatingQuestion } from '@/types';
  
  export default defineComponent({
    name: 'RatingEditor',
    props: {
      modelValue: {
        type: Object as PropType<RatingQuestion>,
        required: true,
      },
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      // Watchers or methods to emit updates can be added here if needed
    },
  });
  </script>
  
  <style scoped>
  .rating-editor {
    margin-top: 20px;
  }
  
  label {
    display: block;
    margin-bottom: 10px;
  }
  
  input[type="number"], select {
    width: 100%;
    padding: 5px;
    margin-top: 5px;
  }
  
  input[type="checkbox"] {
    margin-right: 5px;
  }
  </style>