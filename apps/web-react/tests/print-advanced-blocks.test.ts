import { describe, it, expect } from 'vitest';
import {
  buildSearchOption,
  computeInsertSize,
  extractDiagramSvg,
  parseSvgSize,
  svgToDataUrl,
} from '../src/views/print/custom-print-designer/advancedBlocks';

describe('React Web: print designer advanced blocks', () => {
  it('maps search flags to canvas-editor search options', () => {
    expect(buildSearchOption({ caseSensitive: true, regex: true })).toEqual({ isRegEnable: true, isIgnoreCase: false });
    expect(buildSearchOption({ caseSensitive: false, regex: false })).toEqual({ isRegEnable: false, isIgnoreCase: true });
  });

  it('extracts the exported SVG from the diagram plugin destroy message', () => {
    expect(extractDiagramSvg({ event: 'export', xml: '<svg/>' })).toBe('<svg/>');
    expect(extractDiagramSvg({ event: 'export', xml: '   ' })).toBeNull();
    expect(extractDiagramSvg(undefined)).toBeNull();
  });

  it('encodes SVG documents as data URLs', () => {
    expect(svgToDataUrl('<svg><text>a b</text></svg>')).toContain('data:image/svg+xml;charset=utf-8,');
  });

  it('parses SVG size from attributes or viewBox', () => {
    expect(parseSvgSize('<svg width="381px" height="271px"></svg>')).toEqual({ width: 381, height: 271 });
    expect(parseSvgSize('<svg viewBox="0 0 640 480"></svg>')).toEqual({ width: 640, height: 480 });
    expect(parseSvgSize('<svg></svg>')).toEqual({ width: 300, height: 200 });
  });

  it('scales inserted diagrams to the page while keeping the aspect ratio', () => {
    expect(computeInsertSize(300, 200)).toEqual({ width: 300, height: 200 });
    expect(computeInsertSize(1200, 600)).toEqual({ width: 600, height: 300 });
    expect(computeInsertSize(600, 1600)).toEqual({ width: 300, height: 800 });
  });
});
