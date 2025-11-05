<template>
  <div class="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-8 py-6 border-b border-gray-200 dark:border-gray-800">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Form Configuration
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Step {{ currentStep }} of 3
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
        <div class="mt-4 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
            :style="{ width: `${(currentStep / 3) * 100}%` }"
          />
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-8 py-6">
        <!-- Step 1: Appearance -->
        <div v-if="currentStep === 1" class="space-y-6">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Form Appearance
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Customize how your form looks to respondents
            </p>
          </div>

          <!-- Theme -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Theme
            </label>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="theme in themes"
                :key="theme.value"
                class="p-4 rounded-lg border-2 transition-all hover:border-blue-500 dark:hover:border-blue-400"
                :class="[
                  config.theme === theme.value
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                ]"
                @click="config.theme = theme.value as 'light' | 'dark' | 'auto'"
              >
                <component :is="theme.icon" class="w-6 h-6 mx-auto mb-2 text-gray-700 dark:text-gray-300" />
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ theme.label }}</span>
              </button>
            </div>
          </div>

          <!-- Header Style -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Header Style
            </label>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="header in headerStyles"
                :key="header.value"
                class="p-4 rounded-lg border-2 transition-all text-left"
                :class="[
                  config.headerStyle === header.value
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                ]"
                @click="config.headerStyle = header.value as 'minimal' | 'full'"
              >
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ header.label }}</span>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ header.description }}</p>
              </button>
            </div>
          </div>

          <!-- Show Progress Bar -->
          <div class="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div>
              <label class="text-sm font-medium text-gray-900 dark:text-gray-100">
                Show Progress Bar
              </label>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Display completion progress to respondents
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                v-model="config.showProgressBar"
                type="checkbox"
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <!-- Step 2: Response Logic -->
        <div v-if="currentStep === 2" class="space-y-6">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Response Logic
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Control how responses are collected and processed
            </p>
          </div>

          <!-- Navigation Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Navigation Type
            </label>
            <div class="space-y-3">
              <button
                v-for="nav in navigationTypes"
                :key="nav.value"
                class="w-full p-4 rounded-lg border-2 transition-all text-left"
                :class="[
                  config.navigationType === nav.value
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                ]"
                @click="config.navigationType = nav.value as 'scroll' | 'paginated'"
              >
                <div class="flex items-start gap-3">
                  <component :is="nav.icon" class="w-5 h-5 text-gray-700 dark:text-gray-300 mt-0.5" />
                  <div class="flex-1">
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ nav.label }}</span>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ nav.description }}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- Response Options -->
          <div class="space-y-3">
            <div class="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div>
                <label class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Allow Multiple Submissions
                </label>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Users can submit the form multiple times
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  v-model="config.allowMultipleSubmissions"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div class="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div>
                <label class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Show Confirmation Page
                </label>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Display a thank you message after submission
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  v-model="config.showConfirmation"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div class="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div>
                <label class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Collect Email Addresses
                </label>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Require respondents to provide their email
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  v-model="config.collectEmail"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- Step 3: Response Format -->
        <div v-if="currentStep === 3" class="space-y-6">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Response Format
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Choose how you want to receive and view responses
            </p>
          </div>

          <!-- Response View -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Default Response View
            </label>
            <div class="space-y-3">
              <button
                v-for="view in responseViews"
                :key="view.value"
                class="w-full p-4 rounded-lg border-2 transition-all text-left"
                :class="[
                  config.responseView === view.value
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                ]"
                @click="config.responseView = view.value as 'table' | 'individual' | 'summary'"
              >
                <div class="flex items-start gap-3">
                  <component :is="view.icon" class="w-5 h-5 text-gray-700 dark:text-gray-300 mt-0.5" />
                  <div class="flex-1">
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ view.label }}</span>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ view.description }}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- Notifications -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Email Notifications
            </label>
            <div class="space-y-3">
              <div class="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div>
                  <label class="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Notify on New Response
                  </label>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Get an email for each new submission
                  </p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    v-model="config.notifyOnResponse"
                    type="checkbox"
                    class="sr-only peer"
                  />
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div v-if="config.notifyOnResponse">
                <input
                  v-model="config.notificationEmail"
                  type="email"
                  placeholder="your@email.com"
                  class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-8 py-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <button
          v-if="currentStep > 1"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          @click="currentStep--"
        >
          <ChevronLeft class="w-4 h-4 inline mr-1" />
          Back
        </button>
        <button
          v-else
          class="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          @click="handleSkip"
        >
          Skip Configuration
        </button>

        <button
          v-if="currentStep < 3"
          class="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
          @click="currentStep++"
        >
          Next
          <ChevronRight class="w-4 h-4 inline ml-1" />
        </button>
        <button
          v-else
          class="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
          @click="handleComplete"
        >
          <Check class="w-4 h-4 inline mr-1" />
          Complete Setup
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Palette,
  Moon,
  Sun,
  Layout,
  List,
  ArrowRight,
  Table,
  BarChart3,
} from "lucide-vue-next";

const emit = defineEmits<{
  (e: "complete", config: FormConfig): void;
  (e: "skip"): void;
}>();

export interface FormConfig {
  theme: "light" | "dark" | "auto";
  headerStyle: "minimal" | "full";
  showProgressBar: boolean;
  navigationType: "scroll" | "paginated";
  allowMultipleSubmissions: boolean;
  showConfirmation: boolean;
  collectEmail: boolean;
  responseView: "table" | "individual" | "summary";
  notifyOnResponse: boolean;
  notificationEmail: string;
}

const currentStep = ref(1);

const config = ref<FormConfig>({
  theme: "auto",
  headerStyle: "minimal",
  showProgressBar: true,
  navigationType: "scroll",
  allowMultipleSubmissions: false,
  showConfirmation: true,
  collectEmail: false,
  responseView: "table",
  notifyOnResponse: false,
  notificationEmail: "",
});

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "auto", label: "Auto", icon: Palette },
];

const headerStyles = [
  {
    value: "minimal",
    label: "Minimal",
    description: "Clean header with just the title",
  },
  {
    value: "full",
    label: "Full",
    description: "Header with logo, title, and description",
  },
];

const navigationTypes = [
  {
    value: "scroll",
    label: "Scroll",
    icon: List,
    description: "All questions on one scrollable page",
  },
  {
    value: "paginated",
    label: "Paginated",
    icon: ArrowRight,
    description: "One question at a time with next/previous buttons",
  },
];

const responseViews = [
  {
    value: "table",
    label: "Table View",
    icon: Table,
    description: "View all responses in a spreadsheet-like table",
  },
  {
    value: "individual",
    label: "Individual View",
    icon: Layout,
    description: "Review responses one at a time",
  },
  {
    value: "summary",
    label: "Summary View",
    icon: BarChart3,
    description: "See aggregated statistics and charts",
  },
];

const handleComplete = () => {
  emit("complete", config.value);
};

const handleSkip = () => {
  emit("skip");
};
</script>
