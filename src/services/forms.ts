import { apiClient, withRequestOptions, type RequestOptions } from "./apiClient";
import type {
  AppForm,
  FormDefinition,
  AppFormResponseDetail,
  FormResponsesPage,
  FormQuestion,
  FormResponseSummary,
  FormSharingSettings,
  FormWebhook,
} from "@/types";

const BASE_PATH = "/app-forms";

const TYPE_ALIASES: Record<string, string> = {
  dropdown: "select",
  toggle: "yesno",
  textarea: "long",
  text: "short",
  fname: "short",
  lname: "short",
  fullname: "short",
  number: "short",
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
  file: "file",
  yesno: "switch",
};

const normalizeQuestionType = (type: unknown): string => {
  if (!type || typeof type !== "string") return "short";
  const normalized = type.toLowerCase();
  return TYPE_ALIASES[normalized] ?? normalized;
};

const normalizeOptions = (rawOptions: unknown): string[] | undefined => {
  if (!Array.isArray(rawOptions)) return undefined;
  return rawOptions.map((option, index) => {
    if (typeof option === "string") return option;
    if (option && typeof option === "object") {
      const candidate = (option as Record<string, unknown>).label ?? (option as Record<string, unknown>).value;
      if (candidate && typeof candidate === "string") return candidate;
    }
    return `Option ${index + 1}`;
  });
};

const normalizeQuestion = (question: any, pageId: string, fallbackIndex: number): FormQuestion => {
  const normalizedType = normalizeQuestionType(question?.type);
  const config = (question?.config ?? {}) as Record<string, unknown>;
  const questionId = question?.id ? String(question.id) : `${pageId}-question-${fallbackIndex}`;

  const normalizedQuestion: Record<string, unknown> = {
    id: questionId,
    page_id: pageId,
    type: normalizedType,
    category: typeof config.category === "string" ? config.category : CATEGORY_BY_TYPE[normalizedType] ?? "text",
    question: question?.prompt ?? question?.question ?? "Untitled question",
    description: (config.description as string) ?? question?.description ?? "",
    placeholder: (config.placeholder as string) ?? question?.placeholder ?? "",
    required: Boolean(question?.required),
    position: question?.position ?? fallbackIndex,
    visibility_condition: question?.visibility_condition ?? null,
    options: normalizeOptions(config.options ?? question?.options),
    validation: Array.isArray(question?.validation) ? question.validation : [],
    logic: question?.logic,
    metadata: question?.metadata,
  };

  return normalizedQuestion as unknown as FormQuestion;
};

const normalizeFormDefinition = (raw: any): FormDefinition => {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid form payload received");
  }

  const layoutMode = raw?.settings?.layout_mode ?? raw?.layout_mode ?? "focus";

  const payment = raw?.payment
    ? {
        enabled: Boolean(raw.payment.enabled),
        amount_cents: raw.payment.amount_cents ?? 0,
        currency: raw.payment.currency ?? "USD",
        mode: raw.payment.mode ?? "platform",
        stripe_publishable_key: raw.payment.stripe_publishable_key ?? undefined,
        stripe_account_id: raw.payment.stripe_account_id ?? undefined,
        application_fee_percent: raw.payment.application_fee_percent ?? undefined,
        product_description: raw.payment.product_description ?? undefined,
        require_billing_details: raw.payment.require_billing_details ?? undefined,
        thank_you_message: raw.payment.thank_you_message ?? undefined,
      }
    : undefined;

  const { id: _settingsId, form_id: _settingsFormId, created_at: _settingsCreatedAt, updated_at: _settingsUpdatedAt, ...settingsRest } =
    (raw?.settings ?? {}) as Record<string, unknown>;

  const questions: FormQuestion[] = [];

  const normalizedPages = Array.isArray(raw?.pages)
    ? raw.pages.map((page: any, index: number) => {
        const pageId = page?.id ? String(page.id) : `page-${index + 1}`;
        const pageQuestions = Array.isArray(page?.questions) ? [...page.questions] : [];
        const sortedQuestions = pageQuestions.sort(
          (a: any, b: any) => (a?.position ?? 0) - (b?.position ?? 0)
        );
        sortedQuestions.forEach((question: any, questionIndex: number) => {
          questions.push(normalizeQuestion(question, pageId, questionIndex));
        });

        return {
          id: pageId,
          form_id: raw.id ? String(raw.id) : undefined,
          title: page?.title ?? `Page ${index + 1}`,
          description: page?.description ?? "",
          position: page?.position ?? index + 1,
          question_order: sortedQuestions.map((question: any, questionIndex: number) =>
            question?.id ? String(question.id) : `${pageId}-question-${questionIndex}`
          ),
          metadata: page?.metadata ?? undefined,
        };
      })
    : [];

  const sharing: FormSharingSettings | undefined =
    (settingsRest?.sharing as FormSharingSettings | undefined) ??
    (raw?.share_slug ? { share_slug: raw.share_slug } : undefined);

  const definition: FormDefinition = {
    id: String(raw.id ?? ""),
    title: raw?.title ?? "Untitled Form",
    description: raw?.description ?? "",
    slug: raw?.slug ?? undefined,
    status: raw?.status ?? undefined,
    owner_id: raw?.owner_id ?? raw?.employee_id ?? undefined,
    organization_id: raw?.organization_id ? String(raw.organization_id) : undefined,
    layout_mode: layoutMode,
    settings: {
      ...settingsRest,
      layout_mode: layoutMode,
    } as any,
    payment,
    header: settingsRest?.header as any,
    typography: settingsRest?.typography as any,
    theme: settingsRest?.theme as any,
    navigation: settingsRest?.navigation as any,
    welcome_screen: settingsRest?.welcome_screen as any,
    completion_screen: settingsRest?.completion_screen as any,
    pages: normalizedPages,
    questions,
    logic_rules: Array.isArray(raw?.logic_rules) ? raw.logic_rules : [],
    sharing,
    security: settingsRest?.security as any,
    metadata: raw?.metadata ?? undefined,
    version: raw?.version ?? undefined,
    created_at: raw?.created_at ?? undefined,
    updated_at: raw?.updated_at ?? undefined,
  };

  return definition;
};

export interface ListFormsParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  view?: string;
  [key: string]: unknown;
}

export const listForms = async (
  params: ListFormsParams = {},
  options?: RequestOptions,
): Promise<AppForm[]> => {
  const response = await apiClient.get(BASE_PATH, {
    ...(withRequestOptions(options) ?? {}),
    params,
  });
  return response.data?.data ?? [];
};

export const fetchForm = async (
  id: string,
  options?: RequestOptions,
): Promise<FormDefinition> => {
  const response = await apiClient.get(`${BASE_PATH}/${id}`, withRequestOptions(options));
  return normalizeFormDefinition(response.data?.data);
};

export const createForm = async (
  payload: Partial<FormDefinition>,
  options?: RequestOptions,
): Promise<FormDefinition> => {
  const response = await apiClient.post(BASE_PATH, payload, withRequestOptions(options));
  return normalizeFormDefinition(response.data?.data);
};

export const updateForm = async (
  id: string,
  payload: Partial<FormDefinition>,
  options?: RequestOptions,
): Promise<FormDefinition> => {
  const response = await apiClient.patch(
    `${BASE_PATH}/${id}`,
    payload,
    withRequestOptions(options),
  );
  return normalizeFormDefinition(response.data?.data);
};

export const publishForm = async (
  id: string,
  options?: RequestOptions,
): Promise<FormDefinition> => {
  const response = await apiClient.post(
    `${BASE_PATH}/${id}/publish`,
    {},
    withRequestOptions(options),
  );
  return normalizeFormDefinition(response.data?.data);
};

export const duplicateForm = async (
  id: string,
  options?: RequestOptions,
): Promise<FormDefinition> => {
  const response = await apiClient.post(
    `${BASE_PATH}/${id}/duplicate`,
    {},
    withRequestOptions(options),
  );
  return normalizeFormDefinition(response.data?.data);
};

export const archiveForm = async (
  id: string,
  options?: RequestOptions,
): Promise<void> => {
  await apiClient.post(`${BASE_PATH}/${id}/archive`, {}, withRequestOptions(options));
};

export const deleteForm = async (
  id: string,
  options?: RequestOptions,
): Promise<void> => {
  await apiClient.delete(`${BASE_PATH}/${id}`, withRequestOptions(options));
};

export const restoreForm = async (
  id: string,
  options?: RequestOptions,
): Promise<FormDefinition> => {
  const response = await apiClient.post(
    `${BASE_PATH}/${id}/restore`,
    {},
    withRequestOptions(options),
  );
  return normalizeFormDefinition(response.data?.data);
};

export const updateSharingSettings = async (
  id: string,
  sharing: Partial<FormSharingSettings>,
  options?: RequestOptions,
): Promise<FormSharingSettings> => {
  const response = await apiClient.patch(
    `${BASE_PATH}/${id}/sharing`,
    sharing,
    withRequestOptions(options),
  );
  return response.data?.data as FormSharingSettings;
};

export interface FetchResponsesParams {
  page?: number;
  per_page?: number;
  status?: string;
}

export const fetchResponses = async (
  id: string,
  params: FetchResponsesParams = {},
  options?: RequestOptions,
): Promise<FormResponsesPage> => {
  const response = await apiClient.get(`${BASE_PATH}/${id}/responses`, {
    ...(withRequestOptions(options) ?? {}),
    params,
  });

  const payload = response.data ?? {};
  const data = (payload.data ?? []) as FormResponseSummary[];
  const meta = payload.meta ?? { current_page: 1, per_page: params.per_page ?? 25, total: data.length };

  return { data, meta };
};

export const fetchResponseDetail = async (
  formId: string,
  responseId: string,
  options?: RequestOptions,
): Promise<AppFormResponseDetail> => {
  const response = await apiClient.get(
    `${BASE_PATH}/${formId}/responses/${responseId}`,
    withRequestOptions(options),
  );
  return response.data?.data as AppFormResponseDetail;
};

export const listWebhooks = async (
  id: string,
  options?: RequestOptions,
): Promise<FormWebhook[]> => {
  const response = await apiClient.get(
    `${BASE_PATH}/${id}/webhooks`,
    withRequestOptions(options),
  );
  // Controller returns { success, data: FormWebhook[] }
  return (response.data?.data ?? []) as FormWebhook[];
};

export const createWebhook = async (
  id: string,
  payload: Pick<FormWebhook, 'url'> & { events?: string[]; status?: 'active' | 'disabled' },
  options?: RequestOptions,
): Promise<FormWebhook> => {
  const response = await apiClient.post(
    `${BASE_PATH}/${id}/webhooks`,
    payload,
    withRequestOptions(options),
  );
  return response.data?.data as FormWebhook;
};

export const deleteWebhook = async (
  id: string,
  webhookId: number,
  options?: RequestOptions,
): Promise<void> => {
  await apiClient.delete(
    `${BASE_PATH}/${id}/webhooks/${webhookId}`,
    withRequestOptions(options),
  );
};

export const sendWebhookSample = async (
  id: string,
  payload: { url: string; event: string },
  options?: RequestOptions,
): Promise<{ success: boolean }> => {
  const response = await apiClient.post(
    `${BASE_PATH}/${id}/webhooks/test`,
    payload,
    withRequestOptions(options),
  );
  return response.data?.data ?? { success: true };
};
