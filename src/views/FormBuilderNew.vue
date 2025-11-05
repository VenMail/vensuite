<template>
  <div class="form-builder-new min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Top Bar -->
    <div class="form-builder-new__topbar sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
      <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            @click="handleBack"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          <div>
            <input
              v-model="formTitle"
              type="text"
              placeholder="Untitled Form"
              class="text-lg font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              @input="handleTitleChange"
            />
            <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span v-if="isSaving">Saving...</span>
              <span v-else-if="lastSaved">Saved {{ lastSaved }}</span>
              <span v-else>Unsaved changes</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            @click="handleSettings"
            title="Form Settings"
          >
            <Settings class="w-4 h-4 inline mr-2" />
            Settings
          </button>
          <button
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            @click="handlePreview"
          >
            <Eye class="w-4 h-4 inline mr-2" />
            Preview
          </button>
          <button
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isPublishing || blocks.length === 0"
            @click="handlePublish"
          >
            <Send class="w-4 h-4 inline mr-2" />
            {{ isPublishing ? 'Publishing...' : 'Publish' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="form-builder-new__content max-w-3xl mx-auto px-6 py-12">
      <!-- Form Header -->
      <div class="form-builder-new__header mb-12">
        <input
          v-model="formTitle"
          type="text"
          placeholder="Untitled Form"
          class="text-5xl font-bold w-full bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 mb-4"
          @input="handleTitleChange"
        />
        <textarea
          v-model="formDescription"
          placeholder="Add a description to help people understand your form..."
          rows="2"
          class="text-lg w-full bg-transparent border-none outline-none text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
          @input="handleDescriptionChange"
        />
      </div>

      <!-- Blocks -->
      <div class="form-builder-new__blocks space-y-3">
        <TransitionGroup name="block-list">
          <div
            v-for="(block, index) in blocks"
            :key="block.id"
            class="block-wrapper group"
          >
            <BlockItemNew
              :block="block"
              :index="index"
              :is-focused="focusedBlockId === block.id"
              @focus="handleBlockFocus(block.id)"
              @blur="handleBlockBlur"
              @update="handleBlockUpdate"
              @delete="handleBlockDelete"
              @duplicate="handleBlockDuplicate"
              @move-up="handleMoveUp"
              @move-down="handleMoveDown"
              @insert-below="handleInsertBelow"
            />
          </div>
        </TransitionGroup>
      </div>

      <!-- Add Block Button -->
      <div class="mt-6">
        <button
          class="add-block-button group w-full flex items-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          @click="handleAddBlock"
        >
          <Plus class="w-5 h-5" />
          <span class="text-sm font-medium">Add a question</span>
          <span class="text-xs text-gray-400 dark:text-gray-500 ml-auto">or press <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 text-xs font-mono">/</kbd></span>
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-if="blocks.length === 0"
        class="empty-state mt-20 text-center"
      >
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 mb-6">
          <Sparkles class="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Start building your form
        </h3>
        <p class="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Add questions, customize fields, and create the perfect form for your needs.
        </p>
        <div class="flex items-center justify-center gap-3">
          <button
            class="px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
            @click="handleAddBlock"
          >
            <Plus class="w-4 h-4 inline mr-2" />
            Add First Question
          </button>
          <button
            class="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            @click="handleUseAI"
          >
            <Wand2 class="w-4 h-4 inline mr-2" />
            Generate with AI
          </button>
        </div>
      </div>
    </div>

    <!-- Slash Command Menu -->
    <SlashMenu
      v-if="showSlashMenu"
      :filter="slashMenuFilter"
      :position="slashMenuPosition"
      @select="handleSlashSelect"
      @close="closeSlashMenu"
    />

    <!-- Configuration Wizard -->
    <FormConfigWizard
      v-if="showConfigWizard"
      @complete="handleConfigComplete"
      @skip="handleConfigSkip"
    />

    <!-- AI Generation Dialog -->
    <Teleport to="body">
      <div
        v-if="showAIDialog"
        class="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
        @click.self="showAIDialog = false"
      >
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">
              Generate with AI
            </h3>
            <button
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
              @click="showAIDialog = false"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
          <textarea
            v-model="aiPrompt"
            rows="4"
            placeholder="Describe what questions you want to add..."
            class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none mb-4"
          />
          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              @click="showAIDialog = false"
            >
              Cancel
            </button>
            <button
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg disabled:opacity-50"
              :disabled="!aiPrompt.trim() || isGenerating"
              @click="handleGenerateAI"
            >
              {{ isGenerating ? 'Generating...' : 'Generate' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, Eye, Send, Plus, Sparkles, Wand2, X, Settings } from "lucide-vue-next";
import BlockItemNew from "@/components/forms/blocks/BlockItemNew.vue";
import SlashMenu from "@/components/forms/blocks/SlashMenu.vue";
import FormConfigWizard from "@/components/forms/FormConfigWizardSimple.vue";
import type { FormBlock } from "@/components/forms/blocks/types";
import type { FormConfig } from "@/components/forms/FormConfigWizardSimple.vue";
import { useFormStore } from "@/store/forms";
import { generateFormBlocks } from "../services/ai";

const route = useRoute();
const router = useRouter();
const formStore = useFormStore();

const formId = computed(() => route.params.id as string);
const formTitle = ref("");
const formDescription = ref("");
const blocks = ref<FormBlock[]>([]);
const focusedBlockId = ref<string | null>(null);
const showSlashMenu = ref(false);
const slashMenuFilter = ref("");
const slashMenuPosition = ref({ top: 0, left: 0 });
const showAIDialog = ref(false);
const aiPrompt = ref("");
const isGenerating = ref(false);
const isSaving = ref(false);
const isPublishing = ref(false);
const lastSaved = ref("");
const showConfigWizard = ref(false);
const isNewForm = ref(false);
const formConfig = ref<FormConfig | null>(null);

// Auto-save functionality
let saveTimeout: NodeJS.Timeout | null = null;
const triggerSave = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    await saveForm();
  }, 2000);
};

const saveForm = async () => {
  if (!formId.value) return;
  
  isSaving.value = true;
  try {
    const pageId = crypto.randomUUID();
    const questions = blocks.value.map((block) => ({
      id: block.id,
      type: block.type,
      category: block.category,
      question: block.question,
      description: block.description,
      placeholder: block.placeholder,
      required: block.required,
      options: block.options,
      validation: block.validation,
      icon_type: block.iconType || 'star',
      allow_half: block.allowHalf,
      min: block.min,
      max: block.max,
      allowed_types: block.allowedTypes,
      max_size: block.maxSize,
      multiple: block.multiple,
      page_id: pageId,
    } as any));

    await formStore.updateForm(formId.value, {
      title: formTitle.value,
      pages: [
        {
          id: pageId,
          title: "Page 1",
          description: formDescription.value,
          position: 1,
          question_order: questions.map(q => q.id),
        }
      ],
      questions,
    });

    const now = new Date();
    lastSaved.value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    console.error("Failed to save form:", error);
    console.error("Failed to save changes");
  } finally {
    isSaving.value = false;
  }
};

const handleTitleChange = () => {
  triggerSave();
};

const handleDescriptionChange = () => {
  triggerSave();
};

const handleBlockFocus = (blockId: string) => {
  focusedBlockId.value = blockId;
};

const handleBlockBlur = () => {
  focusedBlockId.value = null;
};

const handleBlockUpdate = (updatedBlock: FormBlock) => {
  const index = blocks.value.findIndex(b => b.id === updatedBlock.id);
  if (index !== -1) {
    blocks.value[index] = updatedBlock;
    triggerSave();
  }
};

const handleBlockDelete = (blockId: string) => {
  blocks.value = blocks.value.filter(b => b.id !== blockId);
  triggerSave();
};

const handleBlockDuplicate = (blockId: string) => {
  const index = blocks.value.findIndex(b => b.id === blockId);
  if (index !== -1) {
    const original = blocks.value[index];
    const duplicate = {
      ...original,
      id: crypto.randomUUID(),
      question: `${original.question} (copy)`,
    };
    blocks.value.splice(index + 1, 0, duplicate);
    triggerSave();
  }
};

const handleMoveUp = (blockId: string) => {
  const index = blocks.value.findIndex(b => b.id === blockId);
  if (index > 0) {
    // Create new array with swapped elements
    const newBlocks = [...blocks.value];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index - 1];
    newBlocks[index - 1] = temp;
    blocks.value = newBlocks;
    triggerSave();
  }
};

const handleMoveDown = (blockId: string) => {
  const index = blocks.value.findIndex(b => b.id === blockId);
  if (index < blocks.value.length - 1) {
    // Create new array with swapped elements
    const newBlocks = [...blocks.value];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index + 1];
    newBlocks[index + 1] = temp;
    blocks.value = newBlocks;
    triggerSave();
  }
};

const handleInsertBelow = (blockId: string) => {
  const index = blocks.value.findIndex(b => b.id === blockId);
  const newBlock: FormBlock = {
    id: crypto.randomUUID(),
    type: "short",
    category: "text",
    question: "",
    required: false,
  };
  blocks.value.splice(index + 1, 0, newBlock);
  focusedBlockId.value = newBlock.id;
};

const handleAddBlock = () => {
  const newBlock: FormBlock = {
    id: crypto.randomUUID(),
    type: "short",
    category: "text",
    question: "",
    required: false,
  };
  blocks.value.push(newBlock);
  focusedBlockId.value = newBlock.id;
};

const handleSlashSelect = (type: any) => {
  const newBlock: FormBlock = {
    id: crypto.randomUUID(),
    type: type,
    category: getCategoryForType(type),
    question: "",
    required: false,
  };
  
  if (type === "radio" || type === "checkbox" || type === "dropdown") {
    newBlock.options = ["Option 1", "Option 2", "Option 3"];
  }
  
  blocks.value.push(newBlock);
  closeSlashMenu();
  focusedBlockId.value = newBlock.id;
};

const getCategoryForType = (type: string): FormBlock["category"] => {
  const categoryMap: Record<string, FormBlock["category"]> = {
    short: "text",
    long: "text",
    email: "text",
    phone: "text",
    date: "text",
    time: "text",
    radio: "choice",
    checkbox: "choices",
    dropdown: "choice",
    rating: "rating",
    slider: "rating",
    file: "file",
    yesno: "switch",
  };
  return categoryMap[type] || "text";
};

const closeSlashMenu = () => {
  showSlashMenu.value = false;
  slashMenuFilter.value = "";
};

const handleUseAI = () => {
  showAIDialog.value = true;
};

const handleGenerateAI = async () => {
  if (!aiPrompt.value.trim()) return;
  
  isGenerating.value = true;
  try {
    const generatedBlocks = await generateFormBlocks(aiPrompt.value);
    blocks.value.push(...generatedBlocks);
    showAIDialog.value = false;
    aiPrompt.value = "";
    console.log("Questions generated successfully!");
    triggerSave();
  } catch (error) {
    console.error("Failed to generate blocks:", error);
    console.error("Failed to generate questions. Please try again.");
  } finally {
    isGenerating.value = false;
  }
};

const handleBack = () => {
  if (isSaving.value) {
    console.log("Saving changes before leaving...");
    setTimeout(() => {
      router.push({ name: "forms" });
    }, 1000);
  } else {
    router.push({ name: "forms" });
  }
};

const handleConfigComplete = (config: FormConfig) => {
  formConfig.value = config;
  showConfigWizard.value = false;
  // Apply configuration to form settings
  console.log("Form configuration applied:", config);
  // Focus first block after config
  setTimeout(() => {
    if (blocks.value.length > 0) {
      focusedBlockId.value = blocks.value[0].id;
    }
  }, 100);
};

const handleConfigSkip = () => {
  showConfigWizard.value = false;
  // Focus first block after skip
  setTimeout(() => {
    if (blocks.value.length > 0) {
      focusedBlockId.value = blocks.value[0].id;
    }
  }, 100);
};

const handleSettings = () => {
  showConfigWizard.value = true;
};

const handlePreview = async () => {
  if (!formId.value) return;
  
  // Save before preview
  await saveForm();
  
  // Get the form to get its slug
  const form = await formStore.fetchForm(formId.value);
  if (form?.slug) {
    window.open(`/f/${form.slug}`, '_blank');
  } else {
    console.error("Form slug not found");
  }
};

const handlePublish = async () => {
  if (!formId.value || blocks.value.length === 0) return;
  
  isPublishing.value = true;
  try {
    await saveForm();
    // TODO: Add publish API call
    console.log("Form published successfully!");
  } catch (error) {
    console.error("Failed to publish form:", error);
    console.error("Failed to publish form");
  } finally {
    isPublishing.value = false;
  }
};

// Load form data
onMounted(async () => {
  if (formId.value) {
    const form = await formStore.fetchForm(formId.value);
    if (form) {
      formTitle.value = form.title || "";
      
      // Check if this is a new form (no questions yet)
      isNewForm.value = !form.questions || form.questions.length === 0;
      
      if (isNewForm.value) {
        // Show configuration wizard for new forms
        showConfigWizard.value = true;
      }
      
      // Convert all pages and questions to blocks
      const allBlocks: FormBlock[] = [];
      
      if (form.pages && form.pages.length > 0) {
        // Sort pages by position
        const sortedPages = [...form.pages].sort((a, b) => a.position - b.position);
        
        sortedPages.forEach((page, pageIndex) => {
          // Add page description as first block if exists
          if (pageIndex === 0 && page.description) {
            formDescription.value = page.description;
          }
          
          // Get questions for this page
          const pageQuestions = form.questions?.filter(q => q.page_id === page.id) || [];
          const sortedQuestions = [...pageQuestions].sort((a, b) => {
            const posA = (a as any).position || 0;
            const posB = (b as any).position || 0;
            return posA - posB;
          });
          
          // Convert questions to blocks
          sortedQuestions.forEach(q => {
            allBlocks.push({
              id: q.id,
              type: q.type as any,
              category: q.category as any,
              question: q.question || "",
              description: q.description,
              placeholder: q.placeholder,
              required: q.required || false,
              options: (q as any).options?.map((opt: any) => 
                typeof opt === "string" ? opt : opt.label || opt.value
              ),
            });
          });
          
          // Add page break block after each page except the last
          if (pageIndex < sortedPages.length - 1) {
            allBlocks.push({
              id: `pagebreak-${page.id}`,
              type: "pagebreak" as any,
              category: "text" as any,
              question: `Page ${pageIndex + 2}`,
              description: page.title || `Page ${pageIndex + 2}`,
              required: false,
            });
          }
        });
      }
      
      blocks.value = allBlocks;
      
      // Auto-focus first block after loading
      setTimeout(() => {
        if (!isNewForm.value && blocks.value.length > 0) {
          focusedBlockId.value = blocks.value[0].id;
        }
      }, 300);
    }
  }
});

onBeforeUnmount(() => {
  if (saveTimeout) clearTimeout(saveTimeout);
});
</script>

<style scoped>
.block-list-move,
.block-list-enter-active,
.block-list-leave-active {
  transition: all 0.3s ease;
}

.block-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.block-list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.block-list-leave-active {
  position: absolute;
}
</style>
