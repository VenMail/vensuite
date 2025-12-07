<template>
  <div class="text-editor">
    <h3>{{$t('Forms.Editors.TextEditor.heading.text_field_properties')}}</h3>

     
    <label>
      {{$t('Commons.label.field_type')}}
      <select v-model="localModelValue.type">
        <option v-for="type in fieldTypes" :key="type" :value="type">
          {{ formatLabel(type) }}
        </option>
      </select>
    </label>

     
    <label>
      {{$t('Commons.label.navigation_type')}}
      <select v-model="validation.inputType" @change="applyDefaultValidation">
        <option v-for="type in validationTypes" :key="type" :value="type">
          {{ formatLabel(type) }}
        </option>
      </select>
    </label>

     
    <label v-if="validation.inputType === 'text'">
      Regex:
      <input v-model="validation.regex" type="text" placeholder="Enter custom regex (optional)" />
    </label>

     
    <label>
      Min Length:
      <input v-model.number="validation.minLength" type="number" placeholder="Minimum length (optional)" />
    </label>

     
    <label>
      Max Length:
      <input v-model.number="validation.maxLength" type="number" placeholder="Maximum length (optional)" />
    </label>

     
    <div v-if="validation">
      <h4>{{$t('Forms.Editors.TextEditor.heading.current_validation_rules')}}</h4>
      <pre>{{ validation }}</pre>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, watch } from 'vue';

type FieldType = 'email' | 'phone' | 'date' | 'numeric' | 'fname' | 'lname' | 'fullName' | 'short' | 'long' | 'address' | 'website';
type ValidationInputType = 'email' | 'phone' | 'date' | 'numeric' | 'text';

interface TextValidation {
  inputType: ValidationInputType;
  regex?: string;
  minLength?: number;
  maxLength?: number;
}

interface TextQuestion {
  type: FieldType;
  validation?: TextValidation;
}

const fieldTypes: FieldType[] = [
  'email', 'phone', 'date', 'numeric', 'fname', 'lname', 'fullName', 'short', 'long', 'address', 'website'
];

const validationTypes: ValidationInputType[] = ['email', 'phone', 'date', 'numeric', 'text'];

const defaultValidations: Record<ValidationInputType, TextValidation> = {
  email: { inputType: 'email' },
  phone: { inputType: 'phone' },
  date: { inputType: 'date' },
  numeric: { inputType: 'numeric' },
  text: { inputType: 'text' },
};

export default defineComponent({
  name: 'TextEditor',
  props: {
    modelValue: {
      type: Object as PropType<TextQuestion>,
      required: true,
      validator: (value: TextQuestion): boolean => fieldTypes.includes(value.type),
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const localModelValue = computed({
      get: () => props.modelValue,
      set: (value: TextQuestion) => emit('update:modelValue', value),
    });

    const validation = computed({
      get: (): TextValidation => localModelValue.value.validation || defaultValidations.text,
      set: (value: TextValidation) => {
        localModelValue.value = { ...localModelValue.value, validation: value };
      },
    });

    const applyDefaultValidation = () => {
      const type = validation.value.inputType;
      validation.value = {
        ...defaultValidations[type],
        ...validation.value,
      };
    };

    const formatLabel = (str: string): string => {
      return str.charAt(0).toUpperCase() + str.slice(1).replace(/([A-Z])/g, ' $1');
    };

    // Watch for changes in the type and update validation accordingly
    watch(() => localModelValue.value.type, (newType) => {
      const newValidationType = ['email', 'phone', 'date', 'numeric'].includes(newType) 
        ? newType as ValidationInputType 
        : 'text';
      validation.value = { ...validation.value, inputType: newValidationType };
      applyDefaultValidation();
    });

    return {
      localModelValue,
      validation,
      applyDefaultValidation,
      fieldTypes,
      validationTypes,
      formatLabel,
    };
  },
});
</script>

<style scoped>
.text-editor {
  --input-padding: 5px;
  --input-margin: 5px;
  --border-radius: 4px;

  margin-top: 20px;
}

label {
  display: block;
  margin-bottom: 10px;
}

select,
input {
  width: 100%;
  padding: var(--input-padding);
  margin-top: var(--input-margin);
  border-radius: var(--border-radius);
}

pre {
  background-color: #f9f9f9;
  padding: 10px;
  border-radius: var(--border-radius);
  margin-top: 15px;
}
</style>