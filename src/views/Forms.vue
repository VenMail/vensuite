<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import { useFormStore } from "@/store/forms";
import { AppForm } from "@/types";
import QuickViewCard from "@/components/forms/QuickView.vue";
import {
  ActivitySquare,
  Newspaper,
  UserCheck2,
  Grid,
  List,
  Share2,
  Trash2,
  Edit2,
  BookOpen,
  Edit3,
  BookPlus,
  FilePlus2,
  SearchIcon,
  Settings,
} from "lucide-vue-next";
import Input from "@/components/ui/input/Input.vue";
import Button from "@/components/ui/button/Button.vue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { router } from "@/main";

const forms = ref<AppForm[]>([]);
const loading = ref<boolean>(false);
const errorMessage = ref<string | null>(null);
const currentPage = ref<number>(1);
const isFetching = ref<boolean>(false);
const hasMore = ref<boolean>(true);

const searchValue = ref("");
const viewMode = ref<"grid" | "tree" | "thumbnail" | "list">("grid");
const selectedForm = ref<string | null>(null);

const showContextMenu = computed(() => !!selectedForm.value);

const formStore = useFormStore();

// Fetch forms data for the current page
const fetchMoreForms = async () => {
  if (isFetching.value || !hasMore.value) return;

  isFetching.value = true;
  loading.value = true;
  errorMessage.value = null;

  try {
    const response = await formStore.fetchForms(currentPage.value);
    if (response.length > 0) {
      forms.value = [...forms.value, ...response];
      currentPage.value += 1;
    } else {
      hasMore.value = false; // No more forms to fetch
    }
  } catch (error) {
    errorMessage.value = "Failed to load forms. Please try again later.";
  } finally {
    isFetching.value = false;
    loading.value = false;
  }
};

const handleScroll = () => {
  const scrollableHeight = document.documentElement.scrollHeight;
  const currentScroll = window.scrollY + window.innerHeight;

  if (currentScroll + 100 >= scrollableHeight) {
    // If near the bottom, load more forms
    fetchMoreForms();
  }
};

let debounceTimer: NodeJS.Timeout;
const debouncedSearch = ref(searchValue.value);

// Watcher for debouncing the search input
watch(searchValue, (newValue) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = newValue;
  }, 300);
});

const templates = {
  General: [
    { name: "Blank Form", icon: Newspaper },
    { name: "Signup Form", icon: UserCheck2 },
    { name: "Survey Form", icon: ActivitySquare },
  ],
};

function createNewForm(template?: string) {
  if (template == "blank") {
    formStore.saveForm({title: "Blank Form"}, router);
  } else {
    //better to just fetch template from api
    router.push("/forms/" + template || "blank");
  }
}

function previewForm(id: string) {
  router.push("/forms/v/" + id);
}

function editForm() {
  router.push("/forms/edit/" + selectedForm.value);
}

function viewResponses() {
  router.push("/forms/" + selectedForm.value);
}

onMounted(() => {
  fetchMoreForms(); // Fetch the first page of forms
  window.addEventListener("scroll", handleScroll);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll); // Cleanup
});

// Update the contextMenuActions computed property
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
  <div class="flex h-screen bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900">
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Top menubar -->
      <div
        class="bg-white bg-opacity-50 backdrop-blur-lg border-b border-gray-200 p-4 flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="relative">
            <SearchIcon class="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <Input v-model="searchValue" placeholder="Search forms..." class="pl-8 w-64" />
          </div>
        </div>
        <!-- Context-aware menu -->
        <div v-if="showContextMenu"
          class="context-menu bg-white bg-opacity-50 backdrop-blur-sm border border-gray-200 rounded-lg p-2 flex items-center space-x-2">
          <Button v-for="action in contextMenuActions" :key="action.label" variant="ghost" size="sm"
            @click="action.action" class="flex items-center">
            <component :is="action.icon" class="mr-2 h-4 w-4" />
            {{ action.label }}
          </Button>
        </div>
        <div v-else class="flex items-center space-x-4">
          <Button variant="outline" @click="() => createNewForm('blank')">
            <FilePlus2 class="mr-2 h-4 w-4" />
            New Form
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <BookPlus class="mr-2 h-4 w-4" />
                New from Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Choose a Template</DialogTitle>
              </DialogHeader>
              <Tabs default-value="Documents">
                <TabsList>
                  <TabsTrigger v-for="category in Object.keys(templates)" :key="category" :value="category">
                    {{ category }}
                  </TabsTrigger>
                </TabsList>
                <TabsContent v-for="(items, category) in templates" :key="category" :value="category">
                  <div class="grid grid-cols-2 gap-4">
                    <Button v-for="template in items" :key="template.name" variant="outline"
                      class="h-24 flex flex-col items-center justify-center" @click="
                        createNewForm(template.name)
                        ">
                      <component :is="template.icon" class="w-8 h-8" />
                      <span class="mt-2 text-sm">{{ template.name }}</span>
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
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
        <h1 v-if="forms.length < 1" class="text-4xl font-bold text-center mb-8">Create and Manage Forms</h1>

        <!-- Error message -->
        <div v-if="errorMessage" class="text-red-500 text-center">
          {{ errorMessage }}
        </div>

        <!-- Forms grid display -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuickViewCard v-for="form in forms" :key="form.id" :form="form" />
        </div>

        <!-- Loading spinner for infinite scroll -->
        <div v-if="loading && hasMore" class="text-center mt-6">
          <div class="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-blue-500"
            role="status">
          </div>
          <span class="ml-2 text-gray-600" v-if="forms.length > 0">Loading more forms...</span>
          <span class="ml-2 text-gray-600" v-else>Loading...</span>
        </div>

        <!-- No more forms to load -->
        <div v-if="!hasMore && !loading" class="text-center mt-6 text-gray-500">
          No more forms to load.
        </div>
      </div>
    </div>
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
