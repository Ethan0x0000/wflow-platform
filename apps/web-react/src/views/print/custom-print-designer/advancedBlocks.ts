import type { SearchFlags } from './types';

export interface SearchNavigatePayload {
  isRegEnable?: boolean;
  isIgnoreCase?: boolean;
}

export interface Size {
  width: number;
  height: number;
}

/** Translate the toolbar search flags into canvas-editor `ISearchOption`. */
export function buildSearchOption(flags: SearchFlags): SearchNavigatePayload {
  return { isRegEnable: flags.regex, isIgnoreCase: !flags.caseSensitive };
}

/** Encode an SVG document (as returned by the diagram plugin) as a data URL. */
export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Extract the exported SVG from the diagram plugin `onDestroy` payload. */
export function extractDiagramSvg(message: any): string | null {
  if (!message || typeof message !== 'object') return null;
  const xml = (message as { xml?: unknown }).xml;
  return typeof xml === 'string' && xml.trim() ? xml : null;
}

const DEFAULT_SVG_SIZE: Size = { width: 300, height: 200 };

/** Best-effort width/height parsing for an SVG string (width/height attrs, then viewBox). */
export function parseSvgSize(svg: string): Size {
  const widthAttr = /<svg[^>]*?\swidth=["']?([\d.]+)/i.exec(svg);
  const heightAttr = /<svg[^>]*?\sheight=["']?([\d.]+)/i.exec(svg);
  if (widthAttr && heightAttr) {
    const width = Number(widthAttr[1]);
    const height = Number(heightAttr[1]);
    if (width > 0 && height > 0) return { width, height };
  }
  const viewBox = /viewBox=["']?([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(svg);
  if (viewBox) {
    const width = Number(viewBox[3]);
    const height = Number(viewBox[4]);
    if (width > 0 && height > 0) return { width, height };
  }
  return { ...DEFAULT_SVG_SIZE };
}

/** Scale a diagram down to fit the page while keeping its aspect ratio. */
export function computeInsertSize(width: number, height: number, maxWidth = 600, maxHeight = 800): Size {
  const safeWidth = width > 0 ? width : DEFAULT_SVG_SIZE.width;
  const safeHeight = height > 0 ? height : DEFAULT_SVG_SIZE.height;
  const scale = Math.min(1, maxWidth / safeWidth, maxHeight / safeHeight);
  return { width: Math.round(safeWidth * scale), height: Math.round(safeHeight * scale) };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('diagram image decode failed'));
    image.src = src;
  });
}

/**
 * FE-11: diagrams.net exports an SVG document, which canvas-editor cannot render
 * on its own. Rasterize it to PNG (at page scale) before inserting; callers fall
 * back to the raw SVG data URL when rasterization is unavailable.
 */
export async function svgToPngDataUrl(svg: string, maxWidth = 600): Promise<string> {
  if (typeof document === 'undefined') throw new Error('canvas unavailable');
  const image = await loadImage(svgToDataUrl(svg));
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const fallback = parseSvgSize(svg);
  const size = computeInsertSize(naturalWidth || fallback.width, naturalHeight || fallback.height, maxWidth);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas context unavailable');
  context.drawImage(image, 0, 0, size.width, size.height);
  return canvas.toDataURL('image/png');
}
