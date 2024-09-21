<script setup lang="ts">
import { ref, onMounted } from "vue";
import { PropType } from "vue";
import { AppForm, FormResponseData, QuestionStatistics } from "@/types";
import { useFormStore } from "@/store/forms";
import { Bar, Pie } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
} from "chart.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { router } from "@/main";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement
);

// Props received from parent component
const props = defineProps({
  form: {
    type: Object as PropType<AppForm>,
    required: true,
  },
});

const formStore = useFormStore();
const responseData = ref<FormResponseData | null>(null);
const statistics = ref<Record<string, QuestionStatistics>>({});
const loadingResponses = ref<boolean>(false);
const errorMessage = ref<string | null>(null);
const showModal = ref<boolean>(false);

const fetchFormResponses = async () => {
  try {
    loadingResponses.value = true;
    errorMessage.value = null;

    const response = await formStore.fetchResponses(props.form.id!);
    responseData.value = response;
    statistics.value = response.statistics;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Failed to load response data";
  } finally {
    loadingResponses.value = false;
  }
};

onMounted(fetchFormResponses);

// Dynamic chart options
const chartOptions = {
  responsive: true,
  plugins: {
    title: {
      display: true,
      text: "Form Completion Rate",
    },
  },
};

const openModal = () => {
  showModal.value = true;
};

const launchEditor = () => {
  router.push(`/forms/${props.form.id}`);
};

const closeModal = () => {
  showModal.value = false;
};
</script>

<template>
  <div
    class="bg-white shadow-lg rounded-lg p-6 transform transition duration-300 hover:scale-105 hover:shadow-2xl"
  >
    <h2 class="text-2xl font-semibold mb-2 text-gray-900">{{ form.title }}</h2>
    <p class="text-sm text-gray-500 mb-2">
      Created:
      {{
        form.created_at ? new Date(form.created_at).toLocaleDateString() : "N/A"
      }}
    </p>
    <p class="text-sm text-gray-500 mb-4">
      Last Viewed:
      {{
        form.last_view_date
          ? new Date(form.last_view_date).toLocaleDateString()
          : "N/A"
      }}
    </p>

    <div class="mb-4">
      <p class="text-lg font-bold">
        {{ responseData?.meta.total_responses || 0 }} Total Responses
      </p>
      <p class="text-sm text-gray-600">
        Completed: {{ responseData?.meta.completed_responses || 0 }} |
        Incomplete: {{ responseData?.meta.incomplete_responses || 0 }}
      </p>
    </div>

    <div v-if="loadingResponses" class="text-center">
      <span class="text-gray-600">Loading responses...</span>
    </div>
    <div v-if="errorMessage" class="text-red-500 text-center">
      {{ errorMessage }}
    </div>

    <div v-if="!loadingResponses && statistics">
      <div v-if="statistics['completion']">
        <h3 class="text-lg font-semibold mb-2">Completion Statistics</h3>
        <pie
          :data="statistics['completion'].chart_data.data"
          :options="chartOptions"
        ></pie>
      </div>
    </div>

    <div v-if="statistics && Object.keys(statistics).length > 0" class="mt-4">
      <div
        v-for="(stat, questionId) in statistics"
        :key="questionId"
        class="mt-6"
      >
        <h3 class="text-lg font-semibold text-gray-800">
          Question ID: {{ questionId }}
        </h3>
        <bar
          v-if="stat.chart_data.data.labels.length > 6"
          :data="stat.chart_data.data"
        ></bar>
        <pie v-else :data="stat.chart_data.data" :options="chartOptions"></pie>
      </div>
    </div>

    <Button variant="outline" class="mt-4" @click="launchEditor"
      >Edit Form</Button
    >
    <Button variant="outline" class="mt-4" @click="openModal"
      >View Responses</Button
    >

    <Dialog v-model:open="showModal" @close="closeModal">
      <DialogHeader>
        <DialogTitle>Form Responses</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div v-if="loadingResponses">
          <p>Loading responses...</p>
        </div>
        <div v-else>
          <div v-if="responseData">
            <div
              v-for="(response, index) in responseData.responses"
              :key="index"
              class="mb-4"
            >
              <p>{{ response.question_id }}: {{ response.value }}</p>
            </div>
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" @click="closeModal">Close</Button>
      </DialogFooter>
    </Dialog>
  </div>
</template>

<style scoped>
/* Card animation and styling */
.bg-white {
  border-radius: 12px;
  transition: all 0.3s ease-in-out;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
}
.hover\:scale-105:hover {
  transform: scale(1.05);
}
</style>
