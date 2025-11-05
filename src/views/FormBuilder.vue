<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch, reactive, type CSSProperties } from "vue";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import { useFormStore } from "@/store/forms";
import { useFormEditorStore } from "@/store/formEditor";
import { useFormSettingsStore } from "@/store/formSettings";
import { useFormPlayerStore } from "@/store/formPlayer";
import { useFormAutosave } from "./../composables/useFormAutosave";
import { toast } from "@/composables/useToast";
import { publishForm } from "@/services/forms";
import type { FormPaymentMode, FormPaymentSettings } from "@/types";
import ImagePicker from "@/components/ImagePicker.vue";
import WebhooksPanel from "@/components/forms/WebhooksPanel.vue";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Copy, Trash2, MoreVertical } from "lucide-vue-next";
import BlockEditorWrapper from "@/components/forms/blocks/BlockEditorWrapper.vue";

const route = useRoute();
const router = useRouter();
const formStore = useFormStore();
const editorStore = useFormEditorStore();
const settingsStore = useFormSettingsStore();
const playerStore = useFormPlayerStore();

const isHydrated = ref(false);
const autosave = useFormAutosave();
const selectedPageId = ref<string | null>(null);
const selectedQuestionId = ref<string | null>(null);
const dragState = reactive({
  kind: null as null | "page" | "question",
  fromIndex: -1,
  pageId: null as string | null,
  questionId: null as string | null,
  overIndex: -1,
  questionOverIndex: -1,
});
const inspectorTab = ref<"inspector" | "logic" | "design" | "payments">("inspector");
const showImagePicker = ref(false);

const gradientPresets = [
  ["#2563EB", "#9333EA"],
  ["#0EA5E9", "#6366F1"],
  ["#F97316", "#F43F5E"],
  ["#22C55E", "#0EA5E9"],
] as const;

const applyGradientPreset = (preset: readonly [string, string]) => {
  setHeaderGradientValue("color", preset[0], 0);
  setHeaderGradientValue("color", preset[1], 1);
};

const pages = computed(() => editorStore.orderedPages);
const questionsByPage = (pageId: string) => editorStore.questionsByPage(pageId);
const activePageId = computed(() => selectedPageId.value ?? pages.value[0]?.id ?? null);
const activeQuestionId = computed(() => selectedQuestionId.value);
const activeQuestion = computed(() => {
  const id = activeQuestionId.value;
  if (!id) return null as any;
  const found = orderedQuestions.value.find((it) => it?.question?.id === id);
  return (found?.question ?? null) as any;
});
const isSettingsView = computed(() => route.name === "form-settings");
const headerSettings = computed(() => settingsStore.state.header);
const typographySettings = computed(() => settingsStore.state.typography);
const themeSettings = computed(() => settingsStore.state.theme);
const orderedQuestions = computed(() => editorStore.orderedQuestions);
const logicDiagnostics = computed(() => editorStore.logicDiagnostics);
const inspectorTitle = computed(() => {
  if (isSettingsView.value) return "Form settings";
  if (inspectorTab.value === "logic") return "Logic";
  if (inspectorTab.value === "design") return "Design";
  if (inspectorTab.value === "payments") return "Payments";
  return "Inspector";
});
const lastLogicMessage = computed(() => playerStore.state.lastLogicMessage);
const lastLogicRuleId = computed(() => playerStore.state.lastLogicRuleId);

const fontOptions = ["Inter", "Work Sans", "Poppins", "Roboto", "Lora", "Merriweather"] as const;
const buttonStyleOptions = ["solid", "outline", "ghost"] as const;

const hexToRgba = (hex: string, alpha = 1) => {
  const sanitized = hex.replace(/^#/, "");
  if (![3, 6].includes(sanitized.length)) {
    return hex;
  }
  const full = sanitized.length === 3 ? sanitized.split("").map((char) => char + char).join("") : sanitized;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const withAlpha = (color: string, alpha: number) => {
  if (color.startsWith("#")) {
    return hexToRgba(color, alpha);
  }
  return color;
};

const themeCssVars = computed<CSSProperties>(() => {
  const typography = typographySettings.value;
  const theme = themeSettings.value;
  return {
    "--builder-primary": theme.primary_color ?? "#2563EB",
    "--builder-secondary": theme.secondary_color ?? "#1E293B",
    "--builder-accent": theme.accent_color ?? "#D946EF",
    "--builder-bg": theme.background_color ?? "#F8FAFC",
    "--builder-background": theme.background_color ?? "#F8FAFC",
    "--builder-border-radius": theme.border_radius ?? "0.75rem",
    "--builder-heading-font": `'${typography.heading_font_family ?? "Inter"}', sans-serif`,
    "--builder-heading-weight": typography.heading_font_weight ?? "600",
    "--builder-body-font": `'${typography.body_font_family ?? "Inter"}', sans-serif`,
    "--builder-body-weight": typography.body_font_weight ?? "400",
    "--builder-line-height": String(typography.line_height ?? 1.6),
    "--builder-letter-spacing": `${typography.letter_spacing ?? 0}px`,
  } satisfies CSSProperties;
});

const headerBackgroundStyle = computed<CSSProperties>(() => {
  const header = headerSettings.value;
  const background = header.background;
  if (!background) return {};
  if (background.type === "solid") {
    return {
      backgroundColor: background.color ?? "#0F172A",
    } satisfies CSSProperties;
  }
  if (background.type === "gradient") {
    const angle = background.angle ?? 135;
    const start = background.colors?.[0] ?? "#2563EB";
    const end = background.colors?.[1] ?? "#9333EA";
    return {
      backgroundImage: `linear-gradient(${angle}deg, ${start}, ${end})`,
    } satisfies CSSProperties;
  }
  return {
    backgroundImage: background.url ? `url(${background.url})` : undefined,
    backgroundSize: background.fit ?? "cover",
    backgroundPosition: background.position ?? "center",
    backgroundColor: "#0F172A",
  } satisfies CSSProperties;
});

const headerOverlayStyle = computed<CSSProperties>(() => ({
  background: headerSettings.value.overlay_color ?? "rgba(15, 23, 42, 0.45)",
  opacity: headerSettings.value.enabled ? 1 : 0.55,
} satisfies CSSProperties));

const previewButtonStyle = computed<CSSProperties>(() => {
  const theme = themeSettings.value;
  const primary = theme.primary_color ?? "#2563EB";
  const style = theme.button_style ?? "solid";
  if (style === "outline") {
    return {
      backgroundColor: "transparent",
      color: primary,
      border: `1px solid ${primary}`,
    } satisfies CSSProperties;
  }
  if (style === "ghost") {
    return {
      backgroundColor: withAlpha(primary, 0.12),
      color: primary,
      border: `1px solid ${withAlpha(primary, 0.2)}`,
    } satisfies CSSProperties;
  }
  return {
    backgroundColor: primary,
    color: "#ffffff",
    border: "none",
  } satisfies CSSProperties;
});

const selectPage = (pageId: string) => {
  selectedPageId.value = pageId;
  if (questionsByPage(pageId).length) {
    selectedQuestionId.value = questionsByPage(pageId)[0]?.id ?? null;
  } else {
    selectedQuestionId.value = null;
  }
};

const selectQuestion = (questionId: string) => {
  selectedQuestionId.value = questionId;
};

const addPage = () => {
  const page = editorStore.createPage();
  selectPage(page.id);
  toast.success("Page added");
};

const addQuestion = (pageId: string) => {
  const question = editorStore.createQuestion(pageId, {
    type: "short",
    category: "text",
  });
  if (question) {
    selectPage(pageId);
    selectQuestion(question.id);
    toast.success("Question added");
  }
};

const movePage = (pageId: string, direction: "up" | "down") => {
  editorStore.movePage(pageId, direction);
};

const moveQuestion = (pageId: string, questionId: string, direction: "up" | "down") => {
  editorStore.moveQuestion(pageId, questionId, direction);
};

const duplicatePageItem = (pageId: string) => {
  if (isSettingsView.value) return;
  const copy = editorStore.duplicatePage(pageId);
  if (copy) {
    selectPage(copy.id);
    toast.success("Page duplicated");
  } else {
    toast.error("Unable to duplicate page");
  }
};

const duplicateQuestionItem = (pageId: string, questionId: string, insertIndex: number) => {
  if (isSettingsView.value) return;
  const copy = editorStore.duplicateQuestion(pageId, questionId, pageId, insertIndex + 1);
  if (copy) {
    selectPage(pageId);
    selectQuestion(copy.id);
    toast.success("Question duplicated");
  } else {
    toast.error("Unable to duplicate question");
  }
};

const deleteQuestionItem = (pageId: string, questionId: string) => {
  if (isSettingsView.value) return;
  const questions = [...questionsByPage(pageId)];
  const removedIndex = questions.findIndex((question) => question?.id === questionId);
  editorStore.removeQuestion(questionId);
  const remaining = questionsByPage(pageId);
  const next = remaining[removedIndex] ?? remaining[removedIndex - 1] ?? remaining[0] ?? null;
  if (next) {
    selectQuestion(next.id);
  } else {
    selectedQuestionId.value = null;
  }
  toast.success("Question removed");
};

const openInspectorTab = (tab: "inspector" | "logic" | "design" | "payments") => {
  if (tab === "logic" && isSettingsView.value) return;
  if (tab === "design" && isSettingsView.value) return;
  inspectorTab.value = tab;
};

const openDesignTab = () => {
  if (isSettingsView.value) return;
  inspectorTab.value = "design";
};

const openPaymentsTab = () => {
  inspectorTab.value = "payments";
};

const setHeaderEnabled = (enabled: boolean) => {
  settingsStore.updateHeader({ enabled });
};

const setHeaderBackgroundType = (type: "solid" | "gradient" | "image") => {
  const current = headerSettings.value.background;
  if (type === "solid") {
    settingsStore.updateHeader({ background: { type: "solid", color: "color" in current ? current.color ?? "#2563EB" : "#2563EB" } });
    return;
  }
  if (type === "gradient") {
    settingsStore.updateHeader({
      background: {
        type: "gradient",
        angle: current.type === "gradient" ? current.angle ?? 135 : 135,
        colors: current.type === "gradient" ? current.colors ?? ["#2563EB", "#9333EA"] : ["#2563EB", "#9333EA"],
      },
    });
    return;
  }
  settingsStore.updateHeader({
    background: {
      type: "image",
      url: current.type === "image" ? current.url ?? "" : "",
      position: current.type === "image" ? current.position : "center",
      fit: current.type === "image" ? current.fit ?? "cover" : "cover",
    },
  });
};

const setHeaderSolidColor = (color: string) => {
  if (headerSettings.value.background?.type !== "solid") return;
  settingsStore.updateHeader({
    background: {
      ...headerSettings.value.background,
      color,
    },
  });
};

const setHeaderGradientValue = (key: "angle" | "color", value: number | string, colorIndex = 0) => {
  const background = headerSettings.value.background;
  if (!background || background.type !== "gradient") return;
  if (key === "angle" && typeof value === "number") {
    settingsStore.updateHeader({
      background: {
        ...background,
        angle: Math.min(Math.max(value, 0), 360),
      },
    });
    return;
  }

  if (key === "color" && typeof value === "string") {
    const colors = [...background.colors];
    colors[colorIndex] = value;
    settingsStore.updateHeader({
      background: {
        ...background,
        colors,
      },
    });
  }
};

const setHeaderOverlayColor = (overlay: string) => {
  settingsStore.updateHeader({ overlay_color: overlay });
};

const updateTypographyValue = <K extends keyof typeof typographySettings.value>(
  key: K,
  value: typeof typographySettings.value[K],
) => {
  settingsStore.updateTypography({
    [key]: value,
  } as Partial<typeof typographySettings.value>);
};

const updateThemeValue = <K extends keyof typeof themeSettings.value>(
  key: K,
  value: typeof themeSettings.value[K],
) => {
  settingsStore.updateTheme({
    [key]: value,
  } as Partial<typeof themeSettings.value>);
};

const chooseHeaderImage = () => {
  showImagePicker.value = true;
};

const handleHeaderImageSelect = (url: string) => {
  showImagePicker.value = false;
  settingsStore.updateHeader({
    background: {
      type: "image",
      url,
      position: headerSettings.value.background.type === "image" ? headerSettings.value.background.position : "center",
      fit: headerSettings.value.background.type === "image" ? headerSettings.value.background.fit ?? "cover" : "cover",
    },
  });
  toast.success("Header image updated");
};

const closeHeaderImagePicker = () => {
  showImagePicker.value = false;
};

const togglePayments = (enabled: boolean) => {
  settingsStore.setPaymentEnabled(enabled);
  if (!enabled) {
    inspectorTab.value = inspectorTab.value === "payments" ? "inspector" : inspectorTab.value;
  }
};

const clampAmount = (value: number) => {
  if (Number.isNaN(value) || value < 0) return 0;
  if (value > 100) return 100;
  return value;
};

const updatePaymentAmount = (rawValue: string) => {
  const dollars = clampAmount(parseFloat(rawValue));
  settingsStore.updatePayment({ amount_cents: Math.round(dollars * 100) });
};

const updatePaymentValue = <K extends keyof FormPaymentSettings>(
  key: K,
  value: FormPaymentSettings[K],
) => {
  settingsStore.updatePayment({ [key]: value } as Partial<FormPaymentSettings>);
};

const demandFreshValidation = () => {
  paymentErrors.value = validatePaymentSettings(paymentSettings.value);
  return paymentErrors.value.length === 0;
};

const handlePublish = async () => {
  if (!formId.value) return;
  const canPublish = demandFreshValidation();
  if (!canPublish) {
    inspectorTab.value = "payments";
    toast.error("Resolve payment issues before publishing.");
    return;
  }

  if (editorStore.state.dirty || settingsStore.state.dirty) {
    toast.info("Saving changes before publishing…");
    await flushAutosave();
  }

  try {
    isPublishing.value = true;
    const response = await publishForm(formId.value);
    editorStore.setForm(response);
    settingsStore.hydrateFromDefinition(response);
    toast.success("Form published successfully");
  } catch (error: any) {
    toast.error(error?.data?.message ?? "Failed to publish form");
  } finally {
    isPublishing.value = false;
  }
};

const logicRulesForQuestion = (questionId: string) =>
  editorStore.logicRulesForOwner(questionId, "question");

const addLogicRule = (questionId: string) => {
  if (!questionId) return;
  const rule = editorStore.createLogicRule({ ownerId: questionId, scope: "question" });
  editorStore.updateLogicRule(rule.id, {
    conditions: [
      {
        question_id: questionId,
        operator: "equals",
        value: true,
      },
    ],
    actions: [
      {
        type: "jump_to_question",
        target_id: questionId,
      },
    ],
  });
  toast.success("Logic rule created");
};

const toggleLogicType = (ruleId: string) => {
  const rule = editorStore.state.logicRules.byId[ruleId];
  if (!rule) return;
  const nextType = rule.logic_type === "AND" ? "OR" : "AND";
  editorStore.updateLogicRule(ruleId, { logic_type: nextType });
};

const removeLogicRule = (ruleId: string) => {
  editorStore.removeLogicRule(ruleId);
  toast.success("Logic rule removed");
};

watch(isSettingsView, (value) => {
  if (value) {
    inspectorTab.value = "inspector";
  }
});

const beginPageDrag = (event: DragEvent, index: number) => {
  if (isSettingsView.value) return;
  dragState.kind = "page";
  dragState.fromIndex = index;
  dragState.pageId = pages.value[index]?.id ?? null;
  dragState.overIndex = index;
  if (event.dataTransfer) {
    event.dataTransfer.setData("text/plain", "page");
    event.dataTransfer.setData("application/x-builder", "page");
    event.dataTransfer.effectAllowed = "move";
    const dragImage = createDragImage(pages.value[index]?.title ?? "Page");
    event.dataTransfer.setDragImage(dragImage, 0, 0);
  }
};

const completePageDrop = (event: DragEvent, index: number) => {
  event.preventDefault();
  if (dragState.kind !== "page" || dragState.fromIndex === -1) return;
  const targetIndex = dragState.overIndex !== -1 ? dragState.overIndex : index;
  const clampedIndex = clamp(targetIndex, 0, pages.value.length - 1);
  editorStore.reorderPages(dragState.fromIndex, clampedIndex);
  selectedPageId.value = dragState.pageId;
  resetDragState();
};

const hoverPage = (index: number) => {
  if (dragState.kind === "page") {
    dragState.overIndex = index;
  }
};

const hoverQuestion = (index: number) => {
  if (dragState.kind === "question") {
    dragState.questionOverIndex = index;
  }
};

const beginQuestionDrag = (event: DragEvent, pageId: string, index: number) => {
  if (isSettingsView.value) return;
  const question = questionsByPage(pageId)[index];
  dragState.kind = "question";
  dragState.pageId = pageId;
  dragState.fromIndex = index;
  dragState.questionId = question?.id ?? null;
  dragState.questionOverIndex = index;
  const label = question?.question ?? "Question";
  if (event.dataTransfer) {
    event.dataTransfer.setData("text/plain", label);
    event.dataTransfer.setData("application/x-builder", `question:${pageId}`);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setDragImage(createDragImage(label), 0, 0);
  }
};

const completeQuestionDrop = (event: DragEvent, pageId: string, index: number) => {
  event.preventDefault();
  if (dragState.kind !== "question" || dragState.pageId !== pageId || dragState.fromIndex === -1) {
    resetDragState();
    return;
  }
  const questions = questionsByPage(pageId);
  const targetIndex =
    dragState.questionOverIndex !== -1 ? dragState.questionOverIndex : index;
  const clampedIndex = clamp(targetIndex, 0, Math.max(questions.length - 1, 0));
  editorStore.reorderQuestions(pageId, dragState.fromIndex, clampedIndex);
  if (dragState.questionId) {
    selectedQuestionId.value = dragState.questionId;
  }
  resetDragState();
};

const resetDragState = () => {
  dragState.kind = null;
  dragState.fromIndex = -1;
  dragState.pageId = null;
  dragState.questionId = null;
  dragState.overIndex = -1;
  dragState.questionOverIndex = -1;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const createDragImage = (label: string) => {
  const el = document.createElement("div");
  el.textContent = label;
  el.style.position = "absolute";
  el.style.pointerEvents = "none";
  el.style.background = "rgba(37, 99, 235, 0.9)";
  el.style.color = "white";
  el.style.padding = "4px 8px";
  el.style.borderRadius = "6px";
  el.style.fontSize = "12px";
  document.body.appendChild(el);
  setTimeout(() => document.body.removeChild(el), 0);
  return el;
};

const pageDisplayName = (index: number, title?: string) => title || `Page ${index + 1}`;

const questionDisplayName = (questionIndex: number, questionType: string, title?: string) => {
  if (title) return title;
  const formatted = questionType.charAt(0).toUpperCase() + questionType.slice(1);
  return `${formatted} question ${questionIndex + 1}`;
};

const formId = computed(() => (route.params.id as string) ?? "");

const isDirty = computed(() => editorStore.state.dirty || settingsStore.state.dirty);
const isSaving = computed(() => autosave.isSaving.value);
const lastSavedAt = computed(() => autosave.lastSavedAt.value);
const lastError = computed(() => autosave.lastError.value);
const paymentSettings = computed(() => settingsStore.state.payment);
const paymentErrors = ref<string[]>([]);

const validatePaymentSettings = (payment: FormPaymentSettings) => {
  if (!payment.enabled) return [];
  const errors: string[] = [];
  if (payment.amount_cents <= 0) {
    errors.push("Payment amount must be greater than zero.");
  }
  if (payment.amount_cents > 10000) {
    errors.push("Payment amount cannot exceed $100.00.");
  }
  if (!payment.currency) {
    errors.push("Select a currency.");
  }
  if (payment.mode === "custom") {
    if (!payment.stripe_publishable_key?.trim()) {
      errors.push("Stripe publishable key is required for custom mode.");
    }
    if (!payment.stripe_account_id?.trim()) {
      errors.push("Stripe account ID is required for custom mode.");
    }
  }
  return errors;
};

watch(
  paymentSettings,
  () => {
    paymentErrors.value = validatePaymentSettings(paymentSettings.value);
  },
  { deep: true, immediate: true },
);

const publishBlocked = computed(() => paymentErrors.value.length > 0);
const isPublishing = ref(false);

const handleQuestionsUpdate = (questions: any[]) => {
  if (!activePageId.value) return;
  
  // Remove all existing questions for this page
  const existingQuestions = questionsByPage(activePageId.value);
  existingQuestions.forEach((q) => {
    editorStore.removeQuestion(q.id);
  });
  
  // Add updated questions
  questions.forEach((question, index) => {
    editorStore.createQuestion(activePageId.value!, {
      ...question,
      page_id: activePageId.value,
      position: index,
    });
  });
};

const handleTitleUpdate = (title: string) => {
  editorStore.state.metadata.title = title;
  editorStore.state.dirty = true;
};

const handleDescriptionUpdate = (description: string) => {
  // Store description in page metadata for now
  if (activePageId.value) {
    const page = editorStore.state.pages.byId[activePageId.value];
    if (page) {
      page.description = description;
      editorStore.state.dirty = true;
    }
  }
};

const hydrate = async () => {
  if (!formId.value) return;
  autosave.toggleAutosave(false);
  const definition = await formStore.fetchForm(formId.value);
  if (!definition) {
    toast.error("Failed to load form.");
    router.replace({ name: "forms" });
    return;
  }

  editorStore.setForm(definition);
  settingsStore.hydrateFromDefinition(definition);
  playerStore.setFormDefinition(definition, definition.slug ?? "");
  
  // Auto-select first page
  const firstPageId = definition.pages?.[0]?.id ?? null;
  selectedPageId.value = firstPageId;
  selectedQuestionId.value = definition.pages?.[0]?.question_order?.[0] ?? null;
  
  isHydrated.value = true;
  autosave.prime();
  autosave.toggleAutosave(true);
};

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!isDirty.value) return;
  event.preventDefault();
  event.returnValue = "";
};

const flushAutosave = async () => {
  await autosave.flush();
  toast.success("All changes saved");
};

onMounted(async () => {
  await hydrate();
  window.addEventListener("beforeunload", handleBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  autosave.stopWatching();
});

onBeforeRouteLeave((_to, _from, next) => {
  if (!isDirty.value) {
    next();
    return;
  }
  const confirmed = window.confirm(
    "You have unsaved changes. Are you sure you want to leave without saving?",
  );
  if (confirmed) {
    next();
  } else {
    next(false);
  }
});

watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      isHydrated.value = false;
      await hydrate();
    }
  },
);
</script>

<template>
  <div class="builder text-slate-900 dark:text-slate-100" v-if="isHydrated" :style="themeCssVars">
    <header class="builder__topbar bg-white/60 border-b border-slate-200 backdrop-blur-lg dark:bg-slate-900/80 dark:border-slate-700">
      <div class="builder__title">
        <h1>{{ editorStore.state.metadata.title }}</h1>
        <span v-if="lastSavedAt" class="builder__timestamp">Saved {{ new Date(lastSavedAt).toLocaleTimeString() }}</span>
        <span v-else class="builder__timestamp">Unsaved changes</span>
      </div>
      <div class="builder__actions">
        <span v-if="isSaving" class="builder__indicator builder__indicator--saving text-primary-600 dark:text-primary-400">Saving…</span>
        <span v-else-if="lastError" class="builder__indicator builder__indicator--error text-red-600 dark:text-red-400">{{ lastError }}</span>
        <button class="builder__button border border-gray-200 bg-white text-slate-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-slate-100 dark:hover:bg-gray-700" type="button" @click="flushAutosave">Save now</button>
        <button
          class="builder__button builder__button--primary text-white dark:text-white dark:shadow-primary-900/30"
          type="button"
          :disabled="publishBlocked || isPublishing"
          @click="handlePublish"
        >
          {{ isPublishing ? "Publishing…" : publishBlocked ? "Resolve issues" : "Publish" }}
        </button>
      </div>
    </header>

    <div class="builder__body">
      <aside class="builder__sidebar border border-slate-200 dark:bg-gray-900 dark:border-gray-700">
        <header class="builder__panel-header">
          <h2 class="builder__panel-title">Structure</h2>
          <button class="builder__panel-action border border-gray-200 bg-white text-slate-900 rounded-md px-2.5 py-1.5 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-slate-100 dark:hover:bg-gray-700" type="button" @click="addPage">+ Page</button>
        </header>
        <div class="builder__panel-content builder__panel-content--list">
          <ul
            class="builder__page-list"
            @dragover.prevent
            @dragenter="dragState.kind === 'page' && hoverPage(pages.length - 1)"
            @drop="!isSettingsView && completePageDrop($event, pages.length - 1)"
          >
            <li
              v-for="(page, pageIndex) in pages"
              :key="page.id"
              class="builder__page-item"
              :class="{
                'is-dragging': dragState.kind === 'page' && dragState.pageId === page.id,
                'is-drop-target': dragState.kind === 'page' && dragState.overIndex === pageIndex,
              }"
              :draggable="!isSettingsView"
              @dragstart="beginPageDrag($event, pageIndex)"
              @dragover.prevent
              @dragenter="hoverPage(pageIndex)"
              @drop="completePageDrop($event, pageIndex)"
              @dragend="resetDragState"
            >
              <button
                type="button"
                class="builder__page-button dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                :class="{
                  'builder__page-button--active': !isSettingsView && page.id === activePageId,
                  'builder__page-button--disabled': isSettingsView,
                }"
                :disabled="isSettingsView"
                @click="!isSettingsView && selectPage(page.id)"
              >
                <span class="builder__page-index">{{ pageIndex + 1 }}</span>
                <span class="builder__page-title text-slate-700 dark:text-slate-300">{{ pageDisplayName(pageIndex, page.title) }}</span>
              </button>

              <div class="builder__page-controls">
                <button
                  type="button"
                  class="builder__icon-button dark:text-slate-300 hover:dark:text-slate-100"
                  :disabled="isSettingsView"
                  @click="movePage(page.id, 'up')"
                >
                  ▲
                </button>
                <button
                  type="button"
                  class="builder__icon-button dark:text-slate-300 hover:dark:text-slate-100"
                  :disabled="isSettingsView"
                  @click="movePage(page.id, 'down')"
                >
                  ▼
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <button class="builder__icon-button dark:text-slate-300 hover:dark:text-slate-100" type="button" :disabled="isSettingsView">
                      <MoreVertical class="builder__icon" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" :side-offset="4">
                    <DropdownMenuItem @select.prevent="() => duplicatePageItem(page.id)">
                      <Copy class="builder__menu-icon" />
                      Duplicate page
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <ul
                class="builder__question-list"
                @dragover.prevent
                @dragenter="dragState.kind === 'question' && hoverQuestion(questionsByPage(page.id).length - 1)"
                @drop="!isSettingsView && completeQuestionDrop($event, page.id, questionsByPage(page.id).length - 1)"
              >
                <li
                  v-for="(question, questionIndex) in questionsByPage(page.id)"
                  :key="question?.id ?? `${page.id}-${questionIndex}`"
                  class="builder__question-item"
                  :class="{
                    'is-dragging':
                      dragState.kind === 'question' && dragState.questionId === (question?.id ?? null),
                    'is-drop-target':
                      dragState.kind === 'question' && dragState.questionOverIndex === questionIndex,
                  }"
                  :draggable="!isSettingsView"
                  @dragstart="beginQuestionDrag($event, page.id, questionIndex)"
                  @dragover.prevent
                  @dragenter="hoverQuestion(questionIndex)"
                  @drop="completeQuestionDrop($event, page.id, questionIndex)"
                  @dragend="resetDragState"
                >
                  <button
                    type="button"
                    class="builder__question-button dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                    :class="{
                      'builder__question-button--active': !isSettingsView && question?.id === activeQuestionId,
                      'builder__question-button--disabled': isSettingsView,
                    }"
                    :disabled="isSettingsView"
                    @click="!isSettingsView && question && selectQuestion(question.id)"
                  >
                    <span class="builder__question-index">Q{{ questionIndex + 1 }}</span>
                    <span class="builder__question-title text-slate-700 dark:text-slate-300">
                      {{ questionDisplayName(questionIndex, question?.type ?? "question", question?.question) }}
                    </span>
                  </button>

                  <div class="builder__question-controls">
                    <button
                      type="button"
                      class="builder__icon-button dark:text-slate-300 hover:dark:text-slate-100"
                      :disabled="!question || isSettingsView"
                      @click="question && !isSettingsView && moveQuestion(page.id, question.id, 'up')"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      class="builder__icon-button dark:text-slate-300 hover:dark:text-slate-100"
                      :disabled="!question || isSettingsView"
                      @click="question && !isSettingsView && moveQuestion(page.id, question.id, 'down')"
                    >
                      ▼
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <button class="builder__icon-button dark:text-slate-300 hover:dark:text-slate-100" type="button" :disabled="isSettingsView || !question">
                          <MoreVertical class="builder__icon" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" :side-offset="4">
                        <DropdownMenuItem
                          @select.prevent="() => question && duplicateQuestionItem(page.id, question.id, questionIndex)"
                        >
                          <Copy class="builder__menu-icon" />
                          Duplicate question
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          class="builder__menu-item--destructive"
                          @select.prevent="() => question && deleteQuestionItem(page.id, question.id)"
                        >
                          <Trash2 class="builder__menu-icon" />
                          Delete question
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              </ul>

              <button class="builder__add-question border border-dashed border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800/60" type="button" :disabled="isSettingsView" @click="!isSettingsView && addQuestion(page.id)">+ Question</button>
            </li>
          </ul>
        </div>
      </aside>

      <main class="builder__canvas dark:bg-slate-900 dark:border-slate-600">
        <div class="builder__canvas-inner dark:bg-gray-900 dark:border-gray-700 text-slate-500 dark:text-slate-400">
          <BlockEditorWrapper
            v-if="activePageId && !isSettingsView"
            :questions="questionsByPage(activePageId)"
            :title="editorStore.state.metadata.title"
            :description="editorStore.state.pages.byId[activePageId]?.description"
            @update:questions="handleQuestionsUpdate"
            @update:title="handleTitleUpdate"
            @update:description="handleDescriptionUpdate"
          />
          <div v-else class="builder__canvas-content">
            <p class="builder__placeholder text-slate-500 dark:text-slate-400">Select a page to edit questions</p>
            <div
              v-if="lastLogicRuleId"
              class="builder__logic-feedback dark:bg-primary-900/20 dark:text-primary-300"
            >
              <strong>Last logic rule:</strong>
              <span>{{ lastLogicRuleId }}</span>
              <span v-if="lastLogicMessage" class="builder__logic-feedback-message text-slate-700 dark:text-slate-300">{{ lastLogicMessage }}</span>
            </div>
          </div>
        </div>
      </main>

      <aside class="builder__inspector border border-slate-200 dark:bg-gray-900 dark:border-gray-700">
        <div class="builder__inspector-tabs">
          <button
            type="button"
            class="builder__inspector-tab dark:bg-slate-700 dark:text-slate-300"
            :class="{ 'builder__inspector-tab--active': inspectorTab === 'inspector' }"
            @click="openInspectorTab('inspector')"
          >
            Inspector
          </button>
          <button
            type="button"
            class="builder__inspector-tab dark:bg-slate-700 dark:text-slate-300"
            :class="{ 'builder__inspector-tab--active': inspectorTab === 'logic' }"
            :disabled="isSettingsView"
            @click="openInspectorTab('logic')"
          >
            Logic
          </button>
          <button
            type="button"
            class="builder__inspector-tab dark:bg-slate-700 dark:text-slate-300"
            :class="{ 'builder__inspector-tab--active': inspectorTab === 'design' }"
            :disabled="isSettingsView"
            @click="openDesignTab"
          >
            Design
          </button>
          <button
            type="button"
            class="builder__inspector-tab dark:bg-slate-700 dark:text-slate-300"
            :class="{ 'builder__inspector-tab--active': inspectorTab === 'payments' }"
            @click="openPaymentsTab"
          >
            Payments
          </button>
        </div>
        <h2 class="builder__panel-title dark:text-slate-200">{{ inspectorTitle }}</h2>
        <div class="builder__panel-content text-slate-600 dark:text-slate-300">
          <template v-if="isSettingsView || inspectorTab === 'inspector'">
            <p v-if="isSettingsView" class="builder__placeholder">Form settings controls coming soon.</p>
            <div v-else class="builder__inspector-stack">
              <p class="builder__placeholder">Contextual settings inspector.</p>
              <div v-if="activeQuestion && activeQuestion.type === 'file'" class="builder__preview">
                <p class="builder__preview-title">File question preview</p>
                <input class="builder__preview-input" type="file" disabled />
                <ul class="builder__preview-files">
                  <li>example.pdf</li>
                </ul>
              </div>
              <WebhooksPanel :formId="String(route.params.id || '')" />
            </div>
          </template>

          <template v-else-if="inspectorTab === 'logic'">
            <div v-if="orderedQuestions.length" class="logic-list">
              <section
                v-for="item in orderedQuestions"
                :key="item.question.id"
                class="logic-list__group dark:bg-slate-900 dark:border-slate-700"
              >
                <header class="logic-list__header">
                  <div>
                    <h3 class="logic-list__title dark:text-slate-200">{{ item.question.question }}</h3>
                    <p class="logic-list__subtitle text-slate-500 dark:text-slate-400">Q{{ item.pageIndex + 1 }}.{{ item.questionIndex + 1 }}</p>
                  </div>
                  <button
                    type="button"
                    class="builder__button builder__button--sm border-gray-200 bg-white text-slate-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-slate-100 dark:hover:bg-gray-700"
                    @click="addLogicRule(item.question.id)"
                  >
                    + Rule
                  </button>
                </header>

                <ul v-if="logicRulesForQuestion(item.question.id).length" class="logic-rule-list">
                  <li
                    v-for="(rule, ruleIndex) in logicRulesForQuestion(item.question.id)"
                    :key="rule.id"
                    class="logic-rule dark:bg-gray-900 dark:border-gray-700"
                  >
                    <div class="logic-rule__header">
                      <span class="logic-rule__label dark:text-slate-200">Rule {{ ruleIndex + 1 }} · {{ rule.logic_type }}</span>
                      <div class="logic-rule__badges">
                        <span v-if="logicDiagnostics[rule.id]?.length" class="logic-rule__badge logic-rule__badge--error">
                          {{ logicDiagnostics[rule.id].length }} issue{{ logicDiagnostics[rule.id].length > 1 ? "s" : "" }}
                        </span>
                        <button
                          type="button"
                          class="builder__icon-button builder__icon-button--ghost dark:text-slate-300 hover:dark:text-slate-100"
                          @click="toggleLogicType(rule.id)"
                        >
                          ↻ Type
                        </button>
                        <button
                          type="button"
                          class="builder__icon-button builder__icon-button--ghost dark:text-slate-300 hover:dark:text-slate-100"
                          @click="removeLogicRule(rule.id)"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <p class="logic-rule__meta text-slate-600 dark:text-slate-400">
                      {{ rule.conditions.length }} condition{{ rule.conditions.length === 1 ? "" : "s" }} ·
                      {{ rule.actions.length }} action{{ rule.actions.length === 1 ? "" : "s" }}
                    </p>
                  </li>
                </ul>

                <p v-else class="logic-list__empty text-slate-600 dark:text-slate-400">No rules yet. Add a rule to control flow from this question.</p>
              </section>
            </div>

            <p v-else class="builder__placeholder">Add questions to configure logic.</p>
          </template>

          <template v-else-if="inspectorTab === 'design'">
            <section class="design-section dark:bg-gray-900 dark:border-gray-700">
              <header class="design-section__header">
                <div>
                  <h3 class="design-section__title dark:text-slate-200">Header</h3>
                  <p class="design-section__subtitle text-slate-600 dark:text-slate-400">Control hero background and overlay.</p>
                </div>
                <label class="design-toggle">
                  <input
                    type="checkbox"
                    :checked="headerSettings.enabled"
                    @change="setHeaderEnabled(($event.target as HTMLInputElement).checked)"
                  />
                  <span>Enabled</span>
                </label>
              </header>

              <div class="design-grid">
                <label class="design-field">
                  <span>Background type</span>
                  <select
                    class="design-field__control dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    :value="headerSettings.background.type"
                    @change="setHeaderBackgroundType(($event.target as HTMLSelectElement).value as 'solid' | 'gradient' | 'image')"
                  >
                    <option value="solid">Solid color</option>
                    <option value="gradient">Gradient</option>
                    <option value="image">Image</option>
                  </select>
                </label>

                <template v-if="headerSettings.background.type === 'solid'">
                  <label class="design-field">
                    <span>Color</span>
                    <input
                      class="design-field__control design-field__control--color"
                      type="color"
                      :value="headerSettings.background.color"
                      @input="setHeaderSolidColor(($event.target as HTMLInputElement).value)"
                    />
                  </label>
                </template>

                <template v-else-if="headerSettings.background.type === 'gradient'">
                  <label class="design-field">
                    <span>Angle</span>
                    <input
                      class="design-field__control dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      type="number"
                      min="0"
                      max="360"
                      :value="headerSettings.background.angle ?? 135"
                      @input="setHeaderGradientValue('angle', Number(($event.target as HTMLInputElement).value))"
                    />
                  </label>
                  <label class="design-field">
                    <span>Start color</span>
                    <input
                      class="design-field__control design-field__control--color dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      type="color"
                      :value="headerSettings.background.colors?.[0] ?? '#2563EB'"
                      @input="setHeaderGradientValue('color', ($event.target as HTMLInputElement).value, 0)"
                    />
                  </label>
                  <label class="design-field">
                    <span>End color</span>
                    <input
                      class="design-field__control design-field__control--color"
                      type="color"
                      :value="headerSettings.background.colors?.[1] ?? '#9333EA'"
                      @input="setHeaderGradientValue('color', ($event.target as HTMLInputElement).value, 1)"
                    />
                  </label>
                  <div class="design-field design-field--full">
                    <span>Presets</span>
                    <div class="design-gradient-swatches">
                      <button
                        v-for="(preset, index) in gradientPresets"
                        :key="`gradient-${index}`"
                        type="button"
                        class="design-gradient-swatches__item"
                        :style="{
                          backgroundImage: `linear-gradient(135deg, ${preset[0]}, ${preset[1]})`,
                        }"
                        @click="applyGradientPreset(preset)"
                      ></button>
                    </div>
                  </div>
                </template>

                <template v-else>
                  <div class="design-field design-field--full">
                    <span>Background image</span>
                    <button class="builder__button builder__button--sm" type="button" @click="chooseHeaderImage">
                      Select image
                    </button>
                    <p class="design-field__hint" v-if="!headerSettings.background.url">
                      No image selected yet.
                    </p>
                    <p class="design-field__hint" v-else>{{ headerSettings.background.url }}</p>
                  </div>
                </template>

                <label class="design-field design-field--full">
                  <span>Overlay color</span>
                  <input
                    class="design-field__control dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    type="text"
                    placeholder="rgba(15, 23, 42, 0.55)"
                    :value="headerSettings.overlay_color ?? ''"
                    @input="setHeaderOverlayColor(($event.target as HTMLInputElement).value)"
                  />
                </label>
              </div>
            </section>

            <div class="design-preview">
              <div class="design-preview__header" :style="headerBackgroundStyle">
                <div class="design-preview__overlay" :style="headerOverlayStyle"></div>
                <div class="design-preview__content">
                  <h4>Preview title</h4>
                  <p>Engaging subtitle showcasing typography.</p>
                  <button type="button" class="design-preview__button" :style="previewButtonStyle">Primary CTA</button>
                </div>
              </div>
            </div>

            <section class="design-section dark:bg-gray-900 dark:border-gray-700">
              <header class="design-section__header">
                <div>
                  <h3 class="design-section__title dark:text-slate-200">Typography</h3>
                  <p class="design-section__subtitle text-slate-600 dark:text-slate-400">Choose fonts and adjust rhythm.</p>
                </div>
              </header>

              <div class="design-grid">
                <label class="design-field">
                  <span>Heading font</span>
                  <select
                    class="design-field__control dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    :value="typographySettings.heading_font_family"
                    @change="updateTypographyValue('heading_font_family', ($event.target as HTMLSelectElement).value)"
                  >
                    <option v-for="font in fontOptions" :key="`heading-${font}`" :value="font">
                      {{ font }}
                    </option>
                  </select>
                </label>

                <label class="design-field">
                  <span>Heading weight</span>
                  <input
                    class="design-field__control dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    type="text"
                    :value="typographySettings.heading_font_weight ?? ''"
                    placeholder="600"
                    @input="updateTypographyValue('heading_font_weight', ($event.target as HTMLInputElement).value)"
                  />
                </label>

                <label class="design-field">
                  <span>Body font</span>
                  <select
                    class="design-field__control dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    :value="typographySettings.body_font_family"
                    @change="updateTypographyValue('body_font_family', ($event.target as HTMLSelectElement).value)"
                  >
                    <option v-for="font in fontOptions" :key="`body-${font}`" :value="font">
                      {{ font }}
                    </option>
                  </select>
                </label>

                <label class="design-field">
                  <span>Body weight</span>
                  <input
                    class="design-field__control dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    type="text"
                    :value="typographySettings.body_font_weight ?? ''"
                    placeholder="400"
                    @input="updateTypographyValue('body_font_weight', ($event.target as HTMLInputElement).value)"
                  />
                </label>

                <label class="design-field">
                  <span>Line height</span>
                  <input
                    class="design-field__control dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    type="number"
                    step="0.05"
                    min="1"
                    max="3"
                    :value="typographySettings.line_height ?? 1.6"
                    @input="updateTypographyValue('line_height', Number(($event.target as HTMLInputElement).value))"
                  />
                </label>

                <label class="design-field">
                  <span>Letter spacing</span>
                  <input
                    class="design-field__control dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    type="number"
                    step="0.1"
                    min="-2"
                    max="10"
                    :value="typographySettings.letter_spacing ?? 0"
                    @input="updateTypographyValue('letter_spacing', Number(($event.target as HTMLInputElement).value))"
                  />
                </label>
              </div>
            </section>

            <section class="design-section dark:bg-gray-900 dark:border-gray-700">
              <header class="design-section__header">
                <div>
                  <h3 class="design-section__title dark:text-slate-200">Theme</h3>
                  <p class="design-section__subtitle text-slate-600 dark:text-slate-400">Update brand colors and UI details.</p>
                </div>
              </header>

              <div class="design-grid">
                <label class="design-field">
                  <span>Primary color</span>
                  <input
                    class="design-field__control design-field__control--color"
                    type="color"
                    :value="themeSettings.primary_color"
                    @input="updateThemeValue('primary_color', ($event.target as HTMLInputElement).value)"
                  />
                </label>

                <label class="design-field">
                  <span>Secondary color</span>
                  <input
                    class="design-field__control design-field__control--color"
                    type="color"
                    :value="themeSettings.secondary_color ?? '#1E293B'"
                    @input="updateThemeValue('secondary_color', ($event.target as HTMLInputElement).value)"
                  />
                </label>

                <label class="design-field">
                  <span>Accent color</span>
                  <input
                    class="design-field__control design-field__control--color"
                    type="color"
                    :value="themeSettings.accent_color ?? '#D946EF'"
                    @input="updateThemeValue('accent_color', ($event.target as HTMLInputElement).value)"
                  />
                </label>

                <label class="design-field">
                  <span>Button style</span>
                  <select
                    class="design-field__control"
                    :value="themeSettings.button_style ?? 'solid'"
                    @change="updateThemeValue('button_style', ($event.target as HTMLSelectElement).value as typeof buttonStyleOptions[number])"
                  >
                    <option v-for="style in buttonStyleOptions" :key="style" :value="style">
                      {{ style.charAt(0).toUpperCase() + style.slice(1) }}
                    </option>
                  </select>
                </label>

                <label class="design-field">
                  <span>Border radius</span>
                  <input
                    class="design-field__control"
                    type="text"
                    placeholder="0.75rem"
                    :value="themeSettings.border_radius ?? '0.75rem'"
                    @input="updateThemeValue('border_radius', ($event.target as HTMLInputElement).value)"
                  />
                </label>

                <label class="design-field design-field--full">
                  <span>Background color</span>
                  <input
                    class="design-field__control design-field__control--color"
                    type="color"
                    :value="themeSettings.background_color ?? '#FFFFFF'"
                    @input="updateThemeValue('background_color', ($event.target as HTMLInputElement).value)"
                  />
                </label>
              </div>
            </section>
          </template>

          <template v-else>
            <section class="payments-section">
              <header class="payments-section__header">
                <div>
                  <h3>Collect payments</h3>
                  <p>Enable to require respondents to pay before submitting.</p>
                </div>
                <label class="payments-toggle">
                  <input
                    type="checkbox"
                    :checked="paymentSettings.enabled"
                    @change="togglePayments(($event.target as HTMLInputElement).checked)"
                  />
                  <span>{{ paymentSettings.enabled ? "Enabled" : "Disabled" }}</span>
                </label>
              </header>

              <p v-if="paymentErrors.length" class="payments-warning text-red-600 dark:text-red-400">
                Resolve the issues below before publishing.
              </p>

              <div class="payments-grid" :class="{ 'payments-grid--disabled': !paymentSettings.enabled }">
                <label class="payments-field">
                  <span>Amount</span>
                  <div class="payments-amount">
                    <input
                      class="payments-field__control payments-field__control--amount dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      type="number"
                      min="1"
                      max="10000"
                      step="1"
                      :value="paymentSettings.amount_cents / 100"
                      :disabled="!paymentSettings.enabled"
                      @input="updatePaymentAmount(($event.target as HTMLInputElement).value)"
                    />
                    <select
                      class="payments-field__control payments-field__control--currency dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      :value="paymentSettings.currency"
                      :disabled="!paymentSettings.enabled"
                      @change="updatePaymentValue('currency', ($event.target as HTMLSelectElement).value)"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  <small class="payments-field__hint">Maximum $100.00 (or currency equivalent).</small>
                </label>

                <label class="payments-field">
                  <span>Mode</span>
                  <select
                    class="payments-field__control dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    :value="paymentSettings.mode"
                    :disabled="!paymentSettings.enabled"
                    @change="updatePaymentValue('mode', ($event.target as HTMLSelectElement).value as FormPaymentMode)"
                  >
                    <option value="platform">Use platform (5% fee)</option>
                    <option value="custom">Use my Stripe account</option>
                  </select>
                </label>

                <label class="payments-field payments-field--full" v-if="paymentSettings.mode === 'custom'">
                  <span>Stripe publishable key</span>
                  <input
                    class="payments-field__control dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    type="text"
                    placeholder="pk_live_..."
                    :value="paymentSettings.stripe_publishable_key ?? ''"
                    :disabled="!paymentSettings.enabled"
                    @input="updatePaymentValue('stripe_publishable_key', ($event.target as HTMLInputElement).value)"
                  />
                </label>

                <label class="payments-field payments-field--full" v-if="paymentSettings.mode === 'custom'">
                  <span>Stripe account ID</span>
                  <input
                    class="payments-field__control dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    type="text"
                    placeholder="acct_..."
                    :value="paymentSettings.stripe_account_id ?? ''"
                    :disabled="!paymentSettings.enabled"
                    @input="updatePaymentValue('stripe_account_id', ($event.target as HTMLInputElement).value)"
                  />
                </label>

                <label class="payments-field payments-field--full">
                  <span>Thank you message</span>
                  <textarea
                    class="payments-field__control dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows="3"
                    placeholder="Shown once payment succeeds"
                    :value="paymentSettings.thank_you_message ?? ''"
                    :disabled="!paymentSettings.enabled"
                    @input="updatePaymentValue('thank_you_message', ($event.target as HTMLTextAreaElement).value)"
                  ></textarea>
                </label>

                <label class="payments-checkbox">
                  <input
                    type="checkbox"
                    :checked="paymentSettings.require_billing_details"
                    :disabled="!paymentSettings.enabled"
                    @change="updatePaymentValue('require_billing_details', ($event.target as HTMLInputElement).checked)"
                  />
                  <span>Require billing address</span>
                </label>
              </div>

              <ul v-if="paymentErrors.length" class="payments-errors">
                <li v-for="error in paymentErrors" :key="error">{{ error }}</li>
              </ul>
            </section>
          </template>
        </div>
      </aside>
    </div>
  </div>

  <div v-else class="builder__loading">
    <span>Loading form…</span>
  </div>

  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showImagePicker" class="design-modal-backdrop" @click.self="closeHeaderImagePicker">
        <div class="design-modal">
          <header class="design-modal__header">
            <h3>Choose header image</h3>
            <button type="button" class="design-modal__close" @click="closeHeaderImagePicker">×</button>
          </header>
          <ImagePicker
            :initial-url="headerSettings.background.type === 'image' ? headerSettings.background.url : ''"
            submit-label="Select image"
            @submit="handleHeaderImageSelect"
            @cancel="closeHeaderImagePicker"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.builder__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffffd9;
  backdrop-filter: blur(12px);
}

.builder__title h1 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: #0f172a;
}

.builder__timestamp {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.25rem;
}

.builder__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.builder__indicator {
  font-size: 0.75rem;
  color: #64748b;
}

.builder__indicator--saving {
  color: #2563eb;
}

.builder__indicator--error {
  color: #dc2626;
}

.builder__button {
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: white;
  padding: 0.5rem 0.9rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  color: #0f172a;
  cursor: pointer;
  transition: background 0.12s ease;
}

.builder__button:hover {
  background: rgba(37, 99, 235, 0.08);
}

.builder__button--primary {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
  border: none;
  box-shadow: 0 8px 18px -8px rgba(37, 99, 235, 0.48);
}

.builder__button--primary:hover {
  background: linear-gradient(135deg, #1d4ed8, #4338ca);
}

.builder__body {
  display: grid;
  grid-template-columns: 320px 1fr 360px;
  gap: 1rem;
  padding: 1rem 1.5rem;
  flex: 1;
  overflow: hidden;
}

.builder__sidebar,
.builder__inspector {
  background: #ffffff;
  border-radius: 0.75rem;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 16px 40px -24px rgba(15, 23, 42, 0.45);
  display: flex;
  flex-direction: column;
}

.builder__canvas {
  background: #f8fafc;
  border-radius: 1rem;
  border: 2px dashed rgba(148, 163, 184, 0.4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: auto;
}

:deep(.dark) .builder__canvas {
  background: #0f172a;
  border-color: rgba(71, 85, 105, 0.4);
}

.builder__canvas-inner {
  width: 100%;
  min-height: 100%;
  background: white;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  color: #94a3b8;
}

:deep(.dark) .builder__canvas-inner {
  background: #1e293b;
}

.builder__canvas-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.builder__logic-feedback {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  background: rgba(37, 99, 235, 0.08);
  border-radius: 0.75rem;
  color: #1d4ed8;
  font-size: 0.8rem;
  text-align: center;
}

.builder__logic-feedback-message {
  color: #0f172a;
  font-weight: 500;
}

.builder__panel-title {
  font-size: 0.85rem;
  font-weight: 600;
  padding: 1rem 1.25rem 0.5rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  color: #1f2937;
}

.builder__panel-content {
  flex: 1;
  padding: 1rem 1.25rem;
  overflow-y: auto;
  color: #64748b;
}

.builder__inspector {
  position: relative;
}

.builder__inspector-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem 0.25rem;
}

.builder__inspector-tab {
  border: none;
  background: rgba(15, 23, 42, 0.06);
  color: #475569;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.builder__inspector-tab--active {
  background: #2563eb;
  color: #fff;
}

.builder__inspector-tab:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Dark mode overrides */
:global(.dark) .builder__sidebar,
:global(.dark) .builder__inspector {
  background: #0b1220;
  border-color: rgba(148, 163, 184, 0.15);
}

:global(.dark) .builder__canvas {
  background: #0f172a;
  border-color: rgba(148, 163, 184, 0.25);
}

:global(.dark) .builder__canvas-inner {
  background: #0b1220;
  border-color: rgba(148, 163, 184, 0.15);
}

.logic-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.logic-list__group {
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(248, 250, 252, 0.6);
}

.logic-list__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.logic-list__title {
  margin: 0;
  font-size: 0.9rem;
  color: #1f2937;
}

.logic-list__subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
}

.logic-list__empty {
  margin-top: 0.5rem;
  font-size: 0.78rem;
  color: #94a3b8;
}

.logic-rule-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.logic-rule {
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 0.6rem;
  padding: 0.6rem 0.75rem;
  background: #fff;
}

.logic-rule__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.logic-rule__label {
  font-weight: 600;
  font-size: 0.8rem;
  color: #1e293b;
}

.logic-rule__badges {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.logic-rule__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  background: rgba(148, 163, 184, 0.2);
  color: #475569;
}

.logic-rule__badge--error {
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
}

.logic-rule__meta {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: #64748b;
}

.builder__button--sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
}

.builder__icon-button--ghost {
  border: none;
  background: transparent;
  color: #475569;
  font-size: 0.8rem;
  padding: 0.2rem 0.35rem;
}

.builder__icon-button--ghost:hover {
  color: #1f2937;
}

.design-section {
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 0.75rem;
  padding: 1rem 1.1rem;
  background: rgba(255, 255, 255, 0.9);
  margin-bottom: 1rem;
  box-shadow: 0 10px 30px -25px rgba(15, 23, 42, 0.6);
}

.design-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.design-section__title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #1f2937;
}

.design-section__subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  color: #94a3b8;
}

.design-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: #475569;
}

.design-toggle input {
  width: 38px;
  height: 20px;
}

.design-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.design-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: #475569;
}

.design-field--full {
  grid-column: 1 / -1;
}

.design-field__control {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 0.6rem;
  padding: 0.5rem 0.65rem;
  font-size: 0.8rem;
  color: #0f172a;
  background: #fff;
}

.design-field__control:focus {
  outline: 2px solid rgba(37, 99, 235, 0.25);
  border-color: rgba(37, 99, 235, 0.4);
}

.design-field__control--color {
  padding: 0.2rem;
  height: 2.25rem;
}

.design-field__hint {
  margin: 0;
  font-size: 0.72rem;
  color: #94a3b8;
}

.design-gradient-swatches {
  display: flex;
  gap: 0.4rem;
}

.design-gradient-swatches__item {
  width: 40px;
  height: 24px;
  border-radius: 0.5rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
}

.design-gradient-swatches__item:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.65);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.design-preview {
  border: 1px dashed rgba(148, 163, 184, 0.35);
  border-radius: 1rem;
  overflow: hidden;
  margin-bottom: 1.25rem;
  position: relative;
}

.design-preview__header {
  position: relative;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 2rem;
  color: #fff;
}

.design-preview__overlay {
  position: absolute;
  inset: 0;
  opacity: 0.85;
  border-radius: inherit;
}

.design-preview__content {
  position: relative;
  z-index: 1;
  text-align: center;
  font-family: var(--builder-heading-font, "Inter"), sans-serif;
  min-width: 220px;
}

.design-preview__content h4 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: var(--builder-heading-weight, 600);
}

.design-preview__content p {
  margin: 0.6rem 0 1rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
  font-family: var(--builder-body-font, "Inter"), sans-serif;
  font-weight: var(--builder-body-weight, 400);
  line-height: var(--builder-line-height, 1.6);
  letter-spacing: var(--builder-letter-spacing, 0px);
}

.design-preview__button {
  border-radius: var(--builder-border-radius, 0.75rem);
  padding: 0.55rem 1.6rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.design-preview__button:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 25px -18px rgba(15, 23, 42, 0.6);
}

.payments-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.payments-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.payments-section__header h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1f2937;
}

.payments-section__header p {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: #64748b;
}

.payments-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #475569;
}

.payments-toggle input {
  width: 40px;
  height: 20px;
}

.payments-warning {
  margin: 0;
  padding: 0.6rem 0.75rem;
  background: rgba(220, 38, 38, 0.08);
  color: #b91c1c;
  border-radius: 0.65rem;
  font-size: 0.78rem;
}

.payments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.9);
}

.payments-grid--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.payments-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #475569;
}

.payments-field--full {
  grid-column: 1 / -1;
}

.payments-field__control {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 0.65rem;
  padding: 0.5rem 0.65rem;
  font-size: 0.85rem;
  color: #0f172a;
  background: #fff;
}

.payments-field__control:focus {
  outline: 2px solid rgba(37, 99, 235, 0.18);
  border-color: rgba(37, 99, 235, 0.35);
}

.payments-field__control--amount {
  width: 100%;
  padding-right: 0.4rem;
}

.payments-amount {
  display: grid;
  grid-template-columns: 1fr 100px;
  gap: 0.45rem;
}

.payments-field__control--currency {
  padding: 0.5rem 0.45rem;
}

.payments-field__hint {
  margin: 0;
  font-size: 0.72rem;
  color: #94a3b8;
}

.payments-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: #475569;
}

.payments-checkbox input {
  width: 16px;
  height: 16px;
}

.payments-errors {
  margin: 0;
  padding-left: 1.2rem;
  font-size: 0.78rem;
  color: #b91c1c;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.design-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  z-index: 60;
}

.design-modal {
  width: min(720px, 100%);
  max-height: 90vh;
  background: #fff;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.45);
  display: flex;
  flex-direction: column;
}

.design-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.design-modal__header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.design-modal__close {
  border: none;
  background: transparent;
  font-size: 1.5rem;
  line-height: 1;
  color: #64748b;
  cursor: pointer;
}

.design-modal__close:hover {
  color: #0f172a;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.builder__placeholder {
  color: #94a3b8;
  font-size: 0.85rem;
  text-align: center;
}

.builder__loading {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: #64748b;
  background: #f8fafc;
}
</style>
