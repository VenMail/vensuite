import { Node, Mark } from "@tiptap/pm/model";
import {
  IParagraphOptions,
  IRunOptions,
  Paragraph,
  TextRun,
  ExternalHyperlink,
  ParagraphChild,
  MathRun,
  Math,
  TabStopType,
  TabStopPosition,
  SequentialIdentifier,
  Bookmark,
  ImageRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  ITableCellOptions,
  InternalHyperlink,
  SimpleField,
  FootnoteReferenceRun,
} from "docx";
import sizeOf from "buffer-image-size";
import { createNumbering, NumberingStyles } from "./numbering";
import { createDocFromState, createShortId } from "./utils";
import { IFootnotes, INumbering, Mutable } from "./types";

export type AlignOptions = "left" | "center" | "right";

export type NodeSerializer = Record<
  string,
  (state: DocxSerializerState, node: Node, parent: Node, index: number) => void
>;

export type MarkSerializer = Record<
  string,
  (state: DocxSerializerState, node: Node, mark: Mark) => IRunOptions
>;

export type Options = {
  getImageBuffer: (src: string) => Buffer;
};

export type IMathOpts = {
  inline?: boolean;
  id?: string | null;
  numbered?: boolean;
};

const MAX_IMAGE_WIDTH = 600;

function createReferenceBookmark(
  id: string,
  kind: "Equation" | "Figure" | "Table",
  before?: string,
  after?: string
) {
  const textBefore = before ? [new TextRun(before)] : [];
  const textAfter = after ? [new TextRun(after)] : [];
  return new Bookmark({
    id,
    children: [...textBefore, new SequentialIdentifier(kind), ...textAfter],
  });
}

export class DocxSerializerState {
  nodes: NodeSerializer;
  options: Options;
  marks: MarkSerializer;
  children: (Paragraph | Table)[];
  numbering: INumbering[];
  footnotes: IFootnotes = {};
  nextRunOpts?: IRunOptions;
  current: ParagraphChild[] = [];
  currentLink?: { link: string; children: IRunOptions[] };
  nextParentParagraphOpts?: IParagraphOptions;
  currentNumbering?: { reference: string; level: number };

  constructor(nodes: NodeSerializer, marks: MarkSerializer, options: Options) {
    this.nodes = nodes;
    this.marks = marks;
    this.options = options ?? {};
    this.children = [];
    this.numbering = [];
  }

  renderContent(parent: Node, opts?: IParagraphOptions) {
    parent.forEach((node, _, i) => {
      if (opts) this.addParagraphOptions(opts);
      this.render(node, parent, i);
    });
  }

  render(node: Node, parent: Node, index: number) {
    if (typeof parent === "number") throw new Error("!");
    if (!this.nodes[node.type.name]) {
      console.log(this.nodes);
      throw new Error(
        `Node \`${node.type.name}\` has no available serialization`
      );
    }
    this.nodes[node.type.name](this, node, parent, index);
  }

  renderMarks(node: Node, marks: Mark[]): IRunOptions {
    return marks
      .map((mark) => {
        return this.marks[mark.type.name]?.(this, node, mark);
      })
      .reduce((a, b) => ({ ...a, ...b }), {});
  }

  renderInline(parent: Node) {
    let currentLink: { link: string; stack: ParagraphChild[] } | undefined;
    const closeLink = () => {
      if (!currentLink) return;
      const hyperlink = new ExternalHyperlink({
        link: currentLink.link,
        children: this.current,
      });
      this.current = [...currentLink.stack, hyperlink];
      currentLink = undefined;
    };
    const openLink = (href: string) => {
      const sameLink = href === currentLink?.link;
      this.addRunOptions({ style: "Hyperlink" });
      const oneLink = true;
      if (!oneLink) {
        closeLink();
      } else {
        if (currentLink && sameLink) return;
        if (currentLink && !sameLink) {
          closeLink();
        }
      }
      currentLink = {
        link: href,
        stack: this.current,
      };
      this.current = [];
    };
    const progress = (node: Node, offset: number, index: number) => {
      const links = node.marks.filter((m) => m.type.name === "link");
      const hasLink = links.length > 0;
      if (hasLink) {
        openLink(links[0].attrs.href);
      } else if (!hasLink && currentLink) {
        closeLink();
      }
      if (node.isText) {
        this.text(node.text, this.renderMarks(node, [...node.marks]));
      } else {
        this.render(node, parent, index);
      }
    };
    parent.forEach(progress);
    closeLink();
  }

  renderList(node: Node, style: NumberingStyles) {
    if (!this.currentNumbering) {
      const nextId = createShortId();
      this.numbering.push(createNumbering(nextId, style));
      this.currentNumbering = { reference: nextId, level: 0 };
    } else {
      const { reference, level } = this.currentNumbering;
      this.currentNumbering = { reference, level: level + 1 };
    }
    this.renderContent(node);
    if (this.currentNumbering.level === 0) {
      delete this.currentNumbering;
    } else {
      const { reference, level } = this.currentNumbering;
      this.currentNumbering = { reference, level: level - 1 };
    }
  }

  renderListItem(node: Node) {
    if (!this.currentNumbering)
      throw new Error("Trying to create a list item without a list?");
    this.addParagraphOptions({ numbering: this.currentNumbering });
    this.renderContent(node);
  }

  addParagraphOptions(opts: IParagraphOptions) {
    this.nextParentParagraphOpts = { ...this.nextParentParagraphOpts, ...opts };
  }

  addRunOptions(opts: IRunOptions) {
    this.nextRunOpts = { ...this.nextRunOpts, ...opts };
  }

  text(text: string | null | undefined, opts?: IRunOptions) {
    if (!text) return;
    this.current.push(new TextRun({ text, ...this.nextRunOpts, ...opts }));
    delete this.nextRunOpts;
  }

  math(latex: string, opts: IMathOpts = { inline: true }) {
    if (opts.inline || !opts.numbered) {
      this.current.push(new Math({ children: [new MathRun(latex)] }));
      return;
    }
    const id = opts.id ?? createShortId();
    this.current = [
      new TextRun("\t"),
      new Math({
        children: [new MathRun(latex)],
      }),
      new TextRun("\t("),
      createReferenceBookmark(id, "Equation"),
      new TextRun(")"),
    ];
    this.addParagraphOptions({
      tabStops: [
        {
          type: TabStopType.CENTER,
          position: TabStopPosition.MAX / 2,
        },
        {
          type: TabStopType.RIGHT,
          position: TabStopPosition.MAX,
        },
      ],
    });
  }

  maxImageWidth = MAX_IMAGE_WIDTH;

  image(src: string, widthPercent = 70, align: AlignOptions = "center") {
    const buffer = this.options.getImageBuffer(src);
    const dimensions = sizeOf(buffer);
    const aspect = dimensions.height / dimensions.width;
    const width = this.maxImageWidth * (widthPercent / 100);
    this.current.push(
      new ImageRun({
        data: buffer,
        transformation: {
          width,
          height: width * aspect,
        },
      })
    );
    let alignment: typeof AlignmentType[keyof typeof AlignmentType];
    switch (align) {
      case "right":
        alignment = AlignmentType.RIGHT;
        break;
      case "left":
        alignment = AlignmentType.LEFT;
        break;
      default:
        alignment = AlignmentType.CENTER;
    }
    this.addParagraphOptions({
      alignment,
    });
  }

  page(node: Node) {
    node.content.forEach(({ content }) => {
      content.forEach((node) => {
        this.renderContent(node);
      });
    });
  }

  table(node: Node) {
    const actualChildren = this.children;
    const rows: TableRow[] = [];
    node.content.forEach(({ content: rowContent }) => {
      const cells: TableCell[] = [];
      let tableHeader = true;
      rowContent.forEach((cell) => {
        if (cell.type.name !== "table_header") {
          tableHeader = false;
        }
      });
      this.maxImageWidth = MAX_IMAGE_WIDTH / rowContent.childCount;
      rowContent.forEach((cell) => {
        this.children = [];
        this.renderContent(cell);
        const tableCellOpts: Mutable<ITableCellOptions> = {
          children: this.children,
        };
        const colspan = cell.attrs.colspan ?? 1;
        const rowspan = cell.attrs.rowspan ?? 1;
        if (colspan > 1) tableCellOpts.columnSpan = colspan;
        if (rowspan > 1) tableCellOpts.rowSpan = rowspan;
        if (tableHeader) {
          tableCellOpts.rowSpan = 1;
          tableCellOpts.shading = {
            fill: "e7e6e6",
            color: "auto",
          };
        }
        cells.push(new TableCell(tableCellOpts));
      });
      this.children = [];
      rows.push(new TableRow({ children: cells }));
    });
    this.maxImageWidth = MAX_IMAGE_WIDTH;
    this.children = actualChildren;
    this.children.push(new Table({ rows }));
  }

  /**
   * 处理标题块
   * @param id
   * @param kind
   * @param suffix
   */
  captionLabel(
    id: string,
    kind: "Figure" | "Table",
    { suffix } = { suffix: ": " }
  ) {
    this.current.push(
      ...[createReferenceBookmark(id, kind, `${kind} `), new TextRun(suffix)]
    );
  }

  $footnoteCounter = 0;

  footnote(node: Node) {
    const { current, nextRunOpts } = this;
    // Delete everything and work with the footnote inline on the current
    this.current = [];
    delete this.nextRunOpts;

    this.$footnoteCounter += 1;
    this.renderInline(node);
    this.footnotes[this.$footnoteCounter] = {
      children: [new Paragraph({ children: this.current })],
    };
    this.current = current;
    this.nextRunOpts = nextRunOpts;
    this.current.push(new FootnoteReferenceRun(this.$footnoteCounter));
  }

  addFootnoteReference(id: number) {
    this.current.push(new FootnoteReferenceRun(id));
  }

  /**
   * 如果调用了这个方法，那么会把当前节点添加到一个新的段落中
   * @param node
   * @param props
   */
  closeBlock(node: Node, props?: IParagraphOptions) {
    const paragraph = new Paragraph({
      children: this.current,
      ...this.nextParentParagraphOpts,
      ...props,
    });
    this.current = [];
    delete this.nextParentParagraphOpts;
    this.children.push(paragraph);
  }

  createReference(id: string, before?: string, after?: string) {
    const children: ParagraphChild[] = [];
    if (before) children.push(new TextRun(before));
    children.push(new SimpleField(`REF ${id} \\h`));
    if (after) children.push(new TextRun(after));
    const ref = new InternalHyperlink({ anchor: id, children });
    this.current.push(ref);
  }

  footnoteReference(node: Node) {
    const id = parseInt(node.attrs.id ?? createShortId(), 10);
    this.footnotes[id] = {
      children: [new Paragraph({ children: [new TextRun(node.textContent)] })],
    };
    this.addFootnoteReference(id);
  }

  finish() {
    return {
      children: this.children,
      numbering: this.numbering,
      footnotes: this.footnotes,
    };
  }
}

export function createDocxSerializer(options: Options) {
  const nodes: NodeSerializer = {
    text(state, node) {
      state.text(node.text);
    },
    paragraph(state, node) {
      state.renderInline(node);
      state.children.push(new Paragraph({ children: state.current }));
      state.current = [];
    },
    heading(state, node) {
      const level = node.attrs.level;
      state.renderInline(node);
      state.children.push(
        new Paragraph({
          children: state.current,
          heading: `Heading${level}` as any,
        })
      );
      state.current = [];
    },
    bullet_list(state, node) {
      state.renderList(node, "bullets");
    },
    ordered_list(state, node) {
      state.renderList(node, "numbered");
    },
    list_item(state, node) {
      state.renderListItem(node);
    },
    image(state, node) {
      state.image(node.attrs.src, node.attrs.widthPercent, node.attrs.align);
    },
    page(state, node) {
      state.page(node);
    },
    table(state, node) {
      state.table(node);
    },
    table_row(state, node) {
      node.content.forEach((cell, i) => {
        state.render(cell, node, i);
      });
    },
    table_cell(state, node) {
      node.content.forEach((block, i) => {
        state.render(block, node, i);
      });
    },
    tableCell(state, node) {
      node.content.forEach((block, i) => {
        state.render(block, node, i);
      });
    },
    footnote_reference(state, node) {
      state.footnoteReference(node);
    },
    math_inline(state, node) {
      state.math(node.textContent, { inline: true });
    },
    math_display(state, node) {
      state.math(node.textContent, { inline: false });
    },
  };

  const marks: MarkSerializer = {
    bold(state, node, mark) {
      return { bold: true };
    },
    italic(state, node, mark) {
      return { italics: true };
    },
    underline(state, node, mark) {
      return { underline: {} };
    },
    link(state, node, mark) {
      return { style: "Hyperlink" };
    },
  };

  return new DocxSerializerState(nodes, marks, options);
}
export class DocxSerializer {
  nodes: NodeSerializer;

  marks: MarkSerializer;

  constructor(nodes: NodeSerializer, marks: MarkSerializer) {
    this.nodes = nodes;
    this.marks = marks;
  }

  serialize(content: Node, options: Options) {
    const state = createDocxSerializer(options);
    state.renderContent(content);
    const doc = createDocFromState(state);
    return doc;
  }
}
