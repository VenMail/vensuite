<template>
    <div class="file-editor">
      <h3>File Upload Properties</h3>
      <label>
        Allow Multiple Files:
        <input v-model="modelValue.multiple" type="checkbox" />
      </label>
      <label>
        Allowed File Types:
        <input v-model="modelValue.allowedTypes" type="text" placeholder="e.g., .pdf,.doc,.jpg" />
      </label>
      <label>
        Max File Size (MB):
        <input v-model.number="modelValue.maxSize" type="number" />
      </label>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent, PropType } from 'vue';
  import { FileQuestion } from '@/types';
  
  export default defineComponent({
    name: 'FileEditor',
    props: {
      modelValue: {
        type: Object as PropType<FileQuestion>,
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
  .file-editor {
    margin-top: 20px;
  }
  
  label {
    display: block;
    margin-bottom: 10px;
  }
  
  input[type="text"], input[type="number"] {
    width: 100%;
    padding: 5px;
    margin-top: 5px;
  }
  
  input[type="checkbox"] {
    margin-right: 5px;
  }
  </style>