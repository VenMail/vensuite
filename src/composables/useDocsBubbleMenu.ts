import { ref, computed, watch, onUnmounted, type Ref, type Component } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  Text,
  Link as LinkIcon,
  List as BulletListIcon,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Highlighter,
  Eraser,
  BarChart3,
  AArrowUp,
  Type,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Upload,
  Maximize,
  ArrowDown,
  ArrowRight,
  Combine,
  SplitSquareHorizontal,
  Trash2,
} from 'lucide-vue-next';
import { NodeSelection } from '@tiptap/pm/state';
import type { ChartAttrs } from '@/extensions/chart';

export type BubbleAction = {
  key: string;
  icon: Component;
  handler: () => void;
  tooltip: string;
  label: string;
  disabled?: boolean;
  isActive?: boolean;
  className?: string;
  style?: Partial<Record<string, string>>;
};

export function useDocsBubbleMenu(
  editor: Ref<Editor | undefined>,
  isEditorFocused: Ref<boolean>,
  toolbarRef: Ref<any>,
) {
  // --- CSS class constants ---
  const bubbleShellClass = 'flex w-full max-w-[340px] flex-col gap-1 rounded-xl border border-gray-200 bg-white/95 px-2 py-1 text-gray-700 shadow-xl print:hidden dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200';
  const bubbleGridClass = 'flex flex-wrap items-center gap-1';
  const bubbleButtonBase = 'inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-transparent text-gray-600 transition-colors duration-150 hover:bg-gray-100 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-40';
  const bubbleButtonActive = 'border-blue-500 bg-blue-100 text-blue-700 shadow-sm hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-900/60 dark:text-blue-200';
  const bubbleButtonSuccess = 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/60';
  const bubbleButtonDanger = 'text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/60';
  const bubbleOverflowButtonClass = 'flex w-full items-center rounded-md px-2 py-1 text-left text-xs text-gray-600 transition-colors duration-150 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-200 dark:hover:bg-gray-800';
  const bubbleInlineFormClass = 'flex flex-wrap items-center gap-1 pt-1';
  const bubbleInlineInputClass = 'h-8 w-36 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';

  const isMacLike = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test((navigator.platform || ''));
  const linkCtrlClickTooltip = computed(() => isMacLike ? 'Tip: Hold ⌘ and click to open the link.' : 'Tip: Hold Ctrl and click to open the link.');
  const openLinkButtonTooltip = computed(() => isMacLike ? 'Open link in new tab (⌘+Click)' : 'Open link in new tab (Ctrl+Click)');

  // --- Link state ---
  const bubbleLinkUrl = ref('');
  function openBubbleLink() {
    if (!editor.value) return;
    syncBubbleLinkFromEditor(editor.value);
    if (!editor.value.isActive('link')) {
      editor.value.chain().focus().setLink({ href: bubbleLinkUrl.value || 'https://' }).run();
      syncBubbleLinkFromEditor(editor.value);
    }
  }
  function normalizeHref(rawHref: string) {
    if (!rawHref) return '';
    return /^(https?:|mailto:|tel:|ftp:)/i.test(rawHref) ? rawHref : `https://${rawHref}`;
  }
  function openHrefInNewTab(rawHref: string) {
    const trimmed = (rawHref || '').trim();
    if (!trimmed) return;
    window.open(normalizeHref(trimmed), '_blank', 'noopener,noreferrer');
  }
  function applyBubbleLink() {
    if (!editor.value) return;
    const href = (bubbleLinkUrl.value || '').trim();
    if (!href) {
      editor.value.chain().focus().unsetLink().run();
      bubbleLinkUrl.value = '';
    } else {
      const normalized = normalizeHref(href);
      editor.value.chain().focus().setLink({ href: normalized, target: '_blank', rel: 'noopener noreferrer' }).run();
      bubbleLinkUrl.value = normalized;
    }
    isOverflowOpen.value = false;
  }
  function visitBubbleLink() { openHrefInNewTab(bubbleLinkUrl.value || ''); }
  function removeBubbleLink() {
    editor.value?.chain().focus().unsetLink().run();
    bubbleLinkUrl.value = '';
    isOverflowOpen.value = false;
  }
  function syncBubbleLinkFromEditor(activeEditor?: Editor) {
    const instance = activeEditor ?? editor.value;
    if (!instance) return;
    if (instance.isActive('link')) {
      const attrs = instance.getAttributes('link') as any;
      bubbleLinkUrl.value = attrs?.href || '';
    } else {
      bubbleLinkUrl.value = '';
    }
  }

  // --- Image state ---
  const bubbleImageUrl = ref('');
  const bubbleImageAlt = ref('');

  // --- Overflow menu ---
  const isOverflowOpen = ref(false);
  let overflowTimer: ReturnType<typeof setTimeout> | null = null;
  function toggleOverflow() {
    if (!overflowActions.value.length) return;
    isOverflowOpen.value = !isOverflowOpen.value;
    clearOverflowTimer();
  }
  function suspendOverflowClose() { clearOverflowTimer(); }
  function resumeOverflowClose() {
    clearOverflowTimer();
    overflowTimer = setTimeout(() => (isOverflowOpen.value = false), 1200);
  }
  function clearOverflowTimer() {
    if (overflowTimer) { clearTimeout(overflowTimer); overflowTimer = null; }
  }

  // --- Selection type computeds ---
  const isImageEditing = computed(() => {
    if (!editor.value) return false;
    return editor.value.isActive('image') || editor.value.isActive('imagePlus');
  });
  const isTextSelection = computed(() => !!editor.value && !isImageEditing.value && !editor.value.isActive('table') && !editor.value.isActive('chart'));
  const isTableSelection = computed(() => !!editor.value && editor.value.isActive('table'));
  const isTableActiveByClick = ref(false);
  const isLinkEditing = computed(() => !!editor.value && editor.value.isActive('link'));
  const isChartSelection = computed(() => !!editor.value && editor.value.isActive('chart'));

  const bubbleShouldShow = () => {
    const instance = editor.value;
    if (!instance) return false;
    if (isImageEditing.value) return false;
    if (!isEditorFocused.value && !isTableActiveByClick.value) return false;
    const hasSelection = !instance.state.selection.empty;
    if (!hasSelection && !isTableSelection.value && !isTableActiveByClick.value) return false;
    return isTextSelection.value || isTableSelection.value || isTableActiveByClick.value;
  };

  function setTableActiveUI(active: boolean) {
    isTableActiveByClick.value = active;
    const rootEl = editor.value?.view.dom as HTMLElement | undefined;
    if (!rootEl) return;
    if (active) rootEl.classList.add('is-table-active');
    else rootEl.classList.remove('is-table-active');
  }

  // --- Color pickers ---
  const showTextColorPicker = ref(false);
  const showBgColorPicker = ref(false);
  const bubbleTextColor = ref('#000000');
  const bubbleBgColor = ref('#ffff00');
  const showChartTitleEdit = ref(false);
  const chartTitleInput = ref('');
  const showChartFontSizeEdit = ref(false);
  const chartFontSizeInput = ref(12);

  function resetBubbleColorPickers() {
    showTextColorPicker.value = false;
    showBgColorPicker.value = false;
    showChartTitleEdit.value = false;
    showChartFontSizeEdit.value = false;
  }

  const bubbleMenuTippyOptions: Record<string, any> = {
    duration: 100,
    placement: 'top',
    maxWidth: 400,
    onHide: () => { resetBubbleColorPickers(); },
  };

  const currentBubbleTextColor = computed(() => {
    if (!editor.value) return '#000000';
    return editor.value.getAttributes('textStyle')?.color || '#000000';
  });
  const currentBubbleBgColor = computed(() => {
    if (!editor.value) return '#ffff00';
    return editor.value.getAttributes('highlight')?.color || '#ffff00';
  });
  const activeTextColor = computed(() => editor.value?.getAttributes('textStyle')?.color as string | undefined);
  const activeHighlightColor = computed(() => editor.value?.getAttributes('highlight')?.color as string | undefined);

  // --- Image replacement ---
  const showImageUrlDialog = ref(false);
  const imageUrlInput = ref('');

  function closeTiptapBubbleMenu(): void {
    const tippies = document.querySelectorAll<HTMLElement>('[data-tippy-root]');
    tippies.forEach((tippy) => {
      const box = tippy.querySelector<HTMLElement>('.tippy-box');
      if (!box) return;
      tippy.style.visibility = 'hidden';
      tippy.style.opacity = '0';
      tippy.style.pointerEvents = 'none';
      const anyTippy = tippy as any;
      if (anyTippy._tippy && typeof anyTippy._tippy.hide === 'function') {
        try { anyTippy._tippy.hide(); } catch { /* ignore */ }
      }
    });
  }

  function openImageUrlDialog() {
    let attrs = editor.value?.getAttributes('image');
    if (!attrs?.src) { attrs = editor.value?.getAttributes('imagePlus'); }
    imageUrlInput.value = attrs?.src || '';
    closeTiptapBubbleMenu();
    showImageUrlDialog.value = true;
    isOverflowOpen.value = false;
  }

  function replaceImageUrl(url: string) {
    if (!editor.value || !url) return;
    const chain = editor.value.chain().focus();
    if (editor.value.isActive('image')) { chain.updateAttributes('image', { src: url }).run(); }
    else if (editor.value.isActive('imagePlus')) { chain.updateAttributes('imagePlus', { src: url }).run(); }
    showImageUrlDialog.value = false;
    imageUrlInput.value = '';
  }

  function openImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !editor.value) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        if (src && editor.value) {
          const chain = editor.value.chain().focus();
          if (editor.value.isActive('image')) { chain.updateAttributes('image', { src }).run(); }
          else if (editor.value.isActive('imagePlus')) { chain.updateAttributes('imagePlus', { src }).run(); }
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  // --- Chart helpers ---
  function getSelectedChartAttrs(): ChartAttrs | null {
    if (!editor.value) return null;
    const { state } = editor.value;
    const { selection } = state;
    if (selection instanceof NodeSelection && selection.node.type.name === 'chart') {
      return { ...(selection.node.attrs as ChartAttrs) };
    }
    let attrs: ChartAttrs | null = null;
    state.doc.nodesBetween(selection.from, selection.to, node => {
      if (!attrs && node.type.name === 'chart') { attrs = { ...(node.attrs as ChartAttrs) }; return false; }
      return undefined;
    });
    return attrs;
  }

  function openChartConfiguratorFromBubble() {
    const attrs = getSelectedChartAttrs();
    if (!attrs) return;
    isOverflowOpen.value = false;
    showChartTitleEdit.value = false;
    showChartFontSizeEdit.value = false;
    closeTiptapBubbleMenu();
    toolbarRef.value?.openChartConfigurator(attrs);
  }

  function toggleChartTitleEdit() {
    const attrs = getSelectedChartAttrs();
    if (!attrs) return;
    showChartTitleEdit.value = !showChartTitleEdit.value;
    showChartFontSizeEdit.value = false;
    if (showChartTitleEdit.value) { chartTitleInput.value = attrs.title || ''; }
  }
  function toggleChartFontSizeEdit() {
    const attrs = getSelectedChartAttrs();
    if (!attrs) return;
    showChartFontSizeEdit.value = !showChartFontSizeEdit.value;
    showChartTitleEdit.value = false;
    if (showChartFontSizeEdit.value) { chartFontSizeInput.value = attrs.fontSize ?? 12; }
  }
  function applyChartTitle() {
    if (!editor.value) return;
    const { selection } = editor.value.state;
    if (selection instanceof NodeSelection && selection.node.type.name === 'chart') {
      editor.value.chain().focus().setNodeSelection(selection.from).updateAttributes('chart', { title: chartTitleInput.value.trim() }).run();
    }
    showChartTitleEdit.value = false;
  }
  function applyChartFontSize() {
    if (!editor.value) return;
    const { selection } = editor.value.state;
    if (selection instanceof NodeSelection && selection.node.type.name === 'chart') {
      editor.value.chain().focus().setNodeSelection(selection.from).updateAttributes('chart', { fontSize: chartFontSizeInput.value }).run();
    }
    showChartFontSizeEdit.value = false;
  }
  function toggleChartLegend() {
    if (!editor.value) return;
    const attrs = getSelectedChartAttrs();
    if (!attrs) return;
    const { selection } = editor.value.state;
    if (selection instanceof NodeSelection && selection.node.type.name === 'chart') {
      editor.value.chain().focus().setNodeSelection(selection.from).updateAttributes('chart', { showLegend: !attrs.showLegend }).run();
    }
  }

  // --- Action definitions ---
  const allTextActions = computed<BubbleAction[]>(() => {
    if (!editor.value) return [];
    const instance = editor.value;
    const highlightStyle = activeHighlightColor.value
      ? { backgroundColor: String(activeHighlightColor.value), color: '#111827' }
      : undefined;

    return [
      { key: 'bold', icon: Bold, handler: () => instance.chain().focus().toggleBold().run(), tooltip: 'Bold (Ctrl+B)', label: 'Bold', isActive: instance.isActive('bold') },
      { key: 'italic', icon: Italic, handler: () => instance.chain().focus().toggleItalic().run(), tooltip: 'Italic (Ctrl+I)', label: 'Italic', isActive: instance.isActive('italic') },
      { key: 'underline', icon: UnderlineIcon, handler: () => instance.chain().focus().toggleUnderline().run(), tooltip: 'Underline (Ctrl+U)', label: 'Underline', isActive: instance.isActive('underline') },
      { key: 'strike', icon: Strikethrough, handler: () => instance.chain().focus().toggleStrike().run(), tooltip: 'Strikethrough', label: 'Strikethrough', isActive: instance.isActive('strike'), className: 'text-gray-500 dark:text-gray-400' },
      { key: 'text', icon: Text, handler: () => instance.chain().focus().setParagraph().run(), tooltip: 'Normal text', label: 'Paragraph', isActive: instance.isActive('paragraph') },
      { key: 'h2', icon: Heading2, handler: () => instance.chain().focus().toggleHeading({ level: 2 }).run(), tooltip: 'Heading 2', label: 'Heading 2', isActive: instance.isActive('heading', { level: 2 }) },
      { key: 'h3', icon: Heading3, handler: () => instance.chain().focus().toggleHeading({ level: 3 }).run(), tooltip: 'Heading 3', label: 'Heading 3', isActive: instance.isActive('heading', { level: 3 }) },
      { key: 'color', icon: Palette, handler: () => {
        const current = instance.getAttributes('textStyle')?.color;
        if (current && current.toLowerCase() === '#2563eb') { instance.chain().focus().unsetColor().run(); }
        else { instance.chain().focus().setColor('#2563eb').run(); }
      }, tooltip: 'Brand foreground color', label: 'Text color', isActive: (instance.getAttributes('textStyle')?.color || '').toLowerCase() === '#2563eb', style: activeTextColor.value ? { color: String(activeTextColor.value) } : undefined },
      { key: 'highlight', icon: Highlighter, handler: () => { /* intercepted by executeAction */ }, tooltip: 'Background color', label: 'Background color', isActive: instance.isActive('highlight'), style: highlightStyle },
      { key: 'clear', icon: Eraser, handler: () => { instance.chain().focus().unsetHighlight().unsetAllMarks().clearNodes().run(); }, tooltip: 'Clear formatting', label: 'Clear formatting', className: 'text-gray-500 dark:text-gray-400' },
      { key: 'bullet-list', icon: BulletListIcon, handler: () => instance.chain().focus().toggleBulletList().run(), tooltip: 'Bulleted list', label: 'Bulleted list', isActive: instance.isActive('bulletList') },
      { key: 'ordered-list', icon: ListOrdered, handler: () => instance.chain().focus().toggleOrderedList().run(), tooltip: 'Numbered list', label: 'Numbered list', isActive: instance.isActive('orderedList') },
      { key: 'align-left', icon: AlignLeft, handler: () => instance.chain().focus().setTextAlign('left').run(), tooltip: 'Align left', label: 'Align left', isActive: instance.isActive({ textAlign: 'left' }) },
      { key: 'align-center', icon: AlignCenter, handler: () => instance.chain().focus().setTextAlign('center').run(), tooltip: 'Align center', label: 'Align center', isActive: instance.isActive({ textAlign: 'center' }) },
      { key: 'align-right', icon: AlignRight, handler: () => instance.chain().focus().setTextAlign('right').run(), tooltip: 'Align right', label: 'Align right', isActive: instance.isActive({ textAlign: 'right' }) },
      { key: 'align-justify', icon: AlignJustify, handler: () => instance.chain().focus().setTextAlign('justify').run(), tooltip: 'Align justify', label: 'Align justify', isActive: instance.isActive({ textAlign: 'justify' }) },
      { key: 'link', icon: LinkIcon, handler: () => openBubbleLink(), tooltip: 'Insert link (Ctrl+K)', label: 'Link', disabled: !instance.can().setLink({ href: '' }), isActive: instance.isActive('link') },
    ];
  });

  const tableActions = computed<BubbleAction[]>(() => {
    if (!editor.value) return [];
    const instance = editor.value;
    return [
      { key: 'add-col', icon: ArrowRight, handler: () => instance.chain().focus().addColumnAfter().run(), tooltip: 'Add column after', label: 'Add column after' },
      { key: 'add-row', icon: ArrowDown, handler: () => instance.chain().focus().addRowAfter().run(), tooltip: 'Add row below', label: 'Add row below' },
      { key: 'merge', icon: Combine, handler: () => instance.chain().focus().mergeCells().run(), tooltip: 'Merge cells', label: 'Merge cells' },
      { key: 'split', icon: SplitSquareHorizontal, handler: () => instance.chain().focus().splitCell().run(), tooltip: 'Split cell', label: 'Split cell' },
      { key: 'align-left-table', icon: AlignLeft, handler: () => instance.chain().focus().setCellAttribute('alignment', 'left').run(), tooltip: 'Align left', label: 'Align left' },
      { key: 'align-center-table', icon: AlignCenter, handler: () => instance.chain().focus().setCellAttribute('alignment', 'center').run(), tooltip: 'Align center', label: 'Align center' },
      { key: 'align-right-table', icon: AlignRight, handler: () => instance.chain().focus().setCellAttribute('alignment', 'right').run(), tooltip: 'Align right', label: 'Align right' },
      { key: 'del-col', icon: Trash2, handler: () => instance.chain().focus().deleteColumn().run(), tooltip: 'Delete column', label: 'Delete column', className: 'text-red-500 dark:text-red-400' },
      { key: 'del-row', icon: Trash2, handler: () => instance.chain().focus().deleteRow().run(), tooltip: 'Delete row', label: 'Delete row', className: 'text-red-500 dark:text-red-400' },
      { key: 'reset-row-height', icon: Maximize, handler: () => instance.chain().focus().resetRowHeight().run(), tooltip: 'Reset row height', label: 'Reset row height' },
    ];
  });

  const imageActions = computed<BubbleAction[]>(() => {
    if (!editor.value) return [];
    const instance = editor.value;
    return [
      { key: 'replace-url', icon: ImageIcon, handler: openImageUrlDialog, tooltip: 'Replace Image', label: 'Replace Image' },
      { key: 'upload-image', icon: Upload, handler: openImageUpload, tooltip: 'Upload new image', label: 'Upload' },
      { key: 'image-align-left', icon: AlignLeft, handler: () => instance.chain().focus().setTextAlign('left').run(), tooltip: 'Align left', label: 'Align left', isActive: instance.isActive({ textAlign: 'left' }) },
      { key: 'image-align-center', icon: AlignCenter, handler: () => instance.chain().focus().setTextAlign('center').run(), tooltip: 'Center image', label: 'Center image', isActive: instance.isActive({ textAlign: 'center' }) },
      { key: 'image-align-right', icon: AlignRight, handler: () => instance.chain().focus().setTextAlign('right').run(), tooltip: 'Align right', label: 'Align right', isActive: instance.isActive({ textAlign: 'right' }) },
      { key: 'delete-image', icon: Trash2, handler: () => instance.chain().focus().deleteSelection().run(), tooltip: 'Delete image', label: 'Delete', className: 'text-red-500 dark:text-red-400' },
    ];
  });

  const chartActions = computed<BubbleAction[]>(() => {
    if (!editor.value) return [];
    const attrs = getSelectedChartAttrs();
    const showLegend = attrs?.showLegend ?? true;
    return [
      { key: 'edit-chart', icon: BarChart3, handler: openChartConfiguratorFromBubble, tooltip: 'Configure chart data', label: 'Configure data' },
      { key: 'chart-title', icon: Type, handler: () => toggleChartTitleEdit(), tooltip: 'Edit chart title', label: 'Title', isActive: showChartTitleEdit.value },
      { key: 'toggle-legend', icon: showLegend ? Eye : EyeOff, handler: () => toggleChartLegend(), tooltip: showLegend ? 'Hide legend' : 'Show legend', label: showLegend ? 'Hide legend' : 'Show legend', isActive: showLegend },
      { key: 'chart-fontsize', icon: AArrowUp, handler: () => toggleChartFontSizeEdit(), tooltip: 'Adjust font size', label: 'Font size', isActive: showChartFontSizeEdit.value },
    ];
  });

  // --- Priority keys ---
  const textPrimaryKeys = ['bold', 'italic', 'underline', 'color', 'highlight', 'link', 'clear'];
  const textOverflowKeys = ['strike', 'bullet-list', 'ordered-list', 'align-left', 'align-center', 'align-right', 'text', 'h2', 'h3'];
  const headingPrimaryKeys = ['h2', 'h3', 'clear', 'text', 'bold', 'italic', 'underline'];
  const headingOverflowKeys = ['strike', 'color', 'highlight', 'link', 'bullet-list', 'ordered-list', 'align-left', 'align-center', 'align-right'];
  const tablePrimaryKeys = ['add-col', 'add-row', 'merge', 'split', 'align-left-table', 'align-center-table', 'align-right-table'];
  const tableOverflowKeys = ['del-col', 'del-row'];
  const imagePrimaryKeys = ['replace-url', 'upload-image', 'image-align-left', 'image-align-center', 'image-align-right', 'delete-image'];
  const chartPrimaryKeys = ['edit-chart', 'chart-title', 'toggle-legend', 'chart-fontsize'];

  function splitActions(
    actions: BubbleAction[],
    primaryOrder: string[],
    overflowOrder: string[],
    excludeKeys: string[] = []
  ) {
    const map = new Map(actions.map((a) => [a.key, a]));
    const primary: BubbleAction[] = [];
    const MAX_PRIMARY = 8;
    primaryOrder.forEach((key) => {
      if (excludeKeys.includes(key) || primary.length >= MAX_PRIMARY) return;
      const action = map.get(key);
      if (action) primary.push(action);
    });
    const used = new Set(primary.map((a) => a.key));
    const overflow: BubbleAction[] = [];
    overflowOrder.forEach((key) => {
      if (excludeKeys.includes(key) || used.has(key)) return;
      const action = map.get(key);
      if (action) overflow.push(action);
    });
    actions.forEach((action) => {
      if (excludeKeys.includes(action.key) || used.has(action.key) || overflow.find((i) => i.key === action.key)) return;
      overflow.push(action);
    });
    return { primary, overflow };
  }

  const actionSets = computed(() => {
    if (isImageEditing.value) return splitActions(imageActions.value, imagePrimaryKeys, []);
    if (isTableSelection.value) return splitActions(tableActions.value, tablePrimaryKeys, tableOverflowKeys);
    if (isChartSelection.value) return splitActions(chartActions.value, chartPrimaryKeys, []);
    if (isTextSelection.value) {
      const isHeading = editor.value?.isActive('heading');
      return splitActions(allTextActions.value, isHeading ? headingPrimaryKeys : textPrimaryKeys, isHeading ? headingOverflowKeys : textOverflowKeys, isLinkEditing.value ? ['link'] : []);
    }
    return { primary: [] as BubbleAction[], overflow: [] as BubbleAction[] };
  });

  const primaryActions = computed(() => actionSets.value.primary);
  const overflowActions = computed(() => actionSets.value.overflow);

  function executeAction(action: BubbleAction, closeOverflow = false) {
    if (action.disabled) return;
    if (action.key === 'color') {
      const shouldShow = !showTextColorPicker.value;
      resetBubbleColorPickers();
      showTextColorPicker.value = shouldShow;
      if (shouldShow) bubbleTextColor.value = currentBubbleTextColor.value;
      return;
    }
    if (action.key === 'highlight') {
      const shouldShow = !showBgColorPicker.value;
      resetBubbleColorPickers();
      showBgColorPicker.value = shouldShow;
      if (shouldShow) bubbleBgColor.value = currentBubbleBgColor.value;
      return;
    }
    action.handler();
    if (closeOverflow) isOverflowOpen.value = false;
  }

  function onBubbleTextColorChange(event: Event) {
    if (!editor.value) return;
    const color = (event.target as HTMLInputElement).value;
    editor.value.chain().focus().setColor(color).run();
    bubbleTextColor.value = color;
  }
  function onBubbleBgColorChange(event: Event) {
    if (!editor.value) return;
    const color = (event.target as HTMLInputElement).value;
    editor.value.chain().focus().setHighlight({ color }).run();
    bubbleBgColor.value = color;
  }

  // --- Watchers ---
  watch([isTextSelection, isTableSelection, isImageEditing, isChartSelection], () => {
    isOverflowOpen.value = false;
    resetBubbleColorPickers();
    clearOverflowTimer();
  });
  watch(isLinkEditing, (active) => {
    if (active) syncBubbleLinkFromEditor(editor.value);
    else bubbleLinkUrl.value = '';
  });
  watch(isImageEditing, (active) => {
    if (active && editor.value) {
      let attrs = editor.value.getAttributes('image') as any;
      if (!attrs?.src) attrs = editor.value.getAttributes('imagePlus') as any;
      bubbleImageUrl.value = attrs?.src || '';
      bubbleImageAlt.value = attrs?.alt || '';
    }
  });
  onUnmounted(() => clearOverflowTimer());

  // --- Link Ctrl+Click handler ---
  function handleLinkCtrlClick(event: MouseEvent): boolean {
    const target = event.target as HTMLElement | null;
    const linkEl = target?.closest('a[href]');
    if (!linkEl) return false;
    const href = linkEl.getAttribute('href') || '';
    if (!href) return false;
    const ctrlOrMeta = isMacLike ? (event.metaKey || event.ctrlKey) : event.ctrlKey;
    if (href.startsWith('#toc:')) {
      if (!ctrlOrMeta) return false;
      event.preventDefault();
      // TOC link handling delegated to parent
      return true;
    }
    if (!ctrlOrMeta) return false;
    event.preventDefault();
    openHrefInNewTab(href);
    return true;
  }

  return {
    // CSS classes
    bubbleShellClass, bubbleGridClass, bubbleButtonBase, bubbleButtonActive,
    bubbleButtonSuccess, bubbleButtonDanger, bubbleOverflowButtonClass,
    bubbleInlineFormClass, bubbleInlineInputClass,
    // Tooltips
    linkCtrlClickTooltip, openLinkButtonTooltip,
    // Link
    bubbleLinkUrl, applyBubbleLink, visitBubbleLink, removeBubbleLink,
    syncBubbleLinkFromEditor, isLinkEditing,
    // Image
    bubbleImageUrl, bubbleImageAlt, isImageEditing,
    showImageUrlDialog, imageUrlInput, replaceImageUrl, openImageUpload,
    // Overflow
    isOverflowOpen, toggleOverflow, suspendOverflowClose, resumeOverflowClose,
    // Selection types
    isTextSelection, isTableSelection, isTableActiveByClick, isChartSelection,
    // Bubble show
    bubbleShouldShow, setTableActiveUI,
    // Color pickers
    showTextColorPicker, showBgColorPicker, bubbleTextColor, bubbleBgColor,
    // Chart
    showChartTitleEdit, chartTitleInput, showChartFontSizeEdit, chartFontSizeInput,
    applyChartTitle, applyChartFontSize,
    // Tippy
    bubbleMenuTippyOptions, resetBubbleColorPickers,
    // Actions
    primaryActions, overflowActions, executeAction,
    onBubbleTextColorChange, onBubbleBgColorChange,
    // Handlers
    handleLinkCtrlClick, handleEditorClick: (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const gapEl = target?.closest('.rm-pagination-gap') as HTMLElement | null;
      if (gapEl) {
        const breakerEl = gapEl.closest('.breaker') as HTMLElement | null;
        if (breakerEl) {
          const isCollapsed = breakerEl.dataset.collapsed === 'true';
          breakerEl.dataset.collapsed = isCollapsed ? 'false' : 'true';
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
      const isOnTable = !!target?.closest('table');
      setTableActiveUI(isOnTable);
    },
    // Utilities
    normalizeHref, openHrefInNewTab, closeTiptapBubbleMenu,
  };
}
