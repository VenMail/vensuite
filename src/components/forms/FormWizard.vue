<template>
  <div class="form-wizard-overlay fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
    <div
      class="form-wizard flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
       
      <div class="form-wizard__header px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ currentStep === 'describe' ? $t('Forms.FormWizard.heading.create_your_form') : currentStep === 'generating' ? 'Generating Form...' :
              $t('Forms.FormWizard.heading.review_your_form') }}
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {{ currentStep === 'describe' ? $t('Forms.FormWizard.text.describe_what_you_want') : currentStep ===
                'generating' ? $t('Forms.FormWizard.text.ai_is_building_your') : $t('Forms.FormWizard.text.review_and_customize_your') }}
            </p>
          </div>
          <button v-if="currentStep !== 'generating'"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            @click="$emit('close')">
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

       
      <div class="form-wizard__content p-6 flex-1 overflow-y-auto">
         
        <div v-if="currentStep === 'describe'" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{$t('Forms.FormWizard.label.what_kind_of_form')}}
            </label>
            <textarea ref="descriptionInput" v-model="description" rows="3"
              placeholder="Example: A customer feedback form with name, email, rating, and comments..."
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
              @keydown.meta.enter="handleGenerate" @keydown.ctrl.enter="handleGenerate" />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {{$t('Commons.text.less')}} <kbd
                class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 text-xs">Ctrl+Enter</kbd>
              {{$t('Commons.text.to_generate')}}
            </p>
          </div>

           
          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {{$t('Forms.FormWizard.text.or_choose_a_template')}}
            </p>
            <div class="grid grid-cols-2 gap-3">
              <button v-for="template in quickTemplates" :key="template.name"
                class="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
                @click="useTemplate(template)">
                <component :is="template.icon" class="w-5 h-5 text-gray-600 dark:text-gray-400 mb-2" />
                <div class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ template.name }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ template.description }}</div>
              </button>
            </div>
          </div>
        </div>

         
        <div v-else-if="currentStep === 'generating'" class="py-12 text-center">
          <div
            class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4 animate-pulse">
            <Sparkles class="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Creating your form...
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{$t('Forms.FormWizard.text.ai_is_analyzing_your')}}
          </p>
          <div class="mt-6 flex justify-center">
            <div class="flex gap-1">
              <div class="w-2 h-2 bg-primary-600 dark:bg-blue-400 rounded-full animate-bounce"
                style="animation-delay: 0ms"></div>
              <div class="w-2 h-2 bg-primary-600 dark:bg-blue-400 rounded-full animate-bounce"
                style="animation-delay: 150ms"></div>
              <div class="w-2 h-2 bg-primary-600 dark:bg-blue-400 rounded-full animate-bounce"
                style="animation-delay: 300ms"></div>
            </div>
          </div>
        </div>

         
        <div v-else-if="currentStep === 'preview'" class="space-y-6">
          <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="flex items-start justify-between gap-3 border-b border-gray-200 dark:border-gray-700 px-5 py-4">
              <div class="flex-1 space-y-1">
                <input
                  v-model="generatedForm.title"
                  type="text"
                  class="text-xl font-semibold w-full bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Form Title"
                />
                <input
                  v-model="generatedForm.description"
                  type="text"
                  class="text-sm w-full bg-transparent border-none outline-none text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Form description"
                />
              </div>
              <button
                class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                title="Regenerate"
                @click="handleRegenerate"
              >
                <RefreshCw class="w-4 h-4" />
              </button>
            </div>

            <div class="max-h-64 overflow-y-auto space-y-3 px-5 py-4">
              <div
                v-for="(block, index) in generatedForm.blocks"
                :key="index"
                class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 space-y-1">
                    <div class="flex items-center gap-2">
                      <component :is="getBlockIcon(block.type)" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ block.question }}</span>
                      <span v-if="block.required" class="text-xs text-red-500">*</span>
                    </div>
                    <p v-if="block.description" class="text-xs text-gray-500 dark:text-gray-400">{{ block.description }}</p>
                    <div v-if="block.options && block.options.length" class="space-y-1 mt-1">
                      <div
                        v-for="(option, optIndex) in block.options.slice(0, 3)"
                        :key="optIndex"
                        class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
                      >
                        <div class="w-3 h-3 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                        {{ option }}
                      </div>
                      <div v-if="block.options.length > 3" class="text-xs text-gray-500 dark:text-gray-400 ml-5">
                        +{{ block.options.length - 3 }} more
                      </div>
                    </div>
                  </div>
                  <span class="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                    {{ getBlockTypeLabel(block.type) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div class="flex gap-3">
              <Lightbulb class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p class="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {{$t('Forms.FormWizard.text.ai_generated_form_ready')}}
                </p>
                <p class="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  You can edit any field in the form builder after creation. Click "Create Form" to continue.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

       
      <div
        class="form-wizard__footer px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div class="flex items-center justify-between">
          <button
            v-if="currentStep === 'preview'"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            @click="currentStep = 'describe'"
          >
            {{$t('Commons.button.back')}}
          </button>
          <div v-else></div>

          <div class="flex gap-3">
            <button
              v-if="currentStep === 'describe'"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              @click="createBlankForm"
            >
              {{$t('Forms.FormWizard.button.skip_create_blank')}}
            </button>
            <button
              v-if="currentStep === 'describe'"
              class="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!description.trim()"
              @click="handleGenerate"
            >
              {{$t('Forms.FormWizard.button.generate_form')}}
            </button>
            <button
              v-if="currentStep === 'preview'"
              class="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg"
              @click="handleCreateForm"
            >
              {{$t('Commons.button.create_form')}}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import {
  X,
  Sparkles,
  RefreshCw,
  Lightbulb,
  FileText,
  UserCheck,
  MessageSquare,
  ShoppingCart,
  Type,
  Mail,
  Phone,
  Calendar,
  Star,
  CheckSquare,
  ChevronDown,
  Upload,
} from "lucide-vue-next";
import type { FormBlock } from "./blocks/types";
import { t } from '@/i18n';

const props = defineProps<{
  initialDescription?: string
}>()

const emit = defineEmits<{
  (e: "create", data: { title: string; description: string; blocks: FormBlock[] }): void;
  (e: "create-blank"): void;
  (e: "close"): void;
}>();

const currentStep = ref<"describe" | "generating" | "preview">("describe");
const description = ref("");
const descriptionInput = ref<HTMLTextAreaElement | null>(null);

const generatedForm = ref<{
  title: string;
  description: string;
  blocks: FormBlock[];
}>({
  title: "",
  description: "",
  blocks: [],
});

const quickTemplates = [
  {
    name: "Contact Form",
    description: "Name, email, phone, message",
    icon: FileText,
    prompt: "A contact form with fields for full name, email address, phone number, and a message textarea",
  },
  {
    name: "Feedback Survey",
    description: t('Forms.FormWizard.text.rating_and_comments'),
    icon: MessageSquare,
    prompt: "A customer feedback survey with overall rating (1-5 stars), what did you like, what could be improved, and would you recommend us (yes/no)",
  },
  {
    name: "Registration",
    description: t('Forms.FormWizard.text.user_signup_details'),
    icon: UserCheck,
    prompt: "A registration form with first name, last name, email, phone number, company name, and job title",
  },
  {
    name: "Order Form",
    description: t('Forms.FormWizard.text.product_and_shipping_info'),
    icon: ShoppingCart,
    prompt: "An order form with customer name, email, shipping address, product selection dropdown, quantity, and special instructions",
  },
];

const iconMap: Record<string, any> = {
  short: Type,
  long: FileText,
  email: Mail,
  phone: Phone,
  date: Calendar,
  time: Calendar,
  radio: CheckSquare,
  checkbox: CheckSquare,
  dropdown: ChevronDown,
  rating: Star,
  slider: Star,
  file: Upload,
  yesno: CheckSquare,
};

const getBlockIcon = (type: string) => {
  return iconMap[type] || Type;
};

const getBlockTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    short: "Short Text",
    long: "Long Text",
    email: "Email",
    phone: "Phone",
    date: "Date",
    time: "Time",
    radio: "Multiple Choice",
    checkbox: "Checkboxes",
    dropdown: "Dropdown",
    rating: "Rating",
    slider: "Slider",
    file: "File Upload",
    yesno: "Yes/No",
  };
  return labels[type] || type;
};

const useTemplate = (template: typeof quickTemplates[0]) => {
  description.value = template.prompt;
  nextTick(() => {
    handleGenerate();
  });
};

const handleGenerate = async () => {
  if (!description.value.trim()) return;

  currentStep.value = "generating";

  try {
    // Call AI service to generate form structure
    const result = await generateFormFromDescription(description.value);
    generatedForm.value = result;

    // Simulate AI processing time for better UX
    await new Promise(resolve => setTimeout(resolve, 1500));

    currentStep.value = "preview";
  } catch (error) {
    console.error("Failed to generate form:", error);
    // Fallback to a basic form
    generatedForm.value = {
      title: "New Form",
      description: description.value,
      blocks: [
        {
          id: crypto.randomUUID(),
          type: "short",
          category: "text",
          question: "Question 1",
          required: false,
        },
      ],
    };
    currentStep.value = "preview";
  }
};

const handleRegenerate = () => {
  currentStep.value = "describe";
};

const handleCreateForm = () => {
  emit("create", generatedForm.value);
};

const createBlankForm = () => {
  emit("create-blank");
};

// AI Form Generation Function
async function generateFormFromDescription(description: string): Promise<{
  title: string;
  description: string;
  blocks: FormBlock[];
}> {
  // Call the real backend API
  const { generateCompleteForm } = await import("@/services/ai");

  try {
    const result = await generateCompleteForm(description);
    return result;
  } catch (error) {
    console.error("AI generation failed, using fallback:", error);
    // Fallback to mock if API fails
    return mockGenerateForm(description);
  }
}

// Mock function - replace with actual AI call
function mockGenerateForm(description: string): {
  title: string;
  description: string;
  blocks: FormBlock[];
} {
  const lowerDesc = description.toLowerCase();

  // Detect form type and generate appropriate structure
  if (lowerDesc.includes("contact") || lowerDesc.includes("get in touch")) {
    return {
      title: "Contact Form",
      description: t('Forms.FormWizard.text.get_in_touch_with'),
      blocks: [
        {
          id: crypto.randomUUID(),
          type: "short",
          category: "text",
          question: "Full Name",
          placeholder: "John Doe",
          required: true,
        },
        {
          id: crypto.randomUUID(),
          type: "email",
          category: "text",
          question: "Email Address",
          placeholder: "john@example.com",
          required: true,
        },
        {
          id: crypto.randomUUID(),
          type: "phone",
          category: "text",
          question: "Phone Number",
          placeholder: "+1 (555) 000-0000",
          required: false,
        },
        {
          id: crypto.randomUUID(),
          type: "long",
          category: "text",
          question: "Message",
          placeholder: "How can we help you?",
          required: true,
        },
      ],
    };
  } else if (lowerDesc.includes("feedback") || lowerDesc.includes("survey")) {
    return {
      title: "Feedback Survey",
      description: t('Forms.FormWizard.text.help_us_improve_by'),
      blocks: [
        {
          id: crypto.randomUUID(),
          type: "rating",
          category: "rating",
          question: "How would you rate your overall experience?",
          required: true,
          max: 5,
        },
        {
          id: crypto.randomUUID(),
          type: "long",
          category: "text",
          question: "What did you like most?",
          required: false,
        },
        {
          id: crypto.randomUUID(),
          type: "long",
          category: "text",
          question: "What could we improve?",
          required: false,
        },
        {
          id: crypto.randomUUID(),
          type: "yesno",
          category: "switch",
          question: "Would you recommend us to others?",
          required: true,
        },
      ],
    };
  } else if (lowerDesc.includes("registration") || lowerDesc.includes("signup") || lowerDesc.includes("sign up")) {
    return {
      title: "Registration Form",
      description: t('Forms.FormWizard.text.create_your_account'),
      blocks: [
        {
          id: crypto.randomUUID(),
          type: "short",
          category: "text",
          question: "First Name",
          required: true,
        },
        {
          id: crypto.randomUUID(),
          type: "short",
          category: "text",
          question: "Last Name",
          required: true,
        },
        {
          id: crypto.randomUUID(),
          type: "email",
          category: "text",
          question: "Email Address",
          required: true,
        },
        {
          id: crypto.randomUUID(),
          type: "phone",
          category: "text",
          question: "Phone Number",
          required: false,
        },
        {
          id: crypto.randomUUID(),
          type: "short",
          category: "text",
          question: "Company Name",
          required: false,
        },
      ],
    };
  }

  // Default generic form
  return {
    title: "New Form",
    description: description,
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "short",
        category: "text",
        question: "Name",
        required: true,
      },
      {
        id: crypto.randomUUID(),
        type: "email",
        category: "text",
        question: "Email",
        required: true,
      },
      {
        id: crypto.randomUUID(),
        type: "long",
        category: "text",
        question: "Additional Information",
        required: false,
      },
    ],
  };
}

onMounted(() => {
  if (props.initialDescription) {
    description.value = props.initialDescription;
  }
  nextTick(() => {
    if (descriptionInput.value) {
      descriptionInput.value.focus();
    }
  });
});

</script>

<style scoped>
@keyframes bounce {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-0.5rem);
  }
}

.animate-bounce {
  animation: bounce 0.6s infinite;
}
</style>
