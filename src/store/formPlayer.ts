import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type {
  FormDefinition,
  FormQuestion,
  FormLayoutMode,
  LogicRule,
} from "@/types";
import { useLogicEngine } from "@/composables/useLogicEngine";

type PlayerMode = "focus" | "classic";

type AnswerValue = string | number | boolean | string[] | File | null;

interface FormPlayerState {
  formSlug: string | null;
  formDefinition: FormDefinition | null;
  layoutMode: FormLayoutMode;
  modeOverride: PlayerMode | null;
  responseId: string | null;
  answers: Record<string, AnswerValue>;
  seenQuestionIds: string[];
  currentQuestionId: string | null;
  progress: number;
  isSubmitting: boolean;
  isLoading: boolean;
  paymentRequired: boolean;
  paymentIntentId: string | null;
  paymentStatus: "idle" | "pending" | "succeeded" | "failed";
  paymentError: string | null;
  paymentClientSecret: string | null;
  publishableKey: string | null;
  lastLogicRuleId: string | null;
  lastLogicMessage: string | null;
}

const createInitialState = (): FormPlayerState => ({
  formSlug: null,
  formDefinition: null,
  layoutMode: "auto",
  modeOverride: null,
  responseId: null,
  answers: {},
  seenQuestionIds: [],
  currentQuestionId: null,
  progress: 0,
  isSubmitting: false,
  isLoading: false,
  paymentRequired: false,
  paymentIntentId: null,
  paymentStatus: "idle",
  paymentError: null,
  paymentClientSecret: null,
  publishableKey: null,
  lastLogicRuleId: null,
  lastLogicMessage: null,
});

export const useFormPlayerStore = defineStore("form-player", () => {
  const state = ref<FormPlayerState>(createInitialState());
  const logicEngine = useLogicEngine();

  const mode = computed<PlayerMode>(() => {
    if (state.value.modeOverride) return state.value.modeOverride;
    if (state.value.layoutMode === "auto") return "focus";
    return state.value.layoutMode;
  });

  const questions = computed<FormQuestion[]>(() => {
    if (!state.value.formDefinition) return [];
    return state.value.formDefinition.questions ?? [];
  });

  const currentQuestion = computed<FormQuestion | undefined>(() => {
    if (!state.value.currentQuestionId) return undefined;
    return questions.value.find((question) => question.id === state.value.currentQuestionId);
  });

  const remainingQuestions = computed<FormQuestion[]>(() => {
    if (!state.value.currentQuestionId) return questions.value;
    const currentIndex = questions.value.findIndex((q) => q.id === state.value.currentQuestionId);
    return currentIndex === -1 ? questions.value : questions.value.slice(currentIndex + 1);
  });

  const answeredCount = computed(() => Object.keys(state.value.answers).length);

  const questionOrder = computed(() => {
    if (!state.value.formDefinition) return [] as string[];
    const ids: string[] = [];
    state.value.formDefinition.pages?.forEach((page) => {
      page.question_order?.forEach((id) => {
        if (id && !ids.includes(id)) {
          ids.push(id);
        }
      });
    });
    state.value.formDefinition.questions?.forEach((question) => {
      if (question && !ids.includes(question.id)) {
        ids.push(question.id);
      }
    });
    return ids;
  });

  const setFormDefinition = (form: FormDefinition, slug: string) => {
    state.value.formDefinition = form;
    state.value.formSlug = slug;
    state.value.layoutMode = form.layout_mode;
    state.value.seenQuestionIds = [];
    state.value.answers = {};
    const firstQuestionId = form.pages?.[0]?.question_order?.[0] ?? form.questions?.[0]?.id ?? null;
    state.value.currentQuestionId = firstQuestionId;
    state.value.progress = 0;
    state.value.paymentRequired = !!form.payment?.enabled;
    state.value.paymentIntentId = null;
    state.value.paymentClientSecret = null;
    state.value.publishableKey = form.payment?.mode === "custom" ? form.payment?.stripe_publishable_key ?? null : null;
    state.value.paymentStatus = "idle";
    state.value.paymentError = null;
  };

  const answerQuestion = (questionId: string, value: AnswerValue) => {
    state.value.answers[questionId] = value;
    if (!state.value.seenQuestionIds.includes(questionId)) {
      state.value.seenQuestionIds.push(questionId);
    }
    state.value.progress = Math.min(1, Object.keys(state.value.answers).length / Math.max(questions.value.length, 1));

    if (!state.value.formDefinition) return;

    const questionRules = state.value.formDefinition.logic_rules?.filter(
      (rule) => rule.owner_id === questionId && rule.scope === "question",
    );

    if (questionRules?.length) {
      const evaluation = logicEngine.evaluate(questionRules, {
        answers: state.value.answers,
        currentQuestionId: questionId,
        formDefinition: state.value.formDefinition,
      });

      if (evaluation) {
        state.value.lastLogicRuleId = evaluation.rule.id;
        state.value.lastLogicMessage = evaluation.message ?? null;
        if (evaluation.endedForm) {
          advanceToQuestion(null);
          return;
        }
        advanceToQuestion(evaluation.nextQuestionId);
        return;
      }
    }

    const ids = questionOrder.value;
    const currentIndex = ids.indexOf(questionId);
    const nextId = currentIndex === -1 ? ids[0] : ids[currentIndex + 1] ?? null;
    advanceToQuestion(nextId ?? null);
  };

  const advanceToQuestion = (nextQuestionId: string | null) => {
    state.value.currentQuestionId = nextQuestionId;
    state.value.lastLogicRuleId = null;
    state.value.lastLogicMessage = null;
  };

  const setAnswerValue = (questionId: string, value: AnswerValue) => {
    state.value.answers[questionId] = value;
  };

  const getAnswerValue = (questionId: string): AnswerValue => state.value.answers[questionId] ?? null;

  const markSubmitting = (submitting: boolean) => {
    state.value.isSubmitting = submitting;
  };

  const setPaymentState = (status: FormPlayerState["paymentStatus"], error: string | null = null) => {
    state.value.paymentStatus = status;
    state.value.paymentError = error;
  };

  const setPaymentIntent = (intentId: string | null) => {
    state.value.paymentIntentId = intentId;
  };

  const setPaymentClientSecret = (clientSecret: string | null) => {
    state.value.paymentClientSecret = clientSecret;
  };

  const setPublishableKey = (key: string | null) => {
    state.value.publishableKey = key;
  };

  const setPaymentRequired = (required: boolean) => {
    state.value.paymentRequired = required;
  };

  const setResponseId = (id: string) => {
    state.value.responseId = id;
  };

  const setModeOverride = (override: PlayerMode | null) => {
    state.value.modeOverride = override;
  };

  const hydrateFromServer = (
    payload: {
      form: FormDefinition;
      responseId?: string;
      answers?: Record<string, AnswerValue>;
      paymentRequired?: boolean;
      paymentIntentId?: string | null;
      paymentStatus?: FormPlayerState["paymentStatus"];
      paymentClientSecret?: string | null;
      publishableKey?: string | null;
    },
    slug: string,
  ) => {
    setFormDefinition(payload.form, slug);
    if (payload.responseId) {
      state.value.responseId = payload.responseId;
    }
    if (payload.answers) {
      state.value.answers = payload.answers;
    }
    if (payload.paymentRequired !== undefined) {
      state.value.paymentRequired = payload.paymentRequired;
    }
    if (payload.paymentIntentId !== undefined) {
      state.value.paymentIntentId = payload.paymentIntentId;
    }
    if (payload.paymentStatus) {
      state.value.paymentStatus = payload.paymentStatus;
    }
    if (payload.paymentClientSecret !== undefined) {
      state.value.paymentClientSecret = payload.paymentClientSecret;
    }
    if (payload.publishableKey !== undefined) {
      state.value.publishableKey = payload.publishableKey;
    }
    state.value.isLoading = false;
  };

  const setLoading = (loading: boolean) => {
    state.value.isLoading = loading;
  };

  const reset = () => {
    state.value = createInitialState();
  };

  const setLogicResult = (logic: LogicRule | null, nextQuestionId: string | null) => {
    // Placeholder: actual logic evaluation occurs elsewhere
    if (logic) {
      // eslint-disable-next-line no-console
      console.debug("Applied logic rule", logic.id);
    }
    advanceToQuestion(nextQuestionId);
  };

  return {
    state,
    mode,
    questions,
    currentQuestion,
    remainingQuestions,
    answeredCount,
    questionOrder,
    setFormDefinition,
    answerQuestion,
    advanceToQuestion,
    setAnswerValue,
    getAnswerValue,
    markSubmitting,
    setPaymentState,
    setPaymentIntent,
    setPaymentClientSecret,
    setPublishableKey,
    setPaymentRequired,
    setResponseId,
    setModeOverride,
    hydrateFromServer,
    setLoading,
    reset,
    setLogicResult,
  };
});
