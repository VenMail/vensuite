<template>
  <div class="form-editor">
    <Card class="form-preview">
      <CardHeader>
        <CardTitle>{{ form?.title || "New Form" }}</CardTitle>
        <CardDescription>Edit your form fields below</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea :class="formData?.fields.length ? 'h-[300px]' : ''">
          <div v-for="(field, index) in formData?.fields" :key="field.id" class="field-preview mb-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Input v-model="field.question" placeholder="Enter question" />
                </CardTitle>
                <CardDescription>Type: {{ typeToLabelMap[field.type] }}</CardDescription>
              </CardHeader>
              <CardContent>
                <component :is="getPropertyEditor(field.type)" v-if="getPropertyEditor(field.type)" :modelValue="field"
                  @update:modelValue="(newValue) => updateField(index, newValue)" />
                <!-- Logic Editor -->
                <div class="logic-editor mt-4">
                  <h4 class="text-sm font-medium mb-2">Logic Rule</h4>
                  <div class="flex items-center space-x-2">
                    <Checkbox :id="'logic-' + field.id" :checked="!!field.logic" @update:checked="() => toggleLogic(field)" />
                    <Label :for="'logic-' + field.id">
                      Enable Logic
                    </Label>
                  </div>
                  <div v-if="field.logic" class="mt-2">
                    <Select v-model="field.logic.matchType" class="mb-2">
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="type in logicMatchTypes" :key="type" :value="type">
                          {{ type }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Input v-model="field.logic.value" placeholder="Enter value or field id" class="mb-2" />
                    <Select v-model="field.logic.jump">
                      <SelectTrigger>
                        <SelectValue placeholder="Select jump to field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="option in getFieldOptions(index + 1)" :key="option.value"
                          :value="option.value">
                          {{ option.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter class="flex justify-between">
                <div class="flex items-center space-x-2">

                  <Checkbox v-model="field.required" :id="'required-' + field.id" />
                  <Label :for="'required-' + field.id">
                    Required
                  </Label>
                </div>
                <Button variant="destructive" @click="deleteField(index)">Delete</Button>
              </CardFooter>
            </Card>
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <AddFieldButton :selectedCategory="selectedCategory" @toggleExpand="toggleExpand"
          @selectCategory="selectCategory" @addField="addNewField" />
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { useFormStore } from "@/store/forms";
import {
  AppForm,
  FormData,
  Question,
  QuestionType,
  FieldCategory,
  RadioQuestion,
  SelectQuestion,
  FileQuestion,
  MultiChoiceQuestion,
  RatingQuestion,
  SliderQuestion,
  TextQuestion,
  YesNoQuestion,
  typeToCategoryMap,
  typeToLabelMap
} from "@/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import AddFieldButton from "@/components/buttons/AddFieldButton.vue";
// Import field editor components
import ChoiceEditor from "./editors/ChoiceEditor.vue";
import TextEditor from "./editors/TextEditor.vue";
import FileEditor from "./editors/FileEditor.vue";
import RatingEditor from "./editors/RatingEditor.vue";

const props = defineProps<{
  initialFormData?: AppForm;
  autosave?: boolean;
}>();

const emit = defineEmits<{
  (e: "save", formData: FormData): void;
  (e: "delete", index: number): void;
  (e: "close"): void;
  (e: "autosave", formData: FormData): void;
}>();

const form = ref<AppForm | null>(props.initialFormData || {
  title: "New Form",
  form: {
    id: "",
    fields: [],
  }
});
const formData = ref<FormData>(props.initialFormData?.form || {
  id: "",
  fields: [],
});

const selectedCategory = ref<FieldCategory | null>(null);
const showFieldTypeSelector = ref(false);

const recentlyUsedTypes = ref<QuestionType[]>([]);
const formStore = useFormStore();
const isExpanded = ref(false);
const isDropdown = ref(false);

const route = useRoute();
const formID = route.params.id as string;

const resizeListener = () => {
  isDropdown.value = window.innerWidth <= 768;
}

onMounted(() => {
  if (formID && !formData.value) {
    formStore
      .fetchForm(formID)
      .then((appForm) => {
        if (appForm) {
          form.value = appForm;
          formData.value = appForm.form || { id: "", fields: [] };
        }
      })
      .catch((err) => {
        console.error("Error fetching form:", err);
        form.value = {
          title: "New Form",
          form: {
            id: "",
            fields: [],
          },
        };
      });
  }
  window.addEventListener('resize', resizeListener);
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeListener)
});

const getFieldCategory = (type: QuestionType): FieldCategory =>
  typeToCategoryMap[type];

const selectCategory = (category: FieldCategory) => {
  selectedCategory.value = category;
  showFieldTypeSelector.value = true;
};

const updateRecentlyUsedTypes = (type: QuestionType) => {
  recentlyUsedTypes.value = [
    type,
    ...recentlyUsedTypes.value.filter((t) => t !== type),
  ].slice(0, 2);
};

const createNewField = (type: QuestionType): Question => {
  console.log("Creating: ", type);
  const baseField = {
    id: `field_${Date.now()}`,
    type,
    category: getFieldCategory(type),
    question: "",
    required: false,
    logic: undefined,
  };

  switch (type) {
    case "radio":
    case "select":
    case "checkbox":
    case "tags":
      return {
        ...baseField,
        options: [],
      } as RadioQuestion | MultiChoiceQuestion | SelectQuestion;

    case "fname":
    case "lname":
    case "fullName":
    case "short":
    case "long":
    case "email":
    case "date":
    case "time":
    case "address":
    case "phone":
    case "website":
      return {
        ...baseField,
        validation: {
          inputType: "text",
        },
      } as TextQuestion;

    case "file":
      return {
        ...baseField,
        allowedTypes: [],
        maxSize: 10,
        multiple: false,
      } as FileQuestion;

    case "slider":
    case "range":
      return {
        ...baseField,
        min: 0,
        max: 100,
        step: 1,
        showLabels: true,
      } as SliderQuestion;

    case "rating":
      return {
        ...baseField,
        iconType: "star",
        allowHalf: false,
        min: 1,
        max: 5,
      } as RatingQuestion;

    case "yesno":
      return {
        ...baseField,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      } as YesNoQuestion;

    default:
      throw new Error(`Unknown field type: ${type}`);
  }
};

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
  if (!isExpanded.value) {
    selectedCategory.value = null;
    showFieldTypeSelector.value = false;
  }
};

const addNewField = (type: QuestionType) => {
  if (!formData.value) return;
  const newField = createNewField(type);
  formData.value.fields.push(newField);
  showFieldTypeSelector.value = false;
  selectedCategory.value = null;
  updateRecentlyUsedTypes(type);
};

const deleteField = (index: number) => {
  if (!formData.value) return;
  formData.value.fields.splice(index, 1);
  emit("delete", index);
};

const updateField = (index: number, updatedField: Question) => {
  if (!formData.value) return;
  formData.value.fields[index] = updatedField;
};

watch(
  () => formData.value,
  (newVal) => {
    if (props.autosave && newVal) {
      emit("autosave", newVal);
    }
  },
  { deep: true }
);

// Improved property editor component implementation
const propertyEditorComponents = computed(() => ({
  choice: ChoiceEditor,
  choices: ChoiceEditor,
  text: TextEditor,
  file: FileEditor,
  rating: RatingEditor,
  switch: ChoiceEditor,
}));

const getPropertyEditor = (type: QuestionType) => {
  const category = getFieldCategory(type);
  return propertyEditorComponents.value[category] || null;
};

// Logic editor related functions and data
const logicMatchTypes = ['equal', 'greater', 'less', 'contains', 'regex'] as const;

const toggleLogic = (field: Question) => {
  if (field.logic) {
    field.logic = undefined;
  } else {
    field.logic = {
      if: '',
      value: '',
      matchType: 'equal',
      jump: '',
    };
  }
};

const getFieldOptions = (currentFieldIndex: number) => {
  if (!formData.value) return [];
  return formData.value.fields
    .filter((_, index) => index < currentFieldIndex)
    .map(field => ({
      value: field.id,
      label: field.question || `Field ${field.id}`,
    }));
};
</script>