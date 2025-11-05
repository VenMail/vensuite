<template>
  <div class="responses-view text-gray-900 dark:text-gray-100 transition-colors duration-200">
    <header class="responses-view__header">
      <button type="button" class="responses-view__back text-gray-600 dark:text-gray-300" @click="goBack">
        ← Back to Forms
      </button>
      <div class="responses-view__heading">
        <h1 class="text-gray-900 dark:text-gray-100">{{ formTitle }}</h1>
        <p v-if="formDescription" class="text-gray-600 dark:text-gray-300">{{ formDescription }}</p>
      </div>
      <div class="responses-view__actions">
        <button
          type="button"
          class="responses-view__button border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          :disabled="isLoading"
          @click="refresh"
        >
          Refresh
        </button>
        <button
          type="button"
          class="responses-view__button responses-view__button--primary bg-primary-600 border border-primary-600 text-white hover:bg-primary-700"
          :disabled="isExporting || !responseRows.length"
          @click="exportCsv"
        >
          {{ isExporting ? 'Exporting…' : 'Export CSV' }}
        </button>
      </div>
    </header>

    <section class="responses-view__summary">
      <div class="summary-card bg-white border border-gray-200 rounded-md dark:bg-gray-800 dark:border-gray-700">
        <span class="summary-card__label">Total Responses</span>
        <strong class="summary-card__value">{{ responseMeta.total_responses }}</strong>
      </div>
      <div class="summary-card bg-white border border-gray-200 rounded-md dark:bg-gray-800 dark:border-gray-700">
        <span class="summary-card__label">Completed</span>
        <strong class="summary-card__value">{{ responseMeta.completed_responses }}</strong>
      </div>
      <div class="summary-card bg-white border border-gray-200 rounded-md dark:bg-gray-800 dark:border-gray-700">
        <span class="summary-card__label">Incomplete</span>
        <strong class="summary-card__value">{{ responseMeta.incomplete_responses }}</strong>
      </div>
      <div class="summary-chart">
        <Doughnut :data="doughnutData" :options="doughnutOptions" />
      </div>
    </section>

    <section class="responses-view__filters">
      <label class="filter text-gray-700 dark:text-gray-300" for="status-filter">Status</label>
      <select id="status-filter" v-model="filters.status" @change="applyFilters"
        class="border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600">
        <option value="">All</option>
        <option value="submitted">Submitted</option>
        <option value="pending_payment">Pending Payment</option>
        <option value="draft">Draft</option>
      </select>
    </section>

    <section class="responses-view__table" v-if="!isLoading && !loadError">
      <table class="w-full border-collapse bg-white dark:bg-gray-900">
        <thead class="bg-gray-50 dark:bg-gray-800">
          <tr class="text-left text-gray-700 dark:text-gray-300">
            <th class="border-b border-gray-200 dark:border-gray-700 px-3 py-2">ID</th>
            <th class="border-b border-gray-200 dark:border-gray-700 px-3 py-2">Status</th>
            <th class="border-b border-gray-200 dark:border-gray-700 px-3 py-2">Submitted At</th>
            <th class="border-b border-gray-200 dark:border-gray-700 px-3 py-2">Payment Status</th>
            <th class="border-b border-gray-200 dark:border-gray-700 px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!responseRows.length">
            <td colspan="5" class="responses-view__empty text-gray-600 dark:text-gray-400">No responses yet.</td>
          </tr>
          <tr v-for="response in responseRows" :key="response.id" class="hover:bg-gray-50 dark:hover:bg-gray-800">
            <td class="border-b border-gray-200 dark:border-gray-700 px-3 py-2">{{ response.id }}</td>
            <td class="border-b border-gray-200 dark:border-gray-700 px-3 py-2">{{ response.statusLabel }}</td>
            <td class="border-b border-gray-200 dark:border-gray-700 px-3 py-2">{{ response.submittedAtLabel }}</td>
            <td class="border-b border-gray-200 dark:border-gray-700 px-3 py-2">{{ response.paymentStatusLabel }}</td>
            <td class="responses-view__row-action border-b border-gray-200 dark:border-gray-700 px-3 py-2">
              <button type="button" class="responses-view__link text-primary-600 dark:text-primary-400" @click="openDetail(response.id)">View</button>
            </td>
          </tr>
        </tbody>
      </table>

      <footer class="responses-view__pagination text-gray-700 dark:text-gray-300" v-if="hasPagination">
        <button
          type="button"
          class="border border-gray-300 bg-white text-gray-800 px-3 py-1 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          :disabled="pagination.page === 1"
          @click="changePage(pagination.page - 1)"
        >
          Previous
        </button>
        <span class="mx-2">Page {{ pagination.page }} of {{ totalPages }}</span>
        <button
          type="button"
          class="border border-gray-300 bg-white text-gray-800 px-3 py-1 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          :disabled="pagination.page === totalPages"
          @click="changePage(pagination.page + 1)"
        >
          Next
        </button>
      </footer>
    </section>

    <section v-else-if="isLoading" class="responses-view__loading text-gray-600 dark:text-gray-400">
      <span>Loading responses…</span>
    </section>

    <section v-else class="responses-view__error text-red-600 dark:text-red-400">
      <p>{{ loadError }}</p>
      <button type="button" class="responses-view__button" @click="refresh">Retry</button>
    </section>

    <Dialog v-model:open="detailDialogOpen">
      <DialogContent class="responses-detail">
        <DialogHeader>
          <DialogTitle>
            Response {{ detailState.response?.id ?? activeResponseId ?? '' }}
          </DialogTitle>
        </DialogHeader>

        <div v-if="detailState.isLoading" class="responses-detail__loading">
          Loading response…
        </div>
        <div v-else-if="detailState.error" class="responses-detail__error">
          <p>{{ detailState.error }}</p>
          <button type="button" class="responses-view__button" @click="retryDetail">Retry</button>
        </div>
        <div v-else-if="detailState.response" class="responses-detail__body">
          <div class="responses-detail__meta">
            <div>
              <span class="responses-detail__label">Status</span>
              <strong>{{ formatStatus(detailState.response.status ?? 'draft') }}</strong>
            </div>
            <div>
              <span class="responses-detail__label">Submitted</span>
              <strong>{{ detailState.response.submitted_at ? formatDate(detailState.response.submitted_at) : '—' }}</strong>
            </div>
            <div>
              <span class="responses-detail__label">Payment</span>
              <strong>{{ formatPaymentStatus(detailState.response.payment_status ?? null) }}</strong>
            </div>
          </div>

          <div v-if="respondentDetails.length" class="responses-detail__section">
            <h3>Respondent</h3>
            <dl>
              <div v-for="detail in respondentDetails" :key="detail.key">
                <dt>{{ detail.key }}</dt>
                <dd>{{ detail.value }}</dd>
              </div>
            </dl>
          </div>

          <div class="responses-detail__section">
            <h3>Answers</h3>
            <div v-if="detailAnswers.length" class="responses-detail__answers">
              <article v-for="answer in detailAnswers" :key="answer.id">
                <header>
                  <h4>{{ answer.questionTitle }}</h4>
                  <p v-if="answer.description" class="responses-detail__description">{{ answer.description }}</p>
                </header>
                <div class="responses-detail__answer">
                  <button
                    v-if="answer.fileUrl"
                    type="button"
                    class="responses-detail__download"
                    @click="downloadFileAnswer(answer)"
                  >
                    Download {{ answer.formatted }}
                  </button>
                  <pre v-else-if="answer.isMultiline">{{ answer.formatted }}</pre>
                  <p v-else>{{ answer.formatted }}</p>
                </div>
              </article>
            </div>
            <p v-else class="responses-detail__empty">No answers captured for this response.</p>
          </div>
        </div>

        <DialogFooter>
          <button type="button" class="responses-view__button" @click="closeDetail">Close</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  useRoute,
  useRouter,
  type LocationQueryRaw,
  type LocationQueryValueRaw,
} from 'vue-router';
import { useFormStore } from '@/store/forms';
import { useAuthStore } from '@/store/auth';
import { fetchResponseDetail } from '@/services/forms';
import type {
  AppFormResponseDetail,
  AppFormResponseAnswer,
  FormResponsesPage,
  FormResponseSummary,
} from '@/types';
import { saveAs } from 'file-saver';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ResponsesMeta {
  total_responses: number;
  completed_responses: number;
  incomplete_responses: number;
}

interface ResponseRow {
  id: number;
  status: string;
  statusLabel: string;
  submittedAt: string | null;
  submittedAtLabel: string;
  paymentStatusLabel: string;
}

interface PaginationState {
  page: number;
  perPage: number;
  total: number;
}

const route = useRoute();
const router = useRouter();
const formStore = useFormStore();
const authStore = useAuthStore();

const formId = computed(() => route.params.id as string);

const isLoading = ref(false);
const isExporting = ref(false);
const loadError = ref<string | null>(null);
const formTitle = ref('Form Responses');
const formDescription = ref<string>('');

const responsesPage = ref<FormResponsesPage | null>(null);
const summary = reactive<ResponsesMeta>({
  total_responses: 0,
  completed_responses: 0,
  incomplete_responses: 0,
});

const pagination = reactive<PaginationState>({
  page: 1,
  perPage: 25,
  total: 0,
});

const filters = reactive({
  status: '',
});

const detailState = reactive({
  isOpen: false,
  isLoading: false,
  error: null as string | null,
  response: null as AppFormResponseDetail | null,
});

const detailRequestId = ref(0);

const activeResponseId = computed(() => {
  const responseParam = route.query.response;
  const value = Array.isArray(responseParam) ? responseParam[0] : responseParam;
  return value ? String(value) : null;
});

const detailDialogOpen = computed<boolean>({
  get: () => detailState.isOpen,
  set: (open) => {
    detailState.isOpen = open;
  },
});

const responseRows = computed<ResponseRow[]>(() => {
  if (!responsesPage.value?.data) return [];
  return responsesPage.value.data.map(mapResponseRow);
});

const responseMeta = computed<ResponsesMeta>(() => summary);

const hasPagination = computed(() => pagination.total > pagination.perPage);
const totalPages = computed(() => (pagination.total ? Math.ceil(pagination.total / pagination.perPage) : 1));

const doughnutData = computed(() => {
  const completed = summary.completed_responses || 0;
  const incomplete = Math.max((summary.total_responses || 0) - completed, 0);
  return {
    labels: ['Completed', 'Incomplete'],
    datasets: [
      {
        data: [completed, incomplete],
        backgroundColor: ['#10b981', '#f59e0b'],
        borderWidth: 1,
      },
    ],
  } as unknown as any;
});

const doughnutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const },
  },
}));

interface DetailAnswerItem {
  id: number;
  questionTitle: string;
  description?: string;
  formatted: string;
  fileUrl?: string | null;
  isMultiline: boolean;
}

interface RespondentDetailItem {
  key: string;
  value: string;
}

const detailAnswers = computed<DetailAnswerItem[]>(() => {
  if (!detailState.response?.answers?.length) return [];

  return detailState.response.answers.map((answer) => {
    const questionTitle = answer.question?.question ?? `Question ${answer.question_id}`;
    const formatted = formatAnswerValue(answer);

    return {
      id: answer.id,
      questionTitle,
      description: answer.question?.description,
      formatted,
      fileUrl: answer.file_url ?? null,
      isMultiline: formatted.includes('\n'),
    };
  });
});

const respondentDetails = computed<RespondentDetailItem[]>(() => {
  const respondent = detailState.response?.respondent;
  if (!respondent || typeof respondent !== 'object') return [];

  return Object.entries(respondent as Record<string, unknown>)
    .map(([key, value]) => ({
      key: humanizeKey(key),
      value: formatBasicValue(value),
    }))
    .filter((item) => item.value && item.value !== '—');
});

const mapResponseRow = (response: FormResponseSummary): ResponseRow => {
  const status = (response as any).status ?? (response.completed ? 'submitted' : 'draft');
  const submittedAt = (response as any).submitted_at ?? null;
  const paymentStatus = (response as any).payment_status ?? null;

  return {
    id: response.id,
    status,
    statusLabel: formatStatus(status),
    submittedAt,
    submittedAtLabel: submittedAt ? formatDate(submittedAt) : '—',
    paymentStatusLabel: formatPaymentStatus(paymentStatus),
  };
};

const formatStatus = (status: string) => {
  switch (status) {
    case 'submitted':
      return 'Submitted';
    case 'pending_payment':
      return 'Pending Payment';
    case 'draft':
      return 'Draft';
    default:
      return status ?? 'Unknown';
  }
};

const formatDate = (value: string) => {
  try {
    const date = new Date(value);
    return date.toLocaleString();
  } catch (error) {
    return value;
  }
};

const formatPaymentStatus = (status: string | null) => {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'requires_action':
      return 'Requires Action';
    case 'pending':
      return 'Pending';
    case 'canceled':
      return 'Cancelled';
    default:
      return status ? status.replace(/_/g, ' ') : '—';
  }
};

const formatAnswerValue = (answer: AppFormResponseAnswer): string => {
  if (answer.file_url) {
    const fileName = answer.file_path?.split('/').pop();
    return fileName ?? 'Download file';
  }

  return formatBasicValue(answer.value);
};

const formatBasicValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    return value.map((item) => formatBasicValue(item)).join(', ');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => `${humanizeKey(key)}: ${formatBasicValue(val)}`)
      .join('\n');
  }
  return String(value);
};

const humanizeKey = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const loadResponses = async (): Promise<void> => {
  if (!formId.value) return;
  isLoading.value = true;
  loadError.value = null;

  try {
    const page = await formStore.fetchResponses(formId.value, {
      page: pagination.page,
      per_page: pagination.perPage,
      status: filters.status || undefined,
    });

    if (!page) {
      responsesPage.value = null;
      pagination.total = 0;
      throw new Error(formStore.error ?? 'Failed to load responses.');
    }

    responsesPage.value = page;
    const total = page.meta?.total ?? 0;
    const perPage = page.meta?.per_page ?? pagination.perPage;
    pagination.total = total;
    pagination.perPage = perPage;

    const computedTotalPages = total && perPage ? Math.ceil(total / perPage) : 1;
    if (pagination.page > computedTotalPages && computedTotalPages > 0) {
      pagination.page = computedTotalPages;
      await loadResponses();
    }
  } catch (error: any) {
    const message = error?.data?.message ?? error?.message ?? 'Failed to load responses.';
    loadError.value = message;
  } finally {
    isLoading.value = false;
  }
};

const loadSummary = async () => {
  if (!formId.value) return;

  try {
    const [allResponses, completedResponses] = await Promise.all([
      formStore.fetchResponses(formId.value, { per_page: 1 }),
      formStore.fetchResponses(formId.value, { per_page: 1, status: 'submitted' }),
    ]);

    const total = allResponses?.meta?.total ?? 0;
    const completed = completedResponses?.meta?.total ?? 0;
    summary.total_responses = total;
    summary.completed_responses = completed;
    summary.incomplete_responses = Math.max(total - completed, 0);
  } catch (error) {
    // Ignore summary errors; table already reports main error state
  }
};

const loadFormInfo = async () => {
  if (!formId.value) return;
  try {
    const form = await formStore.fetchForm(formId.value);
    if (form) {
      formTitle.value = form.title ?? 'Form Responses';
      formDescription.value = form.description ?? '';
    }
  } catch (error) {
    // Fallback to default titles if form metadata cannot be loaded.
  }
};

const changePage = (page: number) => {
  pagination.page = page;
  loadResponses();
};

const refresh = () => {
  pagination.page = 1;
  Promise.all([loadResponses(), loadSummary()]);
};

const applyFilters = () => {
  pagination.page = 1;
  loadResponses();
};

const openDetail = (responseId: number) => {
  const baseQuery = { ...route.query, response: String(responseId) };
  const routeName = typeof route.name === 'string' ? route.name : 'form-responses';
  router.push({ name: routeName, params: { ...route.params }, query: baseQuery });
};

const closeDetail = () => {
  detailDialogOpen.value = false;
};

const goBack = () => {
  router.push({ name: 'forms' });
};

const exportCsv = async () => {
  if (!responseRows.value.length || !formId.value) return;

  isExporting.value = true;
  try {
    const rows: ResponseRow[] = hasPagination.value
      ? await fetchAllResponsesRows()
      : responseRows.value;

    const csvRows = [
      ['ID', 'Status', 'Submitted At', 'Payment Status'],
      ...rows.map((row) => [
        String(row.id),
        row.statusLabel,
        row.submittedAtLabel,
        row.paymentStatusLabel,
      ]),
    ];

    const csvContent = csvRows.map((cells) => cells.map((cell) => escapeCsvValue(cell)).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    saveAs(blob, `form-${formId.value}-responses-${timestamp}.csv`);
  } finally {
    isExporting.value = false;
  }
};

const escapeCsvValue = (value: string) => {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const fetchAllResponsesRows = async (): Promise<ResponseRow[]> => {
  if (!formId.value) return [];
  const rows: ResponseRow[] = [];
  const baseParams = {
    per_page: pagination.perPage,
    status: filters.status || undefined,
  } as const;

  const first = await formStore.fetchResponses(formId.value, { page: 1, ...baseParams });
  if (!first) return rows;

  rows.push(...first.data.map(mapResponseRow));
  const total = first.meta?.total ?? 0;
  const per = first.meta?.per_page ?? baseParams.per_page;
  const totalPagesLocal = total && per ? Math.ceil(total / per) : 1;

  for (let p = 2; p <= totalPagesLocal; p++) {
    const next = await formStore.fetchResponses(formId.value, { page: p, ...baseParams });
    if (next?.data?.length) {
      rows.push(...next.data.map(mapResponseRow));
    }
  }

  return rows;
};

const loadResponseDetail = async (responseId: string) => {
  if (!formId.value) return;

  const requestId = ++detailRequestId.value;
  detailState.isLoading = true;
  detailState.error = null;
  detailState.response = null;

  try {
    const token = authStore.getToken?.();
    const detail = await fetchResponseDetail(formId.value, responseId, {
      auth: token ? { token } : undefined,
    });

    if (detailRequestId.value === requestId) {
      detailState.response = detail;
    }
  } catch (error: any) {
    if (detailRequestId.value === requestId) {
      detailState.error = error?.data?.message ?? error?.message ?? 'Failed to load response detail.';
      detailState.response = null;
    }
  } finally {
    if (detailRequestId.value === requestId) {
      detailState.isLoading = false;
    }
  }
};

const clearResponseQuery = () => {
  if (!route.query.response) return;
  const nextQuery: LocationQueryRaw = {};
  Object.entries(route.query).forEach(([key, value]) => {
    if (key === 'response') return;
    nextQuery[key] = value as LocationQueryValueRaw | LocationQueryValueRaw[];
  });
  const routeName = typeof route.name === 'string' ? route.name : undefined;
  if (routeName) {
    router.replace({ name: routeName, params: { ...route.params }, query: nextQuery });
  } else {
    router.replace({ path: route.path, query: nextQuery });
  }
};

const retryDetail = () => {
  if (activeResponseId.value) {
    loadResponseDetail(activeResponseId.value);
  }
};

onMounted(async () => {
  await Promise.all([loadFormInfo(), loadResponses(), loadSummary()]);
});

watch(
  () => route.query.response,
  (responseIdParam) => {
    const responseId = Array.isArray(responseIdParam) ? responseIdParam[0] : responseIdParam;
    if (responseId) {
      detailDialogOpen.value = true;
      loadResponseDetail(String(responseId));
    } else {
      detailState.response = null;
      detailState.error = null;
      detailDialogOpen.value = false;
    }
  },
  { immediate: true },
);

watch(
  () => detailDialogOpen.value,
  (isOpen, wasOpen) => {
    if (!isOpen && wasOpen) {
      detailState.response = null;
      detailState.error = null;
      clearResponseQuery();
    }
  },
);

const downloadFileAnswer = (answer: DetailAnswerItem) => {
  if (!answer.fileUrl) return;
  window.open(answer.fileUrl, '_blank');
};
</script>

<style scoped>
.responses-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2rem;
  color: #111827;
}

.responses-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.responses-view__back {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  font-weight: 500;
}

.responses-view__heading h1 {
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0;
}

.responses-view__heading p {
  margin: 0.25rem 0 0;
  color: #4b5563;
}

.responses-view__actions {
  display: flex;
  gap: 0.75rem;
}

.responses-view__button {
  border-radius: 0.5rem;
  padding: 0.5rem 1.25rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #1f2937;
  font-weight: 500;
  transition: background 0.2s ease;
}

.responses-view__button--primary {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.responses-view__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.summary-chart {
  width: 220px;
  height: 220px;
}

.responses-view__table table {
  width: 100%;
  border-collapse: collapse;
}

.responses-view__table th,
.responses-view__table td {
  border-bottom: 1px solid #e5e7eb;
  padding: 0.65rem 0.75rem;
  text-align: left;
}

.summary-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
}
</style>
