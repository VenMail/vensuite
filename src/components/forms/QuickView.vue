<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { PropType } from "vue";
import { AppForm, FormDefinition, type FormResponsesPage } from "@/types";
import { useFormStore } from "@/store/forms";
import { Button } from "@/components/ui/button";
import { router } from "@/main";
import { Trash2, Edit3 } from "lucide-vue-next";

const props = defineProps({
  form: {
    type: Object as PropType<AppForm>,
    required: true,
  },
  viewMode: {
    type: String as PropType<"grid" | "list">,
    default: "grid",
  },
});

const formStore = useFormStore();
const responseData = ref<FormResponsesPage | null>(null);
const loadingResponses = ref<boolean>(false);
const errorMessage = ref<string | null>(null);

const totalResponses = computed(() => responseData.value?.meta?.total ?? 0);
const hasResponses = computed(() => totalResponses.value > 0);
const fieldCount = computed(() => {
  const definition = props.form.form as FormDefinition;
  if (!definition) return 0;
  if (Array.isArray(definition.questions)) {
    return definition.questions.length;
  }
  if (Array.isArray(definition.pages)) {
    return definition.pages.reduce((total: number, page: any) => {
      const pageQuestions = Array.isArray(page?.questions) ? page.questions.length : 0;
      return total + pageQuestions;
    }, 0);
  }
  return 0;
});
const slugOrId = computed(() => props.form.slug ?? props.form.id ?? null);
const isList = computed(() => props.viewMode === "list");
const isDraft = computed(() => (props.form.status ?? "draft") === "draft");

const statusLabel = computed(() => {
  switch (props.form.status) {
    case "published":
      return "Published";
    case "archived":
      return "Archived";
    default:
      return "Draft";
  }
});

const statusConfig = computed(() => {
  switch (props.form.status) {
    case "published":
      return {
        label: "Published",
        classes: "text-emerald-600 dark:text-emerald-400"
      };
    case "archived":
      return {
        label: "Archived",
        classes: "text-slate-500 dark:text-slate-400"
      };
    default:
      return {
        label: "Draft",
        classes: "text-amber-600 dark:text-amber-400"
      };
  }
});

const createdLabel = computed(() => formatDate(props.form.created_at));
const updatedLabel = computed(() => formatRelative(props.form.updated_at ?? props.form.last_view_date ?? props.form.created_at));

const cardClass = computed(() => [
  "group relative flex flex-col rounded-xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md",
  "dark:bg-slate-900 dark:border-slate-800",
  isList.value 
    ? "p-5 md:flex-row md:items-center md:justify-between md:gap-8" 
    : "p-6",
]);

const contentClass = computed(() => [
  "flex flex-col gap-5",
  isList.value ? "flex-1 md:flex-row md:items-start md:gap-8" : "",
]);

const headerClass = computed(() => [
  "flex-1 space-y-3",
  isList.value ? "md:min-w-0" : "",
]);

const statsClass = computed(() => [
  "flex gap-8",
  isList.value ? "md:w-auto md:gap-6" : "justify-start",
]);

const actionsClass = computed(() => [
  "flex items-center gap-2 pt-5 mt-5 border-t border-slate-100 dark:border-slate-800",
  isList.value ? "md:w-auto md:border-0 md:pt-0 md:mt-0 md:pl-6 md:border-l md:border-slate-100 dark:md:border-slate-800" : "",
]);

const deleting = ref(false);

const fetchFormResponses = async () => {
  if (!props.form.id) return;
  try {
    loadingResponses.value = true;
    errorMessage.value = null;

    const response = await formStore.fetchResponses(props.form.id, { page: 1 });
    responseData.value = response;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Failed to load response data";
  } finally {
    loadingResponses.value = false;
  }
};

onMounted(fetchFormResponses);

const launchEditor = () => {
  if (!props.form.id) return;
  router.push({ name: "form-edit", params: { id: props.form.id } });
};

const previewForm = () => {
  if (!slugOrId.value) return;
  router.push(`/f/${slugOrId.value}`);
};

const viewResponses = () => {
  if (!props.form.id) return;
  router.push({ name: "form-responses", params: { id: props.form.id } });
};

const deleteDraft = async () => {
  if (!props.form.id || deleting.value) return;
  if (!window.confirm("Delete this draft form? This action cannot be undone.")) {
    return;
  }
  deleting.value = true;
  const success = await formStore.deleteForm(props.form.id);
  if (!success) {
    deleting.value = false;
  }
};

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  try {
    const date = typeof value === "string" ? new Date(value) : value;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (error) {
    return "—";
  }
}

function formatRelative(value?: string | Date | null) {
  if (!value) return "—";
  try {
    const date = typeof value === "string" ? new Date(value) : value;
    const now = Date.now();
    const diff = now - date.getTime();

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;

    if (diff < minute) return "Just now";
    if (diff < hour) {
      const minutes = Math.floor(diff / minute);
      return `${minutes}m ago`;
    }
    if (diff < day) {
      const hours = Math.floor(diff / hour);
      return `${hours}h ago`;
    }
    if (diff < week) {
      const days = Math.floor(diff / day);
      return `${days}d ago`;
    }
    return formatDate(date);
  } catch (error) {
    return "—";
  }
}
</script>

<template>
  <article :class="cardClass">
    <div :class="contentClass">
      <!-- Header Section -->
      <div :class="headerClass">
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <span class="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              {{ createdLabel }}
            </span>
            <span class="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
            <span :class="['text-[10px] font-semibold uppercase tracking-[0.12em]', statusConfig.classes]">
              {{ statusConfig.label }}
            </span>
          </div>
          
          <h3 class="text-xl font-semibold leading-tight text-slate-900 line-clamp-2 dark:text-white">
            {{ form.title || "Untitled Form" }}
          </h3>
        </div>
        
        <p 
          v-if="form.form?.metadata?.description" 
          class="text-sm leading-relaxed text-slate-500 line-clamp-2 dark:text-slate-400"
        >
          {{ form.form.metadata.description }}
        </p>
      </div>

      <!-- Stats Section -->
      <div :class="statsClass">
        <div class="flex flex-col gap-1 min-w-[90px]">
          <span class="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Fields
          </span>
          <span class="text-sm font-medium tabular-nums text-slate-900 dark:text-white">
            {{ fieldCount }}
          </span>
        </div>
        
        <div class="flex flex-col gap-1 min-w-[90px]">
          <span class="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Responses
          </span>
          <span v-if="loadingResponses" class="text-sm font-medium tabular-nums text-slate-300 dark:text-slate-600">
            —
          </span>
          <span v-else class="text-sm font-medium tabular-nums text-slate-900 dark:text-white">
            {{ totalResponses.toLocaleString() }}
          </span>
        </div>
        
        <div class="flex flex-col gap-1 min-w-[90px]">
          <span class="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Updated
          </span>
          <span class="text-sm font-medium tabular-nums text-slate-700 dark:text-slate-300">
            {{ updatedLabel }}
          </span>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <p v-if="errorMessage" class="text-xs font-medium text-rose-600 dark:text-rose-400 mt-3">
      {{ errorMessage }}
    </p>

    <!-- Actions Footer -->
    <footer :class="actionsClass">
      <Button 
        size="sm" 
        variant="default"
        class="gap-1.5 font-medium"
        :disabled="deleting" 
        @click="launchEditor"
      >
        <Edit3 class="h-3.5 w-3.5" />
        Edit
      </Button>
      
      <Button
        size="sm"
        variant="ghost"
        class="gap-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        :disabled="!hasResponses || deleting"
        @click="viewResponses"
      >
        Responses
      </Button>
      
      <Button
        v-if="slugOrId"
        size="sm"
        variant="ghost"
        class="gap-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        :disabled="deleting"
        @click="previewForm"
      >
        Preview
      </Button>
      
      <button
        v-if="isDraft"
        type="button"
        class="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-400"
        :disabled="deleting"
        @click.stop="deleteDraft"
        aria-label="Delete draft form"
      >
        <Trash2 class="h-4 w-4" />
      </button>
      
      <span v-if="deleting" class="text-xs font-medium text-slate-400 dark:text-slate-500">
        Deleting…
      </span>
    </footer>
  </article>
</template>