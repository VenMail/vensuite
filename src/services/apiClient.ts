import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { getActivePinia } from "pinia";
import { useAuthStore } from "@/auth/index";

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

// A JSON Content-Type makes Axios stringify FormData and drop File contents.
export const multipartApiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

function registerInterceptors(client: AxiosInstance): void {
  // Automatically attach auth token from localStorage to every request
  client.interceptors.request.use((config) => {
    try {
      const token = localStorage.getItem('venAuthToken');
      if (token && !config.headers?.Authorization) {
        config.headers = config.headers || {};
        (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
      }
    } catch {
      // Silently ignore localStorage errors
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response) {
        try {
          const pinia = getActivePinia();
          if (pinia) {
            const authStore = useAuthStore(pinia);
            const status = error.response.status;
            const responseData = error.response.data;
            const requestUrl = String(error.config?.url || "");
            const isSigningRequest =
              requestUrl.includes("/api/signing/session/") ||
              requestUrl.includes("/api/signing/complete/") ||
              requestUrl.includes("/api/signing/editor/") ||
              requestUrl.includes("/api/composer/signing/");
            const isTokenIssue =
              !isSigningRequest &&
              (status === 401 ||
                status === 419 ||
                (status === 403 &&
                  typeof responseData?.message === "string" &&
                  /token|unauthorized|unauthenticated/i.test(responseData.message)));

            if (isTokenIssue && authStore.isAuthenticated && authStore.getToken()) {
              await authStore.handleTokenExpiration();
            }
          }
        } catch {
          // Keep the original request failure if auth cleanup cannot run.
        }

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
}

registerInterceptors(apiClient);
registerInterceptors(multipartApiClient);

export async function postFormData<T>(
  url: string,
  formData: FormData,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await multipartApiClient.post<T>(url, formData, config);
  return response.data;
}

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
