import type { AbsFragment, AbsTable, AbsTableCell, AbsTableRow, ConvertOptions } from './types';

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function toNum(v: number | null | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function groupRows(fragments: AbsFragment[], yTolerance: number): Array<{ y: number; frags: AbsFragment[] }> {
  const sorted = [...fragments].sort((a, b) => toNum(a.y) - toNum(b.y) || toNum(a.x) - toNum(b.x));
  const rows: Array<{ y: number; frags: AbsFragment[] }> = [];

  for (const frag of sorted) {
    const last = rows.length ? rows[rows.length - 1] : null;
    if (last && Math.abs(last.y - toNum(frag.y)) <= yTolerance) {
      last.frags.push(frag);
    } else {
      rows.push({ y: toNum(frag.y), frags: [frag] });
    }
  }

  for (const row of rows) {
    row.frags.sort((a, b) => toNum(a.x) - toNum(b.x));
  }

  return rows;
}

function clusterXs(xs: number[], mergeThreshold: number): number[] {
  const sorted = [...xs].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return [];
  const centers: number[] = [sorted[0]];
  for (const x of sorted.slice(1)) {
    const last = centers[centers.length - 1];
    if (Math.abs(x - last) <= mergeThreshold) {
      centers[centers.length - 1] = (last + x) / 2;
    } else {
      centers.push(x);
    }
  }
  return centers;
}

function rowSignature(row: { frags: AbsFragment[] }, quantize: number): string {
  const sig = row.frags
    .map((f) => Math.round(toNum(f.x) / quantize) * quantize)
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  return sig.join(',');
}

function signatureSimilarity(a: string, b: string): number {
  const sa = new Set(a.split(',').filter(Boolean));
  const sb = new Set(b.split(',').filter(Boolean));
  if (!sa.size && !sb.size) return 1;
  const inter = Array.from(sa).filter((x) => sb.has(x)).length;
  const uni = new Set([...Array.from(sa), ...Array.from(sb)]).size;
  return uni ? inter / uni : 0;
}

export function inferTablesFromFragments(
  fragments: AbsFragment[],
  page: number,
  opts: ConvertOptions = {}
): AbsTable[] {
  if (!opts.inferTables) return [];

  const yTolerance = typeof opts.yTolerance === 'number' ? opts.yTolerance : 2;
  const quantize = 10;
  const mergeThreshold = 18;
  const minCols = 3;
  const minRows = 3;
  const maxRowGap = 18;

  const rows = groupRows(fragments, yTolerance)
    .filter((r) => r.frags.length >= minCols);

  if (rows.length < minRows) return [];

  const tables: AbsTable[] = [];

  let current: Array<{ y: number; frags: AbsFragment[]; sig: string }> = [];
  let lastY: number | null = null;
  let lastSig: string | null = null;

  const flush = () => {
    if (current.length < minRows) {
      current = [];
      lastY = null;
      lastSig = null;
      return;
    }

    const tableId = uid('tbl');
    const allFrags = current.flatMap((r) => r.frags);
    const colCenters = clusterXs(allFrags.map((f) => toNum(f.x)), mergeThreshold);
    if (colCenters.length < minCols) {
      current = [];
      lastY = null;
      lastSig = null;
      return;
    }

    const cells: AbsTableCell[] = [];
    const rowsOut: AbsTableRow[] = [];
    const bbox = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };

    for (let r = 0; r < current.length; r++) {
      const row = current[r];
      const cellText: string[] = new Array(colCenters.length).fill('');

      for (const frag of row.frags) {
        const x = toNum(frag.x);
        let bestCol = 0;
        let bestDist = Infinity;
        for (let c = 0; c < colCenters.length; c++) {
          const d = Math.abs(x - colCenters[c]);
          if (d < bestDist) {
            bestDist = d;
            bestCol = c;
          }
        }

        if (cellText[bestCol].length) cellText[bestCol] += ' ';
        cellText[bestCol] += frag.text;

        const w = toNum(frag.width);
        const h = toNum(frag.height);
        bbox.left = Math.min(bbox.left, x);
        bbox.top = Math.min(bbox.top, toNum(frag.y));
        bbox.right = Math.max(bbox.right, x + (w || 0));
        bbox.bottom = Math.max(bbox.bottom, toNum(frag.y) + (h || 0));
      }

      rowsOut.push({ y: row.y, cells: cellText.map((t) => t.trim()) });

      for (let c = 0; c < colCenters.length; c++) {
        const x = colCenters[c];
        const y = row.y;
        cells.push({ row: r, col: c, x, y, w: 0, h: 0, text: cellText[c].trim() });
      }
    }

    const left = bbox.left === Infinity ? 0 : bbox.left;
    const top = bbox.top === Infinity ? 0 : bbox.top;
    const right = bbox.right === -Infinity ? left : bbox.right;
    const bottom = bbox.bottom === -Infinity ? top : bbox.bottom;

    tables.push({
      id: tableId,
      page,
      bbox: { left, right, top, bottom },
      cells,
      rows: rowsOut,
    });

    current = [];
    lastY = null;
    lastSig = null;
  };

  for (const r of rows) {
    const sig = rowSignature(r, quantize);
    const y = r.y;

    if (lastY != null) {
      const gap = Math.abs(y - lastY);
      const sim = lastSig ? signatureSimilarity(sig, lastSig) : 0;
      const looksContinuous = gap <= maxRowGap && sim >= 0.55;
      if (!looksContinuous) {
        flush();
      }
    }

    current.push({ ...r, sig });
    lastY = y;
    lastSig = sig;
  }

  flush();
  return tables;
}
