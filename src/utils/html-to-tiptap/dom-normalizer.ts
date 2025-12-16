import type { AbsFragment, AbsImageItem, AbsShapeItem, ConvertOptions } from './types';

function parseCssPx(input: string | null | undefined): number | null {
  if (!input) return null;
  const m = String(input).trim().match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function roundTo(n: number, places: number): number {
  const p = Math.pow(10, places);
  return Math.round(n * p) / p;
}

function normalizeText(text: string): string {
  const t = text.replace(/\u00a0/g, ' ');
  return t;
}

function isLikelyPdfPageElement(el: HTMLElement): boolean {
  const cls = (el.getAttribute('class') || '').toLowerCase();
  const id = (el.getAttribute('id') || '').toLowerCase();
  const hasPageAttr = !!(el.getAttribute('data-page') || el.getAttribute('data-page-number'));
  const hasSizeAttr = !!(el.getAttribute('data-width') || el.getAttribute('data-height'));
  const hasSizeStyle = !!(el.style.width || el.style.height);

  if (cls.includes('pdf-page')) return true;
  if (hasPageAttr && (hasSizeAttr || hasSizeStyle)) return true;
  if (/^pf\d+$/.test(id)) return true;
  if (cls.split(/\s+/).includes('pf') && (hasSizeAttr || hasSizeStyle)) return true;

  return false;
}

function isAbsolutePositioned(el: HTMLElement): boolean {
  const style = (el.getAttribute('style') || '').toLowerCase();
  if (style.includes('position:absolute') || style.includes('position: absolute')) return true;
  const cssPos = (el.style.position || '').toLowerCase();
  return cssPos === 'absolute';
}

function isHiddenElement(el: HTMLElement): boolean {
  const styleAttr = (el.getAttribute('style') || '').toLowerCase();
  const visibility = (el.style.visibility || '').toLowerCase();
  const display = (el.style.display || '').toLowerCase();
  const opacity = el.style.opacity ? Number(el.style.opacity) : null;
  if (display === 'none') return true;
  if (visibility === 'hidden') return true;
  if (styleAttr.includes('display:none') || styleAttr.includes('display: none')) return true;
  if (styleAttr.includes('visibility:hidden') || styleAttr.includes('visibility: hidden')) return true;
  if (opacity != null && Number.isFinite(opacity) && opacity <= 0) return true;
  const color = (el.style.color || '').toLowerCase();
  if (color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return true;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  return false;
}

function elementOrAncestorHasYFlipTransform(el: HTMLElement, stopAt: HTMLElement | null): boolean {
  let cur: HTMLElement | null = el;
  while (cur) {
    if (elementHasYFlipTransform(cur)) return true;
    if (stopAt && cur === stopAt) break;
    cur = cur.parentElement;
  }
  return false;
}

function findClosestPageElement(el: HTMLElement): HTMLElement | null {
  let cur: HTMLElement | null = el;
  while (cur) {
    if (isLikelyPdfPageElement(cur)) return cur;
    cur = cur.parentElement;
  }
  return null;
}

function inferPageNumberFromElement(pageEl: HTMLElement, fallbackIndex: number): number {
  const dataPage = pageEl.getAttribute('data-page') || pageEl.getAttribute('data-page-number');
  if (dataPage && !Number.isNaN(Number(dataPage))) return Number(dataPage);
  const cls = pageEl.getAttribute('class') || '';
  const m = cls.match(/pdf-page-(\d+)/);
  if (m) return Number(m[1]) + 1;

  const id = pageEl.getAttribute('id') || '';
  const m2 = id.match(/^pf(\d+)$/i);
  if (m2) return Number(m2[1]);

  return fallbackIndex + 1;
}

function elementHasYFlipTransform(el: HTMLElement): boolean {
  const styleAttr = (el.getAttribute('style') || '').toLowerCase();
  const t = (el.style.transform || '').toLowerCase();
  const combined = `${styleAttr};${t}`;

  if (combined.includes('scaley(-1') || (combined.includes('scale3d') && combined.includes('-1'))) return true;

  const m = combined.match(/matrix\(([^)]+)\)/);
  if (m) {
    const parts = m[1]
      .split(',')
      .map((p) => Number(String(p).trim()))
      .filter((n) => Number.isFinite(n));
    if (parts.length >= 6) {
      const d = parts[3];
      if (typeof d === 'number' && Number.isFinite(d) && d < 0) return true;
    }
  }

  return false;
}

function resolveTopPx(el: HTMLElement, pageHeightPx: number | null, heightPx: number | null): number | null {
  const explicitTop = parseCssPx(el.getAttribute('data-y')) ?? parseCssPx(el.style.top);
  if (explicitTop != null) return explicitTop;

  const bottom = parseCssPx(el.style.bottom);
  if (bottom == null) return null;
  if (pageHeightPx == null || !Number.isFinite(pageHeightPx) || pageHeightPx <= 0) return null;

  const h = typeof heightPx === 'number' && Number.isFinite(heightPx) ? heightPx : 0;
  return pageHeightPx - bottom - h;
}

function parseCssNumber(input: string | null | undefined): number | null {
  if (!input) return null;
  const m = String(input).trim().match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function parseFirstCssUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = String(input).match(/url\((['"]?)(.*?)\1\)/i);
  if (!m) return null;
  const url = String(m[2] || '').trim();
  return url ? url : null;
}

function isTransparentColor(input: string | null | undefined): boolean {
  const v = (input || '').trim().toLowerCase();
  if (!v) return true;
  if (v === 'transparent') return true;
  const m = v.match(/rgba\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(',').map((p) => Number(String(p).trim()));
    if (parts.length >= 4) {
      const a = parts[3];
      if (Number.isFinite(a) && a <= 0) return true;
    }
  }
  return false;
}

function svgOuterHtmlToDataUrl(outerHtml: string): string {
  let markup = String(outerHtml || '');
  if (!markup) return '';
  if (!/\sxmlns=/.test(markup)) {
    markup = markup.replace(
      /<svg\b/i,
      '<svg xmlns="http://www.w3.org/2000/svg"',
    );
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

function normalizeAbsoluteHtmlToFragmentsViaLayout(
  html: string,
  opts: ConvertOptions = {},
): { fragments: AbsFragment[]; images: AbsImageItem[]; shapes: AbsShapeItem[] } {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return { fragments: [], images: [], shapes: [] };
  }
  if (!document.body) return { fragments: [], images: [], shapes: [] };

  const debug = typeof localStorage !== 'undefined' && localStorage.getItem('absDebug') === '1';

  const roundPx = typeof opts.roundPx === 'number' ? opts.roundPx : 2;
  const targetPageWidthPx = typeof opts.pageWidthPx === 'number' ? opts.pageWidthPx : 794;
  const targetPageHeightPx = typeof opts.pageHeightPx === 'number' ? opts.pageHeightPx : 1123;
  const forceLayoutCapture = opts.forceLayoutCapture === true;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-100000px';
  iframe.style.top = '0';
  iframe.style.width = '5000px';
  iframe.style.height = '5000px';
  iframe.style.visibility = 'hidden';
  iframe.style.pointerEvents = 'none';
  iframe.setAttribute('aria-hidden', 'true');

  document.body.appendChild(iframe);

  try {
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) return { fragments: [], images: [], shapes: [] };

    const wrapped = /<\s*html[\s>]/i.test(html)
      ? html
      : `<!doctype html><html><head><style>html,body{margin:0;padding:0;}</style></head><body>${html}</body></html>`;

    doc.open();
    doc.write(wrapped);
    doc.close();

    const root = doc.body || doc.documentElement;

    const allElements = Array.from(root.querySelectorAll<HTMLElement>('*'));
    const pageEls = allElements
      .filter((el) => isLikelyPdfPageElement(el))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return Number.isFinite(r.width) && Number.isFinite(r.height) && r.width >= 200 && r.height >= 200;
      });
    const pageIndexByEl = new Map<HTMLElement, number>();
    pageEls.forEach((p, idx) => pageIndexByEl.set(p, idx));
    const pageElSet = new Set(pageEls);

    // If no explicit pages exist (typical for normal HTML), use a synthetic
    // "content bounds" rect as our coordinate system so scaling is stable.
    let syntheticPageRect: { left: number; top: number; width: number; height: number } | null = null;
    if (forceLayoutCapture && pageEls.length === 0) {
      let minLeft = Number.POSITIVE_INFINITY;
      let minTop = Number.POSITIVE_INFINITY;
      let maxRight = Number.NEGATIVE_INFINITY;
      let maxBottom = Number.NEGATIVE_INFINITY;

      for (const el of allElements) {
        if (isLikelyPdfPageElement(el)) continue;
        const cs = win.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const opacity = cs.opacity ? Number(cs.opacity) : null;
        if (opacity != null && Number.isFinite(opacity) && opacity <= 0) continue;
        if (el.getAttribute('aria-hidden') === 'true') continue;

        const tag = (el.tagName || '').toLowerCase();
        const rawText = normalizeText(el.textContent || '');
        const bgUrl = parseFirstCssUrl(cs.backgroundImage);
        const borderWidth = parseCssNumber(cs.borderTopWidth) ?? 0;
        const borderStyle = (cs.borderTopStyle || '').toLowerCase();
        const borderColor = cs.borderTopColor || '';
        const bgColor = cs.backgroundColor || '';
        const hasBorder = borderWidth > 0 && borderStyle !== 'none' && !isTransparentColor(borderColor);
        const hasFill = !isTransparentColor(bgColor);

        const isLeafText = el.childElementCount === 0 && rawText.trim().length > 0;
        const isImg = tag === 'img' || tag === 'svg' || !!bgUrl;
        const isShape = (hasBorder || hasFill);

        if (!isLeafText && !isImg && !isShape) continue;

        const r = el.getBoundingClientRect();
        if (!Number.isFinite(r.left) || !Number.isFinite(r.top) || !Number.isFinite(r.width) || !Number.isFinite(r.height)) continue;
        if (!(r.width > 0) || !(r.height > 0)) continue;

        minLeft = Math.min(minLeft, r.left);
        minTop = Math.min(minTop, r.top);
        maxRight = Math.max(maxRight, r.right);
        maxBottom = Math.max(maxBottom, r.bottom);
      }

      if (
        Number.isFinite(minLeft) &&
        Number.isFinite(minTop) &&
        Number.isFinite(maxRight) &&
        Number.isFinite(maxBottom) &&
        maxRight > minLeft &&
        maxBottom > minTop
      ) {
        syntheticPageRect = {
          left: minLeft,
          top: minTop,
          width: maxRight - minLeft,
          height: maxBottom - minTop,
        };
      }
    }

    const absAncestorCache = new Map<HTMLElement, HTMLElement | null>();

    const findClosestAbsoluteAncestor = (from: HTMLElement): HTMLElement | null => {
      if (absAncestorCache.has(from)) return absAncestorCache.get(from) || null;
      let cur: HTMLElement | null = from.parentElement;
      while (cur) {
        const cs = win.getComputedStyle(cur);
        if ((cs.position || '').toLowerCase() === 'absolute') {
          absAncestorCache.set(from, cur);
          return cur;
        }
        cur = cur.parentElement;
      }
      absAncestorCache.set(from, null);
      return null;
    };

    const findClosestMeasuredPageElement = (from: HTMLElement): HTMLElement | null => {
      let cur: HTMLElement | null = from;
      while (cur) {
        if (pageElSet.has(cur)) return cur;
        cur = cur.parentElement;
      }
      return null;
    };

    const fragments: AbsFragment[] = [];
    const images: AbsImageItem[] = [];
    const shapes: AbsShapeItem[] = [];

    const dedupText = new Set<string>();
    const dedupImage = new Set<string>();
    const dedupShape = new Set<string>();

    const capturedSvg = new WeakSet<Element>();

    let absCount = 0;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const el of allElements) {
      if (isLikelyPdfPageElement(el)) continue;
      const cs = win.getComputedStyle(el);
      const isAbs = (cs.position || '').toLowerCase() === 'absolute';
      const isLeafText = el.childElementCount === 0;
      const rawText = normalizeText(el.textContent || '');
      const absAncestor = !isAbs && isLeafText && rawText.trim() ? findClosestAbsoluteAncestor(el) : null;
      if (!isAbs && !absAncestor && !forceLayoutCapture) continue;
      absCount += 1;
      if (cs.display === 'none') continue;
      if (cs.visibility === 'hidden') continue;
      const opacity = cs.opacity ? Number(cs.opacity) : null;
      if (opacity != null && Number.isFinite(opacity) && opacity <= 0) continue;
      if (el.getAttribute('aria-hidden') === 'true') continue;

      const svgRoot = el.closest ? el.closest('svg') : null;
      const isSvgRootEl = (el.tagName || '').toLowerCase() === 'svg';
      if (svgRoot && !isSvgRootEl) {
        if (!capturedSvg.has(svgRoot)) {
          capturedSvg.add(svgRoot);

          const pageEl = findClosestMeasuredPageElement(svgRoot as any) || findClosestPageElement(svgRoot as any);
          const pageIdx = pageEl ? (pageIndexByEl.get(pageEl) ?? 0) : 0;
          const pageNumber = pageEl
            ? inferPageNumberFromElement(pageEl, pageIdx)
            : ((svgRoot as any).getAttribute?.('data-page') ? Number((svgRoot as any).getAttribute('data-page')) : null);

          const pageRect = pageEl
            ? pageEl.getBoundingClientRect()
            : (syntheticPageRect ?? root.getBoundingClientRect());
          if (pageRect && pageRect.width > 0 && pageRect.height > 0) {
            const svgRect = (svgRoot as any as HTMLElement).getBoundingClientRect();
            const left = svgRect.left - pageRect.left;
            const top = svgRect.top - pageRect.top;
            if (Number.isFinite(left) && Number.isFinite(top)) {
              const sxCandidate = targetPageWidthPx / pageRect.width;
              const syCandidate = targetPageHeightPx / pageRect.height;
              let s = sxCandidate;
              if (Number.isFinite(syCandidate) && syCandidate > 0 && sxCandidate > 0) {
                const relDiff = Math.abs(sxCandidate - syCandidate) / sxCandidate;
                if (relDiff > 0.02) {
                  s = Math.min(sxCandidate, syCandidate);
                }
              }

              const x = roundTo(left * s, roundPx);
              const y = roundTo(top * s, roundPx);
              const w = Number.isFinite(svgRect.width) ? roundTo(svgRect.width * s, roundPx) : null;
              const h = Number.isFinite(svgRect.height) ? roundTo(svgRect.height * s, roundPx) : null;

              const svgSrc = svgOuterHtmlToDataUrl((svgRoot as any as HTMLElement).outerHTML || '');
              if (svgSrc && (w == null || w > 2) && (h == null || h > 2)) {
                const imgKey = [pageNumber ?? 1, roundTo(x, 1), roundTo(y, 1), roundTo((w ?? 0), 1), roundTo((h ?? 0), 1), svgSrc].join('|');
                if (!dedupImage.has(imgKey)) {
                  dedupImage.add(imgKey);
                  images.push({
                    x,
                    y,
                    width: w,
                    height: h,
                    src: svgSrc,
                    alt: null,
                    opacity: opacity != null && Number.isFinite(opacity) && opacity < 1 ? opacity : null,
                    page: pageNumber && Number.isFinite(pageNumber) ? pageNumber : null,
                  });
                }
              }
            }
          }
        }

        continue;
      }

      const pageEl = findClosestMeasuredPageElement(el) || findClosestPageElement(el);
      const pageIdx = pageEl ? (pageIndexByEl.get(pageEl) ?? 0) : 0;
      const pageNumber = pageEl
        ? inferPageNumberFromElement(pageEl, pageIdx)
        : (el.getAttribute('data-page') ? Number(el.getAttribute('data-page')) : null);

      const pageRect = pageEl
        ? pageEl.getBoundingClientRect()
        : (syntheticPageRect ?? root.getBoundingClientRect());
      if (!pageRect || !(pageRect.width > 0) || !(pageRect.height > 0)) continue;

      const elRect = el.getBoundingClientRect();
      const left = elRect.left - pageRect.left;
      const top = elRect.top - pageRect.top;

      if (Number.isFinite(top)) {
        minY = Math.min(minY, top);
        maxY = Math.max(maxY, top);
      }

      if (!Number.isFinite(left) || !Number.isFinite(top)) continue;

      const sxCandidate = targetPageWidthPx / pageRect.width;
      const syCandidate = targetPageHeightPx / pageRect.height;
      let s = sxCandidate;
      if (Number.isFinite(syCandidate) && syCandidate > 0 && sxCandidate > 0) {
        const relDiff = Math.abs(sxCandidate - syCandidate) / sxCandidate;
        if (relDiff > 0.02) {
          s = Math.min(sxCandidate, syCandidate);
        }
      }

      const sx = s;
      const sy = s;

      const x = roundTo(left * sx, roundPx);
      const y = roundTo(top * sy, roundPx);
      const w = Number.isFinite(elRect.width) ? roundTo(elRect.width * sx, roundPx) : null;
      const h = Number.isFinite(elRect.height) ? roundTo(elRect.height * sy, roundPx) : null;

      const bgUrl = parseFirstCssUrl(cs.backgroundImage);
      const tag = (el.tagName || '').toLowerCase();
      if (tag === 'img' || tag === 'svg' || tag === 'canvas' || bgUrl) {
        const svgSrc = tag === 'svg'
          ? svgOuterHtmlToDataUrl(el.outerHTML || '')
          : '';
        const canvasSrc = tag === 'canvas'
          ? (() => {
              try {
                const anyCanvas: any = el as any;
                return typeof anyCanvas.toDataURL === 'function' ? anyCanvas.toDataURL('image/png') : '';
              } catch {
                return '';
              }
            })()
          : '';
        const src = (tag === 'svg'
          ? svgSrc
          : (tag === 'canvas'
            ? canvasSrc
            : (el.getAttribute('src') || el.getAttribute('data-src') || (bgUrl || '')))).trim();
        if (src && (w == null || w > 2) && (h == null || h > 2)) {
          const imgKey = [pageNumber ?? 1, roundTo(x, 1), roundTo(y, 1), roundTo((w ?? 0), 1), roundTo((h ?? 0), 1), src].join('|');
          if (!dedupImage.has(imgKey)) {
            dedupImage.add(imgKey);
            images.push({
              x,
              y,
              width: w,
              height: h,
              src,
              alt: el.getAttribute('alt') || null,
              opacity: opacity != null && Number.isFinite(opacity) && opacity < 1 ? opacity : null,
              page: pageNumber && Number.isFinite(pageNumber) ? pageNumber : null,
            });
          }
        }
      }

      const bwTop = parseCssNumber(cs.borderTopWidth) ?? 0;
      const bwRight = parseCssNumber(cs.borderRightWidth) ?? 0;
      const bwBottom = parseCssNumber(cs.borderBottomWidth) ?? 0;
      const bwLeft = parseCssNumber(cs.borderLeftWidth) ?? 0;
      const bsTop = (cs.borderTopStyle || '').toLowerCase();
      const bsRight = (cs.borderRightStyle || '').toLowerCase();
      const bsBottom = (cs.borderBottomStyle || '').toLowerCase();
      const bsLeft = (cs.borderLeftStyle || '').toLowerCase();
      const bcTop = cs.borderTopColor || '';
      const bcRight = cs.borderRightColor || '';
      const bcBottom = cs.borderBottomColor || '';
      const bcLeft = cs.borderLeftColor || '';

      const ow = parseCssNumber((cs as any).outlineWidth) ?? 0;
      const os = String((cs as any).outlineStyle || '').toLowerCase();
      const oc = String((cs as any).outlineColor || '');

      const sideBorders: Array<{ w: number; s: string; c: string }> = [
        { w: bwTop, s: bsTop, c: bcTop },
        { w: bwRight, s: bsRight, c: bcRight },
        { w: bwBottom, s: bsBottom, c: bcBottom },
        { w: bwLeft, s: bsLeft, c: bcLeft },
      ];

      const borderCandidates = sideBorders
        .filter((b) => b.w > 0 && b.s !== 'none' && !isTransparentColor(b.c));
      const outlineCandidate = ow > 0 && os !== 'none' && !isTransparentColor(oc);

      const borderWidth = borderCandidates.reduce((acc, b) => Math.max(acc, b.w), 0);
      const borderColor = borderCandidates.length ? borderCandidates[0].c : (outlineCandidate ? oc : '');
      const bgColor = cs.backgroundColor || '';
      const hasBorder = borderWidth > 0 || outlineCandidate;
      const hasFill = !isTransparentColor(bgColor);

      const isContainer = el.childElementCount > 0;
      const text = isContainer ? '' : rawText;

      const ww = w ?? 0;
      const hh = h ?? 0;
      const thinLineThickness = Math.max(6, (borderWidth > 0 ? borderWidth * 2 + 2 : 0));
      const isThinLine = (ww >= 40 && hh <= thinLineThickness) || (hh >= 40 && ww <= thinLineThickness);
      const isBoxLike = ww >= 6 && hh >= 6;

      if ((hasBorder || hasFill) && (isBoxLike || isThinLine)) {
        const r1 = parseCssNumber(cs.borderTopLeftRadius);
        const r2 = parseCssNumber(cs.borderTopRightRadius);
        const r3 = parseCssNumber(cs.borderBottomRightRadius);
        const r4 = parseCssNumber(cs.borderBottomLeftRadius);
        const radius = [r1, r2, r3, r4]
          .filter(isFiniteNumber)
          .reduce((acc, n) => Math.max(acc, n), 0);

        const shapeKey = [
          pageNumber ?? 1,
          roundTo(x, 1),
          roundTo(y, 1),
          roundTo((w ?? 0), 1),
          roundTo((h ?? 0), 1),
          hasBorder ? String(borderColor) : '',
          hasBorder ? String(borderWidth) : '',
          hasFill ? String(bgColor) : '',
          radius ? String(radius) : '',
        ].join('|');

        if (!dedupShape.has(shapeKey)) {
          dedupShape.add(shapeKey);

          const isHorizontal = ww >= 40 && hh <= thinLineThickness;
          const isVertical = hh >= 40 && ww <= thinLineThickness;
          const adjW = isVertical && (w ?? 0) <= 0 && borderWidth > 0 ? borderWidth : w;
          const adjH = isHorizontal && (h ?? 0) <= 0 && borderWidth > 0 ? borderWidth : h;

          shapes.push({
            x,
            y,
            width: adjW,
            height: adjH,
            strokeColor: hasBorder ? borderColor : null,
            strokeWidth: hasBorder ? borderWidth : null,
            fillColor: hasFill ? bgColor : null,
            radius: radius ? radius : null,
            opacity: opacity != null && Number.isFinite(opacity) && opacity < 1 ? opacity : null,
            page: pageNumber && Number.isFinite(pageNumber) ? pageNumber : null,
          });
        }
      }

      if (!text.trim()) continue;
      if ((cs.color || '').toLowerCase() === 'transparent') continue;

      const fontSizeRaw = el.getAttribute('data-font-size') || cs.fontSize || null;
      const fontFamilyRaw = el.getAttribute('data-font-family') || cs.fontFamily || null;

      const lhRaw = el.getAttribute('data-line-height') || cs.lineHeight || null;
      const fontSizeNum = parseCssNumber(fontSizeRaw);

      // PDF HTML often includes stable PDF-space coordinates (`data-x`, `data-y`) on the
      // leaf text nodes. Using those yields better alignment with the page SVG drawings
      // than relying on getBoundingClientRect (which is sensitive to font fallback).
      let xForText = x;
      let yForText = y;
      if (pageEl && isLikelyPdfPageElement(pageEl) && pageRect.height > 0) {
        const dataX = parseCssNumber(el.getAttribute('data-x'));
        const dataY = parseCssNumber(el.getAttribute('data-y'));

        const pageCs = win.getComputedStyle(pageEl);
        const borderLeft = parseCssNumber(pageCs.borderLeftWidth) ?? 0;
        const borderTop = parseCssNumber(pageCs.borderTopWidth) ?? 0;
        const padLeft = parseCssNumber(pageCs.paddingLeft) ?? 0;
        const padTop = parseCssNumber(pageCs.paddingTop) ?? 0;

        const originX = borderLeft + padLeft;
        const originY = borderTop + padTop;

        if (dataX != null && dataY != null && Number.isFinite(dataX) && Number.isFinite(dataY)) {
          const fs = fontSizeNum != null && Number.isFinite(fontSizeNum) ? fontSizeNum : 0;
          const topFromPdf = pageRect.height - dataY - fs;
          if (Number.isFinite(topFromPdf)) {
            xForText = roundTo((dataX + originX) * sx, roundPx);
            yForText = roundTo((topFromPdf + originY) * sy, roundPx);
          }
        }
      }

      const lineHeightNormalized = (() => {
        if (!lhRaw) return null;
        const lhStr = String(lhRaw).trim();
        if (lhStr.toLowerCase() !== 'normal') return lhStr;
        if (fontSizeNum != null && fontSizeNum > 0) {
          return `${roundTo(fontSizeNum * 1.2, 2)}px`;
        }
        return null;
      })();

      const key = [
        pageNumber ?? 1,
        roundTo(xForText, 1),
        roundTo(yForText, 1),
        String(fontSizeRaw || ''),
        String(fontFamilyRaw || ''),
        text,
      ].join('|');

      if (dedupText.has(key)) continue;
      dedupText.add(key);

      const frag: AbsFragment = {
        text,
        x: xForText,
        y: yForText,
        width: w,
        height: h,
        fontFamily: fontFamilyRaw,
        fontSize: fontSizeRaw,
        fontWeight: el.getAttribute('data-font-weight') || cs.fontWeight || null,
        fontStyle: el.getAttribute('data-font-style') || cs.fontStyle || null,
        lineHeight: lineHeightNormalized,
        letterSpacing: el.getAttribute('data-letter-spacing') || cs.letterSpacing || null,
        color: el.getAttribute('data-color') || cs.color || null,
        page: pageNumber && Number.isFinite(pageNumber) ? pageNumber : null,
      };

      fragments.push(frag);
    }

    if (debug) {
      const firstPage = pageEls[0];
      const firstRect = firstPage ? firstPage.getBoundingClientRect() : null;
      console.info('[abs-normalizer] layout extraction', {
        pageEls: pageEls.length,
        absElements: absCount,
        fragments: fragments.length,
        images: images.length,
        shapes: shapes.length,
        yRangePx: Number.isFinite(minY) && Number.isFinite(maxY) ? { minY, maxY } : null,
        firstPageRect: firstRect
          ? { w: firstRect.width, h: firstRect.height, x: firstRect.left, y: firstRect.top }
          : null,
      });
    }

    return { fragments, images, shapes };
  } finally {
    iframe.remove();
  }
}

export function detectAbsoluteLayoutHtml(html: string): boolean {
  return /position\s*:\s*absolute/i.test(html);
}

export function normalizeAbsoluteHtmlToFragments(html: string, opts: ConvertOptions = {}): AbsFragment[] {
  const layout = normalizeAbsoluteHtmlToFragmentsViaLayout(html, opts);
  if (layout.fragments.length) return layout.fragments;

  const roundPx = typeof opts.roundPx === 'number' ? opts.roundPx : 2;
  const targetPageWidthPx = typeof opts.pageWidthPx === 'number' ? opts.pageWidthPx : 794;
  const targetPageHeightPx = typeof opts.pageHeightPx === 'number' ? opts.pageHeightPx : 1123;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body || doc.documentElement;

  const pageEls = Array.from(root.querySelectorAll<HTMLElement>('.pdf-page'));
  const pageIndexByEl = new Map<HTMLElement, number>();
  pageEls.forEach((p, idx) => pageIndexByEl.set(p, idx));

  const elements = Array.from(root.querySelectorAll<HTMLElement>('*'))
    .filter((el) => isAbsolutePositioned(el) && !isHiddenElement(el));

  const fragments: AbsFragment[] = [];
  const dedup = new Set<string>();

  for (const el of elements) {
    const pageEl = findClosestPageElement(el);
    const pageIdx = pageEl ? (pageIndexByEl.get(pageEl) ?? 0) : 0;
    const pageNumber = pageEl ? inferPageNumberFromElement(pageEl, pageIdx) : (el.getAttribute('data-page') ? Number(el.getAttribute('data-page')) : null);

    const sourcePageWidth = pageEl ? (parseCssPx(pageEl.style.width) ?? parseCssPx(pageEl.getAttribute('data-width'))) : null;
    const sourcePageHeight = pageEl ? (parseCssPx(pageEl.style.height) ?? parseCssPx(pageEl.getAttribute('data-height'))) : null;
    const sx = sourcePageWidth && sourcePageWidth > 0 ? targetPageWidthPx / sourcePageWidth : 1;
    const sy = sourcePageHeight && sourcePageHeight > 0 ? targetPageHeightPx / sourcePageHeight : 1;

    const left = parseCssPx(el.getAttribute('data-x')) ?? parseCssPx(el.style.left);
    const width = parseCssPx(el.getAttribute('data-width')) ?? parseCssPx(el.style.width);
    const height = parseCssPx(el.getAttribute('data-height')) ?? parseCssPx(el.style.height);

    const top = resolveTopPx(el, sourcePageHeight, height);

    if (left == null || top == null) continue;

    const text = normalizeText(el.textContent || '');
    if (!text.trim()) continue;

    const fontSizeRaw = el.getAttribute('data-font-size') || el.style.fontSize || null;
    const fontFamilyRaw = el.getAttribute('data-font-family') || el.style.fontFamily || null;

    const hasYFlip = elementOrAncestorHasYFlipTransform(el, pageEl);
    const topForLayout = hasYFlip && sourcePageHeight != null
      ? (sourcePageHeight - top - (typeof height === 'number' && Number.isFinite(height) ? height : 0))
      : top;

    const key = [
      pageNumber ?? 1,
      roundTo(left * sx, 1),
      roundTo(topForLayout * sy, 1),
      String(fontSizeRaw || ''),
      String(fontFamilyRaw || ''),
      text.trim(),
    ].join('|');
    if (dedup.has(key)) continue;
    dedup.add(key);

    const frag: AbsFragment = {
      text,
      x: roundTo(left * sx, roundPx),
      y: roundTo(topForLayout * sy, roundPx),
      width: width != null ? roundTo(width * sx, roundPx) : null,
      height: height != null ? roundTo(height * sy, roundPx) : null,
      fontFamily: fontFamilyRaw,
      fontSize: fontSizeRaw,
      fontWeight: el.getAttribute('data-font-weight') || el.style.fontWeight || null,
      fontStyle: el.getAttribute('data-font-style') || el.style.fontStyle || null,
      lineHeight: el.getAttribute('data-line-height') || el.style.lineHeight || null,
      letterSpacing: el.getAttribute('data-letter-spacing') || el.style.letterSpacing || null,
      color: el.getAttribute('data-color') || el.style.color || null,
      page: pageNumber && Number.isFinite(pageNumber) ? pageNumber : null,
    };

    fragments.push(frag);
  }

  return fragments;
}

export function normalizeAbsoluteHtmlToItems(
  html: string,
  opts: ConvertOptions = {},
): { fragments: AbsFragment[]; images: AbsImageItem[]; shapes: AbsShapeItem[] } {
  const layout = normalizeAbsoluteHtmlToFragmentsViaLayout(html, opts);
  if (layout.fragments.length || layout.images.length || layout.shapes.length) return layout;
  return { fragments: normalizeAbsoluteHtmlToFragments(html, opts), images: [], shapes: [] };
}
