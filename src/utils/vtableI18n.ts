/**
 * DOM-based locale patch for @visactor/vtable-sheet.
 * The library has no i18n API and ships with hardcoded Chinese strings.
 * We intercept via MutationObserver + direct attribute patching.
 *
 * NOTE: spreadsheet_ready event is never emitted by the library (emitReady() is
 * defined but never called). patchVTableSheetLocale() is therefore called from
 * VTableSheet.vue via nextTick after the synchronous constructor completes.
 */

const ZH_EN: Record<string, string> = {
  // Sheet tab navigation (title attributes on buttons)
  '添加工作表': 'Add sheet',
  '向左滚动': 'Scroll left',
  '向右滚动': 'Scroll right',
  '工作表选项': 'Sheet options',
  // Undo/Redo (title attributes)
  '撤销': 'Undo',
  '重做': 'Redo',
  // Formula bar (title and placeholder)
  '输入公式...': 'Enter formula...',
  '插入函数': 'Insert function',
  '确认': 'Confirm',
  '取消': 'Cancel',
  // Context menu — clipboard
  '复制': 'Copy',
  '剪切': 'Cut',
  '粘贴': 'Paste',
  // Context menu — insert columns/rows (label spans, not inputs)
  '向左插入列数：': 'Insert columns left:',
  '向右插入列数：': 'Insert columns right:',
  '向上插入行数：': 'Insert rows above:',
  '向下插入行数：': 'Insert rows below:',
  // Context menu — delete
  '删除行': 'Delete row',
  '删除列': 'Delete column',
  // Context menu — freeze
  '冻结到本行': 'Freeze to this row',
  '冻结到本列': 'Freeze to this column',
  '冻结到本行本列': 'Freeze to row & column',
  '取消冻结': 'Unfreeze',
  // Context menu — merge
  '合并单元格': 'Merge cells',
  '取消合并单元格': 'Unmerge cells',
  // Context menu — other
  '隐藏列': 'Hide column',
  '排序': 'Sort',
  // Context menu — group labels
  '插入': 'Insert',
  '删除': 'Delete',
  '冻结': 'Freeze',
  // Context menu — filter / header (from table-plugins.js)
  '设置筛选器': 'Set filter',
  '取消筛选器': 'Clear filter',
  '首行表头': 'Use first row as header',
  '取消表头': 'Remove header row',
  '启用首行表头': 'Enable first row as header',
  // Formula autocomplete panel
  '函数': 'Functions',
  '单元格': 'Cell',
  '单元格引用': 'Cell reference',
  '垂直查找': 'VLOOKUP',
  '开始选择范围': 'Start range selection',
  '条件判断': 'IF',
  '没有匹配的函数': 'No matching functions',
  '范围': 'Range',
  '计数数值单元格': 'COUNT',
  '计算平均值': 'AVERAGE',
  '计算数值总和': 'SUM',
  '返回最大值': 'MAX',
  '返回最小值': 'MIN',
  '连接文本': 'CONCAT',
  // Snackbar validation messages
  '至少保留一个工作表': 'Must keep at least one sheet',
  '工作表名称已存在，请重新输入': 'Sheet name already exists, please try another',
  '工作表名称不能为空': 'Sheet name cannot be empty',
  '工作表名称不能超过100个字符': 'Sheet name cannot exceed 100 characters',
  '工作表名称不能包含特殊字符，如/ \\ ? * [ ] : |':
    'Sheet name cannot contain special characters: / \\ ? * [ ] : |',
}

// ─── Core helpers ────────────────────────────────────────────────────────────

function translateTextNode(node: Text): void {
  const trimmed = node.textContent?.trim() ?? ''
  if (trimmed && ZH_EN[trimmed]) {
    // Preserve surrounding whitespace
    node.textContent = node.textContent!.replace(trimmed, ZH_EN[trimmed])
  }
}

function translateElement(el: Element): void {
  // Attributes
  const title = el.getAttribute('title')
  if (title && ZH_EN[title]) el.setAttribute('title', ZH_EN[title])

  const placeholder = el.getAttribute('placeholder')
  if (placeholder && ZH_EN[placeholder]) el.setAttribute('placeholder', ZH_EN[placeholder])

  // Recurse into children
  el.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      translateTextNode(child as Text)
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      translateElement(child as Element)
    }
  })
}

// ─── Initial container scan ───────────────────────────────────────────────────

/**
 * Translate all existing title/placeholder attrs and text nodes inside container.
 * Called once after VTableSheet construction (synchronous).
 */
function scanContainer(container: HTMLElement): void {
  translateElement(container)
}

// ─── Context menu observer ────────────────────────────────────────────────────
//
// The context menu manager (vtable-plugins) does:
//   1. document.body.appendChild(emptyContainer)  ← mutation A
//   2. synchronously fills container with items    ← mutation B, C, D…
//
// MutationObserver batches A+B+C+D into one callback invocation (microtask).
// By the time the callback fires the container is fully populated, so we can
// translate via requestAnimationFrame (after browser has laid out the frame).

function observeBodyInjections(): () => void {
  const pendingMenus = new Set<Element>()

  function flush() {
    pendingMenus.forEach((menu) => {
      if (document.body.contains(menu)) translateElement(menu)
    })
    pendingMenus.clear()
  }

  let rafId = 0

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue
        const el = node as Element

        // Context menu root or any ancestor match
        if (el.classList.contains('vtable-context-menu-container')) {
          pendingMenus.add(el)
        }

        // Snackbar: translate immediately (single text node, stable by the time
        // this fires)
        if (el.classList.contains('vtable-sheet-snackbar-message')) {
          const text = el.textContent?.trim() ?? ''
          if (ZH_EN[text]) el.textContent = ZH_EN[text]
        }

        // Formula autocomplete / any other body-level vtable panel
        if (
          el.classList.contains('vtable-formula-autocomplete') ||
          el.classList.contains('vtable-sheet-formula')
        ) {
          pendingMenus.add(el)
        }
      }

      // Children added to an already-present context menu (subtree)
      if ((mutation.target as Element).closest?.('.vtable-context-menu-container')) {
        const menu = (mutation.target as Element).closest!('.vtable-context-menu-container')!
        pendingMenus.add(menu)
      }
    }

    if (pendingMenus.size > 0) {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(flush)
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
  return () => {
    observer.disconnect()
    cancelAnimationFrame(rafId)
  }
}

// ─── Container mutation observer ─────────────────────────────────────────────
//
// Watches the vtable-sheet container for new children (formula autocomplete
// panel, sheet tabs being updated, etc.) and translates them.

function observeContainerMutations(container: HTMLElement): () => void {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // New child elements
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          translateElement(node as Element)
        }
      }
      // Attribute changes on existing elements
      if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
        const el = mutation.target as Element
        const title = el.getAttribute('title')
        if (title && ZH_EN[title]) el.setAttribute('title', ZH_EN[title])
        const ph = el.getAttribute('placeholder')
        if (ph && ZH_EN[ph]) el.setAttribute('placeholder', ZH_EN[ph])
      }
    }
  })

  observer.observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['title', 'placeholder'],
  })
  return () => observer.disconnect()
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Entry point — call this after VTableSheet construction.
 * Scans existing DOM immediately, then watches for dynamic injections.
 * Returns a cleanup function to disconnect all observers.
 */
export function patchVTableSheetLocale(container: HTMLElement): () => void {
  // Translate everything already rendered by the synchronous constructor
  scanContainer(container)

  // Watch for dynamic injections (context menu, snackbar, autocomplete)
  const stopBody = observeBodyInjections()
  const stopContainer = observeContainerMutations(container)

  return () => {
    stopBody()
    stopContainer()
  }
}
