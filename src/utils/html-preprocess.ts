import { detectAbsoluteLayoutHtml } from '@/utils/html-to-tiptap';

function parseNumAttr(v: string | null): number | null {
  if (!v) return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function extractBalancedObjectLiteral(src: string, fromIndex: number): string | null {
  const start = src.indexOf('{', fromIndex);
  if (start < 0) return null;
  let depth = 0;
  let quote: '"' | "'" | '`' | null = null;
  let esc = false;
  for (let i = start; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === '\\') {
        esc = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch as any;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    if (depth === 0) return src.slice(start, i + 1);
  }
  return null;
}

function objectLiteralToJsonText(input: string): string {
  let s = String(input || '').trim();
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/(^|[^:])\/\/.*$/gm, '$1');
  s = s.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, inner: string) => {
    const escaped = String(inner).replace(/\"/g, '"').replace(/"/g, '\\"');
    return `"${escaped}"`;
  });
  s = s.replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3');
  s = s.replace(/,\s*([}\]])/g, '$1');
  return s;
}

function tryParseConfig(input: string): any | null {
  const candidates = [input, objectLiteralToJsonText(input)];
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // ignore
    }
  }
  return null;
}

function buildChartNodeEl(doc: Document, attrs: any, size?: { width?: number | null; height?: number | null }): HTMLElement {
  const el = doc.createElement('div');
  el.setAttribute('data-type', 'chart-node');
  el.setAttribute('data-chart-type', String(attrs.chartType || 'bar'));
  el.setAttribute('data-chart-labels', JSON.stringify(Array.isArray(attrs.labels) ? attrs.labels : []));
  el.setAttribute('data-chart-datasets', JSON.stringify(Array.isArray(attrs.datasets) ? attrs.datasets : []));
  if (size?.width != null) el.setAttribute('data-chart-width', String(size.width));
  if (size?.height != null) el.setAttribute('data-chart-height', String(size.height));
  if (typeof attrs.title === 'string') el.setAttribute('data-chart-title', attrs.title);
  if (typeof attrs.showLegend === 'boolean') el.setAttribute('data-chart-legend', String(attrs.showLegend));
  if (typeof attrs.fontSize === 'number' && Number.isFinite(attrs.fontSize)) el.setAttribute('data-chart-fontsize', String(attrs.fontSize));
  return el;
}

function configToChartAttrs(config: any): any | null {
  if (!config || typeof config !== 'object') return null;
  const type = typeof config.type === 'string' ? config.type : 'bar';
  const data = config.data && typeof config.data === 'object' ? config.data : null;
  const labels = Array.isArray(data?.labels) ? data.labels.map((v: any) => String(v)) : [];
  const datasets = Array.isArray(data?.datasets)
    ? data.datasets.map((ds: any) => ({
        label: typeof ds?.label === 'string' ? ds.label : undefined,
        data: Array.isArray(ds?.data) ? ds.data.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n)) : [],
        backgroundColor: typeof ds?.backgroundColor === 'string' ? ds.backgroundColor : undefined,
        borderColor: typeof ds?.borderColor === 'string' ? ds.borderColor : undefined,
        borderWidth: typeof ds?.borderWidth === 'number' ? ds.borderWidth : undefined,
        tension: typeof ds?.tension === 'number' ? ds.tension : undefined,
      }))
    : [];

  const titleText = config?.options?.plugins?.title?.text;
  const title = typeof titleText === 'string' ? titleText : '';
  const showLegend = config?.options?.plugins?.legend?.display;
  const fontSize = config?.options?.plugins?.legend?.labels?.font?.size;

  return {
    chartType: type,
    labels,
    datasets,
    title,
    showLegend: typeof showLegend === 'boolean' ? showLegend : undefined,
    fontSize: typeof fontSize === 'number' ? fontSize : undefined,
  };
}

export function preprocessHtmlEmbeds(html: string): string {
  if (!html || typeof html !== 'string') return html;
  if (typeof DOMParser === 'undefined') return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');

  const forms = Array.from(doc.querySelectorAll('form'));
  for (const form of forms) {
    const nodes = Array.from(form.childNodes);
    let currentP: HTMLElement | null = null;

    const ensureP = (): HTMLElement => {
      if (!currentP) {
        currentP = doc.createElement('p');
        form.appendChild(currentP);
      }
      return currentP;
    };

    const isBlockEl = (el: Element): boolean => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'p') return true;
      if (tag === 'div') return true;
      if (tag === 'table' || tag === 'thead' || tag === 'tbody' || tag === 'tr' || tag === 'td' || tag === 'th') return true;
      if (tag === 'ul' || tag === 'ol' || tag === 'li') return true;
      if (tag === 'blockquote' || tag === 'pre') return true;
      if (/^h[1-6]$/.test(tag)) return true;
      return false;
    };

    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? '';
        if (!text.trim()) {
          node.remove();
          continue;
        }
        ensureP().appendChild(node);
        continue;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (isBlockEl(el)) {
          currentP = null;
          form.appendChild(node);
          continue;
        }

        ensureP().appendChild(node);
        continue;
      }

      node.remove();
    }

    const p = currentP as HTMLElement | null;
    if (p && p.childNodes.length === 0) {
      p.remove();
    }
  }

  const canvases = Array.from(doc.querySelectorAll('canvas'));
  for (const canvas of canvases) {
    const raw = canvas.getAttribute('data-chartjs') || canvas.getAttribute('data-chart-config') || canvas.getAttribute('data-chart');
    if (!raw) continue;
    try {
      const config = JSON.parse(raw);
      const attrs = configToChartAttrs(config);
      if (!attrs) continue;
      const w = parseNumAttr(canvas.getAttribute('width'));
      const h = parseNumAttr(canvas.getAttribute('height'));
      const chartNode = buildChartNodeEl(doc, attrs, { width: w, height: h });
      canvas.replaceWith(chartNode);
    } catch {
      // ignore
    }
  }

  const scripts = Array.from(doc.querySelectorAll('script'));
  for (const script of scripts) {
    const text = script.textContent || '';
    if (!/new\s+Chart\s*\(/.test(text)) continue;

    const m = text.match(
      /new\s+Chart\s*\(\s*(?:document\.getElementById\(\s*['\"]([^'\"]+)['\"]\s*\)|document\.querySelector\(\s*['\"]#([^'\"]+)['\"]\s*\))\s*,/,
    );
    const id = (m?.[1] || m?.[2] || '').trim();
    if (!id) continue;

    const canvas = doc.getElementById(id) as HTMLCanvasElement | null;
    if (!canvas || canvas.tagName.toLowerCase() !== 'canvas') continue;

    const startAt = (m?.index ?? 0) + (m?.[0]?.length ?? 0);
    const objLiteral = extractBalancedObjectLiteral(text, startAt);
    if (!objLiteral) continue;

    const parsed = tryParseConfig(objLiteral);
    const attrs = parsed ? configToChartAttrs(parsed) : null;
    if (!attrs) continue;

    const w = parseNumAttr(canvas.getAttribute('width'));
    const h = parseNumAttr(canvas.getAttribute('height'));

    const chartNode = buildChartNodeEl(doc, attrs, { width: w, height: h });
    canvas.replaceWith(chartNode);
    script.remove();
  }

  const output = doc.body?.innerHTML || html;
  if (detectAbsoluteLayoutHtml(html)) return html;
  return output;
}
