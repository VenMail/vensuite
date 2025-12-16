import type { AbsPageModel, ConvertOptions, AbsFragment, AbsImageItem, AbsShapeItem } from './types';
import { normalizeAbsoluteHtmlToItems } from './dom-normalizer';
import { groupIntoLines } from './line-grouper';
import { detectColumns, assignColumnsToLines } from './column-detector';
import { inferTablesFromFragments } from './table-inference';
import { detectLineAlignment } from './justification';

function toNum(v: number | null | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export function buildAbsPageModels(html: string, opts: ConvertOptions = {}): AbsPageModel[] {
  const pageWidthPx = typeof opts.pageWidthPx === 'number' ? opts.pageWidthPx : 794;
  const pageHeightPx = typeof opts.pageHeightPx === 'number' ? opts.pageHeightPx : 1123;

  const items = normalizeAbsoluteHtmlToItems(html, opts);
  const pages = new Map<number, { fragments: AbsFragment[]; images: AbsImageItem[]; shapes: AbsShapeItem[] }>();

  const ensure = (page: number) => {
    if (!pages.has(page)) pages.set(page, { fragments: [], images: [], shapes: [] });
    return pages.get(page)!;
  };

  for (const frag of items.fragments) {
    const pageFromSource = frag.page != null;
    let page = frag.page ?? null;
    if (page == null) {
      const inferred = Math.floor(toNum(frag.y) / pageHeightPx) + 1;
      page = inferred > 0 ? inferred : 1;
    }

    const localY = pageFromSource ? toNum(frag.y) : (toNum(frag.y) - (page - 1) * pageHeightPx);

    const next: AbsFragment = {
      ...frag,
      page,
      y: localY,
    };

    ensure(page).fragments.push(next);
  }

  for (const img of items.images) {
    const pageFromSource = img.page != null;
    let page = img.page ?? null;
    if (page == null) {
      const inferred = Math.floor(toNum(img.y) / pageHeightPx) + 1;
      page = inferred > 0 ? inferred : 1;
    }

    const localY = pageFromSource ? toNum(img.y) : (toNum(img.y) - (page - 1) * pageHeightPx);
    const next: AbsImageItem = {
      ...img,
      page,
      y: localY,
    };

    ensure(page).images.push(next);
  }

  for (const shape of items.shapes) {
    const pageFromSource = shape.page != null;
    let page = shape.page ?? null;
    if (page == null) {
      const inferred = Math.floor(toNum(shape.y) / pageHeightPx) + 1;
      page = inferred > 0 ? inferred : 1;
    }

    const localY = pageFromSource ? toNum(shape.y) : (toNum(shape.y) - (page - 1) * pageHeightPx);
    const next: AbsShapeItem = {
      ...shape,
      page,
      y: localY,
    };

    ensure(page).shapes.push(next);
  }

  const models: AbsPageModel[] = [];

  for (const [page, pageItems] of Array.from(pages.entries()).sort((a, b) => a[0] - b[0])) {
    const pageFragments = pageItems.fragments;
    const lines = groupIntoLines(pageFragments, opts);
    const columns = opts.detectColumns ? detectColumns(lines, opts) : [];
    if (columns.length) assignColumnsToLines(lines, columns);
    const tables = inferTablesFromFragments(pageFragments, page, opts);

    // Tag lines that are inside a detected table bbox
    for (const table of tables) {
      for (const line of lines) {
        if (line.tableId) continue;
        const withinY = line.y >= table.bbox.top - 2 && line.y <= table.bbox.bottom + 2;
        const withinX = line.x >= table.bbox.left - 2 && (line.x + (line.width || 0)) <= table.bbox.right + 2;
        if (withinY && withinX) {
          line.tableId = table.id;
        }
      }
    }
    detectLineAlignment(lines, { ...opts, pageWidthPx });

    models.push({
      page,
      widthPx: pageWidthPx,
      heightPx: pageHeightPx,
      fragments: pageFragments,
      images: pageItems.images,
      shapes: pageItems.shapes,
      lines,
      columns,
      tables,
    });
  }

  return models;
}
