/**
 * Export Utilities
 * Based on DocExCore's export utilities
 * Provides conversion functions for CSS to DOCX units
 */

export const computedStyleToNumber = (
  computed: string,
  unit: string = "px"
): number => {
  switch (unit) {
    case "px":
    default:
      return parseFloat(computed.replace("px", ""));
  }
};

export const pxToTwips = (px: number): number => {
  return px * 15;
};

export const ptToTwips = (pt: number): number => {
  return pt * 20;
};

export const pxToPt = (px: number): number => {
  return px / 1.333333;
};

export const CSS_FONT_TO_WORD_FONT = {
  Times: "Times New Roman",
  Arial: "Arial",
  "Courier New": "Courier New",
  Georgia: "Georgia",
  Garamond: "Garamond",
  Palatino: "Palatino",
  Aptos: "Aptos",
  "Helvetica Neue": "Helvetica",
  "Segoe UI": "Segoe UI",
  Roboto: "Roboto",
  "Open Sans": "Open Sans",
  Lato: "Lato",
  Montserrat: "Montserrat",
  Poppins: "Poppins",
} as const;

export type CSSFont = keyof typeof CSS_FONT_TO_WORD_FONT;

const RGB_REGEX = /rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)/i;

const normalizeHex = (hex: string) =>
  hex
    .replace('#', '')
    .split('')
    .map((char, _idx, arr) => (arr.length === 3 ? char + char : char))
    .join('')
    .slice(0, 6)
    .padEnd(6, '0');

export const cssColorToHex = (color?: string | null): string | undefined => {
  if (!color) return undefined;
  const trimmed = color.trim();
  if (
    !trimmed ||
    trimmed === 'transparent' ||
    trimmed === 'rgba(0, 0, 0, 0)'
  ) {
    return undefined;
  }

  if (trimmed.startsWith('#')) {
    return normalizeHex(trimmed);
  }

  const rgbMatch = trimmed.match(RGB_REGEX);
  if (rgbMatch) {
    const r = Number(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = Number(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = Number(rgbMatch[3]).toString(16).padStart(2, '0');
    const alpha = rgbMatch[4] ? Number(rgbMatch[4]) : 1;
    if (alpha === 0) return undefined;
    return `${r}${g}${b}`.toUpperCase();
  }

  return undefined;
};

export const getComputedColor = (element: HTMLElement): string | undefined => {
  const style = window.getComputedStyle(element);
  return cssColorToHex(style.color);
};

export const getComputedBackgroundColor = (
  element: HTMLElement
): string | undefined => {
  const style = window.getComputedStyle(element);
  return cssColorToHex(style.backgroundColor);
};

/**
 * Get computed font family and map to Word font
 */
export const getComputedFont = (element: HTMLElement): string => {
  const computedStyle = window.getComputedStyle(element);
  const fontFamily = computedStyle.fontFamily;
  
  // Extract font name from quotes
  const cleanFont = fontFamily.replace(/['"]/g, '').split(',')[0].trim();
  
  // Map to Word font or fallback
  return CSS_FONT_TO_WORD_FONT[cleanFont as CSSFont] || cleanFont || "Arial";
};

/**
 * Get computed font size in points
 */
export const getComputedFontSize = (element: HTMLElement): number => {
  const computedStyle = window.getComputedStyle(element);
  const fontSize = computedStyle.fontSize;
  return pxToPt(computedStyleToNumber(fontSize));
};

/**
 * Get computed text alignment
 */
export const getComputedAlignment = (element: HTMLElement): "left" | "center" | "right" | "justify" => {
  const computedStyle = window.getComputedStyle(element);
  const textAlign = computedStyle.textAlign;
  
  switch (textAlign) {
    case "center":
    case "right":
    case "justify":
      return textAlign;
    default:
      return "left";
  }
};

/**
 * Get computed line spacing
 */
export const getComputedLineSpacing = (element: HTMLElement): number => {
  const computedStyle = window.getComputedStyle(element);
  const lineHeight = computedStyle.lineHeight;
  
  if (lineHeight === "normal") return 1.15;
  
  const lineHeightNum = computedStyleToNumber(lineHeight);
  const fontSize = getComputedFontSize(element);
  
  return lineHeightNum / fontSize;
};

/**
 * Get computed margins
 */
export const getComputedMargins = (element: HTMLElement) => {
  const computedStyle = window.getComputedStyle(element);
  
  return {
    top: pxToPt(computedStyleToNumber(computedStyle.marginTop)),
    right: pxToPt(computedStyleToNumber(computedStyle.marginRight)),
    bottom: pxToPt(computedStyleToNumber(computedStyle.marginBottom)),
    left: pxToPt(computedStyleToNumber(computedStyle.marginLeft)),
  };
};

/**
 * Check if element has specific formatting
 */
export const hasFormatting = (element: HTMLElement): {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
} => {
  const computedStyle = window.getComputedStyle(element);
  
  return {
    bold: computedStyle.fontWeight === "bold" || parseInt(computedStyle.fontWeight) >= 700,
    italic: computedStyle.fontStyle === "italic",
    underline: computedStyle.textDecoration.includes("underline"),
    strike: computedStyle.textDecoration.includes("line-through"),
  };
};
