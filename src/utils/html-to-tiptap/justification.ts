import type { AbsLine, Alignment, ConvertOptions } from './types';

function toNum(v: number | null | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function countLargeSpaces(text: string): number {
  return (text.match(/\s{2,}/g) || []).length;
}

export function detectLineAlignment(lines: AbsLine[], opts: ConvertOptions = {}): void {
  if (!opts.detectJustification) return;

  const pageWidth = typeof opts.pageWidthPx === 'number' ? opts.pageWidthPx : 794;

  for (const line of lines) {
    const x = toNum(line.x);
    const w = toNum(line.width);
    const right = x + w;

    const leftMargin = x;
    const rightMargin = Math.max(0, pageWidth - right);

    let align: Alignment = 'left';

    if (Math.abs(leftMargin - rightMargin) < 24 && w > pageWidth * 0.3) {
      align = 'center';
    } else if (rightMargin < 24 && w > pageWidth * 0.2) {
      align = 'right';
    } else {
      const largeSpaces = countLargeSpaces(line.text || '');
      if (largeSpaces >= 2 && w > pageWidth * 0.5) {
        align = 'justify';
      } else {
        align = 'left';
      }
    }

    line.align = align;
  }
}
