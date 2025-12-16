import type { AbsPageModel, AbsTable, AbsFragment, AbsImageItem, AbsShapeItem } from './types';

function escAttr(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fragmentToAbsBlockHtml(frag: AbsFragment, id: string): string {
  const attrs: Record<string, string> = {
    'data-abs-block': 'true',
    'data-x': String(frag.x || 0),
    'data-y': String(frag.y || 0),
    'data-font-family': frag.fontFamily || '',
    'data-font-size': frag.fontSize || '',
    'data-font-weight': frag.fontWeight || '',
    'data-font-style': frag.fontStyle || '',
    'data-color': frag.color || '',
    'data-line-id': id,
  };

  if (frag.width != null) attrs['data-width'] = String(frag.width);
  if (frag.height != null) attrs['data-height'] = String(frag.height);
  if (frag.lineHeight) attrs['data-line-height'] = frag.lineHeight;
  if (frag.letterSpacing) attrs['data-letter-spacing'] = frag.letterSpacing;
  if (frag.page != null) attrs['data-page'] = String(frag.page);

  const attrStr = Object.entries(attrs)
    .filter(([, v]) => v != null && String(v).length > 0)
    .map(([k, v]) => `${k}="${escAttr(String(v))}"`)
    .join(' ');

  return `<div ${attrStr}>${escText(frag.text || '')}</div>`;
}

function imageToAbsImageHtml(img: AbsImageItem): string {
  const attrs: Record<string, string> = {
    'data-abs-image': 'true',
    'data-x': String(img.x || 0),
    'data-y': String(img.y || 0),
    src: img.src || '',
  };

  if (img.width != null) attrs['data-width'] = String(img.width);
  if (img.height != null) attrs['data-height'] = String(img.height);
  if (img.alt) attrs.alt = img.alt;
  if (img.opacity != null) attrs['data-opacity'] = String(img.opacity);
  if (img.page != null) attrs['data-page'] = String(img.page);

  const attrStr = Object.entries(attrs)
    .filter(([, v]) => v != null && String(v).length > 0)
    .map(([k, v]) => `${k}="${escAttr(String(v))}"`)
    .join(' ');

  return `<img ${attrStr} />`;
}

function shapeToAbsShapeHtml(shape: AbsShapeItem): string {
  const attrs: Record<string, string> = {
    'data-abs-shape': 'true',
    'data-x': String(shape.x || 0),
    'data-y': String(shape.y || 0),
  };

  if (shape.width != null) attrs['data-width'] = String(shape.width);
  if (shape.height != null) attrs['data-height'] = String(shape.height);
  if (shape.strokeColor) attrs['data-stroke-color'] = shape.strokeColor;
  if (shape.strokeWidth != null) attrs['data-stroke-width'] = String(shape.strokeWidth);
  if (shape.fillColor) attrs['data-fill-color'] = shape.fillColor;
  if (shape.radius != null) attrs['data-radius'] = String(shape.radius);
  if (shape.opacity != null) attrs['data-opacity'] = String(shape.opacity);
  if (shape.page != null) attrs['data-page'] = String(shape.page);

  const attrStr = Object.entries(attrs)
    .filter(([, v]) => v != null && String(v).length > 0)
    .map(([k, v]) => `${k}="${escAttr(String(v))}"`)
    .join(' ');

  return `<div ${attrStr}></div>`;
}

function tableToAbsTableHtml(table: AbsTable): string {
  const x = table.bbox.left || 0;
  const y = table.bbox.top || 0;
  const width = Math.max(0, (table.bbox.right ?? 0) - (table.bbox.left ?? 0));
  const height = Math.max(0, (table.bbox.bottom ?? 0) - (table.bbox.top ?? 0));

  const attrs: Record<string, string> = {
    'data-abs-table': 'true',
    'data-x': String(x),
    'data-y': String(y),
    'data-width': String(width),
    'data-height': String(height),
    'data-table-id': table.id,
    'data-page': String(table.page),
  };

  const attrStr = Object.entries(attrs)
    .filter(([, v]) => v != null && String(v).length > 0)
    .map(([k, v]) => `${k}="${escAttr(String(v))}"`)
    .join(' ');

  const rows = table.rows ?? [];
  const tableHtml = `<table><tbody>${rows
    .map((r) => `<tr>${(r.cells || []).map((c) => `<td>${escText(String(c ?? ''))}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;

  return `<div ${attrStr}>${tableHtml}</div>`;
}

export function buildAnnotatedAbsoluteHtml(pages: AbsPageModel[]): string {
  const sections: string[] = [];

  for (const page of pages) {
    const pageAttrs = [
      'data-abs-page="true"',
      `data-page-number="${page.page}"`,
      `data-width="${page.widthPx}"`,
      `data-height="${page.heightPx}"`,
    ].join(' ');

    const layerAttrs = [
      'data-abs-layer="true"',
      `data-width="${page.widthPx}"`,
      `data-height="${page.heightPx}"`,
    ].join(' ');

    const absTables = (page.tables || [])
      .slice()
      .sort((a, b) => (a.bbox.top ?? 0) - (b.bbox.top ?? 0) || (a.bbox.left ?? 0) - (b.bbox.left ?? 0))
      .map(tableToAbsTableHtml)
      .join('');

    const absShapes = (page.shapes || [])
      .slice()
      .sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0))
      .map(shapeToAbsShapeHtml)
      .join('');

    const absImages = (page.images || [])
      .slice()
      .sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0))
      .map(imageToAbsImageHtml)
      .join('');

    const isFragInsideTable = (frag: AbsFragment): boolean => {
      const tables = page.tables || [];
      if (!tables.length) return false;
      const x = frag.x ?? 0;
      const y = frag.y ?? 0;
      return tables.some((t) => {
        const withinY = y >= (t.bbox.top ?? 0) - 2 && y <= (t.bbox.bottom ?? 0) + 2;
        const withinX = x >= (t.bbox.left ?? 0) - 2 && x <= (t.bbox.right ?? 0) + 2;
        return withinY && withinX;
      });
    };

    const blocks = (page.fragments || [])
      .filter((frag) => !!(frag.text && frag.text.trim().length > 0))
      .filter((frag) => !isFragInsideTable(frag))
      .map((frag, idx) => fragmentToAbsBlockHtml(frag, `frag_${page.page}_${idx}`))
      .join('');

    sections.push(`<section ${pageAttrs}><div ${layerAttrs}>${absShapes}${absImages}${absTables}${blocks}</div></section>`);
  }

  return sections.join('');
}
