import type { ConvertOptions } from './types';
import { detectAbsoluteLayoutHtml } from './dom-normalizer';
import { buildAbsPageModels } from './model';
import { buildAnnotatedAbsoluteHtml } from './build-annotated-html';

export function maybeConvertHtmlToAnnotatedAbsoluteHtml(html: string, opts: ConvertOptions = {}): string | null {
  if (!detectAbsoluteLayoutHtml(html) && !opts.forceLayoutCapture) return null;

  const pages = buildAbsPageModels(html, {
    detectColumns: true,
    inferTables: true,
    detectJustification: true,
    fontFallback: true,
    ...opts,
  });

  if (!pages.length) return null;

  try {
    const fragmentCount = pages.reduce((acc, p) => acc + (p.fragments?.length ?? 0), 0);
    const lineCount = pages.reduce((acc, p) => acc + (p.lines?.length ?? 0), 0);
    const tableCount = pages.reduce((acc, p) => acc + (p.tables?.length ?? 0), 0);
    const firstPage = pages[0];
    const sampleLine = firstPage?.lines?.[0];
    console.info('[abs-convert] built models', {
      pages: pages.length,
      fragments: fragmentCount,
      lines: lineCount,
      tables: tableCount,
      pageSize: {
        widthPx: firstPage?.widthPx,
        heightPx: firstPage?.heightPx,
      },
      sampleLine: sampleLine
        ? { x: sampleLine.x, y: sampleLine.y, text: (sampleLine.text || '').slice(0, 80) }
        : null,
    });
  } catch {
    // ignore
  }

  return buildAnnotatedAbsoluteHtml(pages);
}
