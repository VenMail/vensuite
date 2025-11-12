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
  BookOpen,
  Edit3,
  FilePlus2,
  SearchIcon,
  Settings,
} from "lucide-vue-next";
import FormWizard from "@/components/forms/FormWizard.vue";
import Input from "@/components/ui/input/Input.vue";
import Button from "@/components/ui/button/Button.vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { router } from "@/main";

const searchValue = ref("");
const debouncedSearch = ref("");
const viewMode = ref<"grid" | "list">("grid");
const selectedForm = ref<string | null>(null);
const shareTarget = ref<AppForm | null>(null);
const showShareModal = ref(false);
const isPublishingShare = ref(false);
const showWizard = ref(false);

const TEMPLATE_STORAGE_PREFIX = "VENX_FORM_TEMPLATE_";

const formStore = useFormStore();

const loading = computed(() => formStore.loading);
const errorMessage = computed(() => formStore.error);
const hasMore = computed(() => formStore.pagination.hasMore);
const forms = computed(() => formStore.allForms);

const filteredForms = computed(() => {
  const query = debouncedSearch.value.trim().toLowerCase();
  if (!query) return forms.value;
  return forms.value.filter((form) => form.title?.toLowerCase().includes(query));
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
    return `${window.location.origin}/f/${shareSlug}`;
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
    toast({ title: "Share link unavailable", description: "Publish the form to get a shareable link.", variant: "destructive" });
    return;
  }
  try {
    await navigator.clipboard.writeText(link);
    toast({ title: "Share link copied", description: "The form link was copied to your clipboard." });
  } catch {
    toast({ title: "Copy failed", description: "Unable to copy link. Try copying manually.", variant: "destructive" });
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
    toast({ title: "Share unavailable", description: "Form is missing an identifier.", variant: "destructive" });
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
      await navigator.clipboard.writeText(`${window.location.origin}/f/${updated.sharing.share_slug}`);
      toast({ title: "Form published", description: "Share link copied to clipboard." });
    } else {
      toast({ title: "Publish incomplete", description: "Unable to generate share slug. Please publish manually.", variant: "destructive" });
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

const cardsContainerClass = computed(() =>
  viewMode.value === "list"
    ? "flex flex-col gap-4"
    : "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3",
);

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

function createNewForm() {
  showWizard.value = true;
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

onMounted(() => {
  formStore.fetchForms(true);
  window.addEventListener("scroll", handleScroll);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll);
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
</script>

<template>
  <div
    :class="[
      'flex h-screen text-gray-900 transition-colors duration-200',
      'bg-gradient-to-br from-gray-50 to-gray-100',
      'dark:bg-gradient-to-br dark:from-gray-900 to-gray-800'
    ]"
  >
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Top menubar -->
      <div
        class="bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between text-gray-800 dark:text-gray-100">
        <div class="flex items-center space-x-4">
          <div class="relative">
            <SearchIcon class="absolute left-2 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <Input v-model="searchValue" placeholder="Search forms..." class="pl-8 w-64 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400" />
          </div>
        </div>
        <!-- Context-aware menu -->
        <div v-if="showContextMenu"
          class="context-menu bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-lg p-2 flex items-center space-x-2 text-gray-800 dark:text-gray-100">
          <Button v-for="action in contextMenuActions" :key="action.label" variant="ghost" size="sm"
            @click="action.action" class="flex items-center">
            <component :is="action.icon" class="mr-2 h-4 w-4" />
            {{ action.label }}
          </Button>
        </div>
        <div v-else class="flex items-center space-x-4">
          <Button variant="outline" @click="createNewForm">
            <FilePlus2 class="mr-2 h-4 w-4" />
            New Form
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <component :is="viewMode === 'grid' ? Grid : List" class="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem @click="viewMode = 'grid'">
                <Grid class="mr-2 h-4 w-4" />
                Grid View
              </DropdownMenuItem>
              <DropdownMenuItem @click="viewMode = 'list'">
                <List class="mr-2 h-4 w-4" />
                List View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon">
            <Settings class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div class="flex-1 p-6 overflow-hidden">
        <h1 v-if="forms.length < 1" class="text-4xl font-bold text-center mb-8 dark:text-white">Create and Manage Forms</h1>

        <!-- Error message -->
        <div v-if="errorMessage" class="text-red-500 text-center">
          {{ errorMessage }}
        </div>

        <!-- Forms grid/list display -->
        <div :class="cardsContainerClass">
          <QuickViewCard
            v-for="form in filteredForms"
            :key="form.id"
            :form="form"
            :view-mode="viewMode"
            :field-count="computeFieldCount(form) ?? undefined"
            :response-count="computeResponseCount(form) ?? undefined"
            @view-responses="handleQuickViewResponses"
            @share="handleQuickViewShare"
          />
        </div>

        <!-- Loading spinner for infinite scroll -->
        <div v-if="loading && hasMore" class="text-center mt-6">
          <div class="inline-block w-8 h-8 rounded-full border-4 border-gray-300 dark:border-gray-600 border-r-transparent animate-spin" role="status"></div>
          <span class="ml-2 text-gray-600 dark:text-gray-400" v-if="forms.length > 0">Loading more forms...</span>
          <span class="ml-2 text-gray-600 dark:text-gray-400" v-else>Loading...</span>
        </div>

        <!-- No more forms to load -->
        <div v-if="!hasMore && !loading" class="text-center mt-6 text-gray-500 dark:text-gray-400">
          No more forms to load.
        </div>
      </div>

      <Dialog :open="showShareModal" @update:open="value => value ? null : closeShareModal()">
        <DialogContent class="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share form</DialogTitle>
            <DialogDescription>
              Share this form with participants or collaborators using the link below.
            </DialogDescription>
          </DialogHeader>

          <div class="space-y-4 py-2">
            <div class="space-y-2">
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Share link
              </label>
              <div class="flex flex-col gap-2 sm:flex-row">
                <Input
                  :model-value="computedShareLink"
                  readonly
                  class="sm:flex-1 font-mono text-sm"
                  @focus="handleShareLinkFocus"
                />
                <Button
                  type="button"
                  variant="outline"
                  :disabled="!computedShareLink"
                  @click="copyShareLink"
                >
                  Copy
                </Button>
              </div>
              <p class="text-xs text-slate-500">
                Anyone with this link can access the form based on its publish settings.
              </p>
            </div>

            <div v-if="shareHelperItems.length" class="grid gap-2 sm:grid-cols-2">
              <Button
                v-for="item in shareHelperItems"
                :key="item.label"
                type="button"
                variant="outline"
                class="justify-start"
                @click="item.action"
              >
                {{ item.label }}
              </Button>
            </div>

            <div v-if="isPublishingShare" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              Publishing form to generate share link…
            </div>
          </div>

          <DialogFooter>
            <DialogClose as-child>
              <Button type="button" variant="secondary" :disabled="isPublishingShare">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    <!-- Form Wizard -->
    <FormWizard
      v-if="showWizard"
      @create="handleWizardCreate"
      @create-blank="handleWizardCreateBlank"
      @close="showWizard = false"
    />
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
}

.spinner-border {
  border-right-color: transparent;
}
</style>
