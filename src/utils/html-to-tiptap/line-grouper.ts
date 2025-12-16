import type { AbsFragment, AbsLine, ConvertOptions } from './types';
import { estimateSpaceWidth, estimateTextWidth } from './font-metrics';
import { normalizeFontFamily, extractFontTraits } from './font-map';

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function toNum(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

export function groupIntoLines(fragments: AbsFragment[], opts: ConvertOptions = {}): AbsLine[] {
  const yTolerance = typeof opts.yTolerance === 'number' ? opts.yTolerance : 2;
  const xGapSpace = typeof opts.xGapSpaceThresholdPx === 'number' ? opts.xGapSpaceThresholdPx : 6;

  const sorted = [...fragments].sort((a, b) => {
    const ap = a.page ?? 1;
    const bp = b.page ?? 1;
    if (ap !== bp) return ap - bp;
    if (Math.abs(toNum(a.y) - toNum(b.y)) < yTolerance) return toNum(a.x) - toNum(b.x);
    return toNum(a.y) - toNum(b.y);
  });

  const lines: AbsLine[] = [];

  for (const frag of sorted) {
    const page = frag.page ?? 1;
    const last = lines.length ? lines[lines.length - 1] : undefined;

    if (last && last.page === page && Math.abs(last.y - frag.y) <= yTolerance) {
      last.fragments.push(frag);
    } else {
      lines.push({
        id: uid('line'),
        page,
        y: toNum(frag.y),
        fragments: [frag],
        text: '',
        x: toNum(frag.x),
        width: null,
        fontFamily: frag.fontFamily || null,
        fontSize: frag.fontSize || null,
        fontWeight: frag.fontWeight || null,
        fontStyle: frag.fontStyle || null,
        lineHeight: frag.lineHeight || null,
        letterSpacing: frag.letterSpacing || null,
        color: frag.color || null,
        align: null,
        columnId: null,
        tableId: null,
        row: null,
      });
    }
  }

  for (const line of lines) {
    line.fragments.sort((a, b) => toNum(a.x) - toNum(b.x));

    const first = line.fragments[0];
    line.x = toNum(first.x);

    const baseFontFamily = normalizeFontFamily(first.fontFamily);
    const traits = extractFontTraits(first.fontFamily);

    line.fontFamily = baseFontFamily;
    line.fontWeight = first.fontWeight || traits.weight;
    line.fontStyle = first.fontStyle || traits.style;
    line.fontSize = first.fontSize || null;
    line.lineHeight = first.lineHeight || null;
    line.letterSpacing = first.letterSpacing || null;
    line.color = first.color || null;

    let text = '';
    let cursorX = toNum(first.x);
    const spaceWidth = estimateSpaceWidth(first);

    for (const frag of line.fragments) {
      const gap = toNum(frag.x) - cursorX;

      if (gap > xGapSpace && text.length > 0) {
        const estimatedSpaces = spaceWidth > 0 ? Math.round(gap / spaceWidth) : 1;
        const spaces = Math.max(1, Math.min(10, estimatedSpaces));
        text += ' '.repeat(spaces);
      }

      text += frag.text;
      cursorX = toNum(frag.x) + (frag.width != null ? toNum(frag.width) : estimateTextWidth(frag));
    }

    line.text = text;

    const lastFrag = line.fragments[line.fragments.length - 1];
    const endX = toNum(lastFrag.x) + (lastFrag.width != null ? toNum(lastFrag.width) : estimateTextWidth(lastFrag));
    line.width = Math.max(0, endX - line.x);
  }

  return lines;
}
