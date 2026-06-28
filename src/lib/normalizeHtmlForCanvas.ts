/**
 * Normalizes raw HTML before passing it to canvas-editor's executeSetHTML.
 *
 * Upstream insight: canvas-editor's own copy/paste path is higher fidelity than
 * our previous aggressive normalization because it renders the HTML in a Shadow
 * DOM, walks the original structure, and reads getComputedStyle on each text
 * node's parent. It then inserts paragraph breaks after block elements and
 * preserves headings, lists, and tables.
 *
 * This normalization therefore stays as close to the original markup as possible:
 * - keeps block wrappers (div, section, article, etc.) so paragraph boundaries survive
 * - preserves existing inline styles (including font-size from pt sources)
 * - only injects missing table geometry and link fallback styles
 * - strips non-visual/dangerous tags and removes the protocol-only <vensuite-doc> wrapper
 */

const STRIP_TAGS = ['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'HEAD', 'NOSCRIPT', 'BASE', 'TEMPLATE'];
const STRIP_SELECTOR = STRIP_TAGS.join(', ');

const TABLE_STYLE = 'border-collapse:collapse;width:100%;table-layout:fixed';
const TD_STYLE = 'border:1px solid #ccc;padding:6px 8px';
const TH_STYLE = 'border:1px solid #ccc;padding:6px 8px;background-color:#f5f5f5;font-weight:bold';
const LINK_STYLE = 'color:#2563eb;text-decoration:underline';

// canvas-editor replaces H1-H6 with <div> during parsing, which drops the browser's
// default heading sizes. Use canvas-editor's own default title sizes as a fallback
// when the source heading does not already declare an inline font-size.
const HEADING_SIZE_FALLBACK: Record<string, string> = {
  H1: '26px',
  H2: '24px',
  H3: '22px',
  H4: '20px',
  H5: '18px',
  H6: '16px',
};

/** Merge a style declaration into an element without overwriting existing values for the same property. */
function mergeStyle(el: HTMLElement, additional: string): void {
  const existing = el.getAttribute('style') || '';
  const declarations = new Map<string, string>();
  for (const decl of existing.split(';')) {
    const [prop, ...valueParts] = decl.split(':');
    if (prop && valueParts.length) {
      declarations.set(prop.trim(), valueParts.join(':').trim());
    }
  }
  for (const decl of additional.split(';')) {
    const [prop, ...valueParts] = decl.split(':');
    if (!prop || !valueParts.length) continue;
    const key = prop.trim();
    if (!declarations.has(key)) {
      declarations.set(key, valueParts.join(':').trim());
    }
  }
  const merged = Array.from(declarations.entries()).map(([prop, value]) => `${prop}:${value}`).join(';');
  el.setAttribute('style', merged);
}

/** Ensure a tag has a specific style property, but only if it is missing. */
function ensureStyle(el: HTMLElement, defaultStyle: string): void {
  const existing = el.getAttribute('style') || '';
  if (!existing.trim()) {
    el.setAttribute('style', defaultStyle);
    return;
  }
  mergeStyle(el, defaultStyle);
}

/** Remove all HTML comments and empty text nodes. */
function cleanNode(host: HTMLElement): void {
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT, null);
  const toRemove: ChildNode[] = [];
  let node: Node | null;
  while ((node = walker.nextNode()) !== null) {
    if (node.nodeType === Node.COMMENT_NODE) {
      toRemove.push(node as ChildNode);
    } else if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) {
      toRemove.push(node as ChildNode);
    }
  }
  toRemove.forEach((n) => n.remove());
}

export function normalizeHtmlForCanvas(html: string): string {
  const host = document.createElement('div');
  host.innerHTML = html;

  // 1. Strip non-visual / dangerous tags
  host.querySelectorAll(STRIP_SELECTOR).forEach((el) => el.remove());

  // 2. Replace the protocol-only <vensuite-doc> wrapper with a plain div so structure is preserved
  host.querySelectorAll('vensuite-doc').forEach((el) => {
    const div = document.createElement('div');
    // preserve any inline styles set on the wrapper
    const style = (el as HTMLElement).getAttribute('style');
    if (style) div.setAttribute('style', style);
    while (el.firstChild) {
      div.appendChild(el.firstChild);
    }
    el.parentNode?.replaceChild(div, el);
  });

  // 3. Remove comments and empty text nodes
  cleanNode(host);

  // 4. Wrap top-level orphan text nodes in <p> so canvas-editor inserts paragraph breaks
  const childNodes = Array.from(host.childNodes);
  for (const node of childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      const p = document.createElement('p');
      p.textContent = node.textContent;
      host.replaceChild(p, node);
    }
  }

  // 5. Preserve heading sizes: canvas-editor replaces H1-H6 with <div>, which drops
  // browser default sizing. Only add a fallback when the heading has no inline font-size.
  host.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
    const style = (el as HTMLElement).getAttribute('style') || '';
    if (!style.includes('font-size:')) {
      const size = HEADING_SIZE_FALLBACK[el.nodeName];
      if (size) {
        mergeStyle(el as HTMLElement, `font-size:${size}`);
      }
    }
  });

  // 6. Ensure tables have explicit geometry so canvas-editor can compute cell widths
  host.querySelectorAll('table').forEach((table) => {
    ensureStyle(table as HTMLElement, TABLE_STYLE);
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
  });

  // 7. Link fallback styling only when the anchor has no explicit color
  host.querySelectorAll('a').forEach((a) => {
    const style = (a as HTMLElement).getAttribute('style') || '';
    if (!style.includes('color:')) {
      mergeStyle(a as HTMLElement, LINK_STYLE);
    }
  });

  // 8. Ensure empty paragraphs have a non-breaking space (canvas-editor needs content)
  host.querySelectorAll('p').forEach((p) => {
    if (!p.textContent?.trim() && !p.innerHTML.trim()) {
      p.innerHTML = '&nbsp;';
    }
  });

  return host.innerHTML;
}
