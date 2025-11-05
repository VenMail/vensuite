<script setup lang="ts">
import { ref, onMounted } from "vue";
import { PropType } from "vue";
import { AppForm, type FormResponsesPage } from "@/types";
import { useFormStore } from "@/store/forms";
// charts removed (not used in pagination summary)
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

// no chart registration needed

// Props received from parent component
const props = defineProps({
  form: {
    type: Object as PropType<AppForm>,
    required: true,
  },
});

const formStore = useFormStore();
const responseData = ref<FormResponsesPage | null>(null);
const loadingResponses = ref<boolean>(false);
const errorMessage = ref<string | null>(null);

const fetchFormResponses = async () => {
  try {
    loadingResponses.value = true;
    errorMessage.value = null;

    const response = await formStore.fetchResponses(props.form.id!, { page: 1 });
    responseData.value = response;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Failed to load response data";
  } finally {
    loadingResponses.value = false;
  }
};

onMounted(fetchFormResponses);

// no chart options

const launchEditor = () => {
  router.push(`/forms/${props.form.id}`);
};

</script>

<template>
  <div
    class="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 transform transition duration-300 hover:scale-105 hover:shadow-2xl space-y-4 border border-gray-200 dark:border-gray-700">
    <h2 class="text-3xl font-semibold text-gray-900 dark:text-gray-100">{{ form.title }}</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Created: {{ form.created_at ? new Date(form.created_at).toLocaleDateString() : "N/A" }}
    </p>
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Last Viewed: {{ form.last_view_date ? new Date(form.last_view_date).toLocaleDateString() : "N/A" }}
    </p>

    <div class="space-y-1">
      <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ responseData?.meta.total || 0 }} Total Responses</p>
    </div>

    <div v-if="loadingResponses" class="text-center text-gray-500 dark:text-gray-400">Loading responses...</div>
    <div v-if="errorMessage" class="text-center text-red-500 dark:text-red-400">{{ errorMessage }}</div>

    <!-- Analytics per-question not available from pagination response; omitted intentionally -->

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
          <div v-else-if="responseData" class="space-y-2 text-sm">
            <div v-for="row in responseData.data" :key="row.id" class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 py-2">
              <span class="text-gray-700 dark:text-gray-300">ID: {{ row.id }}</span>
              <span class="text-gray-500 dark:text-gray-400">Status: {{ row.status || 'n/a' }}</span>
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
