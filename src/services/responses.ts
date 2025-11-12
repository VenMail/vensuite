import { apiClient, withRequestOptions, type RequestOptions } from "./apiClient";
import type {
  FormDefinition,
  FormQuestion,
  FormResponse,
  FormResponseData,
  FormResponseSummary,
} from "@/types";

const PUBLIC_BASE_PATH = "/forms";

const TYPE_ALIASES: Record<string, string> = {
  dropdown: "select",
  toggle: "yesno",
  textarea: "long",
  text: "short",
  fname: "short",
  lname: "short",
  fullname: "short",
  number: "number",
};

const CATEGORY_BY_TYPE: Record<string, string> = {
  short: "text",
  long: "text",
  email: "text",
  phone: "text",
  date: "text",
  time: "text",
  radio: "choice",
  checkbox: "choices",
  select: "choice",
  rating: "rating",
  slider: "rating",
  range: "rating",
  file: "file",
  yesno: "switch",
  number: "text",
  statement: "info",
};

const normalizePublicQuestionType = (type: unknown): string => {
  if (!type || typeof type !== "string") return "short";
  const normalized = type.toLowerCase();
  return TYPE_ALIASES[normalized] ?? normalized;
};

const normalizePublicOptions = (rawOptions: unknown): any[] | undefined => {
  if (!Array.isArray(rawOptions)) return undefined;
  return rawOptions.map((option, index) => {
    if (typeof option === "string") {
      return { label: option, value: option };
    }
    if (option && typeof option === "object") {
      const record = option as Record<string, unknown>;
      const label = (record.label as string) ?? (record.value as string);
      if (label) {
        return {
          ...(record.value ? { value: String(record.value) } : {}),
          label,
        };
      }
    }
    return { label: `Option ${index + 1}`, value: `option-${index + 1}` };
  });
};

const normalizePublicQuestion = (question: any, pageId: string, fallbackIndex: number): FormQuestion => {
  const type = normalizePublicQuestionType(question?.type ?? question?.field_type);
  const id = question?.id ? String(question.id) : `${pageId}-question-${fallbackIndex}`;
  const config = (question?.config ?? {}) as Record<string, unknown>;
  const options = normalizePublicOptions(config.options ?? question?.options);
  const titleCandidate =
    question?.question ??
    question?.prompt ??
    question?.title ??
    (typeof question?.label === "string" ? question.label : undefined);

  return {
    id,
    page_id: pageId,
    type: type as any,
    category: (CATEGORY_BY_TYPE[type] ?? "text") as any,
    question: titleCandidate && typeof titleCandidate === "string" && titleCandidate.length > 0 ? titleCandidate : "Untitled question",
    description: (config.description as string) ?? (question?.description as string) ?? "",
    placeholder: (config.placeholder as string) ?? (question?.placeholder as string) ?? "",
    required: Boolean(question?.required ?? question?.is_required),
    help_text: (question?.help_text as string) ?? undefined,
    options: options as any,
    metadata: question?.metadata as any,
    visibility_condition: question?.visibility_condition ?? null,
    logic: question?.logic,
  };
};

// Ensure public form payload matches the normalized shape our players expect
const normalizePublicFormDefinition = (raw: any): FormDefinition => {
  const layoutMode = raw?.settings?.layout_mode ?? raw?.layout_mode ?? "focus";
  const pages = Array.isArray(raw?.pages) ? raw.pages : [];

  const normalizedQuestions: FormQuestion[] = [];

  const normalizedPages = pages.map((page: any, index: number) => {
    const pageId = page?.id ? String(page.id) : `page-${index + 1}`;
    const rawQuestions = Array.isArray(page?.questions) ? [...page.questions] : [];
    const sorted = rawQuestions.sort((a: any, b: any) => (a?.position ?? 0) - (b?.position ?? 0));
    const normalizedPageQuestions = sorted.map((question: any, qIdx: number) => {
      const normalized = normalizePublicQuestion(question, pageId, qIdx);
      normalizedQuestions.push(normalized);
      return normalized;
    });

    const order = Array.isArray(page?.question_order)
      ? page.question_order.map((id: any) => String(id))
      : normalizedPageQuestions.map((question) => question.id);

    return {
      id: pageId,
      form_id: raw?.id ? String(raw.id) : undefined,
      title: page?.title ?? `Page ${index + 1}`,
      description: page?.description ?? "",
      position: page?.position ?? index + 1,
      question_order: order,
      metadata: page?.metadata ?? undefined,
      questions: normalizedPageQuestions,
    };
  });

  if (Array.isArray(raw?.questions)) {
    raw.questions.forEach((question: any, index: number) => {
      const pageId = question?.page_id ? String(question.page_id) : normalizedPages[0]?.id ?? `page-${normalizedPages.length + 1 || 1}`;
      const normalized = normalizePublicQuestion(question, pageId, index);
      if (!normalizedQuestions.some((existing) => existing.id === normalized.id)) {
        normalizedQuestions.push(normalized);
      }
    });
  }

  const definition: FormDefinition = {
    id: String(raw?.id ?? ""),
    title: raw?.title ?? "Untitled Form",
    description: raw?.description ?? "",
    slug: raw?.slug ?? undefined,
    status: raw?.status ?? undefined,
    owner_id: raw?.owner_id ?? raw?.employee_id ?? undefined,
    organization_id: raw?.organization_id ? String(raw.organization_id) : undefined,
    layout_mode: layoutMode,
    settings: (raw?.settings ?? {}) as any,
    payment: raw?.payment ?? undefined,
    header: raw?.settings?.header ?? undefined,
    typography: raw?.settings?.typography ?? undefined,
    theme: raw?.settings?.theme ?? undefined,
    navigation: raw?.settings?.navigation ?? undefined,
    welcome_screen: raw?.settings?.welcome_screen ?? undefined,
    completion_screen: raw?.settings?.completion_screen ?? undefined,
    pages: normalizedPages,
    questions: normalizedQuestions,
    logic_rules: Array.isArray(raw?.logic_rules) ? raw.logic_rules : [],
    sharing: (raw?.settings?.sharing as any) ?? (raw?.share_slug ? { share_slug: raw.share_slug } : undefined),
    security: raw?.settings?.security ?? undefined,
    metadata: raw?.metadata ?? undefined,
    version: raw?.version ?? undefined,
    created_at: raw?.created_at ?? undefined,
    updated_at: raw?.updated_at ?? undefined,
  };

  return definition;
};

export interface SubmitResponsePayload {
  answers: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  captcha_token?: string;
}

export interface SubmitResponseResult {
  response: FormResponse;
  nextQuestionId?: string | null;
  nextType?: "question" | "payment" | "submit";
  requiresPayment?: boolean;
  paymentIntentId?: string | null;
}

export interface FinalizeResponsePayload {
  captcha_token?: string;
}

type CreateResponseAnswers =
  | Record<string, unknown>
  | Array<{ question_id: string | number; value: unknown; meta?: Record<string, unknown> }>;

export interface CreateResponsePayload {
  source?: string;
  meta?: Record<string, unknown>;
  answers?: CreateResponseAnswers;
  submit?: boolean;
  captcha_token?: string;
}

const unwrapFinalizeResponse = (payload: unknown): FormResponse => {
  if (!payload || typeof payload !== "object") {
    return payload as FormResponse;
  }

  const record = payload as Record<string, unknown>;
  if (record.data && typeof record.data === "object") {
    return record.data as FormResponse;
  }

  return record as unknown as FormResponse;
};

interface SubmitResponseApiResult {
  response: FormResponse;
  next_question_id?: string | null;
  nextQuestionId?: string | null;
  next?: { type?: string; id?: string | number | null } | null;
  requires_payment?: boolean;
  requiresPayment?: boolean;
  payment_required?: boolean | string;
  payment_intent_id?: string | null;
  paymentIntentId?: string | null;
}

const coerceBoolean = (value: unknown): boolean => {
  if (typeof value === "string") {
    return value === "true" || value === "1" || value.toLowerCase() === "yes";
  }
  return Boolean(value);
};

const toNumericId = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const normalizeCreateAnswers = (
  answers: CreateResponseAnswers | undefined,
): CreateResponseAnswers | undefined => {
  if (!answers) return undefined;
  if (Array.isArray(answers)) return answers;
  const entries = Object.entries(answers as Record<string, unknown>);
  return entries.map(([key, value]) => {
    const numeric = toNumericId(key);
    return { question_id: typeof numeric === "number" ? numeric : key, value } as any;
  });
};

const buildSubmitResponseResultFromRecord = (
  record: Record<string, unknown>,
): SubmitResponseApiResult => {
  const rawResponse =
    record.response && typeof record.response === "object" && !Array.isArray(record.response)
      ? { ...(record.response as Record<string, unknown>) }
      : {};

  const fallbackIdCandidates = [
    record.response_id,
    record.responseId,
    record.id,
  ];

  for (const candidate of fallbackIdCandidates) {
    const numericId = toNumericId(candidate);
    if (typeof numericId === "number" && numericId > 0 && rawResponse.id == null) {
      rawResponse.id = numericId;
      break;
    }
  }

  const statusCandidate = record.status;
  if (typeof statusCandidate === "string" && rawResponse.status == null) {
    rawResponse.status = statusCandidate;
  }

  const submittedAtCandidate = record.submitted_at ?? record.submittedAt;
  if (submittedAtCandidate != null && rawResponse.submitted_at == null) {
    rawResponse.submitted_at = submittedAtCandidate as unknown as string;
  }

  const paymentIntentField =
    record.payment_intent_id ?? record.paymentIntentId ?? record.payment_intent ?? null;
  if (paymentIntentField != null && (rawResponse as Record<string, unknown>).payment_intent_id == null) {
    (rawResponse as Record<string, unknown>).payment_intent_id = paymentIntentField;
  }

  const nextCandidate = record.nextQuestionId ?? record.next_question_id ?? null;
  const requiresPaymentCandidate =
    record.requiresPayment ?? record.requires_payment ?? record.payment_required ?? null;
  const paymentIntentCandidate =
    record.paymentIntentId ?? record.payment_intent_id ?? record.payment_intent ?? null;

  const numericRawId = toNumericId((rawResponse as Record<string, unknown>).id);
  const response: FormResponseSummary = {
    id: typeof numericRawId === "number" && numericRawId > 0 ? numericRawId : 0,
    status: (rawResponse.status as string | undefined) ?? undefined,
    submitted_at: (rawResponse.submitted_at as string | undefined) ?? undefined,
    payment_status: (rawResponse.payment_status as string | undefined) ?? undefined,
  };

  const result: SubmitResponseApiResult = {
    response: response as unknown as FormResponse,
  };

  if (record.next && typeof record.next === "object" && !Array.isArray(record.next)) {
    const next = record.next as Record<string, unknown>;
    const type = typeof next.type === "string" ? next.type : undefined;
    const idRaw = next.id as unknown;
    const id =
      typeof idRaw === "string"
        ? idRaw
        : typeof idRaw === "number"
        ? String(idRaw)
        : undefined;
    result.next = { type, id } as any;
    if (type === "question" && id) {
      result.nextQuestionId = id;
    }
  }

  if (typeof nextCandidate === "string") {
    result.nextQuestionId = nextCandidate;
  } else if (typeof nextCandidate === "number") {
    result.nextQuestionId = String(nextCandidate);
  }

  if (requiresPaymentCandidate != null) {
    result.requiresPayment = coerceBoolean(requiresPaymentCandidate);
  }

  if (paymentIntentCandidate != null) {
    result.paymentIntentId = String(paymentIntentCandidate);
  }

  return result;
};

const isSubmitResponseApiResult = (value: unknown): value is SubmitResponseApiResult => {
  return Boolean(
    value &&
      typeof value === "object" &&
      "response" in value,
  );
};

const normalizeSubmitResponseResult = (raw: SubmitResponseApiResult): SubmitResponseResult => {
  const requiresPaymentRaw =
    raw.requiresPayment ??
    raw.requires_payment ??
    raw.payment_required ??
    (raw.response as any)?.requires_payment ??
    (raw.response as any)?.requiresPayment;

  const paymentIntentRaw =
    raw.paymentIntentId ??
    raw.payment_intent_id ??
    (raw.response as any)?.payment_intent_id ??
    (raw.response as any)?.paymentIntentId ??
    null;

  let nextType: "question" | "payment" | "submit" | undefined;
  let nextQuestionId: string | null = null;
  if (raw.next && typeof raw.next === "object") {
    const typeCandidate = (raw.next as any).type;
    if (typeof typeCandidate === "string") {
      const lowered = typeCandidate.toLowerCase();
      if (lowered === "question" || lowered === "payment" || lowered === "submit") {
        nextType = lowered as typeof nextType;
      }
    }
    const idCandidate = (raw.next as any).id;
    if (nextType === "question") {
      if (typeof idCandidate === "string") nextQuestionId = idCandidate;
      else if (typeof idCandidate === "number") nextQuestionId = String(idCandidate);
    }
  }

  if (!nextQuestionId) {
    const legacyNext = raw.nextQuestionId ?? (raw as any).next_question_id ?? null;
    if (typeof legacyNext === "string") nextQuestionId = legacyNext;
    else if (typeof legacyNext === "number") nextQuestionId = String(legacyNext);
  }

  let requiresPayment = coerceBoolean(requiresPaymentRaw);
  if (nextType === "payment") {
    requiresPayment = true;
  }

  return {
    response: raw.response,
    nextQuestionId,
    nextType,
    requiresPayment,
    paymentIntentId: paymentIntentRaw ? String(paymentIntentRaw) : null,
  };
};

const unwrapSubmitResponsePayload = (payload: unknown): SubmitResponseApiResult => {
  if (!payload || typeof payload !== "object") {
    return { response: payload as FormResponse } as SubmitResponseApiResult;
  }

  const record = payload as Record<string, unknown>;
  if (isSubmitResponseApiResult(record)) {
    return record;
  }
  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    const inner = record.data as Record<string, unknown>;
    const combined: Record<string, unknown> = { ...record, ...inner };
    delete combined.data;
    return buildSubmitResponseResultFromRecord(combined);
  }

  return buildSubmitResponseResultFromRecord(record);
};

export const fetchPublicForm = async (
  slug: string,
  options?: RequestOptions,
): Promise<FormDefinition> => {
  const response = await apiClient.get(
    `${PUBLIC_BASE_PATH}/${slug}`,
    withRequestOptions(options),
  );
  return normalizePublicFormDefinition(response.data?.data);
};

export const submitResponse = async (
  slug: string,
  payload: SubmitResponsePayload,
  options?: RequestOptions,
): Promise<SubmitResponseResult> => {
  return createOrSubmitResponse(slug, { ...payload, submit: false }, options);
};

export const createOrSubmitResponse = async (
  slug: string,
  payload: CreateResponsePayload,
  options?: RequestOptions,
): Promise<SubmitResponseResult> => {
  const normalizedPayload: CreateResponsePayload = {
    ...payload,
    answers: normalizeCreateAnswers(payload.answers),
  };
  const response = await apiClient.post(
    `${PUBLIC_BASE_PATH}/${slug}/responses`,
    normalizedPayload,
    withRequestOptions(options),
  );
  const result = unwrapSubmitResponsePayload(response.data ?? {});
  return normalizeSubmitResponseResult(result);
};

export const finalizeResponseSubmission = async (
  slug: string,
  responseId: string,
  payload: FinalizeResponsePayload = {},
  options?: RequestOptions,
): Promise<FormResponse> => {
  const response = await apiClient.post(
    `${PUBLIC_BASE_PATH}/${slug}/responses/${encodeURIComponent(String(responseId))}/submit`,
    payload,
    withRequestOptions(options),
  );
  return unwrapFinalizeResponse(response.data ?? {});
};

export const updateResponseDraft = async (
  slug: string,
  responseId: string,
  payload: SubmitResponsePayload,
  options?: RequestOptions,
): Promise<SubmitResponseResult> => {
  const normalizedPayload: SubmitResponsePayload = {
    ...payload,
    answers: normalizeCreateAnswers(payload.answers) as any,
  } as any;
  const response = await apiClient.patch(
    `${PUBLIC_BASE_PATH}/${slug}/responses/${responseId}`,
    normalizedPayload,
    withRequestOptions(options),
  );
  const result = unwrapSubmitResponsePayload(response.data ?? {});
  return normalizeSubmitResponseResult(result);
};

export const fetchResponseAnalytics = async (
  formId: string,
  options?: RequestOptions,
): Promise<FormResponseData> => {
  const response = await apiClient.get(
    `/app-forms/${formId}/responses`,
    withRequestOptions(options),
  );
  return response.data as FormResponseData;
};

export interface QuestionPrefillPayload {
  form: FormDefinition;
  questions: FormQuestion[];
}

export const prefillQuestions = async (
  slug: string,
  payload: QuestionPrefillPayload,
  options?: RequestOptions,
): Promise<Record<string, unknown>> => {
  const response = await apiClient.post(
    `${PUBLIC_BASE_PATH}/${slug}/prefill`,
    payload,
    withRequestOptions(options),
  );
  return response.data?.data as Record<string, unknown>;
};
