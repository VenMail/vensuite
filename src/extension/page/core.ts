import { Node } from "@tiptap/pm/model";
import { generateHTML } from "@tiptap/html";
import { CassieKit } from "@/extension";
import { SplitContext } from "@/extension/page/computed";
import { PAGE, PARAGRAPH } from "@/extension/nodeNames";

const map = new Map();

/**
 * 计算最后一行是否填满
 * @param cnode
 */
export function getFlag(cnode: Node) {
  const paragraphDOM = document.getElementById(cnode.attrs.id);
  if (!paragraphDOM) return null;
  const width = paragraphDOM.getBoundingClientRect().width;
  const html = generateHTML(getJsonFromDoc(cnode), getExtentions());
  const { width: wordl } = computedWidth(html, false);
  //证明一行都没填满 应当执行 合并
  if (width >= wordl) {
    return false;
  }
  let strLength = 0;
  cnode.descendants((node: Node, pos: number, _: Node | null, _i: number) => {
    //todo 文字计算的时候使用性能较低 需要使用二分查找提高性能
    if (node.isText) {
      const nodeText = node.text;
      if (nodeText) {
        for (let i = 0; i < nodeText.length; i++) {
          const { width: wl } = computedWidth(nodeText.charAt(i));
          if (strLength + wl > width) {
            strLength = wl;
          } else {
            strLength += wl;
          }
        }
      }
    } else {
      const html = generateHTML(getJsonFromDoc(node), getExtentions());
      const { width: wordl } = computedWidth(html);
      if (strLength + wordl > width) {
        strLength = wordl;
      } else {
        strLength += wordl;
      }
    }
  });
  const space = parseFloat(window.getComputedStyle(paragraphDOM).getPropertyValue("font-size"));
  return Math.abs(strLength - width) < space;
}

/**
 * Optimized calculation of node's width and overflow position.
 * @param {Node} node - The node to calculate overflow for.
 * @param {number} width - The available width.
 * @param {SplitContext} splitContex - The context for splitting.
 * @returns {{strLength: number, index: number}} The overflow width and index.
 */
function calculateNodeOverflowWidthAndPoint(node:Node, width:number, splitContex: SplitContext) {
  let strLength = 0;
  let allHeight = 0;
  let maxHeight = 0;
  let index = 0;
  let isFlag = true;

  // Cache for node dimensions to avoid recomputation.
  const dimensionsCache = new Map();

  node.descendants((node: Node, pos: number) => {
    if (!isFlag) return false;

    let content = node.isText ? node.text : generateHTML(getJsonFromDoc(node), getExtentions());

    let isMarkd = false;
    if (node.marks.length) isMarkd = true;

    if (isMarkd && content != " ") {
      content = generateHTML(getJsonFromDoc(node), getExtentions())
    }

    if (dimensionsCache.has(content)) {
      // Retrieve cached dimensions.
      var { width: nodeWidth, height } = dimensionsCache.get(content);
    } else {
      // Compute and cache dimensions.
      if (!content) {
        isFlag = false;
        return false;        
      }
      var { width: nodeWidth, height } = computedWidth(content);
      dimensionsCache.set(content, { nodeWidth, height });
    }

    if (strLength + nodeWidth > width) {
      allHeight += maxHeight;
      if (splitContex.isOverflow(allHeight)) {
        isFlag = false;
        return false;
      }
      index = pos + (node.isText ? 1 : node.nodeSize);
      strLength = nodeWidth;
      maxHeight = height;
    } else {
      maxHeight = Math.max(maxHeight, height);
      strLength += nodeWidth;
    }
    return true;
  });

  return { strLength, index };
}

/**
 *获取段落里最后一个需要分页的地方
 * 行内中文字符和英文字符宽度超过 段落宽度 计算
 * 没有超过直接返回null
 * 由于行内有可能含有图片 不需要计算图片
 * @param cnode
 * @param dom
 */
export function getBreakPos(cnode: Node, dom: HTMLElement, splitContex: SplitContext) {
  if (!dom) return null;

  const width = dom.offsetWidth;
  const html = generateHTML(getJsonFromDoc(cnode), getExtentions());
  const { width: wordl } = computedWidth(html, false);

  if (width >= wordl) {
    return null;
  }

  const { index } = calculateNodeOverflowWidthAndPoint(cnode, width, splitContex);
  return index ? index : null;
}

/**
 * 工具类
 * @param node
 */
export function getJsonFromDoc(node: Node) {
  return {
    type: "doc",
    content: [node.toJSON()]
  };
}

export function getJsonFromDocForJson(json: any) {
  return {
    type: "doc",
    content: [json]
  };
}

export function getExtentions() {
  return [
    CassieKit.configure({
      textAlign: { types: ["heading", "paragraph"] },
      highlight: {
        multicolor: true
      },
      table: {
        HTMLAttributes: {
          class: "border-collapse border border-slate-400"
        }
      },
      tableCell: {
        HTMLAttributes: {
          class: "border border-slate-300"
        }
      },
      tableHeader: {
        HTMLAttributes: {
          class: "border border-slate-300"
        }
      },
      page: false,
      focus: false,
      history: false
    })
  ];
}

/**
 * @description 获取节点高度 根据id获取dom高度
 * @author Cassie
 * @method getBlockHeight
 */
export function getBlockHeight(node: Node): number {
  const paragraphDOM = document.getElementById(node.attrs.id);
  if (paragraphDOM) {
    return paragraphDOM.offsetHeight;
  }
  return 0;
}

export class UnitConversion {
  arrDPI: any[] = [];

  constructor() {
    const arr: any[] = [];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (window.screen.deviceXDPI) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      arr.push(window.screen.deviceXDPI);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      arr.push(window.screen.deviceYDPI);
    } else {
      const tmpNode: HTMLElement = document.createElement("DIV");
      tmpNode.style.cssText = "width:1in;height:1in;position:absolute;left:0px;top:0px;z-index:-99;visibility:hidden";
      document.body.appendChild(tmpNode);
      arr.push(tmpNode.offsetWidth);
      arr.push(tmpNode.offsetHeight);
      if (tmpNode && tmpNode.parentNode) {
        tmpNode.parentNode.removeChild(tmpNode);
      }
    }
    this.arrDPI = arr;
  }

  /**
   * @description px to mm
   * @param value px值
   */
  pxConversionMm(value: number): number {
    const inch = value / this.arrDPI[0];
    const c_value = inch * 25.4;
    return Number(c_value.toFixed());
  }

  /**
   * @description mm to px
   * @param value px值
   */
  mmConversionPx(value: number) {
    const inch = value / 25.4;
    const c_value = inch * this.arrDPI[0];
    return Number(c_value.toFixed());
  }
}

const dimensionsCache = new Map();

/**
 * Computes and caches the width and height of an HTML string.
 * @param {string} html - The HTML string to compute dimensions for.
 * @param {boolean} cache - Whether to cache the result.
 * @returns {{width: number, height: number}} The dimensions of the HTML.
 */
function computedWidth(html:string, cache = true) {
  // Check if the result is already cached.
  if (cache && dimensionsCache.has(html)) {
    return dimensionsCache.get(html);
  }

  // Compute the dimensions.
  const computedSpan = document.getElementById('computedspan');
  if (!computedSpan) {
    return { height: 0, width: 0 };
  }

  // Use innerText for text content to avoid parsing HTML.
  computedSpan.innerText = html === ' ' ? '\u00A0' : html;
  const dimensions = {
    width: computedSpan.offsetWidth,
    height: computedSpan.offsetHeight
  };

  // Cache the result for future constant time access.
  if (cache) {
    dimensionsCache.set(html, dimensions);
  }

  // Reset the computedSpan content.
  computedSpan.innerText = '\u00A0';
  return dimensions;
}

// export function computedWidth(html: string, cache = true) {
//   if (map.has(html)) {
//     return map.get(html);
//   }

//   const computedSpan = document.getElementById("computedspan");
//   if (!computedSpan) return { height: 0, width: 0 };

//   const previousHTML = computedSpan.innerHTML;
//   computedSpan.innerHTML = html === " " ? "&nbsp;" : html;

//   const rect = computedSpan.getBoundingClientRect();
//   const dimensions = { height: rect.height, width: rect.width };

//   if (cache) {
//     map.set(html, dimensions);
//   }

//   computedSpan.innerHTML = previousHTML;
//   return dimensions;
// }

export function getContentSpacing(dom: HTMLElement) {
  const content = dom.querySelector(".content");
  if (dom && content) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const contentStyle = window.getComputedStyle(content);
    const paddingTop = contentStyle.paddingTop;
    const paddingBottom = contentStyle.paddingBottom;
    const marginTop = contentStyle.marginTop;
    const marginBottom = contentStyle.marginBottom;
    const padding = parseFloat(paddingTop) + parseFloat(paddingBottom);
    const margin = parseFloat(marginTop) + parseFloat(marginBottom);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return padding + margin + (dom.offsetHeight - content.offsetHeight);
  }
  return 0;
}

export function getSpacing(dom: HTMLElement) {
  const contentStyle = window.getComputedStyle(dom);

  const padding = parseFloat(contentStyle.paddingTop) + parseFloat(contentStyle.paddingBottom);
  const margin = parseFloat(contentStyle.marginTop) + parseFloat(contentStyle.marginBottom);

  return padding + margin;
}

export function getDefault() {
  if (map.has("defaultheight")) {
    return map.get("defaultheight");
  }
  const computedspan = document.getElementById("computedspan");
  if (!computedspan) return 0;

  const defaultheight = getDomHeight(computedspan);
  map.set("defaultheight", defaultheight);
  return defaultheight;
}

export function getDomHeight(dom: HTMLElement) {
  if (!dom) return 0;

  const style = window.getComputedStyle(dom);
  const paddingTop = parseFloat(style.paddingTop);
  const paddingBottom = parseFloat(style.paddingBottom);
  const marginTop = parseFloat(style.marginTop);
  const marginBottom = parseFloat(style.marginBottom);
  const borderWidth = parseFloat(style.borderWidth);

  return dom.offsetHeight + paddingTop + paddingBottom + marginTop + marginBottom + borderWidth;
}

export function getAbsentHtmlH(node: Node) {
  const html = generateHTML(getJsonFromDoc(node), getExtentions());
  if (node.type.name == PAGE) {
    return null;
  }
  if (node.type.name == PARAGRAPH) {
    const computeddiv = document.getElementById("computedspan");
    if (computeddiv) {
      computeddiv.innerHTML = html;
    }
  } else {
    const computeddiv = document.getElementById("computeddiv");
    if (computeddiv) {
      computeddiv.innerHTML = html;
    }
  }

  const nodesom = document.getElementById(node.attrs.id);
  return nodesom;
}

export function removeAbsentHtmlH() {
  const computeddiv = document.getElementById("computeddiv");
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  computeddiv.innerHTML = "";
}

export function buildComputedHtml(options: any) {
  let computedSpan = document.getElementById("computedspan");
  if (!computedSpan) {
    computedSpan = document.createElement("p");
    computedSpan.classList.add("text-editor");
    computedSpan.setAttribute("style", "opacity: 0; position: absolute; z-index: -89; margin-left: -2003px;");
    computedSpan.setAttribute("id", "computedspan");
    computedSpan.innerHTML = "&nbsp;";
    document.body.append(computedSpan);
  }

  let computedDiv = document.getElementById("computeddiv");
  if (!computedDiv) {
    const dom = document.createElement("div");
    dom.setAttribute("class", "Page text-editor relative");
    dom.setAttribute("style", `opacity: 0; position: absolute; z-index: -9999; margin-left: -2003px; max-width: ${options.bodyWidth}px; width: ${options.bodyWidth}px;`);

    const content = document.createElement("div");
    content.classList.add("PageContent");
    content.setAttribute("style", `min-height: ${options.bodyHeight}px; padding: ${options.bodyPadding}px`);
    content.setAttribute("id", "computeddiv");

    dom.append(content);
    document.body.append(dom);
  }
}
