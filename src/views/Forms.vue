<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { useFormStore } from "@/store/forms";
import { useFormTemplates } from "@/composables/useFormTemplates";
import { useFormFilters } from "@/composables/useFormFilters";
import { useFormWizard } from "@/composables/useFormWizard";
import { Plus } from "lucide-vue-next";
import FormWizard from "@/components/forms/FormWizard.vue";
import Button from "@/components/ui/button/Button.vue";
import { Dialog } from "@/components/ui/dialog";
import { router } from "@/main";
import WorkspaceTopBar from "@/components/layout/WorkspaceTopBar.vue";
import ShareModal from "@/components/forms/ShareModal.vue";
import TemplateDialog from "@/components/forms/TemplateDialog.vue";
import TemplatePreview from "@/components/forms/TemplatePreview.vue";
import FormsList from "@/components/forms/FormsList.vue";
import type { AppForm } from "@/types";
import type { FormTemplate } from "@/composables/useFormTemplates";

const viewMode = ref<"grid" | "list">("grid");
const selectedForm = ref<string | null>(null);
const showShareModal = ref(false);
const shareTarget = ref<AppForm | null>(null);
const showTemplateDialog = ref(false);
const isMobile = ref(false);

const formStore = useFormStore();
const { formTemplates } = useFormTemplates();
const { 
  sortedForms, 
  formsSubtitle, 
  computeFieldCount, 
  computeResponseCount 
} = useFormFilters(formStore.allForms);
const { 
  showWizard, 
  wizardPreset, 
  handleWizardCreate, 
  handleWizardCreateBlank, 
  openWizard 
} = useFormWizard();

const loading = computed(() => formStore.loading);
const hasMore = computed(() => formStore.pagination.hasMore);

const handleQuickViewResponses = (form: AppForm) => {
  if (!form.id) return;
  router.push({ name: "form-responses", params: { id: form.id } });
};

const handleQuickViewShare = (form: AppForm) => {
  shareTarget.value = form;
  showShareModal.value = true;
};

const closeShareModal = () => {
  showShareModal.value = false;
  shareTarget.value = null;
};

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

const handleResize = () => {
  isMobile.value = window.innerWidth < 768;
};

const createNewForm = (preset?: string) => {
  openWizard(preset);
};

const createNewFormFromTemplate = (template: FormTemplate) => {
  createNewForm(template.preset || "");
};

const handleSelectForm = (id: string) => {
  selectedForm.value = id === '' ? null : id;
};

const handleViewChange = (mode: "grid" | "list") => {
  viewMode.value = mode;
};

const currentTitle = computed(() => "Forms");
const breadcrumbs = computed(() => [{ id: null, title: "Forms" }]);
const canNavigateUp = computed(() => false);
const topBarActions = computed(() => []);
const stats = computed(() => []);
const filterOptions = computed(() => []);
const viewOptions = computed(() => []);
const handleFilter = () => {
  // Handle filter change
};

const actionIconClass = computed(
  () =>
    "relative group rounded-full transition-all duration-200 shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700",
);

onMounted(() => {
  handleResize();
  window.addEventListener('resize', handleResize);
  formStore.fetchForms(true);
  window.addEventListener("scroll", handleScroll);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener('resize', handleResize);
});
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
              @click="showTemplateDialog = true"
            >
              <Plus class="h-5 w-5 text-primary-600" />
            </Button>
          </DialogTrigger>
        </Dialog>
      </template>
    </WorkspaceTopBar>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col gap-6 p-4 sm:p-6 overflow-hidden">
      <!-- Template previews -->
      <TemplatePreview
        :templates="formTemplates"
        @select-template="createNewFormFromTemplate"
        @create-blank="createNewForm"
      />

      <!-- Forms List -->
      <FormsList
        :forms="sortedForms"
        :view-mode="viewMode"
        :selected-form="selectedForm"
        :loading="loading"
        :has-more="hasMore"
        :compute-field-count="computeFieldCount"
        :compute-response-count="computeResponseCount"
        @select-form="handleSelectForm"
        @view-responses="handleQuickViewResponses"
        @share="handleQuickViewShare"
        @create-blank="createNewForm"
        @create-template="() => createNewFormFromTemplate(formTemplates[1])"
      />
    </div>

    <!-- Share Modal -->
    <ShareModal
      :is-open="showShareModal"
      :form="shareTarget"
      @close="closeShareModal"
    />

    <!-- Template Dialog -->
    <TemplateDialog
      :is-open="showTemplateDialog"
      :templates="formTemplates"
      @close="showTemplateDialog = false"
      @select-template="createNewFormFromTemplate"
      @create-blank="createNewForm"
    />

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
