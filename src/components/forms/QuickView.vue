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
  DialogTrigger,
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

const launchEditor = () => {
  router.push(`/forms/${props.form.id}`);
};

</script>

<template>
  <div
    class="bg-white shadow-lg rounded-xl p-6 transform transition duration-300 hover:scale-105 hover:shadow-2xl space-y-4">
    <h2 class="text-3xl font-semibold text-gray-900">{{ form.title }}</h2>
    <p class="text-sm text-gray-500">
      Created: {{ form.created_at ? new Date(form.created_at).toLocaleDateString() : "N/A" }}
    </p>
    <p class="text-sm text-gray-500">
      Last Viewed: {{ form.last_view_date ? new Date(form.last_view_date).toLocaleDateString() : "N/A" }}
    </p>

    <div class="space-y-1">
      <p class="text-lg font-semibold">{{ responseData?.meta.total_responses || 0 }} Total Responses</p>
      <p class="text-sm text-gray-600">
        Completed: {{ responseData?.meta.completed_responses || 0 }} | Incomplete: {{
          responseData?.meta.incomplete_responses || 0 }}
      </p>
    </div>

    <div v-if="loadingResponses" class="text-center text-gray-500">Loading responses...</div>
    <div v-if="errorMessage" class="text-center text-red-500">{{ errorMessage }}</div>

    <div v-if="statistics['completion']">
      <h3 class="text-lg font-semibold mb-2">Completion Statistics</h3>
      <pie :data="statistics['completion'].chart_data.data" :options="chartOptions"></pie>
    </div>

    <div v-if="statistics && Object.keys(statistics).length > 0" class="space-y-6 mt-6">
      <div v-for="(stat, questionId) in statistics" :key="questionId">
        <h3 class="text-lg font-medium text-gray-800">Question ID: {{ questionId }}</h3>
        <bar v-if="stat.chart_data.data.labels.length > 6" :data="stat.chart_data.data"></bar>
        <pie v-else :data="stat.chart_data.data" :options="chartOptions"></pie>
      </div>
    </div>

    <div class="flex space-x-4 mt-6">
      <Button variant="outline" @click="launchEditor">Edit Form</Button>

      <!-- Modal -->
      <Dialog>
        <DialogTrigger>
          <Button variant="outline">View Responses</Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Form Responses</DialogTitle>
          </DialogHeader>

          <!-- Dialog content goes here -->
          <div v-if="loadingResponses" class="text-center">
            Loading responses...
          </div>
          <div v-else-if="responseData" class="space-y-4">
            <div v-for="(response, index) in responseData.responses" :key="index">
              <p>{{ response.question_id }}: {{ response.value }}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

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
