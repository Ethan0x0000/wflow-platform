/** 最小化 AMap JS API（v2.0）类型，仅覆盖 Location 组件用到的能力 */
export interface AMapLngLat {
  lng?: number;
  lat?: number;
  getLng?: () => number;
  getLat?: () => number;
}

export interface AMapMapInstance {
  add: (target: unknown) => void;
  on: (event: string, handler: (event: { lnglat?: AMapLngLat }) => void) => void;
  setCenter: (center: [number, number]) => void;
  destroy: () => void;
}

export interface AMapMarkerInstance {
  setPosition: (position: [number, number]) => void;
  getPosition: () => AMapLngLat | [number, number] | undefined;
  on: (event: string, handler: () => void) => void;
}

export interface AMapGeocoderInstance {
  getAddress: (
    position: [number, number],
    callback: (status: string, result: { regeocode?: { formattedAddress?: string } }) => void
  ) => void;
}

export interface AMapNamespace {
  Map: new (container: HTMLElement, options?: { center?: [number, number]; zoom?: number }) => AMapMapInstance;
  Marker: new (options?: {
    position?: [number, number];
    draggable?: boolean;
    cursor?: string;
  }) => AMapMarkerInstance;
  Geocoder: new (options?: Record<string, unknown>) => AMapGeocoderInstance;
}

const AMAP_VERSION = '2.0';

type AMapGlobal = { AMap?: AMapNamespace };

let amapPromise: Promise<AMapNamespace> | null = null;

function readGlobalAMap(): AMapNamespace | undefined {
  return (globalThis as AMapGlobal).AMap;
}

/**
 * 懒加载高德 JS API（v2.0），并发调用共享同一个 Promise（去重）。
 * 页面已加载过（globalThis.AMap 存在）时直接复用，不重复注入脚本。
 * 脚本失败时重置缓存并 reject，调用方可回退且后续仍可重试。
 */
export function loadAMap(key: string, doc?: Document): Promise<AMapNamespace> {
  const existing = readGlobalAMap();
  if (existing) return Promise.resolve(existing);

  const normalized = typeof key === 'string' ? key.trim() : '';
  if (!normalized) {
    return Promise.reject(new Error('缺少高德地图 Key（VITE_AMAP_KEY 或 props.amapKey）'));
  }

  if (amapPromise) return amapPromise;

  const targetDoc = doc || document;
  amapPromise = new Promise<AMapNamespace>((resolve, reject) => {
    const script = targetDoc.createElement('script');
    // Geocoder 属于服务插件，需随主体同步加载（对齐 Vue initAMapApiLoader 的 plugin 列表）
    script.src = `https://webapi.amap.com/maps?v=${AMAP_VERSION}&key=${encodeURIComponent(normalized)}&plugin=AMap.Geocoder`;
    script.async = true;
    script.onload = () => {
      const namespace = readGlobalAMap();
      if (namespace) {
        resolve(namespace);
      } else {
        amapPromise = null;
        reject(new Error('高德地图脚本已加载，但未挂载 AMap 全局对象'));
      }
    };
    script.onerror = () => {
      amapPromise = null;
      script.remove();
      reject(new Error('高德地图脚本加载失败'));
    };
    targetDoc.head.appendChild(script);
  });

  return amapPromise;
}

/** 解析高德 Key：优先 props.amapKey，其次环境变量 VITE_AMAP_KEY */
export function resolveAMapKey(
  props: Record<string, unknown> | undefined | null,
  envKey: string | undefined = import.meta.env.VITE_AMAP_KEY
): string {
  const fromProps = typeof props?.amapKey === 'string' ? props.amapKey.trim() : '';
  if (fromProps) return fromProps;
  return typeof envKey === 'string' ? envKey.trim() : '';
}

/** 读取 AMap 经纬度对象/数组（兼容 v1 getLng/getLat 与 v2 lng/lat） */
export function readLngLat(position: unknown): [number, number] | null {
  if (!position) return null;
  if (Array.isArray(position)) {
    const [lng, lat] = position;
    return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
  }
  const point = position as AMapLngLat;
  const lng = typeof point.getLng === 'function' ? point.getLng() : point.lng;
  const lat = typeof point.getLat === 'function' ? point.getLat() : point.lat;
  if (typeof lng !== 'number' || !Number.isFinite(lng)) return null;
  if (typeof lat !== 'number' || !Number.isFinite(lat)) return null;
  return [lng, lat];
}
