/**
 * DOCX conversion service.
 *
 * Strategy: always convert client-side with Mammoth first (fast, no backend
 * dependency). Compute a complexity heuristic from the resulting HTML. If the
 * document looks complex, attempt a higher-fidelity conversion through the
 * authenticated backend proxy (POST {VITE_API_BASE_URL}/ai/parse-docx), which
 * forwards to an internal libreoffice/python-docx microservice. The microservice
 * itself is never exposed publicly. On ANY failure (network, non-200, timeout,
 * service down) we silently fall back to the Mammoth result — the high-fidelity
 * path being unavailable must never throw.
 *
 * For local dev you may set VITE_DOCX_SERVICE_URL to hit a microservice directly,
 * bypassing the backend proxy.
 */
import { useAuthStore } from '@/store/auth';

export interface DocxConversionResult {
  html: string;
  plainText: string;
  complex: boolean;
  engine: 'docx-service' | 'mammoth';
}

interface DocxComplexity {
  score: number;
  tables: number;
  nestedTables: number;
  images: number;
  complex: boolean;
}

/** Strip HTML tags to plain text (fallback when mammoth.extractRawText is absent). */
function stripHtmlToText(html: string): string {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body?.textContent || '').replace(/\s+\n/g, '\n').trim();
  } catch {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

/** Heuristic complexity scoring from the mammoth-produced HTML. */
function computeComplexity(html: string): DocxComplexity {
  const tables = (html.match(/<table[\s>]/gi) || []).length;
  const images = (html.match(/<img[\s>]/gi) || []).length;
  // Rough nested-table count: tables that contain another table.
  let nestedTables = 0;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    nestedTables = Array.from(doc.querySelectorAll('table table')).length;
  } catch {
    nestedTables = 0;
  }
  const length = html.length;
  const complex = tables > 2 || images > 5 || length > 60000;
  const score = tables + images + nestedTables * 2 + Math.floor(length / 10000);
  return { score, tables, nestedTables, images, complex };
}

async function toArrayBuffer(input: File | ArrayBuffer): Promise<ArrayBuffer> {
  if (input instanceof ArrayBuffer) return input;
  return await input.arrayBuffer();
}

/** Resolve the current auth bearer token, if any. */
function getAuthToken(): string | null {
  try {
    const authStore = useAuthStore();
    return authStore.getToken?.() ?? authStore.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Convert via the high-fidelity backend. Resolves null on any failure.
 * When `direct` is true the URL is a microservice base (`/convert`, no auth) —
 * used only for local dev via VITE_DOCX_SERVICE_URL. Otherwise the URL is the
 * authenticated backend proxy endpoint (`/ai/parse-docx`, Bearer token).
 */
async function convertViaService(
  endpoint: string,
  file: File | ArrayBuffer,
  fileName: string | undefined,
  direct: boolean,
): Promise<DocxConversionResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const blob =
      file instanceof ArrayBuffer
        ? new Blob([file], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          })
        : file;
    const form = new FormData();
    const name = fileName || (file instanceof File ? file.name : 'document.docx');
    form.append('file', blob, name);

    const url = direct ? `${endpoint.replace(/\/+$/, '')}/convert` : endpoint;
    const token = direct ? null : getAuthToken();
    const response = await fetch(url, {
      method: 'POST',
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      html?: string;
      plainText?: string;
      complexity?: { complex?: boolean };
      engine?: string;
    };
    if (!data?.html) return null;

    return {
      html: data.html,
      plainText: data.plainText || stripHtmlToText(data.html),
      complex: !!data.complexity?.complex,
      engine: 'docx-service',
    };
  } catch {
    // Network error, abort/timeout, parse error, etc. — fall back silently.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Convert a DOCX file to HTML + plain text, choosing the best available engine.
 *
 * @param file     The .docx File or its ArrayBuffer.
 * @param fileName Optional file name (used for the service multipart field).
 */
export async function convertDocxSmart(
  file: File | ArrayBuffer,
  fileName?: string,
): Promise<DocxConversionResult> {
  const buffer = await toArrayBuffer(file);

  // 1) Always convert client-side first.
  const mammoth = (window as any).mammoth;
  let html = '';
  let plainText = '';
  try {
    // @ts-ignore mammoth is loaded globally in main.ts
    const result = await mammoth?.convertToHtml({ arrayBuffer: buffer });
    html = result?.value || '';
  } catch (e) {
    console.warn('Mammoth convertToHtml failed:', e);
  }
  try {
    if (typeof mammoth?.extractRawText === 'function') {
      const raw = await mammoth.extractRawText({ arrayBuffer: buffer });
      plainText = raw?.value || '';
    }
  } catch {
    /* ignore — fall through to tag-stripping */
  }
  if (!plainText) plainText = stripHtmlToText(html);

  const complexity = computeComplexity(html);
  const mammothResult: DocxConversionResult = {
    html,
    plainText,
    complex: complexity.complex,
    engine: 'mammoth',
  };

  // 2) If complex, try the high-fidelity path. Prefer a direct microservice URL
  //    (local dev); otherwise use the authenticated backend proxy.
  if (complexity.complex) {
    const directUrl = import.meta.env.VITE_DOCX_SERVICE_URL;
    if (directUrl) {
      const direct = await convertViaService(directUrl, file, fileName, true);
      if (direct?.html) return direct;
    } else {
      const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');
      const proxied = await convertViaService(`${apiBase}/ai/parse-docx`, file, fileName, false);
      if (proxied?.html) return proxied;
    }
  }

  return mammothResult;
}
