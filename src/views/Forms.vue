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
import { t } from '@/i18n';

const searchValue = ref("");
const debouncedSearch = ref("");
const viewMode = ref<"grid" | "list">("grid");
const SHARE_BASE_URL = import.meta.env.VITE_SHARE_BASE_URL || window.location.origin;

const selectedForm = ref<string | null>(null);
const shareTarget = ref<AppForm | null>(null);
const showShareModal = ref(false);
const isPublishingShare = ref(false);
const showWizard = ref(false);
const wizardPreset = ref<string>("");
const isMobile = ref(false);

const TEMPLATE_STORAGE_PREFIX = "VENX_FORM_TEMPLATE_";

const formStore = useFormStore();

const loading = computed(() => formStore.loading);
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

function createNewForm() {
  wizardPreset.value = "";
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
</script>

<template>
  <div
    :class="[
      'flex h-screen text-gray-900 transition-colors duration-200 flex-col',
      'bg-gradient-to-br from-gray-50 to-gray-100',
      'dark:bg-gradient-to-br dark:from-gray-900 to-gray-800'
    ]"
  >
    <!-- Mobile header -->
    <div
      class="bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 p-3 sm:p-4 text-gray-800 dark:text-gray-100 shrink-0"
    >
      <div class="flex flex-col gap-3 sm:hidden">
        <div class="flex items-center justify-between gap-2">
          <div class="relative flex-1">
            <SearchIcon class="absolute left-2 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <Input v-model="searchValue" placeholder="Search..." class="pl-8 w-full text-sm dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <component :is="viewMode === 'grid' ? Grid : List" class="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem @click="viewMode = 'grid'">
                <Grid class="mr-2 h-4 w-4" />
                {{$t('Commons.text.grid_view')}}
              </DropdownMenuItem>
              <DropdownMenuItem @click="viewMode = 'list'">
                <List class="mr-2 h-4 w-4" />
                {{$t('Commons.text.list_view')}}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon">
            <Settings class="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" @click="createNewForm" class="w-full">
          <FilePlus2 class="h-4 w-4 mr-2" />
          {{$t('Commons.button.new_form')}}
        </Button>
      </div>

      <!-- Desktop header -->
      <div class="hidden sm:flex items-center justify-between">
        <div class="flex items-center gap-4 flex-1">
          <div class="relative max-w-xs lg:max-w-sm">
            <SearchIcon class="absolute left-2 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <Input v-model="searchValue" placeholder="Search forms..." class="pl-8 w-full dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400" />
          </div>
        </div>

        <div v-if="showContextMenu" class="flex items-center gap-2 ml-auto">
          <Button v-for="action in contextMenuActions" :key="action.label" variant="ghost" size="sm"
            @click="action.action" class="flex items-center text-xs lg:text-sm">
            <component :is="action.icon" class="mr-2 h-4 w-4" />
            <span class="hidden lg:inline">{{ action.label }}</span>
          </Button>
        </div>

        <div v-else class="flex items-center gap-2 ml-auto">
          <Button variant="outline" @click="createNewForm" class="hidden lg:flex">
            <FilePlus2 class="mr-2 h-4 w-4" />
            {{$t('Commons.button.new_form')}}
          </Button>
          <Button variant="outline" @click="createNewForm" size="icon" class="lg:hidden">
            <FilePlus2 class="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <component :is="viewMode === 'grid' ? Grid : List" class="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem @click="viewMode = 'grid'">
                <Grid class="mr-2 h-4 w-4" />
                {{$t('Commons.text.grid_view')}}
              </DropdownMenuItem>
              <DropdownMenuItem @click="viewMode = 'list'">
                <List class="mr-2 h-4 w-4" />
                {{$t('Commons.text.list_view')}}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon">
            <Settings class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto p-3 sm:p-6">
      <h1 v-if="forms.length < 1" class="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-6 sm:mb-8 dark:text-white">
        {{$t('Views.Forms.heading.create_and_manage_forms')}}
      </h1>

      <!-- ... -->
       
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

       
      <div v-if="loading && hasMore" class="text-center mt-6 sm:mt-8">
        <div class="inline-block w-8 h-8 rounded-full border-4 border-gray-300 dark:border-gray-600 border-r-transparent animate-spin" role="status"></div>
        <span class="ml-2 text-gray-600 dark:text-gray-400 text-sm sm:text-base" v-if="forms.length > 0">{{$t('Views.Forms.text.loading_more_forms')}}</span>
        <span class="ml-2 text-gray-600 dark:text-gray-400 text-sm sm:text-base" v-else>{{$t('Views.Forms.text.loading')}}</span>
      </div>

       
      <div v-if="!hasMore && !loading && forms.length > 0" class="text-center mt-6 sm:mt-8 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
        {{$t('Views.Forms.text.no_more_forms_to')}}
      </div>
    </div>

     
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
          <DialogClose as-child>
            <Button type="button" variant="secondary" :disabled="isPublishingShare" class="text-xs sm:text-sm">
              {{$t('Commons.button.close')}}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>

     
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
</style>