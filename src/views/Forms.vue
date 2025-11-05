<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import { useFormStore } from "@/store/forms";
import QuickViewCard from "@/components/forms/QuickView.vue";
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
import { router } from "@/main";

const searchValue = ref("");
const debouncedSearch = ref("");
const viewMode = ref<"grid" | "tree" | "thumbnail" | "list">("grid");
const selectedForm = ref<string | null>(null);
const showWizard = ref(false);

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
  const pageId = crypto.randomUUID();
  
  // Convert blocks to questions
  const questions = data.blocks.map((block, index) => ({
    ...block,
    page_id: pageId,
    position: index,
  }));
  
  const form = await formStore.createForm({ 
    title: data.title,
    pages: [
      {
        id: pageId,
        title: "Page 1",
        description: data.description,
        position: 1,
        question_order: questions.map(q => q.id),
      }
    ],
    questions,
    logic_rules: [],
  });
  
  if (form?.id) {
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
  router.push(`/f/${id}`);
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
      action: () => previewForm(selectedForm.value!),
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
      action: () => console.log("Share"),
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

        <!-- Forms grid display -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuickViewCard v-for="form in filteredForms" :key="form.id" :form="form" />
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
