import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  AppForm,
  FormDefinition,
  FormPage,
  LogicAction,
  LogicCondition,
  LogicRule,
  Question,
} from "@/types";

interface NormalizedEntities<T> {
  byId: Record<string, T>;
  allIds: string[];
}

interface FormEditorState {
  formId: string | null;
  organizationId: string | null;
  version: number | null;
  updatedAt: string | null;
  metadata: Partial<AppForm>;
  pages: NormalizedEntities<FormPage>;
  questions: NormalizedEntities<Question>;
  logicRules: NormalizedEntities<LogicRule>;
  dirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  lastError: string | null;
}

const createEmptyEntities = <T>(): NormalizedEntities<T> => ({
  byId: {},
  allIds: [],
});

const generateId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `form_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const useFormEditorStore = defineStore("form-editor", () => {
  const state = ref<FormEditorState>({
    formId: null,
    organizationId: null,
    version: null,
    updatedAt: null,
    metadata: {},
    pages: createEmptyEntities<FormPage>(),
    questions: createEmptyEntities<Question>(),
    logicRules: createEmptyEntities<LogicRule>(),
    dirty: false,
    isSaving: false,
    lastSavedAt: null,
    lastError: null,
  });

  const orderedPages = computed(() =>
    state.value.pages.allIds
      .map((id) => state.value.pages.byId[id])
      .filter(Boolean)
      .sort((a, b) => a.position - b.position)
  );

  const orderedQuestions = computed(() => {
    const questions: {
      pageId: string;
      question: Question;
      pageIndex: number;
      questionIndex: number;
    }[] = [];
    orderedPages.value.forEach((page, pageIndex) => {
      if (!page) return;
      const pageQuestions = questionsByPage(page.id);
      pageQuestions.forEach((question, questionIndex) => {
        questions.push({ pageId: page.id, question, pageIndex, questionIndex });
      });
    });
    return questions;
  });

  const questionPositionMap = computed(() => {
    const map: Record<
      string,
      {
        pageId: string;
        pageIndex: number;
        questionIndex: number;
      }
    > = {};
    orderedQuestions.value.forEach(({ question, pageId, pageIndex, questionIndex }) => {
      map[question.id] = {
        pageId,
        pageIndex,
        questionIndex,
      };
    });
    return map;
  });

  const questionsByPage = (pageId: string) => {
    const page = state.value.pages.byId[pageId];
    if (!page) return [] as Question[];
    if (page.question_order?.length) {
      return page.question_order
        .map((id) => state.value.questions.byId[id])
        .filter((question): question is Question => Boolean(question));
    }
    return state.value.questions.allIds
      .map((id) => state.value.questions.byId[id])
      .filter((question): question is Question => question?.page_id === pageId);
  };

  const logicRulesForOwner = (ownerId: string | null, scope: LogicRule["scope"]) => {
    if (!ownerId) return [] as LogicRule[];
    return state.value.logicRules.allIds
      .map((id) => state.value.logicRules.byId[id])
      .filter((rule): rule is LogicRule => Boolean(rule))
      .filter((rule) => rule.scope === scope && rule.owner_id === ownerId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  };

  const createLogicRule = (payload: {
    ownerId: string;
    scope: LogicRule["scope"];
    logicType?: LogicRule["logic_type"];
    condition?: LogicCondition;
    action?: LogicAction;
  }): LogicRule => {
    const id = generateId();
    const rule: LogicRule = {
      id,
      scope: payload.scope,
      owner_id: payload.ownerId,
      logic_type: payload.logicType ?? "AND",
      conditions: payload.condition ? [payload.condition] : [],
      actions: payload.action ? [payload.action] : [],
      order: state.value.logicRules.allIds.length,
      metadata: {},
    };

    upsertLogicRule(rule);
    return rule;
  };

  const updateLogicRule = (ruleId: string, updates: Partial<LogicRule>) => {
    const existing = state.value.logicRules.byId[ruleId];
    if (!existing) return;
    state.value.logicRules.byId[ruleId] = {
      ...existing,
      ...updates,
      conditions: updates.conditions ?? existing.conditions,
      actions: updates.actions ?? existing.actions,
    };
    state.value.dirty = true;
  };

  const reorderLogicRules = (ownerId: string, fromIndex: number, toIndex: number) => {
    const rules = logicRulesForOwner(ownerId, "question");
    if (rules.length <= 1) return;
    const ids = rules.map((rule) => rule.id);
    if (fromIndex < 0 || fromIndex >= ids.length || toIndex < 0 || toIndex >= ids.length) return;
    const [removed] = ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, removed);
    ids.forEach((id, order) => {
      const rule = state.value.logicRules.byId[id];
      if (rule) {
        rule.order = order;
      }
    });
    state.value.dirty = true;
  };

  const addLogicCondition = (ruleId: string, condition: LogicCondition) => {
    const rule = state.value.logicRules.byId[ruleId];
    if (!rule) return;
    rule.conditions = [...rule.conditions, condition];
    upsertLogicRule(rule);
  };

  const updateLogicCondition = (
    ruleId: string,
    index: number,
    updates: Partial<LogicCondition>,
  ) => {
    const rule = state.value.logicRules.byId[ruleId];
    if (!rule || !rule.conditions[index]) return;
    const updated = { ...rule.conditions[index], ...updates } as LogicCondition;
    const next = [...rule.conditions];
    next.splice(index, 1, updated);
    updateLogicRule(ruleId, { conditions: next });
  };

  const removeLogicCondition = (ruleId: string, index: number) => {
    const rule = state.value.logicRules.byId[ruleId];
    if (!rule) return;
    const next = [...rule.conditions];
    next.splice(index, 1);
    updateLogicRule(ruleId, { conditions: next });
  };

  const addLogicAction = (ruleId: string, action: LogicAction) => {
    const rule = state.value.logicRules.byId[ruleId];
    if (!rule) return;
    rule.actions = [...rule.actions, action];
    upsertLogicRule(rule);
  };

  const updateLogicAction = (ruleId: string, index: number, updates: Partial<LogicAction>) => {
    const rule = state.value.logicRules.byId[ruleId];
    if (!rule || !rule.actions[index]) return;
    const updated = { ...rule.actions[index], ...updates } as LogicAction;
    const next = [...rule.actions];
    next.splice(index, 1, updated);
    updateLogicRule(ruleId, { actions: next });
  };

  const removeLogicAction = (ruleId: string, index: number) => {
    const rule = state.value.logicRules.byId[ruleId];
    if (!rule) return;
    const next = [...rule.actions];
    next.splice(index, 1);
    updateLogicRule(ruleId, { actions: next });
  };

  const validateLogicRule = (rule: LogicRule): string[] => {
    const issues: string[] = [];
    if (!rule.owner_id) {
      issues.push("Missing rule owner");
    }

    const ownerPosition = rule.owner_id ? questionPositionMap.value[rule.owner_id] : undefined;

    rule.conditions.forEach((condition, index) => {
      if (!condition.question_id) {
        issues.push(`Condition ${index + 1} is missing a question reference`);
        return;
      }
      const position = questionPositionMap.value[condition.question_id];
      if (!position) {
        issues.push(`Condition ${index + 1} references a deleted question`);
        return;
      }
      if (rule.scope === "question" && ownerPosition) {
        if (
          position.pageIndex > ownerPosition.pageIndex ||
          (position.pageIndex === ownerPosition.pageIndex &&
            position.questionIndex >= ownerPosition.questionIndex)
        ) {
          issues.push(`Condition ${index + 1} references a question that appears after the target question`);
        }
      }
    });

    if (!rule.conditions.length) {
      issues.push("Rule must contain at least one condition");
    }

    if (!rule.actions.length) {
      issues.push("Rule must contain at least one action");
    } else {
      rule.actions.forEach((action, index) => {
        if (action.type === "jump_to_question" && action.target_id) {
          const target = questionPositionMap.value[action.target_id];
          if (!target) {
            issues.push(`Action ${index + 1} targets a missing question`);
          }
        }
        if (action.type === "jump_to_page" && action.target_id) {
          if (!state.value.pages.byId[action.target_id]) {
            issues.push(`Action ${index + 1} targets a missing page`);
          }
        }
      });
    }

    return issues;
  };

  const logicDiagnostics = computed(() => {
    const diagnostics: Record<string, string[]> = {};
    state.value.logicRules.allIds.forEach((id) => {
      const rule = state.value.logicRules.byId[id];
      if (!rule) return;
      const issues = validateLogicRule(rule);
      if (issues.length) {
        diagnostics[id] = issues;
      }
    });
    return diagnostics;
  });

  const setForm = (payload: AppForm | FormDefinition) => {
    const formDefinition: FormDefinition = "pages" in payload ? payload : (payload.form as FormDefinition);

    state.value.formId = formDefinition.id;
    state.value.organizationId = formDefinition.organization_id ?? null;
    state.value.version = formDefinition.version ?? null;
    state.value.updatedAt = (formDefinition.updated_at ?? null) as string | null;
    state.value.metadata = {
      id: (payload as AppForm).id ?? formDefinition.id,
      title: (payload as AppForm).title ?? "",
      organization_id: formDefinition.organization_id,
      layout_mode: formDefinition.layout_mode,
      status: (payload as AppForm).status,
    };

    // Reset entities
    state.value.pages = createEmptyEntities<FormPage>();
    state.value.questions = createEmptyEntities<Question>();
    state.value.logicRules = createEmptyEntities<LogicRule>();

    formDefinition.pages.forEach((page) => {
      state.value.pages.byId[page.id] = { ...page, question_order: page.question_order ?? [] };
      state.value.pages.allIds.push(page.id);
    });

    formDefinition.pages.forEach((page) => {
      const orderedIds = page.question_order ?? [];
      if (orderedIds.length) {
        orderedIds.forEach((questionId) => {
          const question = (formDefinition as FormDefinition & { questions?: Question[] }).questions?.find(
            (item) => item.id === questionId
          );
          if (question) {
            state.value.questions.byId[question.id] = question;
            if (!state.value.questions.allIds.includes(question.id)) {
              state.value.questions.allIds.push(question.id);
            }
          }
        });
      }
    });

    formDefinition.logic_rules.forEach((rule) => {
      state.value.logicRules.byId[rule.id] = rule;
      state.value.logicRules.allIds.push(rule.id);
    });

    state.value.dirty = false;
  };

  const createPage = (payload: Partial<FormPage> = {}): FormPage => {
    const id = payload.id ?? generateId();
    const position =
      payload.position ?? (state.value.pages.allIds.length ? state.value.pages.allIds.length + 1 : 1);
    const page: FormPage = {
      id,
      form_id: payload.form_id ?? state.value.formId ?? undefined,
      title: payload.title ?? "Untitled page",
      description: payload.description,
      position,
      question_order: payload.question_order ?? [],
      metadata: payload.metadata ?? {},
    };

    upsertPage(page);
    return page;
  };

  const createQuestion = (pageId: string, payload: Partial<Question> = {}): Question | null => {
    const page = state.value.pages.byId[pageId];
    if (!page) return null;

    const id = payload.id ?? generateId();
    const question: Question = {
      id,
      page_id: pageId,
      category: payload.category ?? "text",
      type: payload.type ?? "short",
      question: payload.question ?? "Untitled question",
      description: payload.description,
      placeholder: payload.placeholder,
      required: payload.required ?? false,
      help_text: payload.help_text,
      metadata: payload.metadata ?? {},
    } as Question;

    upsertQuestion(question);

    const order = page.question_order ?? [];
    if (!order.includes(id)) {
      order.push(id);
      state.value.pages.byId[pageId] = {
        ...page,
        question_order: order,
      };
    }

    return question;
  };

  const movePage = (pageId: string, direction: "up" | "down") => {
    const index = state.value.pages.allIds.indexOf(pageId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    reorderPages(index, targetIndex);
  };

  const moveQuestion = (pageId: string, questionId: string, direction: "up" | "down") => {
    const page = state.value.pages.byId[pageId];
    if (!page || !page.question_order) return;
    const index = page.question_order.indexOf(questionId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    reorderQuestions(pageId, index, targetIndex);
  };

  const reorderPages = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const ids = [...state.value.pages.allIds];
    if (fromIndex < 0 || fromIndex >= ids.length || toIndex < 0 || toIndex >= ids.length) return;

    const [removed] = ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, removed);
    state.value.pages.allIds = ids;
    state.value.pages.allIds.forEach((id, position) => {
      if (state.value.pages.byId[id]) {
        state.value.pages.byId[id].position = position + 1;
      }
    });
    state.value.dirty = true;
  };

  const reorderQuestions = (pageId: string, fromIndex: number, toIndex: number) => {
    const page = state.value.pages.byId[pageId];
    if (!page || !page.question_order) return;
    const order = [...page.question_order];
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      fromIndex >= order.length ||
      toIndex < 0 ||
      toIndex >= order.length
    ) {
      return;
    }

    const [removed] = order.splice(fromIndex, 1);
    order.splice(toIndex, 0, removed);
    state.value.pages.byId[pageId] = {
      ...page,
      question_order: order,
    };
    state.value.dirty = true;
  };

  const duplicatePage = (pageId: string): FormPage | null => {
    const original = state.value.pages.byId[pageId];
    if (!original) return null;
    const originalIndex = state.value.pages.allIds.indexOf(pageId);
    const newId = generateId();
    const copy: FormPage = {
      ...original,
      id: newId,
      title: original.title ? `${original.title} (Copy)` : "Untitled page copy",
      position: state.value.pages.allIds.length + 1,
      clone_of: original.id,
      question_order: [],
    };

    createPage(copy);

    const newIndex = state.value.pages.allIds.indexOf(newId);
    if (newIndex !== -1 && originalIndex !== -1) {
      reorderPages(newIndex, originalIndex + 1);
    }

    const questions = questionsByPage(original.id);
    questions.forEach((question) => {
      duplicateQuestion(original.id, question.id, newId);
    });

    return copy;
  };

  const duplicateQuestion = (
    pageId: string,
    questionId: string,
    targetPageId?: string,
    insertIndex?: number,
  ): Question | null => {
    const sourcePage = state.value.pages.byId[targetPageId ?? pageId];
    if (!sourcePage) return null;
    const question = state.value.questions.byId[questionId];
    if (!question) return null;

    const newId = generateId();
    const copy: Question = {
      ...question,
      id: newId,
      page_id: targetPageId ?? pageId,
      metadata: {
        ...question.metadata,
        clone_of: question.id,
      },
      question: question.question ? `${question.question} (Copy)` : "Untitled question copy",
    } as Question;

    upsertQuestion(copy);

    const order = [...(state.value.pages.byId[targetPageId ?? pageId].question_order ?? [])];
    if (!order.includes(newId)) {
      if (
        typeof insertIndex === "number" &&
        insertIndex >= 0 &&
        insertIndex <= order.length
      ) {
        order.splice(insertIndex, 0, newId);
      } else {
        order.push(newId);
      }
      state.value.pages.byId[targetPageId ?? pageId] = {
        ...state.value.pages.byId[targetPageId ?? pageId],
        question_order: order,
      };
    }

    state.value.dirty = true;
    return copy;
  };

  const upsertPage = (page: FormPage) => {
    const exists = state.value.pages.byId[page.id];
    state.value.pages.byId[page.id] = { ...page, question_order: page.question_order ?? [] };
    if (!exists) {
      state.value.pages.allIds.push(page.id);
    }
    state.value.pages.byId[page.id].position = page.position;
    state.value.dirty = true;
  };

  const upsertQuestion = (question: Question) => {
    const exists = state.value.questions.byId[question.id];
    state.value.questions.byId[question.id] = question;
    if (!exists) {
      state.value.questions.allIds.push(question.id);
    }
    state.value.dirty = true;
  };

  const removeQuestion = (questionId: string) => {
    if (!state.value.questions.byId[questionId]) return;
    const question = state.value.questions.byId[questionId];
    delete state.value.questions.byId[questionId];
    state.value.questions.allIds = state.value.questions.allIds.filter((id) => id !== questionId);
    if (question?.page_id && state.value.pages.byId[question.page_id]) {
      const page = state.value.pages.byId[question.page_id];
      state.value.pages.byId[question.page_id] = {
        ...page,
        question_order: (page.question_order ?? []).filter((id) => id !== questionId),
      };
    } else {
      // scrub from any page order arrays just in case
      state.value.pages.allIds.forEach((pageId) => {
        const page = state.value.pages.byId[pageId];
        if (page?.question_order?.includes(questionId)) {
          state.value.pages.byId[pageId] = {
            ...page,
            question_order: page.question_order.filter((id) => id !== questionId),
          };
        }
      });
    }
    state.value.dirty = true;
  };

  const upsertLogicRule = (rule: LogicRule) => {
    const exists = state.value.logicRules.byId[rule.id];
    state.value.logicRules.byId[rule.id] = rule;
    if (!exists) {
      state.value.logicRules.allIds.push(rule.id);
    }
    state.value.dirty = true;
  };

  const removeLogicRule = (logicRuleId: string) => {
    if (!state.value.logicRules.byId[logicRuleId]) return;
    delete state.value.logicRules.byId[logicRuleId];
    state.value.logicRules.allIds = state.value.logicRules.allIds.filter((id) => id !== logicRuleId);
    state.value.dirty = true;
  };

  const markSaving = (isSaving: boolean) => {
    state.value.isSaving = isSaving;
  };

  const markSaved = (timestamp: string) => {
    state.value.isSaving = false;
    state.value.dirty = false;
    state.value.lastSavedAt = timestamp;
    state.value.lastError = null;
  };

  const markError = (message: string) => {
    state.value.isSaving = false;
    state.value.lastError = message;
  };

  const reset = () => {
    state.value = {
      formId: null,
      organizationId: null,
      version: null,
      updatedAt: null,
      metadata: {},
      pages: createEmptyEntities<FormPage>(),
      questions: createEmptyEntities<Question>(),
      logicRules: createEmptyEntities<LogicRule>(),
      dirty: false,
      isSaving: false,
      lastSavedAt: null,
      lastError: null,
    };
  };

  return {
    state,
    orderedPages,
    orderedQuestions,
    questionsByPage,
    setForm,
    upsertPage,
    upsertQuestion,
    removeQuestion,
    upsertLogicRule,
    removeLogicRule,
    markSaving,
    markSaved,
    markError,
    createPage,
    createQuestion,
    movePage,
    moveQuestion,
    reorderPages,
    reorderQuestions,
    duplicatePage,
    duplicateQuestion,
    logicRulesForOwner,
    createLogicRule,
    updateLogicRule,
    reorderLogicRules,
    addLogicCondition,
    updateLogicCondition,
    removeLogicCondition,
    addLogicAction,
    updateLogicAction,
    removeLogicAction,
    logicDiagnostics,
    validateLogicRule,
    reset,
  };
});
