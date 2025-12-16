import type { AbsFragment } from './types';

function parseFontSizePx(fontSize?: string | null): number {
  if (!fontSize) return 12;
  const m = String(fontSize).match(/\d+(?:\.\d+)?/);
  if (!m) return 12;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : 12;
}

let canvasCtx: CanvasRenderingContext2D | null = null;

function getCanvasCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (canvasCtx) return canvasCtx;
  const canvas = document.createElement('canvas');
  canvasCtx = canvas.getContext('2d');
  return canvasCtx;
}

export function estimateTextWidth(fragment: AbsFragment): number {
  const text = fragment.text || '';
  if (!text) return 0;

  const ctx = getCanvasCtx();
  const fontSizePx = parseFontSizePx(fragment.fontSize);

  if (ctx) {
    const fontFamily = fragment.fontFamily || 'system-ui, sans-serif';
    const fontWeight = fragment.fontWeight || '400';
    const fontStyle = fragment.fontStyle || 'normal';
    ctx.font = `${fontStyle} ${fontWeight} ${fontSizePx}px ${fontFamily}`;
    const m = ctx.measureText(text);
    if (Number.isFinite(m.width)) return m.width;
  }

  return text.length * fontSizePx * 0.5;
}

export function estimateSpaceWidth(fragment: AbsFragment): number {
  const ctx = getCanvasCtx();
  const fontSizePx = parseFontSizePx(fragment.fontSize);

  if (ctx) {
    const fontFamily = fragment.fontFamily || 'system-ui, sans-serif';
    const fontWeight = fragment.fontWeight || '400';
    const fontStyle = fragment.fontStyle || 'normal';
    ctx.font = `${fontStyle} ${fontWeight} ${fontSizePx}px ${fontFamily}`;
    const m = ctx.measureText(' ');
    if (Number.isFinite(m.width) && m.width > 0) return m.width;
  }

  return fontSizePx * 0.33;
}
