import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export interface AuthContext {
  token?: string | null;
}

export interface RequestOptions {
  auth?: AuthContext;
  idempotencyKey?: string;
  config?: AxiosRequestConfig;
}

const defaultHeaders = {
  "Content-Type": "application/json",
  Accept: "application/vnd.vensuite.v1+json",
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: defaultHeaders,
  timeout: 20000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      return Promise.reject({
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
        config: error.config,
      });
    }
    return Promise.reject(error);
  }
);

export const withRequestOptions = (options: RequestOptions = {}): AxiosRequestConfig => {
  const { auth, idempotencyKey, config } = options;
  const headers: Record<string, string> = {
    ...defaultHeaders,
    ...(config?.headers as Record<string, string> | undefined),
  };

  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  return {
    ...config,
    headers,
  };
};
