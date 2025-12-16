import type { AbsColumn, AbsLine, ConvertOptions } from './types';

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function toNum(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

export function detectColumns(lines: AbsLine[], opts: ConvertOptions = {}): AbsColumn[] {
  const mergeGap = typeof opts.xGapSpaceThresholdPx === 'number' ? opts.xGapSpaceThresholdPx * 8 : 48;

  const byPage = new Map<number, AbsLine[]>();
  for (const line of lines) {
    const p = line.page ?? 1;
    if (!byPage.has(p)) byPage.set(p, []);
    byPage.get(p)!.push(line);
  }

  const columns: AbsColumn[] = [];

  for (const [page, pageLines] of byPage.entries()) {
    const xs = pageLines
      .map((l) => toNum(l.x))
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);

    if (xs.length === 0) continue;

    const centers: number[] = [];
    for (const x of xs) {
      const last = centers.length ? centers[centers.length - 1] : null;
      if (last == null || Math.abs(x - last) > mergeGap) {
        centers.push(x);
      }
    }

    for (let i = 0; i < centers.length; i++) {
      const center = centers[i];
      const left = i === 0 ? center : (centers[i - 1] + center) / 2;
      const right = i === centers.length - 1 ? center : (center + centers[i + 1]) / 2;
      columns.push({
        id: uid('col'),
        page,
        left,
        right,
        center,
      });
    }
  }

  return columns;
}

export function assignColumnsToLines(lines: AbsLine[], columns: AbsColumn[]): void {
  const byPage = new Map<number, AbsColumn[]>();
  for (const col of columns) {
    if (!byPage.has(col.page)) byPage.set(col.page, []);
    byPage.get(col.page)!.push(col);
  }

  for (const line of lines) {
    const pageCols = byPage.get(line.page) || [];
    if (pageCols.length === 0) {
      line.columnId = null;
      continue;
    }

    let best: AbsColumn | null = null;
    let bestDist = Infinity;
    for (const col of pageCols) {
      const d = Math.abs((line.x || 0) - col.center);
      if (d < bestDist) {
        bestDist = d;
        best = col;
      }
    }

    line.columnId = best?.id ?? null;
  }
}
