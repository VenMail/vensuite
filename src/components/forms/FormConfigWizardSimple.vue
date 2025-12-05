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
          {{$t('Commons.button.skip_setup')}}
        </button>

        <button
          v-if="currentStepIndex < questions.length - 1"
          class="px-6 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-primary-600 rounded-lg transition-colors"
          @click="goNext"
        >
          {{$t('Commons.button.next')}}
          <ChevronRight class="w-4 h-4 inline ml-1" />
        </button>
        <button
          v-else
          class="px-6 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-primary-600 rounded-lg transition-colors"
          @click="handleComplete"
        >
          <Check class="w-4 h-4 inline mr-1" />
          {{$t('Commons.button.complete')}}
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
import { t } from '@/i18n';

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
    description: t('Forms.FormConfigWizardSimple.text.how_should_your_form'),
    options: [
      {
        value: "light",
        label: "Light Mode",
        description: t('Forms.FormConfigWizardSimple.text.clean_and_bright_interface'),
        icon: Sun,
      },
      {
        value: "dark",
        label: "Dark Mode",
        description: t('Forms.FormConfigWizardSimple.text.easy_on_the_eyes'),
        icon: Moon,
      },
      {
        value: "auto",
        label: "Auto",
        description: t('Forms.FormConfigWizardSimple.text.match_system_preference'),
        icon: Palette,
      },
    ],
  },
  {
    key: "fontFamily",
    title: "Choose Your Font",
    description: t('Forms.FormConfigWizardSimple.text.select_the_typography_for'),
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
        description: t('Forms.FormConfigWizardSimple.text.modern_and_clean'),
        icon: Type,
      },
      {
        value: "roboto",
        label: "Roboto",
        description: t('Forms.FormConfigWizardSimple.text.professional_and_readable'),
        icon: Type,
      },
      {
        value: "poppins",
        label: "Poppins",
        description: t('Forms.FormConfigWizardSimple.text.friendly_and_approachable'),
        icon: Type,
      },
    ],
  },
  {
    key: "labelPlacement",
    title: "Label Placement",
    description: t('Forms.FormConfigWizardSimple.text.choose_how_labels_should'),
    options: [
      {
        value: "stacked",
        label: "Stacked Labels",
        description: t('Forms.FormConfigWizardSimple.text.labels_sit_above_each'),
        icon: List,
      },
      {
        value: "inline",
        label: "Inline Labels",
        description: t('Forms.FormConfigWizardSimple.text.place_labels_beside_inputs'),
        icon: ArrowRight,
      },
    ],
  },
  {
    key: "formDensity",
    title: "Form Spacing",
    description: t('Forms.FormConfigWizardSimple.text.control_how_much_breathing'),
    options: [
      {
        value: "comfortable",
        label: "Comfortable",
        description: t('Forms.FormConfigWizardSimple.text.standard_spacing_that_balances'),
        icon: Palette,
      },
      {
        value: "compact",
        label: "Compact",
        description: t('Forms.FormConfigWizardSimple.text.reduce_spacing_to_fit'),
        icon: Check,
      },
    ],
  },
  {
    key: "navigationType",
    title: "How Should Users Navigate?",
    description: t('Forms.FormConfigWizardSimple.text.choose_the_best_experience'),
    options: [
      {
        value: "scroll",
        label: "Scroll",
        description: t('Forms.FormConfigWizardSimple.text.all_questions_on_one'),
        icon: List,
      },
      {
        value: "paginated",
        label: "Paginated",
        description: t('Forms.FormConfigWizardSimple.text.one_question_at_a'),
        icon: ArrowRight,
      },
    ],
  },
  {
    key: "enablePayments",
    title: "Do You Need to Collect Payments?",
    description: t('Forms.FormConfigWizardSimple.text.enable_payment_processing_for'),
    options: [
      {
        value: true,
        label: "Yes, Enable Payments",
        description: t('Forms.FormConfigWizardSimple.text.accept_payments_via_stripe'),
        icon: CreditCard,
      },
      {
        value: false,
        label: "No, Skip Payments",
        description: t('Forms.FormConfigWizardSimple.text.this_is_a_free'),
        icon: X,
      },
    ],
  },
  {
    key: "showLogo",
    title: "Add Your Logo?",
    description: t('Forms.FormConfigWizardSimple.text.display_your_brand_logo'),
    options: [
      {
        value: true,
        label: "Yes, Add Logo",
        description: t('Forms.FormConfigWizardSimple.text.show_logo_in_form'),
        icon: Image,
      },
      {
        value: false,
        label: "No Logo",
        description: t('Forms.FormConfigWizardSimple.text.keep_it_simple'),
        icon: X,
      },
    ],
  },
  {
    key: "enableWebhooks",
    title: "Connect to External Services?",
    description: t('Forms.FormConfigWizardSimple.text.send_form_submissions_to'),
    options: [
      {
        value: true,
        label: "Yes, Enable Webhooks",
        description: t('Forms.FormConfigWizardSimple.text.integrate_with_other_tools'),
        icon: Webhook,
      },
      {
        value: false,
        label: "No, Skip Webhooks",
        description: t('Forms.FormConfigWizardSimple.text.just_store_responses'),
        icon: X,
      },
    ],
  },
  {
    key: "responseView",
    title: "How Do You Want to View Responses?",
    description: t('Forms.FormConfigWizardSimple.text.choose_your_preferred_response'),
    options: [
      {
        value: "table",
        label: "Table View",
        description: t('Forms.FormConfigWizardSimple.text.spreadsheet_like_view_of'),
        icon: Table,
      },
      {
        value: "individual",
        label: "Individual View",
        description: t('Forms.FormConfigWizardSimple.text.review_responses_one_at'),
        icon: List,
      },
      {
        value: "summary",
        label: "Summary View",
        description: t('Forms.FormConfigWizardSimple.text.aggregated_statistics_and_charts'),
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
