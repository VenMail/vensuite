import { apiClient, withRequestOptions, type RequestOptions } from "./apiClient";
import type {
  AppForm,
  FormDefinition,
  AppFormResponseDetail,
  FormResponsesPage,
  FormResponseSummary,
  FormSharingSettings,
  FormWebhook,
} from "@/types";

const BASE_PATH = "/app-forms";

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
  return response.data?.data as FormDefinition;
};

export const createForm = async (
  payload: Partial<FormDefinition>,
  options?: RequestOptions,
): Promise<FormDefinition> => {
  const response = await apiClient.post(BASE_PATH, payload, withRequestOptions(options));
  return response.data?.data as FormDefinition;
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
  return response.data?.data as FormDefinition;
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
  return response.data?.data as FormDefinition;
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
  return response.data?.data as FormDefinition;
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
  return response.data?.data as FormDefinition;
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
