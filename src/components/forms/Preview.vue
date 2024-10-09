<template>
    <div class="wizard-form">
      <!-- Display Form Metadata -->
      <header>
        <img v-if="metadata?.logo" :src="metadata?.logo?.url" :alt="metadata?.logo?.altText" class="form-logo" />
        <h1>{{ metadata?.title }}</h1>
        <p>{{ metadata?.description }}</p>
      </header>
  
      <!-- Progress Bar -->
      <div v-if="settings?.progressBar?.show === true" class="progress-bar">
        <div class="progress" :style="progressBarStyle"></div>
        <p v-if="settings?.progressBar?.type === 'percentage'">{{ progressPercentage }}%</p>
      </div>
  
      <!-- Display Current Field -->
      <div v-if="currentField">
        <h2>{{ currentField.question }}</h2>
  
        <!-- Render Field Based on Type -->
        <div v-if="currentField.category === 'text'">
          <input
            :type="currentField.type"
            v-model="responses[currentField.id]"
            :placeholder="currentField.placeholder"
            :required="currentField.required"
            @focus="focusField"
          />
        </div>
        <div v-else-if="currentField.type === 'select'">
          <select v-model="responses[currentField.id]" :required="currentField.required">
            <option v-for="(option, index) in currentField.options" :key="index" :value="Object.keys(option)[0]">
              {{ Object.values(option)[0] }}
            </option>
          </select>
        </div>
        <div v-else-if="currentField.type === 'checkbox'">
          <div v-for="(option, index) in currentField.options" :key="index">
            <input
              type="checkbox"
              :value="option"
              v-model="responses[currentField.id]"
            />
            <label>{{ option }}</label>
          </div>
        </div>
        <div v-else-if="currentField.type === 'rating'">
          <div v-for="n in currentField.max" :key="n">
            <input type="radio" :value="n" v-model="responses[currentField.id]" />
            <label>{{ n }}</label>
          </div>
        </div>
  
        <!-- Navigation Buttons -->
        <div class="navigation-buttons">
          <button v-if="settings?.navigation?.allowBack && currentStep > 0" @click="prevField">Back</button>
          <button v-if="canSkip" @click="nextField">Skip</button>
          <button v-else @click="nextField" :disabled="!canProceed">Next</button>
        </div>
      </div>
  
      <!-- Success Message -->
      <div v-if="formCompleted" class="success-message">
        <p>{{ metadata?.completion?.successMessage }}</p>
      </div>
    </div>

    <footer class="mt-8 text-center text-sm text-gray-600">
      <p>{{ metadata?.footer?.text }}</p>
    </footer>

  </template>
  
  <script lang="ts">
  import { FormData } from "@/types";
import { defineComponent, ref, computed, watch } from "vue";
  
  export default defineComponent({
    name: "WizardForm",
    props: {
      formData: {
        type: Object as () => FormData,
        required: true,
      },
    },
    setup(props) {
      const { metadata, settings, fields } = props.formData;
      const currentStep = ref(0);
      const responses = ref<Record<string, any>>({});
      const formCompleted = ref(false);
  
      const currentField = computed(() => {
        return fields[currentStep.value];
      });
  
      const progressPercentage = computed(() => {
        return Math.round(((currentStep.value + 1) / fields.length) * 100);
      });
  
      const progressBarStyle = computed(() => ({
        width: `${progressPercentage.value}%`,
      }));
  
      const canProceed = computed(() => {
        if (!currentField.value) return false;
        if (currentField.value.required && !responses.value[currentField.value.id]) return false;
        return true;
      });
  
      const canSkip = computed(() => {
        return settings?.navigation?.allowSkip && !currentField.value.required;
      });
  
      const nextField = () => {
        if (currentStep.value < fields.length - 1) {
          currentStep.value += 1;
        } else {
          formCompleted.value = true;
        }
      };
  
      const prevField = () => {
        if (currentStep.value > 0) {
          currentStep.value -= 1;
        }
      };
  
      const focusField = () => {
        if (settings?.autoFocus) {
          const input = document.querySelector<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input, select, textarea');
          input?.focus();
        }
      };
  
      watch(currentStep, () => {
        focusField();
      });
  
      return {
        metadata,
        settings,
        fields,
        currentField,
        currentStep,
        responses,
        progressPercentage,
        progressBarStyle,
        formCompleted,
        nextField,
        prevField,
        focusField,
        canProceed,
        canSkip,
      };
    },
  });
  </script>
  
  <style scoped>
  .wizard-form {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
  }
  
  .form-logo {
    max-width: 150px;
  }
  
  .progress-bar {
    height: 8px;
    background-color: #f0f0f0;
    margin: 10px 0;
    position: relative;
  }
  
  .progress {
    height: 100%;
    background-color: #3b82f6;
  }
  
  .navigation-buttons {
    margin-top: 20px;
  }
  
  .success-message {
    text-align: center;
    font-size: 1.2em;
    font-weight: bold;
    color: #4caf50;
  }
  </style>
  