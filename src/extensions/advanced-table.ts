import { mergeAttributes, type CommandProps } from '@tiptap/core';
import { Table, type TableOptions } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TableMap, CellSelection } from '@tiptap/pm/tables';

declare module '@tiptap/extension-table' {
  interface TableCommands<ReturnType> {
    addRowAbove: () => ReturnType;
    addRowBelow: () => ReturnType;
    resetRowHeight: () => ReturnType;
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    // Expose globally for chain().addRowBelow() style
    addRowAbove: () => ReturnType;
    addRowBelow: () => ReturnType;
    resetRowHeight: () => ReturnType;
    // Also keep a namespaced variant if consumers prefer grouping
    advancedTable: {
      addRowAbove: () => ReturnType;
      addRowBelow: () => ReturnType;
      resetRowHeight: () => ReturnType;
    };
  }
}

type TableInfo = {
  pos: number;
  start: number;
  node: ProseMirrorNode;
};

type RowResizingDragState = {
  view: EditorView;
  tablePos: number;
  rowIndex: number;
  startY: number;
  startHeight: number;
  lastHeight: number;
  handle: HTMLElement;
};

interface RowResizingOptions {
  minRowHeight: number;
}

const RowResizingPluginKey = new PluginKey('advanced-table-row-resizing');

function buildRowResizeDecorations(doc: ProseMirrorNode): Decoration[] {
  const decorations: Decoration[] = [];

  doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (node.type.spec.tableRole !== 'row') {
      return true;
    }

    // Find parent table
    let tablePos = -1;
    let rowIndex = -1;
    
    doc.nodesBetween(0, doc.content.size, (n, p) => {
      if (n.type.spec.tableRole === 'table') {
        // Check if this row is a child of this table
        let foundRow = false;
        n.forEach((_child, offset, idx) => {
          if (p + 1 + offset === pos) {
            tablePos = p;
            rowIndex = idx;
            foundRow = true;
          }
        });
        if (foundRow) return false;
      }
    });

    if (tablePos === -1 || rowIndex === -1) return;

    // Add decoration to the row node itself
    const rowDeco = Decoration.node(pos, pos + node.nodeSize, {
      class: 'has-row-resize-handle',
      'data-table-pos': String(tablePos),
      'data-row-index': String(rowIndex),
    });

    decorations.push(rowDeco);
  });

  return decorations;
}

function buildColumnResizeDecorations(doc: ProseMirrorNode): Decoration[] {
  const decorations: Decoration[] = [];

  doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (node.type.spec.tableRole !== 'table') {
      return true;
    }

    const tablePos = pos;
    const tableStart = pos + 1;

    // Add column resize handles for first row cells
    if (node.childCount > 0) {
      const firstRow = node.child(0);

      firstRow.forEach((cell, offset, colIndex) => {
        const cellPos = tableStart + offset;
        
        const cellDeco = Decoration.node(cellPos, cellPos + cell.nodeSize, {
          class: 'has-col-resize-handle',
          'data-table-pos': String(tablePos),
          'data-col-index': String(colIndex),
        });

        decorations.push(cellDeco);
      });
    }

    return false;
  });

  return decorations;
}

function applyRowHeight(view: EditorView, tablePos: number, rowIndex: number, targetHeight: number | null, minRowHeight: number): void {
  const { state, dispatch } = view;
  const table = state.doc.nodeAt(tablePos);

  if (!table) return;

  const map = TableMap.get(table);
  const tableStart = tablePos + 1;
  const height = targetHeight === null ? null : Math.max(minRowHeight, Math.round(targetHeight));
  let tr = state.tr;

  for (let col = 0; col < map.width; col++) {
    const cellPos = tableStart + map.positionAt(rowIndex, col, table);
    const cell = tr.doc.nodeAt(cellPos);
    if (!cell) continue;

    const attrs = { ...cell.attrs } as Record<string, unknown>;

    if (height === null) {
      if (attrs.rowHeight !== undefined) {
        delete attrs.rowHeight;
        tr = tr.setNodeMarkup(cellPos, cell.type, attrs, cell.marks);
      }
    } else {
      if (attrs.rowHeight !== height) {
        attrs.rowHeight = height;
        tr = tr.setNodeMarkup(cellPos, cell.type, attrs, cell.marks);
      }
    }
  }

  if (tr.docChanged) {
    dispatch(tr);
  }
}

function getRowHeightFromDOM(view: EditorView, tablePos: number, rowIndex: number): number {
  const tableDom = view.nodeDOM(tablePos) as HTMLElement | null;
  if (!tableDom) return 0;
  const rows = tableDom.querySelectorAll<HTMLTableRowElement>('tr');
  const rowDom = rows?.[rowIndex];
  if (!rowDom) return 0;
  return rowDom.getBoundingClientRect().height;
}

function createRowResizingPlugin(options: RowResizingOptions): Plugin {
  let dragState: RowResizingDragState | null = null;

  const handleMouseMove = (event: MouseEvent) => {
    if (!dragState) return;

    const diff = event.clientY - dragState.startY;
    const nextHeight = Math.max(options.minRowHeight, dragState.startHeight + diff);

    if (Math.abs(nextHeight - dragState.lastHeight) < 0.5) {
      return;
    }

    dragState.lastHeight = nextHeight;
    applyRowHeight(dragState.view, dragState.tablePos, dragState.rowIndex, nextHeight, options.minRowHeight);
  };

  const stopDragging = () => {
    if (!dragState) return;

    dragState.handle.classList.remove('is-dragging');
    dragState = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopDragging);
  };

  return new Plugin({
    key: RowResizingPluginKey,
    props: {
      decorations(state) {
        const rowDecos = buildRowResizeDecorations(state.doc);
        const colDecos = buildColumnResizeDecorations(state.doc);
        return DecorationSet.create(state.doc, [...rowDecos, ...colDecos]);
      },
      handleDOMEvents: {
        mousedown(view, event) {
          const target = event.target as HTMLElement | null;
          if (!target) return false;

          // Check if clicking on row resize handle (::after pseudo-element)
          const tr = target.closest('tr.has-row-resize-handle') as HTMLElement | null;
          if (tr) {
            const rect = tr.getBoundingClientRect();
            const clickY = event.clientY;
            
            // Check if click is in the bottom resize zone (4px)
            if (clickY >= rect.bottom - 4 && clickY <= rect.bottom + 2) {
              const rowIndex = Number(tr.dataset.rowIndex ?? '-1');
              const tablePos = Number(tr.dataset.tablePos ?? '-1');

              if (Number.isNaN(rowIndex) || rowIndex < 0 || Number.isNaN(tablePos) || tablePos < 0) {
                return false;
              }

              event.preventDefault();
              event.stopPropagation();

              const startHeight = getRowHeightFromDOM(view, tablePos, rowIndex) || options.minRowHeight;

              dragState = {
                view,
                rowIndex,
                tablePos,
                startY: event.clientY,
                startHeight,
                lastHeight: startHeight,
                handle: tr,
              };

              tr.classList.add('is-dragging');

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', stopDragging, { once: true });

              return true;
            }
          }

          return false;
        },
      },
    },
    view() {
      return {
        destroy() {
          stopDragging();
        },
      };
    },
  });
}

function getTableInfoFromState(state: EditorState): TableInfo | null {
  const { $from } = state.selection;

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.spec.tableRole === 'table') {
      const pos = $from.before(depth);
      return {
        pos,
        start: pos + 1,
        node,
      };
    }
  }

  return null;
}

function getSelectedRowInfo(state: EditorState) {
  const tableInfo = getTableInfoFromState(state);
  if (!tableInfo) return null;

  const tableStart = tableInfo.start;
  const map = TableMap.get(tableInfo.node);

  let relativePos: number;

  if (state.selection instanceof CellSelection) {
    relativePos = state.selection.$anchorCell.pos - tableStart;
  } else {
    relativePos = state.selection.$head.pos - tableStart;
  }

  const cell = map.findCell(Math.max(0, relativePos));
  if (!cell) return null;

  return {
    tablePos: tableInfo.pos,
    tableNode: tableInfo.node,
    rowIndex: cell.top,
  };
}

function createTemplateRow(tableNode: ProseMirrorNode, rowIndex: number): ProseMirrorNode | null {
  const rowNode = tableNode.child(rowIndex);
  const cells = [] as ProseMirrorNode[];

  for (let i = 0; i < rowNode.childCount; i++) {
    const cell = rowNode.child(i);
    const created = cell.type.createAndFill(cell.attrs, undefined, cell.marks);
    if (!created) {
      return null;
    }
    cells.push(created);
  }

  return rowNode.type.create(rowNode.attrs, cells, rowNode.marks);
}

export const AdvancedTableCell = TableCell.extend({
  name: 'tableCell',
  addAttributes() {
    return {
      ...this.parent?.(),
      rowHeight: {
        default: null,
        parseHTML: element => {
          const dataValue = element.getAttribute('data-row-height');
          if (dataValue) {
            const parsed = parseInt(dataValue, 10);
            return Number.isNaN(parsed) ? null : parsed;
          }

          const styleValue = element.style.height;
          if (styleValue) {
            const parsed = parseInt(styleValue, 10);
            return Number.isNaN(parsed) ? null : parsed;
          }

          return null;
        },
        renderHTML: attributes => {
          if (!attributes.rowHeight) {
            return {};
          }

          const heightValue = `${attributes.rowHeight}px`;
          const existingStyle = attributes.style ? `${attributes.style}; ` : '';

          return {
            'data-row-height': attributes.rowHeight,
            style: `${existingStyle}height: ${heightValue};`,
          };
        },
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ['td', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

export const AdvancedTableHeader = TableHeader.extend({
  name: 'tableHeader',
  addAttributes() {
    return {
      ...this.parent?.(),
      rowHeight: {
        default: null,
        parseHTML: element => {
          const dataValue = element.getAttribute('data-row-height');
          if (dataValue) {
            const parsed = parseInt(dataValue, 10);
            return Number.isNaN(parsed) ? null : parsed;
          }

          const styleValue = element.style.height;
          if (styleValue) {
            const parsed = parseInt(styleValue, 10);
            return Number.isNaN(parsed) ? null : parsed;
          }

          return null;
        },
        renderHTML: attributes => {
          if (!attributes.rowHeight) {
            return {};
          }

          const heightValue = `${attributes.rowHeight}px`;
          const existingStyle = attributes.style ? `${attributes.style}; ` : '';

          return {
            'data-row-height': attributes.rowHeight,
            style: `${existingStyle}height: ${heightValue};`,
          };
        },
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ['th', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

export const AdvancedTableRow = TableRow.extend({
  name: 'tableRow',
});

interface AdvancedTableOptions extends TableOptions {
  rowResizing?: boolean;
  minRowHeight?: number;
}

export const AdvancedTable = Table.extend<AdvancedTableOptions>({
  name: 'table',

  addOptions() {
    return {
      ...this.parent?.(),
      resizable: true,
      rowResizing: true,
      minRowHeight: 24,
    };
  },

  addCommands() {
    const parent = this.parent?.();
    return {
      ...(parent ?? {}),
      addRowAbove:
        () => ({ state, dispatch }: CommandProps) => {
          const info = getSelectedRowInfo(state);
          if (!info || !dispatch) return false;

          const templateRow = createTemplateRow(info.tableNode, info.rowIndex);
          if (!templateRow) return false;

          const map = TableMap.get(info.tableNode);
          const tableStart = info.tablePos + 1;
          const insertPos = tableStart + map.positionAt(info.rowIndex, 0, info.tableNode);

          const tr = state.tr.insert(insertPos, templateRow);
          dispatch(tr);
          return true;
        },
      addRowBelow:
        () => ({ state, dispatch }: CommandProps) => {
          const info = getSelectedRowInfo(state);
          if (!info || !dispatch) return false;

          const templateRow = createTemplateRow(info.tableNode, info.rowIndex);
          if (!templateRow) return false;

          const map = TableMap.get(info.tableNode);
          const tableStart = info.tablePos + 1;
          const insertPos = tableStart + map.positionAt(info.rowIndex + 1, 0, info.tableNode);

          const tr = state.tr.insert(insertPos, templateRow);
          dispatch(tr);
          return true;
        },
      resetRowHeight:
        () => ({ state, view }: CommandProps) => {
          if (!view) return false;
          const info = getSelectedRowInfo(state);
          if (!info) return false;

          applyRowHeight(view, info.tablePos, info.rowIndex, null, this.options?.minRowHeight ?? 24);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const parent = this.parent?.call(this) ?? [];
    if (!this.options?.rowResizing) {
      return parent;
    }

    return [
      ...parent,
      createRowResizingPlugin({
        minRowHeight: this.options?.minRowHeight ?? 24,
      }),
    ];
  },
});
