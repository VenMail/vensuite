<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import { useFormStore } from "@/store/forms";
import QuickViewCard from "@/components/forms/QuickView.vue";
import type { AppForm, FormDefinition } from "@/types";
import {
  Grid,
  List,
  Share2,
  Trash2,
  Edit2,
  Edit3,
  BookOpen,
  FilePlus2,
  SearchIcon,
  Settings,
  Plus,
  ChevronDown,
  FolderOpen,
  MessageSquare,
  Users,
  Calendar,
  Star,
  Check,
  FileText,
  ClipboardList,
  UserCheck,
  CreditCard,
  FileQuestion,
  MessageCircle,
  UserPlus,
  ShoppingCart,
  X,
} from "lucide-vue-next";
import FormWizard from "@/components/forms/FormWizard.vue";
import Input from "@/components/ui/input/Input.vue";
import Button from "@/components/ui/button/Button.vue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { router } from "@/main";
import { t } from '@/i18n';
import WorkspaceTopBar from "@/components/layout/WorkspaceTopBar.vue";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define types locally since they're not exported from WorkspaceTopBar
interface BreadcrumbItem {
  id?: string | null
  title: string
}

interface ActionItem {
  key?: string
  label?: string
  icon?: any
  component?: any
  props?: Record<string, unknown>
  onClick?: () => void
  slot?: string
}

interface StatItem {
  label: string
  value: string | number
}

interface FilterItem {
  key?: string
  label: string
  value: string
  icon?: any
  active?: boolean
}

interface ViewOption {
  label?: string
  value: string
  icon?: any
  active?: boolean
}

const searchValue = ref("");
const debouncedSearch = ref("");
const viewMode = ref<"grid" | "list">("grid");
const SHARE_BASE_URL = import.meta.env.VITE_SHARE_BASE_URL || window.location.origin;

const selectedForm = ref<string | null>(null);
const shareTarget = ref<AppForm | null>(null);
const showShareModal = ref(false);
const isPublishingShare = ref(false);
const showWizard = ref(false);
const wizardPreset = ref("");
const isMobile = ref(false);
const currentFilter = ref("all");
const sortBy = ref("date");

const TEMPLATE_STORAGE_PREFIX = "VENX_FORM_TEMPLATE_";

type FormTemplate = {
  name: string;
  slug: string;
  subtitle: string;
  badge: string;
  icon: any;
  previewStyle: string;
  preset?: string;
};

// Icon mappings for templates
const Contact = MessageSquare;
const Feedback = MessageCircle;
const Registration = UserPlus;
const Order = ShoppingCart;
const Poll = FileQuestion;

const formTemplates: FormTemplate[] = [
  {
    name: "Blank Form",
    slug: "blank",
    subtitle: "Start from scratch",
    badge: "Blank",
    icon: FileText,
    previewStyle: "background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);",
  },
  {
    name: "Contact Form",
    slug: "contact",
    subtitle: "Collect contact information",
    badge: "Contact",
    icon: Contact,
    previewStyle: "background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);",
    preset: "Create a contact form with name, email, phone, and message fields"
  },
  {
    name: "Feedback Form",
    slug: "feedback",
    subtitle: "Gather user feedback",
    badge: "Feedback",
    icon: Feedback,
    previewStyle: "background: linear-gradient(135deg, #10b981 0%, #34d399 100%);",
    preset: "Create a feedback form with rating, satisfaction, and comment fields"
  },
  {
    name: "Registration Form",
    slug: "registration",
    subtitle: "Event or service signup",
    badge: "Registration",
    icon: Registration,
    previewStyle: "background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);",
    preset: "Create a registration form with personal details and preferences"
  },
  {
    name: "Order Form",
    slug: "order",
    subtitle: "Product or service orders",
    badge: "Order",
    icon: Order,
    previewStyle: "background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);",
    preset: "Create an order form with product selection and payment details"
  },
  {
    name: "Survey Form",
    slug: "survey",
    subtitle: "Research and opinions",
    badge: "Survey",
    icon: Poll,
    previewStyle: "background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);",
    preset: "Create a survey form with multiple choice and text questions"
  },
  {
    name: "Event Registration",
    slug: "event",
    subtitle: "Conference or meetup signup",
    badge: "Event",
    icon: Calendar,
    previewStyle: "background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%);",
    preset: "Create an event registration form with date, time, and attendee details"
  },
  {
    name: "Application Form",
    slug: "application",
    subtitle: "Job or program applications",
    badge: "Application",
    icon: UserCheck,
    previewStyle: "background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%);",
    preset: "Create an application form with experience and qualification fields"
  },
];

type FormFilter = "all" | "contact" | "feedback" | "registration" | "survey" | "other";
type FormSort = "name" | "date" | "responses";

const formStore = useFormStore();

const loading = computed(() => formStore.loading);
const hasMore = computed(() => formStore.pagination.hasMore);
const forms = computed(() => formStore.allForms);

const filteredForms = computed(() => {
  let formsList = forms.value;
  
  // Apply filter
  if (currentFilter.value !== "all") {
    formsList = formsList.filter((form) => {
      const title = form.title?.toLowerCase() || "";
      const description = (form as any).description?.toLowerCase() || "";
      
      switch (currentFilter.value) {
        case "contact":
          return title.includes("contact") || description.includes("contact");
        case "feedback":
          return title.includes("feedback") || description.includes("feedback");
        case "registration":
          return title.includes("registration") || description.includes("registration") || title.includes("signup");
        case "survey":
          return title.includes("survey") || description.includes("survey");
        default:
          return true;
      }
    });
  }
  
  // Apply search
  const query = debouncedSearch.value.trim().toLowerCase();
  if (query) {
    formsList = formsList.filter((form) => 
      form.title?.toLowerCase().includes(query) ||
      (form as any).description?.toLowerCase().includes(query)
    );
  }
  
  return formsList;
});

const sortedForms = computed(() => {
  const formsList = [...filteredForms.value];
  
  switch (sortBy.value) {
    case "name":
      return formsList.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    case "responses":
      return formsList.sort((a, b) => {
        const aResponses = computeResponseCount(a) || 0;
        const bResponses = computeResponseCount(b) || 0;
        return bResponses - aResponses;
      });
    case "date":
    default:
      return formsList.sort((a, b) => {
        const aDate = new Date(a.updated_at || a.created_at || 0).getTime();
        const bDate = new Date(b.updated_at || b.created_at || 0).getTime();
        return bDate - aDate;
      });
  }
});

const computeFieldCount = (form: AppForm): number | null => {
  if (typeof form.question_count === "number") {
    return form.question_count;
  }

  const definition = form.form as FormDefinition | undefined;
  if (!definition) return null;

  if (Array.isArray(definition.questions)) {
    return definition.questions.length;
  }

  if (Array.isArray(definition.pages)) {
    return definition.pages.reduce<number>((total, page) => {
      const pageQuestions = Array.isArray((page as any)?.questions) ? (page as any).questions.length : 0;
      const orderIds = Array.isArray(page?.question_order) ? page.question_order.length : 0;
      return total + Math.max(pageQuestions, orderIds);
    }, 0);
  }

  return null;
};

const computeResponseCount = (form: AppForm): number | null => {
  if (typeof form.response_count === "number") return form.response_count;
  if (typeof form.responses?.length === "number") return form.responses.length;

  return null;
};

const computedShareLink = computed(() => {
  if (!shareTarget.value) return "";
  const shareSlug = shareTarget.value.sharing?.share_slug ?? shareTarget.value.slug;
  if (shareSlug) {
    return `${SHARE_BASE_URL}/share/form/${shareSlug}`;
  }
  if (shareTarget.value.id) {
    return `${window.location.origin}/f/by-id/${shareTarget.value.id}`;
  }
  return "";
});

const shareHelperItems = computed(() => {
  const link = computedShareLink.value;
  if (!link) return [];
  return [
    {
      label: "Open form",
      action: () => {
        window.open(link, "_blank", "noopener,noreferrer");
      },
    },
  ];
});

const copyShareLink = async () => {
  const link = computedShareLink.value;
  if (!link) {
    toast({ title: "Share link unavailable", description: t('Views.Forms.text.publish_the_form_to'), variant: "destructive" });
    return;
  }
  try {
    await navigator.clipboard.writeText(link);
    toast({ title: "Share link copied", description: t('Views.Forms.text.the_form_link_was') });
  } catch {
    toast({ title: "Copy failed", description: t('Views.Forms.text.unable_to_copy_link'), variant: "destructive" });
  }
};

const handleShareLinkFocus = (event: FocusEvent) => {
  const target = event.target as HTMLInputElement | null;
  target?.select();
};

const closeShareModal = () => {
  if (isPublishingShare.value) return;
  showShareModal.value = false;
  shareTarget.value = null;
};

const ensurePublishedShareSlug = async (form: AppForm) => {
  if (!form.id) return null;

  const latest = formStore.allForms.find((item) => item.id === form.id) ?? form;
  const hasExistingShare =
    latest.status !== "draft" &&
    Boolean(latest.sharing?.share_slug ?? latest.slug);

  if (hasExistingShare) {
    return latest;
  }

  const published = await formStore.publishForm(form.id);
  if (!published) {
    return latest ?? null;
  }

  const merged: AppForm = {
    ...latest,
    ...(published as unknown as Partial<AppForm>),
    id: form.id,
    slug: published.slug ?? latest.slug ?? form.slug,
    status: (published.status ?? latest.status ?? "published") as AppForm["status"],
    sharing: {
      ...latest.sharing,
      ...(published as any)?.sharing,
    },
  };

  return merged;
};

const openShareModal = async (form: AppForm) => {
  if (!form.id) {
    toast({ title: "Share unavailable", description: t('Views.Forms.text.form_is_missing_an'), variant: "destructive" });
    return;
  }

  shareTarget.value = form;
  showShareModal.value = true;

  const hasShareSlug = form.sharing?.share_slug || form.slug;
  if (hasShareSlug || form.status !== "draft") {
    return;
  }

  try {
    isPublishingShare.value = true;
    const updated = await ensurePublishedShareSlug(form);
    if (updated?.sharing?.share_slug) {
      shareTarget.value = updated;
      await navigator.clipboard.writeText(`${SHARE_BASE_URL}/share/form/${updated.sharing.share_slug}`);
      toast({ title: "Form published", description: t('Views.Forms.text.share_link_copied_to') });
    } else {
      toast({ title: "Publish incomplete", description: t('Views.Forms.text.unable_to_generate_share'), variant: "destructive" });
    }
  } catch (error: any) {
    const message = error?.data?.message ?? "Failed to publish form for sharing";
    toast({ title: "Share failed", description: message, variant: "destructive" });
  } finally {
    isPublishingShare.value = false;
  }
};

const handleQuickViewResponses = (form: AppForm) => {
  if (!form.id) return;
  router.push({ name: "form-responses", params: { id: form.id } });
};

const handleQuickViewShare = (form: AppForm) => {
  openShareModal(form);
};

const cardsContainerClass = computed(() => {
  if (viewMode.value === "list") {
    return "flex flex-col gap-3 sm:gap-4";
  }
  return "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
});

const showContextMenu = computed(() => !!selectedForm.value);

const fetchMoreForms = async () => {
  if (loading.value || !hasMore.value) return;
  await formStore.fetchForms();
};

const handleScroll = () => {
  const scrollableHeight = document.documentElement.scrollHeight;
  const currentScroll = window.scrollY + window.innerHeight;

  if (currentScroll + 100 >= scrollableHeight) {
    fetchMoreForms();
  }
};

let debounceTimer: number | null = null;
watch(searchValue, (newValue) => {
  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer);
  }
  debounceTimer = window.setTimeout(() => {
    debouncedSearch.value = newValue;
  }, 300) as unknown as number;
});

function createNewForm(preset?: string) {
  wizardPreset.value = preset || "";
  showWizard.value = true;
}

function createNewFormFromTemplate(template: FormTemplate) {
  createNewForm(template.preset || "");
}

async function handleWizardCreate(data: { title: string; description: string; blocks: any[] }) {
  let pageId: string = crypto.randomUUID();

  const normalizeOption = (option: any, index: number) => {
    if (typeof option === 'string') {
      const value = option.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `option-${index + 1}`;
      return { value, label: option };
    }
    const value = option?.value || option?.label || `option-${index + 1}`;
    const label = option?.label || option?.value || `Option ${index + 1}`;
    return { value, label };
  };

  const mapType = (type: string | undefined): string => {
    switch (type) {
      case 'dropdown':
        return 'select';
      case 'toggle':
        return 'yesno';
      default:
        return type || 'short';
    }
  };

  const mapCategory = (type: string): string => {
    const categoryMap: Record<string, string> = {
      radio: 'choice',
      select: 'choice',
      dropdown: 'choice',
      checkbox: 'choices',
      yesno: 'switch',
      rating: 'rating',
      slider: 'choice',
      range: 'choice',
      file: 'file',
    };
    return categoryMap[type] || 'text';
  };

  const buildQuestionPayload = (block: any, index: number) => {
    const id = block.id || crypto.randomUUID();
    const type = mapType(block.type);
    const category = block.category || mapCategory(type);

    const base: any = {
      id,
      page_id: pageId,
      position: index,
      type,
      category,
      question: block.question || 'Untitled question',
      description: block.description ?? '',
      placeholder: block.placeholder ?? '',
      required: Boolean(block.required),
    };

    if (category === 'choice' || category === 'choices' || category === 'switch') {
      const rawOptions = block.options && block.options.length ? block.options : type === 'yesno'
        ? ['Yes', 'No']
        : ['Option 1', 'Option 2'];
      base.options = rawOptions.map((opt: any, optIndex: number) => normalizeOption(opt, optIndex));
    }

    if (type === 'rating') {
      base.icon_type = block.iconType || 'star';
      base.min = typeof block.min === 'number' ? block.min : 1;
      base.max = typeof block.max === 'number' ? block.max : 5;
      base.allow_half = Boolean(block.allowHalf);
    }

    if (type === 'slider' || type === 'range') {
      base.min = typeof block.min === 'number' ? block.min : 0;
      base.max = typeof block.max === 'number' ? block.max : 10;
      base.step = typeof block.step === 'number' && block.step > 0 ? block.step : 1;
      base.show_labels = Boolean(block.showLabels);
      if (block.options?.length) {
        base.options = block.options.map((opt: any, optIndex: number) => normalizeOption(opt, optIndex));
      }
    }

    return base;
  };

  const questions = data.blocks.map((block, index) => buildQuestionPayload(block, index));

  let pagePayload = {
    id: pageId,
    title: "Page 1",
    description: data.description,
    position: 1,
    question_order: questions.map(q => q.id),
  };

  const form = await formStore.createForm({
    title: data.title,
    description: data.description,
    pages: [pagePayload],
    logic_rules: [],
  });

  if (form?.id) {
    const persistedPageId = form.pages?.[0]?.id ?? pageId;
    if (persistedPageId !== pageId) {
      pageId = persistedPageId;
      pagePayload = {
        ...pagePayload,
        id: persistedPageId,
        description: data.description,
        title: form.pages?.[0]?.title || pagePayload.title,
      };
      questions.forEach((question) => {
        question.page_id = persistedPageId;
      });
    }

    const needsBackfill = !form.questions || form.questions.length === 0;

    if (needsBackfill) {
      sessionStorage.setItem(
        `${TEMPLATE_STORAGE_PREFIX}${form.id}`,
        JSON.stringify({
          title: data.title,
          description: data.description,
          blocks: data.blocks,
        }),
      );

      await formStore.updateForm(form.id, {
        title: data.title,
        description: data.description,
        layout_mode: form.layout_mode ?? "auto",
        pages: [pagePayload],
        questions,
        logic_rules: [],
        settings: form.settings,
        header: form.header,
        typography: form.typography,
        theme: form.theme,
        navigation: form.navigation,
        welcome_screen: form.welcome_screen,
        completion_screen: form.completion_screen,
        sharing: form.sharing,
        security: form.security,
        payment: form.payment,
      });
    }

    showWizard.value = false;
    router.replace({ name: 'form-edit', params: { id: form.id } });
  }
}

async function handleWizardCreateBlank() {
  const form = await formStore.createForm({ 
    title: "Blank Form",
    pages: [
      {
        id: crypto.randomUUID(),
        title: "Untitled page",
        position: 1,
        question_order: [],
      }
    ],
    logic_rules: [],
  });
  
  if (form?.id) {
    showWizard.value = false;
    router.replace({ name: 'form-edit', params: { id: form.id } });
  }
}

function previewForm(id: string) {
  const form = formStore.allForms.find((item) => item.id === id);
  const isPublished = form?.status === "published";
  const shareSlug = form?.sharing?.share_slug;
  const target = isPublished && shareSlug
    ? `/f/${shareSlug}`
    : `/f/by-id/${id}`;

  router.push(target);
}

function editForm() {
  if (!selectedForm.value) return;
  router.push({ name: 'form-edit', params: { id: selectedForm.value } });
}

function viewResponses() {
  if (!selectedForm.value) return;
  router.push({ name: 'form-responses', params: { id: selectedForm.value } });
}

const handleResize = () => {
  isMobile.value = window.innerWidth < 768;
};

onMounted(() => {
  handleResize();
  window.addEventListener('resize', handleResize);
  formStore.fetchForms(true);
  window.addEventListener("scroll", handleScroll);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener('resize', handleResize);
  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer);
  }
});

const contextMenuActions = computed(() => {
  if (!selectedForm.value) return [];

  return [
    {
      label: "Preview",
      icon: BookOpen,
      action: () => {
        previewForm(selectedForm.value!);
      },
    },
    {
      label: "Edit",
      icon: Edit3,
      action: editForm,
    },
    {
      label: "View Responses",
      icon: Edit2,
      action: viewResponses,
    },
    {
      label: "Delete",
      icon: Trash2,
      action: () => formStore.deleteForm(selectedForm.value!),
    },
    {
      label: "Share",
      icon: Share2,
      action: async () => {
        const target = formStore.allForms.find((item) => item.id === selectedForm.value);
        if (target) {
          await openShareModal(target);
        }
      },
    },
  ];
});

// Computed properties for WorkspaceTopBar
const currentTitle = computed(() => "Forms");
const formsSubtitle = computed(() => {
  switch (currentFilter.value) {
    case "contact":
      return "Contact forms";
    case "feedback":
      return "Feedback forms";
    case "registration":
      return "Registration forms";
    case "survey":
      return "Survey forms";
    default:
      return "All forms";
  }
});

const breadcrumbs = computed<BreadcrumbItem[]>(() => []);
const canNavigateUp = computed(() => false);

const stats = computed<StatItem[]>(() => [
  { value: sortedForms.value.length, label: "forms" },
  ...(selectedForm.value ? [{ value: "1", label: "selected" }] : [])
]);

const filterOptions = computed<FilterItem[]>(() => [
  { key: "all", label: "All", value: "all", icon: FileText, active: currentFilter.value === "all" },
  { key: "contact", label: "Contact", value: "contact", icon: Contact, active: currentFilter.value === "contact" },
  { key: "feedback", label: "Feedback", value: "feedback", icon: Feedback, active: currentFilter.value === "feedback" },
  { key: "registration", label: "Registration", value: "registration", icon: Registration, active: currentFilter.value === "registration" },
  { key: "survey", label: "Survey", value: "survey", icon: Poll, active: currentFilter.value === "survey" },
]);

const viewOptions = computed<ViewOption[]>(() => [
  { value: "grid", icon: Grid, label: "Grid", active: viewMode.value === "grid" },
  { value: "list", icon: List, label: "List", active: viewMode.value === "list" },
]);

const sortOptions = [
  { value: "date", label: "Date" },
  { value: "name", label: "Name" },
  { value: "responses", label: "Responses" },
];

const sortLabel = computed(() => {
  const option = sortOptions.find(opt => opt.value === sortBy.value);
  return option?.label || "Date";
});

const actionIconClass = computed(
  () =>
    "relative group rounded-full transition-all duration-200 shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700",
);

const topBarActions = computed<ActionItem[]>(() => {
  const actions: ActionItem[] = [
    {
      key: "new-form",
      component: "div",
      slot: "new-form",
    },
  ];

  if (selectedForm.value) {
    actions.push(
      {
        key: "preview",
        icon: BookOpen,
        component: Button,
        props: { variant: "ghost", size: "icon", class: actionIconClass.value },
        onClick: () => previewForm(selectedForm.value!),
      },
      {
        key: "edit",
        icon: Edit3,
        component: Button,
        props: { variant: "ghost", size: "icon", class: actionIconClass.value },
        onClick: editForm,
      },
      {
        key: "responses",
        icon: Edit2,
        component: Button,
        props: { variant: "ghost", size: "icon", class: actionIconClass.value },
        onClick: viewResponses,
      },
      {
        key: "share",
        icon: Share2,
        component: Button,
        props: { variant: "ghost", size: "icon", class: actionIconClass.value },
        onClick: async () => {
          const target = formStore.allForms.find((item) => item.id === selectedForm.value);
          if (target) {
            await openShareModal(target);
          }
        },
      },
      {
        key: "delete",
        icon: Trash2,
        component: Button,
        props: { variant: "ghost", size: "icon", class: actionIconClass.value },
        onClick: () => formStore.deleteForm(selectedForm.value!),
      },
      {
        key: "clear",
        icon: X,
        component: Button,
        props: { variant: "ghost", size: "icon", class: actionIconClass.value },
        onClick: () => { selectedForm.value = null; },
      },
    );
  }

  return actions;
});

// Event handlers
const handleFilter = (filter: FormFilter) => {
  currentFilter.value = filter;
  selectedForm.value = null;
};

const handleViewChange = (mode: "grid" | "list") => {
  viewMode.value = mode;
};

const handleSort = (sort: FormSort) => {
  sortBy.value = sort;
};

</script>

<template>
  <div
    :class="[
      'h-screen text-gray-900 transition-colors duration-200',
      'bg-gradient-to-br from-gray-50 to-gray-100',
      'dark:bg-gradient-to-br dark:from-gray-900 to-gray-800'
    ]"
  >
    <!-- Workspace Top Bar -->
    <WorkspaceTopBar
      :title="currentTitle"
      :subtitle="formsSubtitle"
      :breadcrumbs="breadcrumbs"
      :can-navigate-up="canNavigateUp"
      :actions="topBarActions"
      :stats="stats"
      :filters="filterOptions"
      :view-options="viewOptions"
      @filter-select="handleFilter"
      @view-change="handleViewChange"
    >
      <template #action-new-form>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              :class="actionIconClass"
            >
              <Plus class="h-5 w-5 text-primary-600" />
            </Button>
          </DialogTrigger>
          <DialogContent
            :class="[
              'rounded-lg shadow-2xl border',
              'bg-white border-gray-200',
              'dark:bg-gray-800 dark:border-gray-700'
            ]"
          >
            <DialogHeader>
              <DialogTitle
                :class="[
                  'text-xl font-semibold',
                  'text-gray-800 dark:text-gray-100'
                ]"
              >
                Create New Form
              </DialogTitle>
            </DialogHeader>
            <div class="grid grid-cols-2 gap-4 p-2">
              <Button
                v-for="template in formTemplates"
                :key="template.name"
                variant="outline"
                :class="[
                  'h-24 flex flex-col items-center justify-center transition-all',
                  'hover:bg-gray-50 hover:border-primary-400',
                  'dark:hover:bg-gray-700 dark:hover:border-primary-400'
                ]"
                @click="createNewFormFromTemplate(template)"
              >
                <component :is="template.icon" class="w-8 h-8 text-primary-600" />
                <span class="mt-2 text-sm font-medium">{{ template.name }}</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </template>
    </WorkspaceTopBar>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col gap-6 p-4 sm:p-6 overflow-hidden">
      <!-- Template previews -->
      <div
        class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/70 backdrop-blur shadow-sm overflow-hidden group hover:shadow-lg transition-all duration-300"
      >
        <div class="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200/70 dark:border-gray-700/70">
          <div>
            <p class="text-xs uppercase tracking-wide text-primary-600 dark:text-primary-400 font-semibold">
              Start a New Form
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-300">{{$t('Views.Forms.text.pick_a_template_or_start_blank')}}</p>
          </div>
          <Button variant="ghost" size="sm" class="text-primary-600" @click="createNewForm()">
            <Plus class="h-4 w-4 mr-1" /> {{$t('Commons.button.blank')}}
          </Button>
        </div>
        <div class="relative">
          <div class="absolute inset-0 bg-gradient-to-r from-gray-50/90 via-white/70 to-gray-50/90 dark:from-gray-900/80 dark:via-gray-900/40 dark:to-gray-900/80 blur-xl opacity-70 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none"></div>
          <div class="template-preview-scroll overflow-x-auto px-3 sm:px-5 py-4 space-x-4 flex">
            <div
              v-for="template in formTemplates"
              :key="template.slug"
              class="w-44 min-w-[11rem] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              @click="createNewFormFromTemplate(template)"
            >
              <div
                class="h-32 relative overflow-hidden"
                :style="template.previewStyle"
              >
                <div class="absolute inset-0 mix-blend-overlay opacity-70"></div>
                <div class="absolute top-3 left-3 text-xs text-white/90 font-semibold bg-black/20 px-2 py-1 rounded">
                  {{ template.badge }}
                </div>
              </div>
              <div class="px-3 py-3 space-y-1">
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{{ template.name }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ template.subtitle }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Content area -->
      <ScrollArea
        :class="[
          'flex-1 min-h-0 rounded-lg shadow-sm border',
          'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700',
        ]"
      >
        <div v-if="sortedForms.length > 0">
          <!-- Select All header for list view -->
          <div
            v-if="viewMode === 'list'"
            :class="[
              'flex items-center gap-3 px-4 py-3 border-b',
              'border-gray-200 dark:border-gray-700'
            ]"
          >
            <input
              type="checkbox"
              :checked="selectedForm !== null"
              @change="selectedForm = selectedForm ? null : sortedForms[0]?.id || null"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span
              class="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {{ selectedForm ? 'Selected Form' : 'Select All' }}
            </span>
          </div>

          <!-- Select All button for grid view -->
          <div
            v-else-if="viewMode === 'grid'"
            :class="[
              'flex items-center justify-between px-4 py-3 border-b',
              'border-gray-200 dark:border-gray-700'
            ]"
          >
            <Button
              variant="ghost"
              size="sm"
              @click="selectedForm = selectedForm ? null : sortedForms[0]?.id || null"
              class="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <input
                type="checkbox"
                :checked="selectedForm !== null"
                @click.stop
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 pointer-events-none"
              />
              <span
                :class="[
                  'text-sm font-medium text-gray-700 dark:text-gray-300',
                ]"
              >
                {{ selectedForm ? 'Selected Form' : 'Select All' }}
              </span>
            </Button>

            <!-- Optional: Show count of total forms -->
            <span
              :class="['text-xs text-gray-500 dark:text-gray-400']"
            >
              {{ sortedForms.length }} form{{ sortedForms.length !== 1 ? "s" : "" }}
            </span>
          </div>

          <div class="p-2 sm:p-4">
            <div :class="cardsContainerClass">
              <QuickViewCard
                v-for="form in sortedForms"
                :key="form.id"
                :form="form"
                :view-mode="viewMode"
                :field-count="computeFieldCount(form) ?? undefined"
                :response-count="computeResponseCount(form) ?? undefined"
                :is-selected="selectedForm === form.id"
                @view-responses="handleQuickViewResponses"
                @share="handleQuickViewShare"
                @select="selectedForm = $event"
              />
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="empty-state">
          <div class="empty-icon-wrapper">
            <FileText class="empty-icon" />
          </div>
          <h3 class="empty-title">{{$t('Views.Forms.heading.no_forms_found')}}</h3>
          <p class="empty-description">
            {{$t('Views.Forms.text.get_started_by_creating_your_first_form')}}
          </p>
          <div class="empty-actions">
            <Button
              @click="createNewForm()"
              class="bg-primary-600 hover:bg-primary-700"
            >
              <Plus class="mr-2 h-4 w-4" />
              {{$t('Commons.button.new')}}
            </Button>
            <Button
              variant="outline"
              class="border-gray-300 hover:border-gray-400"
              @click="createNewFormFromTemplate(formTemplates[1])"
            >
              <Contact class="mr-2 h-4 w-4" />
              Contact Form
            </Button>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="loading && hasMore" class="text-center mt-6 sm:mt-8 p-4">
          <div class="inline-block w-8 h-8 rounded-full border-4 border-gray-300 dark:border-gray-600 border-r-transparent animate-spin" role="status"></div>
          <span class="ml-2 text-gray-600 dark:text-gray-400 text-sm sm:text-base" v-if="forms.length > 0">{{$t('Views.Forms.text.loading_more_forms')}}</span>
          <span class="ml-2 text-gray-600 dark:text-gray-400 text-sm sm:text-base" v-else>{{$t('Views.Forms.text.loading')}}</span>
        </div>
      </ScrollArea>
    </div>

    <!-- Share Modal -->
    <Dialog :open="showShareModal" @update:open="value => value ? null : closeShareModal()">
      <DialogContent class="w-full max-w-sm sm:max-w-lg mx-auto">
        <DialogHeader>
          <DialogTitle>{{$t('Commons.aria_label.share_form')}}</DialogTitle>
          <DialogDescription>
            {{$t('Views.Forms.heading.share_this_form_with')}}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-2">
          <div class="space-y-2">
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {{$t('Commons.label.share_link')}}
            </label>
            <div class="flex flex-col gap-2 sm:flex-row">
              <Input
                :model-value="computedShareLink"
                readonly
                class="flex-1 font-mono text-xs sm:text-sm"
                @focus="handleShareLinkFocus"
              />
              <Button
                type="button"
                variant="outline"
                :disabled="!computedShareLink"
                @click="copyShareLink"
                class="text-xs sm:text-sm"
              >
                {{$t('Commons.button.copy')}}
              </Button>
            </div>
            <p class="text-xs text-slate-500">
              {{$t('Views.Forms.text.anyone_with_this_link')}}
            </p>
          </div>

          <div v-if="shareHelperItems.length" class="grid gap-2 sm:grid-cols-2">
            <Button
              v-for="item in shareHelperItems"
              :key="item.label"
              type="button"
              variant="outline"
              class="justify-start text-xs sm:text-sm"
              @click="item.action"
            >
              {{ item.label }}
            </Button>
          </div>

          <div v-if="isPublishingShare" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
            {{$t('Views.Forms.text.publishing_form_to_generate')}}
          </div>
        </div>

        <DialogFooter class="flex gap-2">
          <DialogClose asChild>
            <Button type="button" variant="secondary" :disabled="isPublishingShare" class="text-xs sm:text-sm">
              {{$t('Commons.button.close')}}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Form Wizard -->
    <FormWizard
      v-if="showWizard"
      :initial-description="wizardPreset"
      @create="handleWizardCreate"
      @create-blank="handleWizardCreateBlank"
      @close="showWizard = false"
    />
  </div>
</template>

<style scoped>
.spinner-border {
  border-right-color: transparent;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

@media (min-width: 640px) {
  .empty-state {
    padding: 4rem;
  }
}

.empty-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  border-radius: 9999px;
  margin-bottom: 1.5rem;
  background-color: rgb(243 244 246);
}

@media (min-width: 640px) {
  .empty-icon-wrapper {
    width: 5rem;
    height: 5rem;
  }
}

.dark .empty-icon-wrapper {
  background-color: rgb(55 65 81);
}

.empty-icon {
  width: 2rem;
  height: 2rem;
  color: rgb(37 99 235);
}

@media (min-width: 640px) {
  .empty-icon {
    width: 2.5rem;
    height: 2.5rem;
  }
}

.dark .empty-icon {
  color: rgb(59 130 246);
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: rgb(17 24 39);
}

@media (min-width: 640px) {
  .empty-title {
    font-size: 1.25rem;
  }
}

.dark .empty-title {
  color: rgb(243 244 246);
}

.empty-description {
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  max-width: 28rem;
  color: rgb(107 114 128);
}

@media (min-width: 640px) {
  .empty-description {
    margin-bottom: 2rem;
  }
}

.dark .empty-description {
  color: rgb(156 163 175);
}

.empty-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  justify-content: center;
  width: 100%;
}

@media (min-width: 640px) {
  .empty-actions {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 1rem;
    width: auto;
  }
}
</style>