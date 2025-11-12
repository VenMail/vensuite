<template>
  <div class="flex h-full w-full flex-col gap-6 overflow-hidden bg-background text-foreground">
    <div class="relative overflow-hidden border-b border-border/80 bg-gradient-to-br from-background via-background to-background dark:from-background dark:via-background">
      <div class="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 -z-10 rounded-l-full bg-primary/10 blur-3xl dark:bg-primary/15 lg:block" aria-hidden="true" />
      <div class="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-5">
            <!-- <div class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-primary-foreground">
              <span class="inline-flex h-2 w-2 rounded-full bg-primary"></span>
              Response Analytics
            </div> -->
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-3">
                <Button variant="ghost" size="sm" class="gap-2 text-muted-foreground" @click="goBack">
                  <ArrowLeft class="h-4 w-4" />
                  Back to Forms
                </Button>
                <Badge variant="outline" class="rounded-full border-muted-foreground/40 bg-muted/50 px-3 py-1 text-xs font-medium uppercase tracking-wide">
                  Responses dashboard
                </Badge>
              </div>
              <h1 class="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
                {{ formTitle }}
              </h1>
              <p class="max-w-2xl text-sm text-muted-foreground">
                {{ formDescription || 'Monitor how respondents engage with your form and spot trends across completion states.' }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div class="flex items-center gap-2">
                <span class="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                Completed: <span class="font-semibold text-foreground">{{ responseMeta.completed_responses }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                Incomplete: <span class="font-semibold text-foreground">{{ responseMeta.incomplete_responses }}</span>
              </div>
              <Separator orientation="vertical" class="hidden h-5 lg:block" />
              <div class="flex items-center gap-2">
                <span class="text-xs uppercase tracking-wide text-muted-foreground">Last refreshed</span>
                <span class="rounded-full bg-muted px-2 py-1 text-xs font-medium text-foreground">Just now</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <Button variant="outline" size="sm" class="min-w-[110px]" :disabled="isLoading" @click="refresh">
              Refresh
            </Button>
            <Button size="sm" class="min-w-[140px]" :disabled="isExporting || !responseRows.length" @click="exportCsv">
              <Download class="mr-2 h-4 w-4" />
              {{ isExporting ? 'Exporting…' : 'Export CSV' }}
            </Button>
            <Button size="sm" class="min-w-[160px]" :disabled="isExporting || !responseRows.length" @click="exportToSheet">
              <FileSpreadsheet class="mr-2 h-4 w-4" />
              Export to Sheet
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="min-w-[48px] rounded-full border border-transparent text-muted-foreground hover:border-border"
              @click="toggleTheme"
            >
              <SunMedium v-if="!isDarkMode" class="h-4 w-4" />
              <MoonStar v-else class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <div class="grid gap-4 sm:grid-cols-3">
            <Card class="border-none bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-sm ring-1 ring-primary/20 dark:via-primary/10 dark:to-background">
              <CardContent class="flex items-center justify-between gap-4 p-5">
                <div>
                  <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total responses</span>
                  <p class="mt-2 text-3xl font-semibold text-foreground">
                    {{ responseMeta.total_responses.toLocaleString() }}
                  </p>
                </div>
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary dark:bg-primary/20 dark:text-primary-foreground">
                  <PieChart class="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            <Card class="border-none bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-background shadow-sm ring-1 ring-emerald-500/20 dark:to-muted/20">
              <CardContent class="flex items-center justify-between gap-4 p-5">
                <div>
                  <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Completed</span>
                  <p class="mt-2 text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
                    {{ responseMeta.completed_responses.toLocaleString() }}
                  </p>
                </div>
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <CheckCircle2 class="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            <Card class="border-none bg-gradient-to-br from-amber-500/15 via-amber-500/10 to-background shadow-sm ring-1 ring-amber-500/20 dark:to-muted/20">
              <CardContent class="flex items-center justify-between gap-4 p-5">
                <div>
                  <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Incomplete</span>
                  <p class="mt-2 text-3xl font-semibold text-amber-600 dark:text-amber-400">
                    {{ responseMeta.incomplete_responses.toLocaleString() }}
                  </p>
                </div>
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
                  <AlertTriangle class="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card class="flex flex-col border-none bg-card/90 shadow-sm ring-1 ring-border/60">
            <CardHeader class="pb-2">
              <CardTitle class="text-base font-semibold">Response breakdown</CardTitle>
              <CardDescription>Visualize completion ratio at a glance</CardDescription>
            </CardHeader>
            <CardContent class="flex flex-1 items-center justify-center">
              <div class="relative h-48 w-48">
                <Doughnut :data="doughnutData" :options="doughnutOptions" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <div class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 pb-10">
      <Card class="flex-1 overflow-hidden border-none bg-card/95 shadow-lg shadow-primary/5 ring-1 ring-border/60">
        <CardHeader class="flex flex-col gap-6 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div class="space-y-1.5">
            <CardTitle class="text-xl font-semibold">Responses</CardTitle>
            <CardDescription class="text-sm text-muted-foreground">
              Manage submissions, monitor payment status, and drill into individual answers.
            </CardDescription>
          </div>
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex items-center gap-3 rounded-full border border-muted-foreground/30 bg-muted/40 px-3 py-2">
              <Label class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" for="status-filter">
                Status Filter
              </Label>
              <Select :model-value="filters.status || 'all'" @update:model-value="handleStatusChange">
                <SelectTrigger id="status-filter" class="w-44 border-none bg-background/60 text-sm shadow-none">
                  <SelectValue placeholder="All responses" />
                </SelectTrigger>
                <SelectContent class="rounded-lg border border-border bg-card shadow-md">
                  <SelectItem value="all">All responses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="pending_payment">Pending payment</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="hidden h-10 w-px bg-border/70 sm:block" />
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Showing</span>
              <span class="rounded-full bg-muted px-2 py-1 font-medium text-foreground">{{ responseRows.length }}</span>
              <span>of</span>
              <span class="font-semibold text-foreground">{{ responseMeta.total_responses }}</span>
              <span>responses</span>
            </div>
          </div>
        </CardHeader>

        <CardContent class="flex h-full flex-col gap-4 overflow-hidden p-0">
          <div v-if="isLoading" class="flex flex-1 items-center justify-center rounded-none border-none bg-muted/30 py-16 text-sm text-muted-foreground">
            Loading responses…
          </div>

          <div v-else-if="loadError" class="flex flex-1 flex-col items-center justify-center gap-4 rounded-none border-none bg-destructive/5 py-20 text-center">
            <p class="max-w-sm text-sm font-medium text-destructive">{{ loadError }}</p>
            <Button variant="outline" size="sm" @click="refresh">Retry</Button>
          </div>

          <div v-else class="flex flex-1 flex-col overflow-hidden">
            <div v-if="!responseRows.length" class="flex flex-1 items-center justify-center bg-muted/10 py-20 text-sm text-muted-foreground">
              No responses yet. Share your form to start collecting submissions.
            </div>

            <div v-else class="flex h-full flex-col overflow-hidden">
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-border/80 text-sm">
                  <thead class="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th scope="col" class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">ID</th>
                      <th scope="col" class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
                      <th scope="col" class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">Submitted</th>
                      <th scope="col" class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">Payment</th>
                      <th scope="col" class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/80 bg-card text-card-foreground">
                    <tr
                      v-for="response in responseRows"
                      :key="response.id"
                      class="transition-colors hover:bg-muted/40"
                    >
                      <td class="px-6 py-4 text-sm font-semibold text-foreground">#{{ response.id }}</td>
                      <td class="px-6 py-4">
                        <Badge variant="outline" :class="statusBadgeClasses(response.status)">
                          {{ response.statusLabel }}
                        </Badge>
                      </td>
                      <td class="px-6 py-4 text-sm text-muted-foreground">{{ response.submittedAtLabel }}</td>
                      <td class="px-6 py-4 text-sm text-muted-foreground">{{ response.paymentStatusLabel }}</td>
                      <td class="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" class="gap-1 text-primary" @click="openDetail(response.id)">
                          View details
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="hasPagination" class="flex flex-col gap-3 border-t border-border/70 bg-muted/30 px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span class="text-muted-foreground">Page {{ pagination.page }} of {{ totalPages }}</span>
                <div class="flex items-center gap-3">
                  <Button variant="outline" size="sm" class="min-w-[90px]" :disabled="pagination.page === 1" @click="changePage(pagination.page - 1)">
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" class="min-w-[90px]" :disabled="pagination.page === totalPages" @click="changePage(pagination.page + 1)">
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Dialog v-model:open="detailDialogOpen">
      <DialogContent class="max-w-3xl border-none bg-card/95 p-0 shadow-xl shadow-primary/10 ring-1 ring-border/60">
        <DialogHeader class="space-y-1 rounded-t-xl border-b border-border/60 bg-muted/30 px-6 py-5">
          <DialogTitle class="text-lg font-semibold">
            Response #{{ detailState.response?.id ?? activeResponseId ?? '' }}
          </DialogTitle>
          <DialogDescription class="text-sm text-muted-foreground">
            Review submission metadata and answers.
          </DialogDescription>
        </DialogHeader>

        <div class="px-6 py-5">
          <div v-if="detailState.isLoading" class="flex items-center justify-center rounded-lg bg-muted/30 py-12 text-sm text-muted-foreground">
            Loading response…
          </div>
          <div v-else-if="detailState.error" class="flex flex-col items-center justify-center gap-4 rounded-lg bg-destructive/5 py-12 text-center">
            <p class="max-w-sm text-sm font-medium text-destructive">{{ detailState.error }}</p>
            <Button variant="outline" size="sm" @click="retryDetail">Retry</Button>
          </div>
          <div v-else-if="detailState.response" class="space-y-6">
            <div class="grid gap-4 rounded-xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-3">
              <div class="space-y-1">
                <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</span>
                <Badge
                  variant="outline"
                  :class="statusBadgeClasses(detailState.response.status ?? 'draft')"
                >
                  {{ formatStatus(detailState.response.status ?? 'draft') }}
                </Badge>
              </div>
              <div class="space-y-1">
                <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Submitted</span>
                <p class="text-sm text-foreground">
                  {{ detailState.response.submitted_at ? formatDate(detailState.response.submitted_at) : '—' }}
                </p>
              </div>
              <div class="space-y-1">
                <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment</span>
                <p class="text-sm text-foreground">{{ formatPaymentStatus(detailState.response.payment_status ?? null) }}</p>
              </div>
            </div>

            <div v-if="respondentDetails.length" class="space-y-3">
              <h3 class="text-sm font-semibold text-foreground">Respondent</h3>
              <dl class="grid gap-2 rounded-xl border border-border/60 bg-muted/15 p-4 text-sm text-foreground">
                <div v-for="detail in respondentDetails" :key="detail.key" class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <dt class="text-muted-foreground">{{ detail.key }}</dt>
                  <dd class="font-medium">{{ detail.value }}</dd>
                </div>
              </dl>
            </div>

            <div class="space-y-4">
              <h3 class="text-sm font-semibold text-foreground">Answers</h3>
              <div v-if="detailAnswers.length" class="grid gap-3">
                <article
                  v-for="answer in detailAnswers"
                  :key="answer.id"
                  class="rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm"
                >
                  <header class="flex flex-col gap-1">
                    <h4 class="text-sm font-semibold text-foreground">{{ answer.questionTitle }}</h4>
                    <p v-if="answer.description" class="text-xs text-muted-foreground">{{ answer.description }}</p>
                  </header>
                  <div class="mt-3 text-sm">
                    <Button v-if="answer.fileUrl" variant="outline" size="sm" class="shadow-sm" @click="downloadFileAnswer(answer)">
                      <Download class="mr-2 h-4 w-4" />
                      Download {{ answer.formatted }}
                    </Button>
                    <pre v-else-if="answer.isMultiline" class="rounded-lg bg-muted/40 p-3 text-sm leading-relaxed text-foreground">{{ answer.formatted }}</pre>
                    <p v-else class="text-foreground">{{ answer.formatted }}</p>
                  </div>
                </article>
              </div>
              <p v-else class="rounded-xl border border-dashed border-muted-foreground/40 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                No answers captured for this response.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter class="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-6 py-4">
          <Button variant="ghost" @click="closeDetail">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref, watch } from 'vue';
import {
  useRoute,
  useRouter,
  type LocationQueryRaw,
  type LocationQueryValueRaw,
} from 'vue-router';
import { useFormStore } from '@/store/forms';
import { useFileStore } from '@/store/files';
import { useAuthStore } from '@/store/auth';
import { fetchResponseDetail } from '@/services/forms';
import type {
  AppFormResponseDetail,
  AppFormResponseAnswer,
  FormDefinition,
  FormQuestion,
  FormResponsesPage,
  FormResponseSummary,
} from '@/types';
import { saveAs } from 'file-saver';
import { toast } from '@/composables/useToast';
import { DEFAULT_WORKBOOK_DATA } from '@/assets/default-workbook-data';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  MoonStar,
  PieChart,
  SunMedium,
  FileSpreadsheet,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
const fileStore = useFileStore();
const authStore = useAuthStore();

const formId = computed(() => route.params.id as string);

const isLoading = ref(false);
const isExporting = ref(false);
const loadError = ref<string | null>(null);
const formTitle = ref('Form Responses');
const formDescription = ref<string>('');

const questionLookup = ref<Record<string, string>>({});
const questionOrder = ref<string[]>([]);

const themeContext = inject<{
  isDark?: { value: boolean };
  toggleTheme?: () => void;
} | null>('theme', null);
const fallbackDarkMode = ref<boolean>(
  typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false,
);
const isDarkMode = computed(() => themeContext?.isDark?.value ?? fallbackDarkMode.value);
const toggleTheme = () => {
  if (themeContext?.toggleTheme) {
    themeContext.toggleTheme();
  } else {
    fallbackDarkMode.value = !fallbackDarkMode.value;
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', fallbackDarkMode.value);
    }
  }
};

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
    const questionTitle = getQuestionTitle(answer.question_id, answer.question?.question);
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

function statusBadgeClasses(status: string): string {
  switch (status) {
    case 'submitted':
      return 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-800/50 dark:text-emerald-300 dark:bg-emerald-500/10';
    case 'pending_payment':
      return 'border-amber-200 text-amber-700 bg-amber-50 dark:border-amber-800/50 dark:text-amber-300 dark:bg-amber-500/10';
    case 'draft':
      return 'border-slate-200 text-slate-600 bg-slate-50 dark:border-slate-700/50 dark:text-slate-300 dark:bg-slate-800/40';
    default:
      return 'border-slate-200 text-slate-600 bg-slate-50 dark:border-slate-700/50 dark:text-slate-300 dark:bg-slate-800/40';
  }
}

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

const registerQuestion = (id: string, title?: string | null) => {
  const normalizedTitle = title?.trim() || `Question ${id}`;
  if (questionLookup.value[id] !== normalizedTitle) {
    questionLookup.value = { ...questionLookup.value, [id]: normalizedTitle };
  }
  if (!questionOrder.value.includes(id)) {
    questionOrder.value = [...questionOrder.value, id];
  }
};

const getQuestionTitle = (questionId: number | string | undefined, fallback?: string | null) => {
  const idString = questionId ? String(questionId) : null;
  if (idString) {
    if (questionLookup.value[idString]) {
      return questionLookup.value[idString];
    }
    registerQuestion(idString, fallback ?? undefined);
    return questionLookup.value[idString];
  }
  return fallback ?? 'Untitled Question';
};

const buildQuestionLookup = (definition: FormDefinition | null | undefined) => {
  if (!definition) return;
  const map: Record<string, string> = {};
  const order: string[] = [];

  const pushQuestion = (question: FormQuestion | undefined) => {
    if (!question?.id) return;
    const id = String(question.id);
    if (!map[id]) {
      map[id] = question.question ?? `Question ${id}`;
      order.push(id);
    }
  };

  if (Array.isArray(definition.questions)) {
    definition.questions.forEach((question) => pushQuestion(question));
  }

  if (Array.isArray(definition.pages)) {
    definition.pages.forEach((page) => {
      if (Array.isArray(page?.questions)) {
        page.questions.forEach((question) => pushQuestion(question as FormQuestion));
      }
    });
  }

  questionLookup.value = map;
  questionOrder.value = order;
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
      buildQuestionLookup(form as unknown as FormDefinition);
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

const handleStatusChange = (value: string) => {
  filters.status = value === 'all' ? '' : value;
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
    const promise = (async () => {
    if (!questionOrder.value.length && Object.keys(questionLookup.value).length === 0) {
      await loadFormInfo();
    }

    const rows: ResponseRow[] = hasPagination.value
      ? await fetchAllResponsesRows()
      : responseRows.value;

    const token = authStore.getToken?.();
    const answersByResponse: Record<number, Record<string, string>> = {};

    for (const row of rows) {
      try {
        const detail = await fetchResponseDetail(formId.value, String(row.id), {
          auth: token ? { token } : undefined,
        });

        const answerMap: Record<string, string> = {};
        detail?.answers?.forEach((answer) => {
          const id = answer.question?.id ?? answer.question_id;
          if (id == null) return;
          const idString = String(id);
          registerQuestion(idString, answer.question?.question ?? null);
          answerMap[idString] = formatAnswerValue(answer);
        });

        answersByResponse[row.id] = answerMap;
      } catch (error) {
        answersByResponse[row.id] = {};
      }
    }

    const orderedQuestionIds = questionOrder.value.length
      ? questionOrder.value
      : Object.keys(questionLookup.value);

    const header = [
      'ID',
      'Status',
      'Submitted At',
      'Payment Status',
      ...orderedQuestionIds.map((id) => questionLookup.value[id] ?? `Question ${id}`),
    ];

    const csvRows = [
      header,
      ...rows.map((row) => {
        const answerMap = answersByResponse[row.id] ?? {};
        const answerCells = orderedQuestionIds.map((id) => answerMap[id] ?? '—');
        return [
          String(row.id),
          row.statusLabel,
          row.submittedAtLabel,
          row.paymentStatusLabel,
          ...answerCells,
        ];
      }),
    ];

    const csvContent = csvRows.map((cells) => cells.map((cell) => escapeCsvValue(cell)).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    saveAs(blob, `form-${formId.value}-responses-${timestamp}.csv`);
    })();

    await toast.promise(promise, {
      loading: 'Exporting responses…',
      success: 'CSV exported successfully',
      error: (e: any) => e?.message || 'Failed to export CSV',
    });
  } finally {
    isExporting.value = false;
  }
};

const exportToSheet = async () => {
  if (!responseRows.value.length || !formId.value) return;

  isExporting.value = true;
  try {
    const promise = (async () => {
      if (!questionOrder.value.length && Object.keys(questionLookup.value).length === 0) {
        await loadFormInfo();
      }

      const rows: ResponseRow[] = hasPagination.value
        ? await fetchAllResponsesRows()
        : responseRows.value;

      const token = authStore.getToken?.();
      const answersByResponse: Record<number, Record<string, string>> = {};

      for (const row of rows) {
        try {
          const detail = await fetchResponseDetail(formId.value, String(row.id), {
            auth: token ? { token } : undefined,
          });
          const map: Record<string, string> = {};
          detail?.answers?.forEach((answer) => {
            const qid = String(answer.question?.id ?? answer.question_id);
            registerQuestion(qid, answer.question?.question ?? null);
            map[qid] = formatAnswerValue(answer);
          });
          answersByResponse[row.id] = map;
        } catch {
          answersByResponse[row.id] = {};
        }
      }

      const orderedQuestionIds = questionOrder.value.length
        ? questionOrder.value
        : Object.keys(questionLookup.value);

      const header = [
        'ID',
        'Status',
        'Submitted At',
        'Payment Status',
        ...orderedQuestionIds.map((id) => questionLookup.value[id] ?? `Question ${id}`),
      ];

      const matrix: string[][] = [
        header,
        ...rows.map((row) => {
          const map = answersByResponse[row.id] ?? {};
          return [
            String(row.id),
            row.statusLabel,
            row.submittedAtLabel,
            row.paymentStatusLabel,
            ...orderedQuestionIds.map((id) => map[id] ?? '—'),
          ];
        }),
      ];

      // Build Univer workbook from DEFAULT_WORKBOOK_DATA
      const workbook: any = JSON.parse(JSON.stringify(DEFAULT_WORKBOOK_DATA));
      const firstSheetId = workbook.sheetOrder?.[0] || 'sheet-01';
      workbook.id = workbook.id || 'ven-wkbook-strt-01';
      workbook.name = formTitle.value || 'Responses';
      if (!workbook.sheets[firstSheetId]) {
        workbook.sheets[firstSheetId] = { type: 1, id: firstSheetId, name: 'Sheet1', cellData: {} };
      }
      const cellData: Record<number, Record<number, any>> = {};
      matrix.forEach((row, rIdx) => {
        cellData[rIdx] = {} as any;
        row.forEach((val, cIdx) => {
          const asNum = Number(val);
          const isNum = !Number.isNaN(asNum) && val.trim() !== '' && /^-?\d+(\.\d+)?$/.test(val);
          cellData[rIdx][cIdx] = { v: isNum ? asNum : val, t: isNum ? 2 : 1 };
        });
      });
      workbook.sheets[firstSheetId].cellData = cellData;

      // Create and save new spreadsheet file
      const title = `${formTitle.value || 'Form'} Responses (${new Date().toLocaleDateString()})`;
      const newDoc = await fileStore.createNewDocument('xlsx', title);
      const saved = await fileStore.saveDocument({ ...newDoc, content: JSON.stringify(workbook) } as any);
      const targetId = saved?.document?.id || saved?.document?.server_id || newDoc.id;
      if (targetId) {
        router.push(`/sheets/${targetId}`);
      }
    })();

    await toast.promise(promise, {
      loading: 'Preparing spreadsheet…',
      success: 'Sheet created successfully',
      error: (e: any) => e?.message || 'Failed to export to sheet',
    });
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
