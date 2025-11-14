<script setup lang="ts">
import { computed, ref } from "vue";
import { PropType } from "vue";
import { AppForm, FormDefinition, FormData } from "@/types";
import { Button } from "@/components/ui/button";
import { router } from "@/main";
import { Trash2, Edit3, Share2, BarChart2, Eye } from "lucide-vue-next";
import { useFormStore } from "@/store/forms";

const props = defineProps({
  form: {
    type: Object as PropType<AppForm>,
    required: true,
  },
  viewMode: {
    type: String as PropType<"grid" | "list">,
    default: "grid",
  },
  fieldCount: {
    type: Number,
    default: null,
  },
  responseCount: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits<{
  (e: "view-responses", form: AppForm): void;
  (e: "share", form: AppForm): void;
}>();

const formStore = useFormStore();
const hydratedDef = ref<FormDefinition | null>(null);

const totalResponses = computed(() => {
  if (props.responseCount != null) {
    return props.responseCount;
  }
  const count = props.form?.responses?.length ?? 0;
  return count;
});
const hasResponses = computed(() => totalResponses.value > 0);
const responseValueClass = computed(() => [
  "text-sm font-medium tabular-nums transition-colors text-left",
  hasResponses.value
    ? "text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
    : "text-slate-400 dark:text-slate-500 cursor-not-allowed",
]);
const fieldCount = computed(() => {
  if (props.fieldCount != null) {
    return props.fieldCount;
  }
  const source = (hydratedDef.value as any) ?? (props.form.form as any);
  const formData = source as FormDefinition | FormData | undefined;
  if (!formData) return 0;
  if (Array.isArray((formData as FormData).fields)) {
    return (formData as FormData).fields.length;
  }
  if (Array.isArray((formData as FormDefinition).questions)) {
    return ((formData as FormDefinition).questions as any[]).length;
  }
  if (Array.isArray((formData as FormDefinition).pages)) {
    return ((formData as FormDefinition).pages as any[]).reduce((total: number, page: any) => {
      const pageQuestions = Array.isArray(page?.questions) ? page.questions.length : 0;
      const orderIds = Array.isArray(page?.question_order) ? page.question_order.length : 0;
      return total + Math.max(pageQuestions, orderIds);
    }, 0);
  }
  return 0;
});
const shareSlug = computed(() => props.form.sharing?.share_slug ?? props.form.slug ?? null);
const isList = computed(() => props.viewMode === "list");
const isDraft = computed(() => (props.form.status ?? "draft") === "draft");

const statusConfig = computed(() => {
  switch (props.form.status) {
    case "published":
      return {
        label: "Published",
        classes: "text-emerald-600 dark:text-emerald-400",
      };
    case "archived":
      return {
        label: "Archived",
        classes: "text-slate-500 dark:text-slate-400",
      };
    default:
      return {
        label: "Draft",
        classes: "text-amber-600 dark:text-amber-400",
      };
  }
});

const createdLabel = computed(() => formatDate(props.form.created_at));
const lastResponseLabel = computed(() =>
  props.form.last_response_at ? formatRelative(props.form.last_response_at) : "—",
);

// Mobile-first responsive classes
const cardClass = computed(() => [
  "group relative flex flex-col rounded-xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden",
  "dark:bg-slate-900 dark:border-slate-800",
  "p-4 sm:p-5",
  isList.value
    ? "lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:p-5"
    : "md:p-6",
]);

const contentClass = computed(() => [
  "flex flex-col gap-4 sm:gap-5 min-w-0",
  isList.value ? "lg:flex-row lg:items-start lg:gap-8 lg:flex-1" : "",
]);

const headerClass = computed(() => [
  "flex-1 space-y-2 sm:space-y-3 min-w-0",
]);

const statsClass = computed(() => [
  "grid grid-cols-2 gap-3 sm:gap-4",
  isList.value ? "sm:flex sm:gap-4 lg:w-auto lg:gap-6" : "sm:flex sm:justify-start sm:gap-6 md:gap-8",
]);

const actionsClass = computed(() => [
  "flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800",
  isList.value
    ? "lg:w-auto lg:flex-nowrap lg:border-0 lg:pt-0 lg:mt-0 lg:pl-6 lg:border-l lg:border-slate-100 dark:lg:border-slate-800"
    : "sm:pt-5 sm:mt-5",
]);

const deleting = ref(false);

const launchEditor = () => {
  if (!props.form.id) return;
  router.push({ name: "form-edit", params: { id: props.form.id } });
};

const previewForm = () => {
  if (!props.form.id) return;
  const shareSlugValue = shareSlug.value;
  const target = !isDraft.value && shareSlugValue
    ? `/f/${shareSlugValue}`
    : `/f/by-id/${props.form.id}`;
  router.push(target);
};

const handleResponsesClick = () => {
  if (!hasResponses.value) return;
  emit("view-responses", props.form);
};

const handleShareClick = () => {
  emit("share", props.form);
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
        <div class="space-y-2 sm:space-y-3">
          <div class="flex flex-wrap items-center gap-2 sm:gap-3">
            <span class="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 whitespace-nowrap">
              {{ createdLabel }}
            </span>
            <span class="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0"></span>
            <span :class="['text-[10px] font-semibold uppercase tracking-[0.12em] whitespace-nowrap', statusConfig.classes]">
              {{ statusConfig.label }}
            </span>
          </div>

          <h3 class="text-lg sm:text-xl font-semibold leading-tight text-slate-900 line-clamp-2 dark:text-white break-words">
            {{ form.title || "Untitled Form" }}
          </h3>
        </div>

        <p
          v-if="form.form?.metadata?.description"
          class="text-xs sm:text-sm leading-relaxed text-slate-500 line-clamp-2 break-words dark:text-slate-400"
        >
          {{ form.form.metadata.description }}
        </p>
      </div>

      <!-- Stats Section -->
      <div :class="statsClass">
        <div class="flex flex-col gap-1 min-w-0">
          <span class="text-[11px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
            Fields
          </span>
          <span class="text-sm font-medium tabular-nums text-slate-900 dark:text-white truncate">
            {{ fieldCount }}
          </span>
        </div>

        <button
          type="button"
          class="flex flex-col gap-1 min-w-0 text-left transition-colors"
          :class="hasResponses ? 'cursor-pointer text-slate-900 dark:text-white' : 'cursor-not-allowed text-slate-400 dark:text-slate-500'"
          :disabled="!hasResponses"
          @click="handleResponsesClick"
        >
          <span class="text-[11px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
            Responses
          </span>
          <span :class="responseValueClass">
            {{ totalResponses.toLocaleString() }}
          </span>
        </button>

        <div class="flex flex-col gap-1 min-w-0">
          <span class="text-[11px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
            Last response
          </span>
          <span class="text-sm font-medium tabular-nums text-slate-700 dark:text-slate-300 truncate">
            {{ lastResponseLabel }}
          </span>
        </div>
      </div>
    </div>

    <!-- Actions Footer -->
    <footer :class="actionsClass">
      <Button
        size="sm"
        variant="default"
        class="gap-1.5 font-medium text-xs sm:text-sm whitespace-nowrap"
        :disabled="deleting"
        @click="launchEditor"
      >
        <Edit3 class="h-3.5 w-3.5 flex-shrink-0" />
        <span class="hidden xs:inline sm:inline">Edit</span>
        <span class="xs:hidden sm:hidden">Edit</span>
      </Button>

      <div class="flex items-center gap-1 sm:gap-1.5 ml-auto">
        <Button
          size="icon"
          variant="ghost"
          class="h-8 w-8 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          :disabled="!hasResponses || deleting"
          @click="handleResponsesClick"
          aria-label="View responses"
        >
          <BarChart2 class="h-4 w-4" />
        </Button>

        <Button
          v-if="props.form.id"
          size="icon"
          variant="ghost"
          class="h-8 w-8 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          :disabled="deleting"
          @click="previewForm"
          aria-label="Preview form"
        >
          <Eye class="h-4 w-4" />
        </Button>

        <Button
          v-if="props.form.id"
          size="icon"
          variant="ghost"
          class="h-8 w-8 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          :disabled="deleting"
          @click="handleShareClick"
          aria-label="Share form"
        >
          <Share2 class="h-4 w-4" />
        </Button>

        <button
          v-if="isDraft"
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-400 flex-shrink-0"
          :disabled="deleting"
          @click.stop="deleteDraft"
          aria-label="Delete draft form"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </div>

      <span v-if="deleting" class="mt-2 text-xs font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
        Deleting…
      </span>
    </footer>
  </article>
</template>

<style scoped>
/* Ensure proper text wrapping and overflow handling */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Prevent text overflow in all contexts */
* {
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Ensure min-w-0 works properly in flex containers */
.min-w-0 {
  min-width: 0;
}
</style>