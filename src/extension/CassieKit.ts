import { Extension } from '@tiptap/core'
import type { BlockquoteOptions } from '@tiptap/extension-blockquote'
import { Blockquote } from '@tiptap/extension-blockquote'
import type { BoldOptions } from '@tiptap/extension-bold'
import { Bold } from '@tiptap/extension-bold'
import type { BulletListOptions } from '@tiptap/extension-bullet-list'
import type { CodeOptions } from '@tiptap/extension-code'
import { Code } from '@tiptap/extension-code'
import type { CodeBlockOptions } from '@tiptap/extension-code-block'
import { CodeBlock } from '@tiptap/extension-code-block'
import type { DropcursorOptions } from '@tiptap/extension-dropcursor'
import { Dropcursor } from '@tiptap/extension-dropcursor'
import { Gapcursor } from '@tiptap/extension-gapcursor'
import { FontFamily } from '@tiptap/extension-font-family'
import type { HardBreakOptions } from '@tiptap/extension-hard-break'
import { HardBreak } from '@tiptap/extension-hard-break'
import type { HeadingOptions } from '@tiptap/extension-heading'
import type { HistoryOptions } from '@tiptap/extension-history'
import { History } from '@tiptap/extension-history'
import type { HorizontalRuleOptions } from '@tiptap/extension-horizontal-rule'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import type { ItalicOptions } from '@tiptap/extension-italic'
import { Italic } from '@tiptap/extension-italic'
import type { HighlightOptions } from '@tiptap/extension-highlight'
import { Highlight } from '@tiptap/extension-highlight'
import type { ListItemOptions } from '@tiptap/extension-list-item'
import type { OrderedListOptions } from '@tiptap/extension-ordered-list'
import { MathExtension } from '@aarkue/tiptap-math-extension'
import type { StrikeOptions } from '@tiptap/extension-strike'
import { Strike } from '@tiptap/extension-strike'
import type { SuperscriptExtensionOptions } from '@tiptap/extension-superscript'
import Superscript from '@tiptap/extension-superscript'
import type { SubscriptExtensionOptions } from '@tiptap/extension-subscript'
import Subscript from '@tiptap/extension-subscript'
import { EmrListItem } from '@/extension/bulletlist/listitem';
import { EmrParagraph } from '@/extension/paragraph/paragraph'
import { SmilieReplacer } from '@/extension/emoji'
import { CassieText } from '@/extension/text/CassieText'
import type { IndentOptions } from '@/extension/indent'
import Indent from '@/extension/indent'
import { Typography } from '@tiptap/extension-typography'
import { TextStyle } from '@tiptap/extension-text-style'
import { PageExtension } from '@/extension/PageExtension'
import type { FocusOptions } from '@/extension/focus/focus'
import { FocusClasses } from '@/extension/focus/focus'
import { EmrHeading } from '@/extension/heading/heading'
import type { TableCellOptions } from '@tiptap/extension-table-cell'
import type { TableHeaderOptions } from '@tiptap/extension-table-header'
import { TableHeader } from '@tiptap/extension-table-header'
import { CassieTableRow } from '@/extension/table/TableRow'
import { CassieTable } from '@/extension/table/Table'
import Link from '@tiptap/extension-link'
import { cursorPlugin } from '@/extension/cursor/cursor'
import type { TableOptions } from '@tiptap/extension-table'
import type { MentionOptions } from '@/extension/suggestion/mention'
import { Mention } from '@/extension/suggestion/mention'
import type { TextAlignOptions } from '@tiptap/extension-text-align'
import TextAlign from '@tiptap/extension-text-align'
import type { PageOptions } from '@/extension/page/types'
import type { ParagraphOptions } from '@tiptap/extension-paragraph'
import Underline from '@tiptap/extension-underline'
import { StrikeThrough } from '@/extension/marks/strikethrough'
import { Insertion } from '@/extension/marks/insertion'
import { Deletion } from '@/extension/marks/deletion'
import { EmrDocument } from '@/extension/doc/document'
import { Document } from '@tiptap/extension-document'
import { PrintExtension } from '@/extension/print/PrintExtension'
import Image from '@tiptap/extension-image'
import { EmrBulletList } from '@/extension/bulletlist/bulletlist'
import CassieBlock from '@/extension/node/CassieBlock'
import { CassieBlockExt } from '@/extension/node/CassieBlockExt'
import { EmrOrderedList } from '@/extension/bulletlist/orderlist'
import { CassieTableCell } from '@/extension/table/TableCell'
import 'katex/dist/katex.min.css'

export interface CassieKitOptions {
  blockquote: Partial<BlockquoteOptions> | false
  bold: Partial<BoldOptions> | false
  bulletList: Partial<BulletListOptions> | false
  code: Partial<CodeOptions> | false
  codeBlock: Partial<CodeBlockOptions> | false
  page: Partial<PageOptions> | false
  table: Partial<TableOptions> | false
  tableHeader: Partial<TableHeaderOptions> | false
  tableCell: Partial<TableCellOptions> | false
  focus: Partial<FocusOptions> | false
  maths: Partial<MentionOptions> | false
  mention: Partial<MentionOptions> | false
  cursor: boolean
  dropcursor: Partial<DropcursorOptions> | false
  gapcursor: false
  indent: Partial<IndentOptions> | false
  superscript: Partial<SuperscriptExtensionOptions> | false
  subscript: Partial<SubscriptExtensionOptions> | false
  hardBreak: Partial<HardBreakOptions> | false
  heading: Partial<HeadingOptions> | false
  history: Partial<HistoryOptions> | false
  horizontalRule: Partial<HorizontalRuleOptions> | false
  italic: Partial<ItalicOptions> | false
  highlight: Partial<HighlightOptions> | false
  listItem: Partial<ListItemOptions> | false
  orderedList: Partial<OrderedListOptions> | false
  paragraph: Partial<ParagraphOptions> | false
  strike: Partial<StrikeOptions> | false
  text: false
  textAlign: Partial<TextAlignOptions> | false
}

export const CassieKit = Extension.create<CassieKitOptions>({
  name: 'CassieKit',
  addProseMirrorPlugins() {
    const plungs: any[] = []
    if (this.options.cursor) {
      plungs.push(cursorPlugin())
    }

    return plungs
  },
  addExtensions() {
    const extensions: any[] = []

    if (this.options.blockquote !== false) {
      extensions.push(Blockquote.configure(this.options?.blockquote))
    }

    if (this.options.bold !== false) {
      extensions.push(Bold.configure(this.options?.bold))
    }

    if (this.options.bulletList !== false) {
      extensions.push(EmrBulletList.configure(this.options?.bulletList))
    }

    if (this.options.code !== false) {
      extensions.push(Code.configure(this.options?.code))
    }

    if (this.options.codeBlock !== false) {
      extensions.push(CodeBlock.configure(this.options?.codeBlock))
    }

    if (this.options.page !== false) {
      extensions.push(PageExtension.configure(this.options?.page))
      /* 顶级文档 */
      extensions.push(EmrDocument)
    }
    else {
      extensions.push(Document)
    }

    if (this.options.dropcursor !== false) {
      extensions.push(Dropcursor.configure(this.options?.dropcursor))
    }

    if (this.options.gapcursor !== false) {
      extensions.push(Gapcursor.configure(this.options?.gapcursor))
    }

    if (this.options.hardBreak !== false) {
      extensions.push(HardBreak.configure(this.options?.hardBreak))
    }

    if (this.options.heading !== false) {
      extensions.push(EmrHeading.configure(this.options?.heading))
    }

    if (this.options.history !== false) {
      extensions.push(History.configure(this.options?.history))
    }

    if (this.options.horizontalRule !== false) {
      extensions.push(HorizontalRule.configure(this.options?.horizontalRule))
    }

    if (this.options.italic !== false) {
      extensions.push(Italic.configure(this.options?.italic))
    }

    if (this.options.highlight !== false) {
      extensions.push(Highlight.configure(this.options?.highlight))
    }
    if (this.options.listItem !== false) {
      extensions.push(EmrListItem.configure(this.options?.listItem))
    }

    if (this.options.orderedList !== false) {
      extensions.push(EmrOrderedList.configure(this.options?.orderedList))
    }

    if (this.options.paragraph !== false) {
      extensions.push(EmrParagraph.configure(this.options?.paragraph))
    }
    if (this.options.strike !== false) {
      extensions.push(Strike.configure(this.options?.strike))
    }

    if (this.options.text !== false) {
      extensions.push(CassieText.configure(this.options?.text))
      extensions.push(TextStyle)
    }
    if (this.options.textAlign !== false) {
      extensions.push(TextAlign.configure(this.options?.textAlign))
    }
    if (this.options.superscript !== false) {
      extensions.push(Superscript.configure(this.options.superscript))
    }
    if (this.options.subscript !== false) {
      extensions.push(Subscript.configure(this.options.subscript))
    }
    if (this.options.indent !== false) {
      extensions.push(Indent.configure(this.options?.indent))
    }
    if (this.options.table !== false) {
      extensions.push(CassieTable.configure(this.options?.table))
      extensions.push(CassieTableRow)
      extensions.push(this.options?.tableHeader ? TableHeader.configure(this.options?.tableHeader) : TableHeader)
      extensions.push(this.options?.tableCell ? CassieTableCell.configure(this.options?.tableCell) : CassieTableCell)
    }
    if (this.options.focus !== false) {
      extensions.push(FocusClasses.configure(this.options?.focus))
    }
    if (this.options.mention !== false) {
      extensions.push(Mention.configure(this.options?.mention))
    }
    if (this.options.maths !== false) {
      extensions.push(MathExtension.configure({ evaluation: false, katexOptions: { macros: { '\\B': '\\mathbb{B}' } } }))
    }
    /* 自定节点 */
    extensions.push(CassieBlock)
    /* 自定义扩展块 */
    extensions.push(CassieBlockExt)
    extensions.push(Underline)
    extensions.push(StrikeThrough)
    extensions.push(Insertion)
    extensions.push(Deletion)
    extensions.push(PrintExtension)
    extensions.push(Link)
    extensions.push(FontFamily)
    extensions.push(Typography)
    extensions.push(SmilieReplacer)

    extensions.push(Image.configure({ inline: true, allowBase64: true }))
    return extensions
  },
})
