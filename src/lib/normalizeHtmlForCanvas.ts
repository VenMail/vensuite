/**
 * Normalizes raw AI-generated HTML before passing it to canvas-editor's
 * executeSetHTML. Canvas-editor parses HTML via a Shadow DOM and reads
 * getComputedStyle on each node — so inline styles are the only way to
 * convey formatting. This function injects sensible defaults for any
 * semantic tag that lacks inline styles, ensuring consistent rendering
 * regardless of whether the LLM included them.
 *
 * Also handles structural issues:
 * - Unwraps <div>, <section>, <article>, <header>, <footer> wrappers
 *   (canvas-editor has no special handling for them)
 * - Converts <br> in block context to proper paragraph breaks
 * - Ensures table cells have explicit borders/padding
 */

const HEADING_STYLES: Record<string, string> = {
  H1: 'font-size:28px;font-weight:bold;margin:16px 0 8px',
  H2: 'font-size:24px;font-weight:bold;margin:14px 0 6px',
  H3: 'font-size:20px;font-weight:bold;margin:12px 0 4px',
  H4: 'font-size:16px;font-weight:bold;margin:10px 0 4px',
  H5: 'font-size:14px;font-weight:bold;margin:8px 0 2px',
  H6: 'font-size:13px;font-weight:bold;margin:8px 0 2px',
};

const TAG_DEFAULTS: Record<string, string> = {
  P: 'margin:0 0 8px;line-height:1.5',
  BLOCKQUOTE: 'border-left:3px solid #ccc;margin:8px 0;padding:4px 12px;color:#555',
  HR: 'border:none;border-top:1px solid #ccc;margin:12px 0',
  UL: 'margin:8px 0;padding-left:24px',
  OL: 'margin:8px 0;padding-left:24px',
  LI: 'margin:2px 0',
};

const TABLE_STYLE = 'border-collapse:collapse;width:100%';
const TH_STYLE = 'border:1px solid #ccc;padding:6px 8px;background-color:#f5f5f5;font-weight:bold;text-align:left';
const TD_STYLE = 'border:1px solid #ccc;padding:6px 8px;text-align:left';

/** Tags that canvas-editor has no special handling for — unwrap them. */
const UNWRAP_TAGS = new Set(['DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'NAV', 'ASIDE', 'FIGURE', 'FIGCAPTION', 'VENSUITE-DOC']);

/** Tags to remove entirely (no visual content). */
const STRIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'HEAD']);

function ensureStyle(el: HTMLElement, defaultStyle: string): void {
  if (!el.getAttribute('style')) {
    el.setAttribute('style', defaultStyle);
  }
}

function mergeStyle(el: HTMLElement, additional: string): void {
  const existing = el.getAttribute('style') || '';
  if (!existing.includes(additional.split(':')[0])) {
    el.setAttribute('style', existing ? `${existing};${additional}` : additional);
  }
}

export function normalizeHtmlForCanvas(html: string): string {
  const host = document.createElement('div');
  host.innerHTML = html;

  // 1. Strip dangerous/useless tags
  host.querySelectorAll(STRIP_TAGS as unknown as string).forEach((el) => el.remove());

  // 2. Unwrap layout tags (div, section, etc.) — canvas-editor doesn't handle them
  let unwrapTargets = Array.from(host.querySelectorAll(UNWRAP_TAGS as unknown as string));
  while (unwrapTargets.length) {
    for (const el of unwrapTargets) {
      const parent = el.parentNode;
      if (!parent) continue;
      // Move children out, preserving order
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
    }
    // Check again — unwrapping may have exposed new unwrap targets
    unwrapTargets = Array.from(host.querySelectorAll(UNWRAP_TAGS as unknown as string));
  }

  // 3. Apply default heading styles
  for (const [tag, style] of Object.entries(HEADING_STYLES)) {
    host.querySelectorAll(tag).forEach((el) => ensureStyle(el as HTMLElement, style));
  }

  // 4. Apply default paragraph/block styles
  for (const [tag, style] of Object.entries(TAG_DEFAULTS)) {
    host.querySelectorAll(tag).forEach((el) => ensureStyle(el as HTMLElement, style));
  }

  // 5. Table formatting
  host.querySelectorAll('table').forEach((table) => {
    ensureStyle(table as HTMLElement, TABLE_STYLE);
    // Ensure colgroup exists for width calculation
    if (!table.querySelector('colgroup')) {
      const colCount = table.querySelectorAll('tr:first-child th, tr:first-child td').length;
      if (colCount > 0) {
        const colgroup = document.createElement('colgroup');
        for (let i = 0; i < colCount; i++) {
          const col = document.createElement('col');
          col.setAttribute('width', String(Math.floor(100 / colCount)));
          colgroup.appendChild(col);
        }
        table.insertBefore(colgroup, table.firstChild);
      }
    }
  });

  host.querySelectorAll('th').forEach((th) => {
    ensureStyle(th as HTMLElement, TH_STYLE);
    mergeStyle(th as HTMLElement, 'text-align:left');
  });

  host.querySelectorAll('td').forEach((td) => {
    ensureStyle(td as HTMLElement, TD_STYLE);
    mergeStyle(td as HTMLElement, 'text-align:left');
  });

  // 6. Link styling
  host.querySelectorAll('a').forEach((a) => {
    ensureStyle(a as HTMLElement, 'color:#2563eb;text-decoration:underline');
  });

  // 7. Ensure <br> inside paragraphs get proper treatment
  // canvas-editor handles <br> as newline — no change needed

  // 8. Wrap orphan text nodes in <p>
  const childNodes = Array.from(host.childNodes);
  for (const node of childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      const p = document.createElement('p');
      p.setAttribute('style', TAG_DEFAULTS.P);
      p.textContent = node.textContent;
      host.replaceChild(p, node);
    }
  }

  // 9. Ensure empty paragraphs have a non-breaking space (canvas-editor needs content)
  host.querySelectorAll('p').forEach((p) => {
    if (!p.textContent?.trim() && !p.innerHTML) {
      p.innerHTML = '&nbsp;';
    }
  });

  return host.innerHTML;
}
