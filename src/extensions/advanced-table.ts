import { type CommandProps } from '@tiptap/core';
import { Table, type TableOptions } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TableMap } from '@tiptap/pm/tables';

declare module '@tiptap/extension-table' {
  interface TableCommands<ReturnType> {
    resetRowHeight: () => ReturnType;
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resetRowHeight: () => ReturnType;
    advancedTable: {
      resetRowHeight: () => ReturnType;
    };
  }
}

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
    if (node.type.spec.tableRole !== 'table') {
      return true;
    }

    const tablePos = pos;

    // Create handles positioned at row boundaries by calculating cumulative row heights
    node.forEach((rowNode, rowOffset, rowIndex) => {
      if (rowNode.type.spec.tableRole !== 'row') return;

      // Position handle at the bottom of this row (including the last row)
      const handlePos = pos + 1 + rowOffset + rowNode.nodeSize;

      const handle = Decoration.widget(handlePos, () => {
        const el = document.createElement('div');
        el.className = 'table-row-resize-handle';
        el.dataset.tablePos = String(tablePos);
        el.dataset.rowIndex = String(rowIndex);
        el.style.cssText = `
          position: absolute;
          left: 0;
          right: 0;
          height: 6px;
          cursor: row-resize;
          background: transparent;
          border-top: 2px solid transparent;
          pointer-events: auto;
          opacity: 0;
          transition: opacity 0.12s ease, border-color 0.12s ease;
          z-index: 20;
        `;

        // Position relative to table by calculating row height
        requestAnimationFrame(() => {
          const tableElement = el.closest('table') as HTMLTableElement | null;
          if (tableElement) {
            const rows = tableElement.querySelectorAll('tbody tr, thead tr');
            if (rows[rowIndex]) {
              const rowRect = rows[rowIndex].getBoundingClientRect();
              const tableRect = tableElement.getBoundingClientRect();
              // Position exactly at the bottom border of the row
              const relativeTop = rowRect.bottom - tableRect.top;
              el.style.top = `${relativeTop - 3}px`; // Center the 6px handle on the border
              el.style.position = 'absolute';
            }
          }
        });

        return el;
      }, { side: 0, key: `row-resize-${tablePos}-${rowIndex}` });

      decorations.push(handle);
    });

    return false;
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
        const cellEndPos = tableStart + offset + cell.nodeSize;

        const handle = Decoration.widget(cellEndPos, () => {
          const el = document.createElement('div');
          el.className = 'table-col-resize-handle';
          el.dataset.tablePos = String(tablePos);
          el.dataset.colIndex = String(colIndex);
          el.style.cssText = 'position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; cursor: col-resize; z-index: 20;';
          return el;
        }, { side: -1, key: `col-resize-${tablePos}-${colIndex}` });

        decorations.push(handle);
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
    
    // Update handle positions after applying height
    requestAnimationFrame(() => {
      const handles = view.dom.querySelectorAll('.table-row-resize-handle');
      handles.forEach((handle) => {
        const el = handle as HTMLElement;
        const handleRowIndex = Number(el.dataset.rowIndex ?? '-1');
        const tableElement = el.closest('table') as HTMLTableElement | null;
        
        if (tableElement && handleRowIndex >= 0) {
          const rows = tableElement.querySelectorAll('tbody tr, thead tr');
          if (rows[handleRowIndex]) {
            const rowRect = rows[handleRowIndex].getBoundingClientRect();
            const tableRect = tableElement.getBoundingClientRect();
            const relativeTop = rowRect.bottom - tableRect.top;
            el.style.top = `${relativeTop - 3}px`;
          }
        }
      });
    });
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

  const updateHandlePositions = (view: EditorView) => {
    // Update all handle positions after a resize
    requestAnimationFrame(() => {
      const handles = view.dom.querySelectorAll('.table-row-resize-handle');
      handles.forEach((handle) => {
        const el = handle as HTMLElement;
        const rowIndex = Number(el.dataset.rowIndex ?? '-1');
        const tableElement = el.closest('table') as HTMLTableElement | null;
        
        if (tableElement && rowIndex >= 0) {
          const rows = tableElement.querySelectorAll('tbody tr, thead tr');
          if (rows[rowIndex]) {
            const rowRect = rows[rowIndex].getBoundingClientRect();
            const tableRect = tableElement.getBoundingClientRect();
            const relativeTop = rowRect.bottom - tableRect.top;
            el.style.top = `${relativeTop - 3}px`;
          }
        }
      });
    });
  };

  const stopDragging = () => {
    if (!dragState) return;

    dragState.handle.classList.remove('is-dragging');
    
    // Update handle positions after resize
    updateHandlePositions(dragState.view);
    
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

          // Check if clicking on row resize handle
          if (target.classList.contains('table-row-resize-handle')) {
            const rowIndex = Number(target.dataset.rowIndex ?? '-1');
            const tablePos = Number(target.dataset.tablePos ?? '-1');

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
              handle: target,
            };

            target.classList.add('is-dragging');

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', stopDragging, { once: true });

            return true;
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

function getSelectedRowInfo(state: EditorState) {
  const { $from } = state.selection;
  
  // Find the table by traversing up the document tree
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.spec.tableRole === 'table') {
      const tablePos = $from.before(depth);
      const tableStart = tablePos + 1;
      
      // Find which row we're in by checking parent nodes
      for (let d = depth - 1; d > 0; d--) {
        const parentNode = $from.node(d);
        if (parentNode.type.spec.tableRole === 'row') {
          // Found the row, now find its index
          const rowPos = $from.before(d);
          
          // Calculate row index by finding which row contains this position
          let rowIndex = 0;
          let currentPos = tableStart;
          
          for (let i = 0; i < node.childCount; i++) {
            const row = node.child(i);
            if (row.type.spec.tableRole === 'row') {
              if (currentPos <= rowPos && rowPos < currentPos + row.nodeSize) {
                rowIndex = i;
                break;
              }
              currentPos += row.nodeSize;
            }
          }
          
          return {
            tablePos,
            rowIndex,
            tableNode: node,
          };
        }
      }
      
      // If we're in the table but not in a specific row, default to first row
      return {
        tablePos,
        rowIndex: 0,
        tableNode: node,
      };
    }
  }
  
  return null;
}

export const AdvancedTable = Table.extend<TableOptions & { minRowHeight?: number }>({
  addOptions() {
    return {
      ...this.parent?.(),
      resizable: false,
      minRowHeight: 24,
    };
  },

  addCommands() {
    return {
      ...(this.parent?.() ?? {}),
      // Override resetRowHeight to remove custom row heights
      resetRowHeight:
        () => ({ state, view }: CommandProps) => {
          if (!view) return false;
          const info = getSelectedRowInfo(state);
          if (!info) return false;

          // Use the same applyRowHeight function with null to reset
          applyRowHeight(view, info.tablePos, info.rowIndex, null, this.options?.minRowHeight ?? 24);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const plugins = this.parent?.() ?? [];

    if (this.options.resizable) {
      plugins.push(createRowResizingPlugin({
        minRowHeight: this.options.minRowHeight ?? 24,
      }));
    }

    return plugins;
  },
});

export const AdvancedTableRow = TableRow;

export const AdvancedTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      rowHeight: {
        default: null,
        parseHTML: element => element.getAttribute('data-row-height'),
        renderHTML: attributes => {
          if (!attributes.rowHeight) {
            return {};
          }
          return {
            'data-row-height': attributes.rowHeight,
            style: `height: ${attributes.rowHeight}px`,
          };
        },
      },
    };
  },
});

export const AdvancedTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      rowHeight: {
        default: null,
        parseHTML: element => element.getAttribute('data-row-height'),
        renderHTML: attributes => {
          if (!attributes.rowHeight) {
            return {};
          }
          return {
            'data-row-height': attributes.rowHeight,
            style: `height: ${attributes.rowHeight}px`,
          };
        },
      },
    };
  },
});
