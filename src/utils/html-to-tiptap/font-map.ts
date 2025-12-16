const FONT_FALLBACKS: Record<string, string> = {
  'Arial-BoldMT': 'Arial, Helvetica, sans-serif',
  ArialMT: 'Arial, Helvetica, sans-serif',
  Helvetica: 'Helvetica, Arial, sans-serif',
  TimesNewRomanPSMT: 'Times New Roman, Times, serif',
  CourierNewPSMT: 'Courier New, Courier, monospace',
};

export function normalizeFontFamily(raw?: string | null): string {
  if (!raw) return 'system-ui, sans-serif';

  const cleaned = raw
    .replace(/^[A-Z]{6}\+/, '')
    .trim();

  return FONT_FALLBACKS[cleaned] ?? `${cleaned}, system-ui, sans-serif`;
}

export function extractFontTraits(fontFamily?: string | null): { weight: string; style: string } {
  const lower = (fontFamily || '').toLowerCase();
  return {
    weight: lower.includes('bold') ? '700' : '400',
    style: lower.includes('italic') ? 'italic' : 'normal',
  };
}
