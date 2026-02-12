import { IParagraphOptions, IRunOptions, TextRun } from "docx";
import {
  computedStyleToNumber,
  getComputedAlignment,
  getComputedBackgroundColor,
  getComputedColor,
  getComputedFont,
  getComputedFontSize,
  getComputedLineSpacing,
  getComputedMargins,
  pxToTwips,
} from "../../utils/exportUtils";

export interface SegmentInfo {
  props: IParagraphOptions;
  isFirstSegment: boolean;
}

type RunStyle = {
  bold: boolean;
  italics: boolean;
  underline: boolean;
  strike: boolean;
  font: string;
  size: number; // in points
  color?: string;
  highlight?: string;
};

const DEFAULT_STYLE: RunStyle = {
  bold: false,
  italics: false,
  underline: false,
  strike: false,
  font: "Arial",
  size: 11,
};

interface SegmentOptions {
  includeBackground?: boolean;
}

export class ParagraphHandler {
  public segmentParagraph(
    element: HTMLElement,
    options?: SegmentOptions
  ): SegmentInfo[] {
    const includeBackground = options?.includeBackground ?? true;
    const paragraphOptions = this.buildParagraphOptions(
      element,
      includeBackground
    );
    if (!paragraphOptions) {
      return [];
    }

    return [
      {
        props: paragraphOptions,
        isFirstSegment: true,
      },
    ];
  }

  private buildParagraphOptions(
    element: HTMLElement,
    includeBackground: boolean
  ): IParagraphOptions | null {
    const baseStyle = this.extractStyle(element, DEFAULT_STYLE, includeBackground);
    const runs = this.buildRuns(element, baseStyle);

    if (!runs.length) {
      return null;
    }

    const alignment = this.getAlignment(element);
    const spacing = this.getParagraphSpacing(element);
    const indent = this.getParagraphIndent(element);

    const shadingColor = includeBackground
      ? getComputedBackgroundColor(element)
      : undefined;

    return {
      children: runs,
      alignment,
      spacing,
      ...(indent ? { indent } : {}),
      ...(shadingColor
        ? {
            shading: {
              type: "clear",
              color: shadingColor,
              fill: shadingColor,
            },
          }
        : {}),
    };
  }

  private buildRuns(node: Node, inheritedStyle: RunStyle): TextRun[] {
    const runs: TextRun[] = [];
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? "";
        if (text.length === 0) return;
        const run = this.createTextRun(text, inheritedStyle);
        if (run) {
          runs.push(run);
        }
        return;
      }

      if (child instanceof HTMLElement) {
        if (child.tagName === "BR") {
          runs.push(new TextRun({ break: 1 }));
          return;
        }

        const childStyle = this.extractStyle(child, inheritedStyle, true);
        runs.push(...this.buildRuns(child, childStyle));
      }
    });

    return runs;
  }

  private createTextRun(text: string, style: RunStyle): TextRun | null {
    if (!text) return null;

    const runOptions: IRunOptions = {
      text,
      bold: style.bold || undefined,
      italics: style.italics || undefined,
      underline: style.underline ? {} : undefined,
      strike: style.strike || undefined,
      font: style.font,
      size: Math.max(2, Math.round(style.size * 2)),
      color: style.color,
      shading: style.highlight
        ? {
            type: "clear",
            color: style.highlight,
            fill: style.highlight,
          }
        : undefined,
    };

    return new TextRun(runOptions);
  }

  private extractStyle(
    element: HTMLElement,
    fallback: RunStyle,
    includeBackground = true
  ): RunStyle {
    const computed = window.getComputedStyle(element);

    return {
      bold:
        computed.fontWeight === "bold" ||
        parseInt(computed.fontWeight, 10) >= 700,
      italics: computed.fontStyle === "italic" || computed.fontStyle === "oblique",
      underline: computed.textDecoration.includes("underline"),
      strike: computed.textDecoration.includes("line-through"),
      font: getComputedFont(element) || fallback.font,
      size: getComputedFontSize(element) || fallback.size,
      color: getComputedColor(element) || fallback.color,
      highlight:
        includeBackground
          ? getComputedBackgroundColor(element) || fallback.highlight
          : fallback.highlight,
    };
  }

  private getAlignment(
    element: HTMLElement
  ): "left" | "right" | "center" | "both" {
    const alignment = getComputedAlignment(element);
    if (alignment === "justify") {
      return "both";
    }
    return alignment;
  }

  private getParagraphSpacing(
    element: HTMLElement
  ): IParagraphOptions["spacing"] {
    const margins = getComputedMargins(element);
    const lineSpacingMultiple = getComputedLineSpacing(element);

    return {
      before: Math.max(0, Math.round(margins.top * 20)),
      after: Math.max(0, Math.round(margins.bottom * 20)),
      line: Math.max(240, Math.round(lineSpacingMultiple * 240)),
      lineRule: "auto",
    };
  }

  private getParagraphIndent(
    element: HTMLElement
  ): IParagraphOptions["indent"] | undefined {
    const style = window.getComputedStyle(element);
    const marginLeft = computedStyleToNumber(style.marginLeft);
    const textIndent = computedStyleToNumber(style.textIndent);

    if (!marginLeft && !textIndent) {
      return undefined;
    }

    const indent: IParagraphOptions["indent"] = {
      ...(marginLeft
        ? { left: Math.round(pxToTwips(marginLeft)) }
        : {}),
      ...(textIndent
        ? { firstLine: Math.round(pxToTwips(textIndent)) }
        : {}),
    };

    return indent;
  }
}
