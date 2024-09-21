<template>
    <div class="text-editor">
      <h3>Text Field Properties</h3>
  
      <!-- Field Type -->
      <label>
        Field Type:
        <select v-model="localModelValue.type" @change="setType">
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="date">Date</option>
          <option value="numeric">Numeric</option>
          <option value="fname">First Name</option>
          <option value="lname">Last Name</option>
          <option value="fullName">Full Name</option>
          <option value="short">Short Text</option>
          <option value="long">Long Text</option>
          <option value="address">Address</option>
          <option value="website">Website</option>
        </select>
      </label>
  
      <!-- Validation Type -->
      <label>
        Validation Type:
        <select v-model="validation.inputType" @change="applyDefaultValidation">
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="date">Date</option>
          <option value="numeric">Numeric</option>
          <option value="text">Text</option>
        </select>
      </label>
  
      <!-- Regex for custom text validation -->
      <label v-if="validation.inputType === 'text'">
        Regex:
        <input v-model="validation.regex" type="text" placeholder="Enter custom regex (optional)" />
      </label>
  
      <!-- Min Length -->
      <label>
        Min Length:
        <input v-model.number="validation.minLength" type="number" placeholder="Minimum length (optional)" />
      </label>
  
      <!-- Max Length -->
      <label>
        Max Length:
        <input v-model.number="validation.maxLength" type="number" placeholder="Maximum length (optional)" />
      </label>
  
      <!-- Optional Preview of Current Validation -->
      <div v-if="validation">
        <h4>Current Validation Rules:</h4>
        <pre>{{ validation }}</pre>
      </div>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent, PropType, computed } from "vue";
  import { defaultValidations, TextQuestion } from "@/types";
  
  export default defineComponent({
    name: "TextEditor",
    props: {
      modelValue: {
        type: Object as PropType<TextQuestion>,
        required: true,
      },
    },
    emits: ["update:modelValue"],
    setup(props, { emit }) {
      // Local proxy to safely handle deep property updates
      const localModelValue = computed({
        get() {
          return props.modelValue;
        },
        set(value) {
          emit("update:modelValue", value);
        },
      });
  
      // Local computed property to safely modify validation properties
      const validation = computed({
        get() {
          return localModelValue.value.validation || {};
        },
        set(value) {
          localModelValue.value = { ...localModelValue.value, validation: value };
        },
      });
  
      // Update the field type
      const setType = () => {
        const updatedModelValue = { ...localModelValue.value, type: localModelValue.value.type || "text" };
        emit("update:modelValue", updatedModelValue);
      };
  
      // Apply default validation when validation type changes
      const applyDefaultValidation = () => {
        const type = validation.value.inputType || "text";
        if (defaultValidations[type]) {
          validation.value = {
            ...defaultValidations[type],
            ...validation.value,
          };
        }
      };
  
      return {
        localModelValue,
        validation,
        setType,
        applyDefaultValidation,
      };
    },
  });
  </script>
  
  <style scoped>
  .text-editor {
    margin-top: 20px;
  }
  
  label {
    display: block;
    margin-bottom: 10px;
  }
  
  select,
  input {
    width: 100%;
    padding: 5px;
    margin-top: 5px;
  }
  
  pre {
    background-color: #f9f9f9;
    padding: 10px;
    border-radius: 4px;
    margin-top: 15px;
  }
  </style>
  