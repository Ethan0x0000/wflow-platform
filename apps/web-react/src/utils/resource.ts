const BASE_API = import.meta.env.VITE_APP_BASE_API || '/api';

type QueryValue = string | number | boolean | undefined | null;

export function resUrl(url?: string | null, query?: Record<string, QueryValue>): string {
  if (!url) return '';
  if (/^data:/i.test(url)) return url;
  let target = url;
  if (!/^https?:\/\//i.test(target)) {
    target = `${BASE_API}${target.startsWith('/') ? '' : '/'}${target}`;
  }
  target = target.replace(/\/api\/api(?=\/|$)/, '/api');
  if (query) {
    const search = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.append(key, String(value));
    });
    const qs = search.toString();
    if (qs) target += target.includes('?') ? `&${qs}` : `?${qs}`;
  }
  return target;
}

export function downloadResUrl(url?: string | null, name?: string): string {
  return resUrl(url, name ? { download: 'true', name } : { download: 'true' });
}

export function dataUrlToFormData(dataUrl: string, name = 'image.png'): FormData {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/.exec(dataUrl);
  const mime = match?.[1] || 'image/png';
  const binary = match?.[2] ? atob(match?.[3] || '') : decodeURIComponent(match?.[3] || '');
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const formData = new FormData();
  formData.append('file', new Blob([bytes], { type: mime }), name);
  return formData;
}
