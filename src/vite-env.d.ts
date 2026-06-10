/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AUTH_URL?: string;
  /** Optional Python DOCX conversion microservice base URL (e.g. http://localhost:8001). Empty/unset disables it. */
  readonly VITE_DOCX_SERVICE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
