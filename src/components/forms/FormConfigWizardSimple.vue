<template>
  <div class="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full">
      <!-- Header -->
      <div class="px-8 py-6 border-b border-gray-200 dark:border-gray-800">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">
              {{ currentQuestion.title }}
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Question {{ currentStepIndex + 1 }} of {{ questions.length }}
            </p>
          </div>
          <button
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            @click="handleSkip"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <!-- Progress Bar -->
        <div class="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-primary-600 dark:bg-blue-500 transition-all duration-300"
            :style="{ width: `${((currentStepIndex + 1) / questions.length) * 100}%` }"
          />
        </div>
      </div>

      <!-- Content -->
      <div class="px-8 py-8">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {{ currentQuestion.description }}
        </p>

        <!-- Options -->
        <div class="space-y-3">
          <button
            v-for="option in currentQuestion.options"
            :key="option.value"
            class="w-full p-5 rounded-xl border-2 transition-all text-left hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md"
            :class="[
              config[currentQuestion.key] === option.value
                ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            ]"
            @click="selectOption(option.value)"
          >
            <div class="flex items-start gap-4">
              <component
                :is="option.icon"
                class="w-6 h-6 text-gray-700 dark:text-gray-300 flex-shrink-0 mt-0.5"
              />
              <div class="flex-1">
                <span class="text-base font-semibold text-gray-900 dark:text-gray-100 block mb-1">
                  {{ option.label }}
                </span>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ option.description }}
                </p>
              </div>
              <div
                v-if="config[currentQuestion.key] === option.value"
                class="w-6 h-6 rounded-full bg-primary-600 dark:bg-blue-500 flex items-center justify-center flex-shrink-0"
              >
                <Check class="w-4 h-4 text-white" />
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-8 py-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <button
          v-if="currentStepIndex > 0"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          @click="goBack"
        >
          <ChevronLeft class="w-4 h-4 inline mr-1" />
          Back
        </button>
        <button
          v-else
          class="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          @click="handleSkip"
        >
          Skip Setup
        </button>

        <button
          v-if="currentStepIndex < questions.length - 1"
          class="px-6 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-primary-600 rounded-lg transition-colors"
          @click="goNext"
        >
          Next
          <ChevronRight class="w-4 h-4 inline ml-1" />
        </button>
        <button
          v-else
          class="px-6 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-primary-600 rounded-lg transition-colors"
          @click="handleComplete"
        >
          <Check class="w-4 h-4 inline mr-1" />
          Complete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { FormDensity, FormLabelPlacement } from "@/types";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Sun,
  Moon,
  Palette,
  List,
  ArrowRight,
  Table,
  BarChart3,
  CreditCard,
  Type,
  Webhook,
  Image,
} from "lucide-vue-next";

const emit = defineEmits<{
  (e: "complete", config: FormConfig): void;
  (e: "skip"): void;
}>();

const props = defineProps<{
  initialConfig?: Partial<FormConfig>;
}>();

export interface FormConfig {
  theme: "light" | "dark" | "auto";
  navigationType: "scroll" | "paginated";
  responseView: "table" | "individual" | "summary";
  showProgressBar: boolean;
  enablePayments: boolean;
  fontFamily: "system" | "inter" | "roboto" | "poppins";
  primaryColor: string;
  enableWebhooks: boolean;
  webhookUrl: string;
  showLogo: boolean;
  logoUrl: string;
  showFooter: boolean;
  footerImageUrl: string;
  labelPlacement: FormLabelPlacement;
  formDensity: FormDensity;
}

const currentStepIndex = ref(0);

const buildDefaultConfig = (): FormConfig => ({
  theme: "auto",
  navigationType: "scroll",
  responseView: "table",
  showProgressBar: true,
  enablePayments: false,
  fontFamily: "system",
  primaryColor: "#3B82F6",
  enableWebhooks: false,
  webhookUrl: "",
  showLogo: false,
  logoUrl: "",
  showFooter: false,
  footerImageUrl: "",
  labelPlacement: "stacked",
  formDensity: "comfortable",
});

const buildConfigFromProps = (): FormConfig => ({
  ...buildDefaultConfig(),
  ...props.initialConfig,
});

const config = ref<FormConfig>(buildConfigFromProps());

watch(
  () => props.initialConfig,
  () => {
    config.value = buildConfigFromProps();
  },
  { deep: true }
);

interface Question {
  key: keyof FormConfig;
  title: string;
  description: string;
  options: Array<{
    value: any;
    label: string;
    description: string;
    icon: any;
  }>;
}

const questions: Question[] = [
  {
    key: "theme",
    title: "Choose Your Theme",
    description: "How should your form look to respondents?",
    options: [
      {
        value: "light",
        label: "Light Mode",
        description: "Clean and bright interface",
        icon: Sun,
      },
      {
        value: "dark",
        label: "Dark Mode",
        description: "Easy on the eyes",
        icon: Moon,
      },
      {
        value: "auto",
        label: "Auto",
        description: "Match system preference",
        icon: Palette,
      },
    ],
  },
  {
    key: "fontFamily",
    title: "Choose Your Font",
    description: "Select the typography for your form",
    options: [
      {
        value: "system",
        label: "System Default",
        description: "Use device's default font",
        icon: Type,
      },
      {
        value: "inter",
        label: "Inter",
        description: "Modern and clean",
        icon: Type,
      },
      {
        value: "roboto",
        label: "Roboto",
        description: "Professional and readable",
        icon: Type,
      },
      {
        value: "poppins",
        label: "Poppins",
        description: "Friendly and approachable",
        icon: Type,
      },
    ],
  },
  {
    key: "labelPlacement",
    title: "Label Placement",
    description: "Choose how labels should align with inputs.",
    options: [
      {
        value: "stacked",
        label: "Stacked Labels",
        description: "Labels sit above each field for maximum clarity.",
        icon: List,
      },
      {
        value: "inline",
        label: "Inline Labels",
        description: "Place labels beside inputs for a tighter layout.",
        icon: ArrowRight,
      },
    ],
  },
  {
    key: "formDensity",
    title: "Form Spacing",
    description: "Control how much breathing room each field uses.",
    options: [
      {
        value: "comfortable",
        label: "Comfortable",
        description: "Standard spacing that balances readability and space.",
        icon: Palette,
      },
      {
        value: "compact",
        label: "Compact",
        description: "Reduce spacing to fit more fields on screen.",
        icon: Check,
      },
    ],
  },
  {
    key: "navigationType",
    title: "How Should Users Navigate?",
    description: "Choose the best experience for your respondents",
    options: [
      {
        value: "scroll",
        label: "Scroll",
        description: "All questions on one scrollable page",
        icon: List,
      },
      {
        value: "paginated",
        label: "Paginated",
        description: "One question at a time with next/previous",
        icon: ArrowRight,
      },
    ],
  },
  {
    key: "enablePayments",
    title: "Do You Need to Collect Payments?",
    description: "Enable payment processing for your form",
    options: [
      {
        value: true,
        label: "Yes, Enable Payments",
        description: "Accept payments via Stripe",
        icon: CreditCard,
      },
      {
        value: false,
        label: "No, Skip Payments",
        description: "This is a free form",
        icon: X,
      },
    ],
  },
  {
    key: "showLogo",
    title: "Add Your Logo?",
    description: "Display your brand logo at the top of the form",
    options: [
      {
        value: true,
        label: "Yes, Add Logo",
        description: "Show logo in form header",
        icon: Image,
      },
      {
        value: false,
        label: "No Logo",
        description: "Keep it simple",
        icon: X,
      },
    ],
  },
  {
    key: "enableWebhooks",
    title: "Connect to External Services?",
    description: "Send form submissions to your webhook endpoint",
    options: [
      {
        value: true,
        label: "Yes, Enable Webhooks",
        description: "Integrate with other tools",
        icon: Webhook,
      },
      {
        value: false,
        label: "No, Skip Webhooks",
        description: "Just store responses",
        icon: X,
      },
    ],
  },
  {
    key: "responseView",
    title: "How Do You Want to View Responses?",
    description: "Choose your preferred response viewing format",
    options: [
      {
        value: "table",
        label: "Table View",
        description: "Spreadsheet-like view of all responses",
        icon: Table,
      },
      {
        value: "individual",
        label: "Individual View",
        description: "Review responses one at a time",
        icon: List,
      },
      {
        value: "summary",
        label: "Summary View",
        description: "Aggregated statistics and charts",
        icon: BarChart3,
      },
    ],
  },
];

const currentQuestion = computed(() => questions[currentStepIndex.value]);

const selectOption = (value: any) => {
  const key = currentQuestion.value.key;
  (config.value as any)[key] = value;
  
  // Auto-advance after selection
  setTimeout(() => {
    if (currentStepIndex.value < questions.length - 1) {
      goNext();
    }
  }, 300);
};

const goNext = () => {
  if (currentStepIndex.value < questions.length - 1) {
    currentStepIndex.value++;
  }
};

const goBack = () => {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--;
  }
};

const handleComplete = () => {
  emit("complete", config.value);
};

const handleSkip = () => {
  emit("skip");
};
</script>
