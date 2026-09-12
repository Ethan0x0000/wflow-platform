import { afterEach, describe, expect, it, vi } from 'vitest';

interface FakeScript {
  src: string;
  async: boolean;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  remove: () => void;
}

function createFakeDocument() {
  const scripts: FakeScript[] = [];
  const doc = {
    createElement: () => {
      const script: FakeScript = { src: '', async: false, onload: null, onerror: null, remove: () => undefined };
      return script;
    },
    head: {
      appendChild: (script: FakeScript) => {
        scripts.push(script);
        return script;
      },
    },
  } as unknown as Document;
  return { doc, scripts };
}

const fakeNamespace = { Map: class {}, Marker: class {}, Geocoder: class {} };

async function freshLoader() {
  vi.resetModules();
  return await import('../src/views/form/amapLoader');
}

describe('React Web: AMap loader', () => {
  afterEach(() => {
    delete (globalThis as { AMap?: unknown }).AMap;
  });

  it('dedupes concurrent loads and resolves with the injected AMap namespace', async () => {
    const { doc, scripts } = createFakeDocument();
    const { loadAMap } = await freshLoader();

    const first = loadAMap('demo-key', doc);
    const second = loadAMap('demo-key', doc);

    expect(first).toBe(second);
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toContain('https://webapi.amap.com/maps?v=2.0');
    expect(scripts[0].src).toContain('key=demo-key');

    (globalThis as { AMap?: unknown }).AMap = fakeNamespace;
    scripts[0].onload?.();

    await expect(first).resolves.toBe(fakeNamespace);
  });

  it('rejects gracefully on script failure and allows a later retry', async () => {
    const { doc, scripts } = createFakeDocument();
    const { loadAMap } = await freshLoader();

    const first = loadAMap('demo-key', doc);
    scripts[0].onerror?.();
    await expect(first).rejects.toThrow('高德地图脚本加载失败');

    const retry = loadAMap('demo-key', doc);
    expect(retry).not.toBe(first);
    expect(scripts).toHaveLength(2);

    (globalThis as { AMap?: unknown }).AMap = fakeNamespace;
    scripts[1].onload?.();
    await expect(retry).resolves.toBe(fakeNamespace);
  });

  it('rejects when no key is provided (fallback path)', async () => {
    const { doc } = createFakeDocument();
    const { loadAMap } = await freshLoader();
    await expect(loadAMap('   ', doc)).rejects.toThrow('缺少高德地图 Key');
  });

  it('reuses an already loaded AMap global without injecting a script', async () => {
    const { doc, scripts } = createFakeDocument();
    (globalThis as { AMap?: unknown }).AMap = fakeNamespace;
    const { loadAMap } = await freshLoader();

    await expect(loadAMap('demo-key', doc)).resolves.toBe(fakeNamespace);
    expect(scripts).toHaveLength(0);
  });

  it('resolves the key from props.amapKey before VITE_AMAP_KEY', async () => {
    const { resolveAMapKey, readLngLat } = await freshLoader();
    expect(resolveAMapKey({ amapKey: ' prop-key ' }, 'env-key')).toBe('prop-key');
    expect(resolveAMapKey({}, ' env-key ')).toBe('env-key');
    expect(resolveAMapKey(undefined, undefined)).toBe('');
    expect(readLngLat([120.1, 30.2])).toEqual([120.1, 30.2]);
    expect(readLngLat({ getLng: () => 1, getLat: () => 2 })).toEqual([1, 2]);
    expect(readLngLat({ lng: 'x', lat: 2 })).toBeNull();
  });
});
