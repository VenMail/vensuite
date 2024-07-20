import Quill from 'quill'

const BlockEmbed = Quill.import('blots/block/embed')

class PageBreakBlot extends BlockEmbed {
  static create() {
    const node = super.create()
    node.setAttribute('contenteditable', 'false')
    node.classList.add('page-break')
    return node
  }

  static value() {
    return {}
  }
}

PageBreakBlot.blotName = 'pageBreak'
PageBreakBlot.tagName = 'div'
PageBreakBlot.className = 'ql-page-break'

Quill.register(PageBreakBlot)
