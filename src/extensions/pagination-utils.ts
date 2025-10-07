import type { Editor } from '@tiptap/core';
import type { EditorView } from '@tiptap/pm/view';
import type { Selection } from '@tiptap/pm/state';

export interface PaginationExtensionOptions {
  pageHeight: number;
  pageGap: number;
  pageBreakBackground: string;
  pageHeaderHeight: number;
  pageFooterHeight: number;
  pageGapBorderSize: number;
  footerRight: string;
  footerLeft: string;
  headerRight: string;
  headerLeft: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  contentMarginTop: number;
  contentMarginBottom: number;
  pageGapBorderColor: string;
}

export const INSERTION_PADDING_PX = 24;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function resolvePaginationOptions(editor: Editor | null | undefined): PaginationExtensionOptions | null {
  const extension = editor?.extensionManager.extensions.find(ext => ext.name === 'PaginationPlus');
  if (!extension) {
    return null;
  }

  const options = extension.options as Partial<PaginationExtensionOptions> | undefined;
  if (!options) {
    return null;
  }

  const requiredNumericKeys: Array<keyof PaginationExtensionOptions> = [
    'pageHeight',
    'pageGap',
    'pageHeaderHeight',
    'pageFooterHeight',
    'marginTop',
    'marginBottom',
    'contentMarginTop',
    'contentMarginBottom',
  ];

  for (const key of requiredNumericKeys) {
    if (!isFiniteNumber(options[key])) {
      return null;
    }
  }

  return options as PaginationExtensionOptions;
}

export function computeNextPageInsertionPosition(
  options: PaginationExtensionOptions,
  view: EditorView,
  selection: Selection,
  requiredContentHeight: number,
  padding: number = INSERTION_PADDING_PX,
): number | null {
  if (!view || !selection || typeof selection.from !== 'number' || !isFiniteNumber(requiredContentHeight)) {
    return null;
  }

  const headerSpace = options.pageHeaderHeight + options.contentMarginTop + options.marginTop;
  const footerSpace = options.pageFooterHeight + options.contentMarginBottom + options.marginBottom;
  const usableContentHeight = options.pageHeight - headerSpace - footerSpace;

  if (!isFiniteNumber(usableContentHeight) || usableContentHeight <= 0) {
    return null;
  }

  const totalPageSpan = options.pageHeight + options.pageGap;

  let selectionCoords: { top: number; left: number } | null = null;
  try {
    const coords = view.coordsAtPos(selection.from);
    selectionCoords = { top: coords.top, left: coords.left };
  } catch {
    return null;
  }

  if (!selectionCoords) {
    return null;
  }

  const rootRect = (view.dom as HTMLElement).getBoundingClientRect();
  const distanceFromDocTop = selectionCoords.top - rootRect.top;

  if (!isFiniteNumber(distanceFromDocTop)) {
    return null;
  }

  const pageIndex = Math.max(0, Math.floor(distanceFromDocTop / totalPageSpan));
  const offsetInsideCycle = distanceFromDocTop - pageIndex * totalPageSpan;
  const contentOffset = Math.max(0, offsetInsideCycle - headerSpace);
  const remainingSpace = usableContentHeight - contentOffset;
  const requiredSpace = requiredContentHeight + padding;

  if (remainingSpace >= requiredSpace) {
    return null;
  }

  const nextPageTopOffset = (pageIndex + 1) * options.pageHeight + pageIndex * options.pageGap + headerSpace + 1;
  const targetTop = rootRect.top + nextPageTopOffset;
  const targetLeft = Math.min(Math.max(selectionCoords.left, rootRect.left + 16), rootRect.right - 16);

  const nextPos = view.posAtCoords({ left: targetLeft, top: targetTop });

  if (!nextPos || typeof nextPos.pos !== 'number') {
    return view.state.doc.content.size;
  }

  if (nextPos.pos <= selection.from) {
    return view.state.doc.content.size;
  }

  return nextPos.pos;
}
