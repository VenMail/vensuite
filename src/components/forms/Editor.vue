<template>
  <div class="form-editor">
    <Card class="form-preview">
      <CardHeader>
        <CardTitle>{{ form?.title || "New Form" }}</CardTitle>
        <CardDescription>{{$t('Forms.Editor.text.edit_your_form_fields')}}</CardDescription>
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
                  @update:modelValue="handleFieldModelUpdate(index, $event)" />
                 
                <div class="logic-editor mt-4">
                  <h4 class="text-sm font-medium mb-2">Logic Rule</h4>
                  <div class="flex items-center space-x-2">
                    <Checkbox :id="'logic-' + field.id" :checked="!!field.logic" @update:checked="() => toggleLogic(field)" />
                    <Label :for="'logic-' + field.id">
                      Enable Logic
                    </Label>
                  </div>
                  <div v-if="field.logic" class="mt-2">
                    <div class="mb-2">
                      <Select v-model="field.logic.conditions[0].operator" class="mb-2">
                        <SelectTrigger>
                          <SelectValue placeholder="Select operator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem v-for="op in logicOperators" :key="op" :value="op">
                            {{ op }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Input v-model="(field.logic.conditions[0].value as any)" placeholder="Enter value" class="mb-2" />
                    </div>
                    
                    <div>
                      <Select v-model="field.logic.actions[0].target_id">
                        <SelectTrigger>
                          <SelectValue placeholder="Select jump to field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem v-for="option in getFieldOptions(index + 1)" :key="option.value" :value="option.value">
                            {{ option.label }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
import type {
  AppForm,
  FormDefinition,
  FormData as BuilderFormData,
  FormQuestion,
  FormQuestionType,
  FormFieldCategory,
  LogicRule,
  Option,
} from "@/types";
import { typeToCategoryMap, typeToLabelMap, defaultValidations } from "@/types";
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
  (e: "save", formData: BuilderFormData): void;
  (e: "delete", index: number): void;
  (e: "close"): void;
  (e: "autosave", formData: BuilderFormData): void;
}>();

const createEmptyFormData = (): BuilderFormData => ({
  id: "",
  fields: [],
});

const normalizeFormData = (source?: unknown): BuilderFormData => {
  if (source && typeof source === "object") {
    if ("fields" in (source as any)) {
      const data = source as BuilderFormData;
      return {
        id: data.id ?? "",
        fields: Array.isArray(data.fields) ? [...data.fields] : [],
        metadata: data.metadata,
        settings: data.settings,
      };
    }
    if ("questions" in (source as any)) {
      const definition = source as FormDefinition;
      return {
        id: definition.id ?? "",
        fields: [...(definition.questions ?? [])],
      };
    }
  }
  return createEmptyFormData();
};

const form = ref<AppForm | FormDefinition | null>(props.initialFormData ?? null);
const formData = ref<BuilderFormData>(normalizeFormData(props.initialFormData?.form));

const selectedCategory = ref<FormFieldCategory | null>(null);
const showFieldTypeSelector = ref(false);

const recentlyUsedTypes = ref<FormQuestionType[]>([]);
const formStore = useFormStore();
const isExpanded = ref(false);
const isDropdown = ref(false);

const route = useRoute();
const formID = route.params.id as string;

const resizeListener = () => {
  isDropdown.value = window.innerWidth <= 768;
};

onMounted(() => {
  if (formID && formData.value.fields.length === 0) {
    formStore
      .fetchForm(formID)
      .then((appForm) => {
        if (appForm) {
          form.value = appForm;
          const rawForm = (appForm as AppForm).form ?? appForm;
          formData.value = normalizeFormData(rawForm);
        }
      })
      .catch((err) => {
        console.error("Error fetching form:", err);
        form.value = {
          title: "New Form",
          form: createEmptyFormData(),
        } as AppForm;
        formData.value = createEmptyFormData();
      });
  }
  window.addEventListener("resize", resizeListener);
});

onUnmounted(() => {
  window.removeEventListener("resize", resizeListener);
});

const getFieldCategory = (type: FormQuestionType): FormFieldCategory =>
  typeToCategoryMap[type] ?? "text";

const selectCategory = (category: FormFieldCategory) => {
  selectedCategory.value = category;
  showFieldTypeSelector.value = true;
};

const updateRecentlyUsedTypes = (type: FormQuestionType) => {
  recentlyUsedTypes.value = [
    type,
    ...recentlyUsedTypes.value.filter((t) => t !== type),
  ].slice(0, 2);
};

const createNewField = (type: FormQuestionType): FormQuestion => {
  const base = {
    id: `field_${Date.now()}`,
    type,
    category: getFieldCategory(type),
    question: "",
    description: undefined,
    placeholder: undefined,
    required: false,
    help_text: undefined,
    logic: undefined,
    metadata: undefined,
  } as FormQuestion & Record<string, any>;

  switch (type) {
    case "radio":
    case "select":
    case "checkbox":
    case "tags":
      base.options = [] as Option[];
      break;
    case "yesno":
      base.options = [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ] as Option[];
      break;
    case "slider":
    case "range":
      base.min = 0;
      base.max = 100;
      base.step = 1;
      base.show_labels = true;
      break;
    case "rating":
      base.icon_type = "star";
      base.allow_half = false;
      base.min = 1;
      base.max = 5;
      break;
    case "file":
      base.allowed_types = [];
      base.max_size_mb = 10;
      base.multiple = false;
      break;
    default:
      base.validation = defaultValidations[type] ?? { inputType: "text" };
      break;
  }

  return base as FormQuestion;
};

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
  if (!isExpanded.value) {
    selectedCategory.value = null;
    showFieldTypeSelector.value = false;
  }
};

const addNewField = (type: FormQuestionType) => {
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

const updateField = (index: number, updatedField: FormQuestion) => {
  if (!formData.value) return;
  formData.value.fields[index] = updatedField;
};

const handleFieldModelUpdate = (index: number, updatedField: FormQuestion) => {
  updateField(index, updatedField);
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
  info: TextEditor,
}));

const getPropertyEditor = (type: FormQuestionType) => {
  const category = getFieldCategory(type);
  return propertyEditorComponents.value[category] || null;
};

// Logic editor related functions and data
const logicOperators = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'greater_than',
  'less_than',
  'greater_or_equal',
  'less_or_equal',
  'matches_regex',
] as const;

const buildDefaultLogicRule = (fieldId: string): LogicRule => ({
  id: `logic_${fieldId}`,
  scope: 'question',
  owner_id: fieldId,
  conditions: [
    {
      question_id: fieldId,
      operator: 'equals',
      value: '',
    },
  ],
  logic_type: 'AND',
  actions: [
    {
      type: 'jump_to_question',
      target_id: '',
    },
  ],
});

const toggleLogic = (field: FormQuestion) => {
  if (field.logic) {
    field.logic = undefined;
    return;
  }
  field.logic = buildDefaultLogicRule(field.id);
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