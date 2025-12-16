import { Node, mergeAttributes } from '@tiptap/core';
import { Fragment } from '@tiptap/pm/model';
import { Plugin, TextSelection } from '@tiptap/pm/state';

function parseCssPx(input: string | null | undefined): number | null {
  if (!input) return null;
  const m = String(input).trim().match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function getInlineStyle(el: HTMLElement, prop: keyof CSSStyleDeclaration): string {
  const anyStyle = el.style as any;
  const v = anyStyle?.[prop];
  return typeof v === 'string' ? v : '';
}

export const AbsBlock = Node.create({
  name: 'absBlock',

  group: 'block',
  content: 'inline*',
  defining: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      x: { default: 0 },
      y: { default: 0 },
      width: { default: null },
      height: { default: null },
      text: { default: '' },
      fontFamily: { default: null },
      fontSize: { default: null },
      fontWeight: { default: null },
      fontStyle: { default: null },
      lineHeight: { default: null },
      letterSpacing: { default: null },
      color: { default: null },
      page: { default: null },
      lineId: { default: null },
      columnId: { default: null },
      tableId: { default: null },
      row: { default: null },
      col: { default: null },
      align: { default: null },
    };
  },

  addProseMirrorPlugins() {
    const META_KEY = 'absBlockFix';
    return [
      new Plugin({
        appendTransaction: (transactions, _oldState, newState) => {
          if (transactions.some((tr) => tr.getMeta(META_KEY))) return null;
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const absBlockType = newState.schema.nodes.absBlock;
          if (!absBlockType) return null;

          const fixes: Array<{ pos: number; nodeSize: number; next: any }> = [];

          newState.doc.descendants((node, pos) => {
            if (node.type !== absBlockType) return;
            const legacyText = typeof (node.attrs as any)?.text === 'string' ? String((node.attrs as any).text) : '';
            if (node.content.size > 0) return;
            if (!legacyText || legacyText.trim().length === 0) return;

            const next = absBlockType.create(node.attrs, Fragment.from(newState.schema.text(legacyText)));
            fixes.push({ pos, nodeSize: node.nodeSize, next });
          });

          if (!fixes.length) return null;

          let tr = newState.tr.setMeta(META_KEY, true);
          for (let i = fixes.length - 1; i >= 0; i -= 1) {
            const f = fixes[i];
            tr = tr.replaceWith(f.pos, f.pos + f.nodeSize, f.next);
          }

          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    const parseNum = (v: unknown): number | null => {
      if (v == null) return null;
      const m = String(v).trim().match(/-?\d+(?:\.\d+)?/);
      if (!m) return null;
      const n = Number(m[0]);
      return Number.isFinite(n) ? n : null;
    };

    const estimateNextLineDeltaY = (attrs: any): number => {
      const h = parseNum(attrs?.height);
      if (h != null && h > 0) return Math.max(12, h);

      const fontSize = parseNum(attrs?.fontSize);
      const lhRaw = attrs?.lineHeight;
      const lhNum = parseNum(lhRaw);

      if (fontSize != null && fontSize > 0 && lhRaw != null) {
        const lhStr = String(lhRaw).trim();
        if (lhStr.endsWith('px')) {
          if (lhNum != null && lhNum > 0) return Math.max(12, lhNum);
        } else if (lhNum != null && lhNum > 0) {
          return Math.max(12, fontSize * lhNum);
        }
      }

      if (fontSize != null && fontSize > 0) return Math.max(12, fontSize * 1.2);
      return 18;
    };

    const nudge = (dx: number, dy: number) => {
      return this.editor.commands.command(({ state, tr, dispatch }) => {
        const { $from } = state.selection;
        const absType = state.schema.nodes.absBlock;
        if (!absType) return false;

        let depth: number | null = null;
        for (let d = $from.depth; d >= 0; d -= 1) {
          if ($from.node(d).type === absType) {
            depth = d;
            break;
          }
        }
        if (depth == null || depth <= 0) return false;

        const node = $from.node(depth);
        const pos = $from.before(depth);
        const attrs: any = node.attrs || {};

        const nextX = (Number(attrs.x) || 0) + dx;
        const nextY = (Number(attrs.y) || 0) + dy;

        tr.setNodeMarkup(pos, undefined, { ...attrs, x: nextX, y: nextY });
        if (dispatch) dispatch(tr);
        return true;
      });
    };

    const splitAndMoveDown = () => {
      return this.editor.commands.command(({ state, tr, dispatch }) => {
        if (!state.selection.empty) return false;

        const { $from } = state.selection;
        const absType = state.schema.nodes.absBlock;
        if (!absType) return false;

        let depth: number | null = null;
        for (let d = $from.depth; d >= 0; d -= 1) {
          if ($from.node(d).type === absType) {
            depth = d;
            break;
          }
        }
        if (depth == null || depth <= 0) return false;

        const node = $from.node(depth);
        const pos = $from.before(depth);

        const cut = Math.max(0, Math.min(node.content.size, state.selection.from - (pos + 1)));
        const before = node.content.cut(0, cut);
        const after = node.content.cut(cut, node.content.size);

        const attrs1: any = { ...(node.attrs || {}), text: '' };
        const deltaY = estimateNextLineDeltaY(attrs1);
        const attrs2: any = { ...attrs1, y: (Number(attrs1.y) || 0) + deltaY, text: '' };

        const node1 = absType.create(attrs1, before);
        const node2 = absType.create(attrs2, after);

        tr = tr.replaceWith(pos, pos + node.nodeSize, [node1, node2]);

        const secondPos = pos + node1.nodeSize;
        const selPos = Math.min(tr.doc.content.size, secondPos + 1);
        tr = tr.setSelection(TextSelection.create(tr.doc, selPos));

        if (dispatch) dispatch(tr.scrollIntoView());
        return true;
      });
    };

    return {
      Enter: () => splitAndMoveDown(),
      'Alt-ArrowDown': () => nudge(0, 5),
      'Alt-ArrowUp': () => nudge(0, -5),
      'Alt-ArrowRight': () => nudge(5, 0),
      'Alt-ArrowLeft': () => nudge(-5, 0),
      'Shift-Alt-ArrowDown': () => nudge(0, 20),
      'Shift-Alt-ArrowUp': () => nudge(0, -20),
      'Shift-Alt-ArrowRight': () => nudge(20, 0),
      'Shift-Alt-ArrowLeft': () => nudge(-20, 0),
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-abs-block], span[data-abs-block]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          return {
            x: parseCssPx(node.getAttribute('data-x')) ?? 0,
            y: parseCssPx(node.getAttribute('data-y')) ?? 0,
            width: parseCssPx(node.getAttribute('data-width')),
            height: parseCssPx(node.getAttribute('data-height')),
            text: node.textContent ?? '',
            fontFamily: node.getAttribute('data-font-family') || null,
            fontSize: node.getAttribute('data-font-size') || null,
            fontWeight: node.getAttribute('data-font-weight') || null,
            fontStyle: node.getAttribute('data-font-style') || null,
            lineHeight: node.getAttribute('data-line-height') || null,
            letterSpacing: node.getAttribute('data-letter-spacing') || null,
            color: node.getAttribute('data-color') || null,
            page: node.getAttribute('data-page') ? Number(node.getAttribute('data-page')) : null,
            lineId: node.getAttribute('data-line-id') || null,
            columnId: node.getAttribute('data-column-id') || null,
            tableId: node.getAttribute('data-table-id') || null,
            row: node.getAttribute('data-row') ? Number(node.getAttribute('data-row')) : null,
            col: node.getAttribute('data-col') ? Number(node.getAttribute('data-col')) : null,
            align: node.getAttribute('data-align') || null,
          };
        },
      },
      {
        tag: 'div[style*="position: absolute"], div[style*="position:absolute"], span[style*="position: absolute"], span[style*="position:absolute"]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          return {
            x: parseCssPx(getInlineStyle(node, 'left')) ?? 0,
            y: parseCssPx(getInlineStyle(node, 'top')) ?? 0,
            width: parseCssPx(getInlineStyle(node, 'width')),
            height: parseCssPx(getInlineStyle(node, 'height')),
            text: node.textContent ?? '',
            fontFamily: getInlineStyle(node, 'fontFamily') || null,
            fontSize: getInlineStyle(node, 'fontSize') || null,
            fontWeight: getInlineStyle(node, 'fontWeight') || null,
            fontStyle: getInlineStyle(node, 'fontStyle') || null,
            lineHeight: getInlineStyle(node, 'lineHeight') || null,
            letterSpacing: getInlineStyle(node, 'letterSpacing') || null,
            color: getInlineStyle(node, 'color') || null,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const {
      x,
      y,
      width,
      height,
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      lineHeight,
      letterSpacing,
      color,
      page,
      lineId,
      columnId,
      tableId,
      row,
      col,
      align,
    } = node.attrs as any;

    const styleParts = [
      'position:absolute',
      `left:${Number(x) || 0}px`,
      `top:${Number(y) || 0}px`,
      'z-index:3',
      width != null ? `width:${width}px` : '',
      height != null ? `height:${height}px` : '',
      fontFamily ? `font-family:${fontFamily}` : '',
      fontSize ? `font-size:${fontSize}` : '',
      fontWeight ? `font-weight:${fontWeight}` : '',
      fontStyle ? `font-style:${fontStyle}` : '',
      lineHeight ? `line-height:${lineHeight}` : '',
      letterSpacing ? `letter-spacing:${letterSpacing}` : '',
      color ? `color:${color}` : '',
      'white-space:pre',
    ].filter(Boolean);

    const dataAttrs: Record<string, any> = {
      'data-abs-block': 'true',
      'data-x': x,
      'data-y': y,
    };

    if (width != null) dataAttrs['data-width'] = width;
    if (height != null) dataAttrs['data-height'] = height;
    if (fontFamily) dataAttrs['data-font-family'] = fontFamily;
    if (fontSize) dataAttrs['data-font-size'] = fontSize;
    if (fontWeight) dataAttrs['data-font-weight'] = fontWeight;
    if (fontStyle) dataAttrs['data-font-style'] = fontStyle;
    if (lineHeight) dataAttrs['data-line-height'] = lineHeight;
    if (letterSpacing) dataAttrs['data-letter-spacing'] = letterSpacing;
    if (color) dataAttrs['data-color'] = color;

    if (page != null) dataAttrs['data-page'] = page;
    if (lineId) dataAttrs['data-line-id'] = lineId;
    if (columnId) dataAttrs['data-column-id'] = columnId;
    if (tableId) dataAttrs['data-table-id'] = tableId;
    if (row != null) dataAttrs['data-row'] = row;
    if (col != null) dataAttrs['data-col'] = col;
    if (align) dataAttrs['data-align'] = align;

    return [
      'div',
      mergeAttributes(dataAttrs, { style: styleParts.join(';') }),
      0,
    ];
  },
});
