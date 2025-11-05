import type { FormDefinition, LogicRule, LogicCondition, LogicAction } from "@/types";

interface EvaluateOptions {
  answers: Record<string, unknown>;
  currentQuestionId: string | null;
  formDefinition?: FormDefinition | null;
}

interface LogicEvaluationResult {
  rule: LogicRule;
  nextQuestionId: string | null;
  actions: LogicAction[];
  message?: string | null;
  endedForm: boolean;
}

const meetsCondition = (condition: LogicCondition, answers: Record<string, unknown>) => {
  const answer = answers[condition.question_id];
  switch (condition.operator) {
    case "equals":
      return answer === condition.value;
    case "not_equals":
      return answer !== condition.value;
    case "contains":
      if (Array.isArray(answer)) {
        return (answer as unknown[]).includes(condition.value as never);
      }
      if (typeof answer === "string" && typeof condition.value === "string") {
        return answer.includes(condition.value);
      }
      return false;
    case "not_contains":
      if (Array.isArray(answer)) {
        return !(answer as unknown[]).includes(condition.value as never);
      }
      if (typeof answer === "string" && typeof condition.value === "string") {
        return !answer.includes(condition.value);
      }
      return true;
    case "greater_than":
      return typeof answer === "number" && typeof condition.value === "number"
        ? answer > condition.value
        : false;
    case "less_than":
      return typeof answer === "number" && typeof condition.value === "number"
        ? answer < condition.value
        : false;
    case "greater_or_equal":
      return typeof answer === "number" && typeof condition.value === "number"
        ? answer >= condition.value
        : false;
    case "less_or_equal":
      return typeof answer === "number" && typeof condition.value === "number"
        ? answer <= condition.value
        : false;
    case "matches_regex":
      if (typeof answer === "string" && typeof condition.value === "string") {
        try {
          const regex = new RegExp(condition.value);
          return regex.test(answer);
        } catch (error) {
          console.warn("Invalid regex in logic condition", condition.value, error);
        }
      }
      return false;
    default:
      return false;
  }
};

const evaluateRule = (rule: LogicRule, answers: Record<string, unknown>) => {
  if (!rule.conditions.length) return false;
  if (rule.logic_type === "AND") {
    return rule.conditions.every((condition) => meetsCondition(condition, answers));
  }
  return rule.conditions.some((condition) => meetsCondition(condition, answers));
};

const buildQuestionSequence = (form?: FormDefinition | null) => {
  if (!form) return [] as string[];
  const sequence: string[] = [];
  const seen = new Set<string>();
  form.pages?.forEach((page) => {
    page.question_order?.forEach((questionId) => {
      if (questionId && !seen.has(questionId)) {
        sequence.push(questionId);
        seen.add(questionId);
      }
    });
  });

  form.questions?.forEach((question) => {
    if (question && !seen.has(question.id)) {
      sequence.push(question.id);
      seen.add(question.id);
    }
  });

  return sequence;
};

const getSequentialNextQuestionId = (
  currentQuestionId: string | null,
  sequence: string[],
): string | null => {
  if (!sequence.length) return null;
  if (!currentQuestionId) return sequence[0] ?? null;
  const currentIndex = sequence.indexOf(currentQuestionId);
  if (currentIndex === -1) return sequence[0] ?? null;
  return sequence[currentIndex + 1] ?? null;
};

const getFirstQuestionForPage = (form: FormDefinition | null | undefined, pageId: string) => {
  if (!form?.pages) return null;
  const page = form.pages.find((candidate) => candidate.id === pageId);
  if (!page) return null;
  const first = page.question_order?.[0];
  if (first) return first;
  if (form.questions) {
    const question = form.questions.find((candidate) => candidate.page_id === pageId);
    return question?.id ?? null;
  }
  return null;
};

const resolveNextQuestion = (
  rule: LogicRule,
  options: EvaluateOptions,
  sequence: string[],
): { nextQuestionId: string | null; endedForm: boolean } => {
  const fallback = getSequentialNextQuestionId(options.currentQuestionId, sequence);

  const questionJump = rule.actions.find((action) => action.type === "jump_to_question" && action.target_id);
  if (questionJump?.target_id) {
    return { nextQuestionId: questionJump.target_id, endedForm: false };
  }

  const pageJump = rule.actions.find((action) => action.type === "jump_to_page" && action.target_id);
  if (pageJump?.target_id) {
    const nextFromPage = getFirstQuestionForPage(options.formDefinition, pageJump.target_id);
    return { nextQuestionId: nextFromPage ?? fallback, endedForm: false };
  }

  if (rule.actions.some((action) => action.type === "end_form")) {
    return { nextQuestionId: null, endedForm: true };
  }

  return { nextQuestionId: fallback, endedForm: false };
};

export const useLogicEngine = () => {
  const evaluate = (
    rules: LogicRule[],
    options: EvaluateOptions,
  ): LogicEvaluationResult | null => {
    if (!rules.length) return null;

    const sequence = buildQuestionSequence(options.formDefinition);

    for (const rule of rules) {
      const matched = evaluateRule(rule, options.answers);
      if (matched) {
        const { nextQuestionId, endedForm } = resolveNextQuestion(rule, options, sequence);
        const messageAction = rule.actions.find((action) => action.type === "show_message");

        return {
          rule,
          nextQuestionId,
          actions: rule.actions,
          message: messageAction?.message ?? null,
          endedForm,
        };
      }
    }

    return null;
  };

  return {
    evaluate,
  };
};
