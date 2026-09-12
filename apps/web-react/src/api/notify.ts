import request from './request';

export interface NotificationItem {
  id: string;
  level: 'INFO' | 'WARNING' | 'DANGER';
  title: string;
  content: string;
  target: string;
  instId?: string | null;
  unread: boolean;
  createTime: string;
}

export function getUnreadNotify(params: { pageNo?: number; pageSize?: number }) {
  return request<{ records: NotificationItem[]; total: number }>({
    url: '/notify/list',
    method: 'get',
    params,
  });
}

export function confirmNotify(ids?: string[]) {
  return request<string>({
    url: '/notify/confirm',
    method: 'post',
    data: ids ?? [],
  });
}

export function testSend(msg: string) {
  return request<string>({
    url: '/notify/testSend',
    method: 'get',
    params: { msg },
  });
}

/**
 * SSE 订阅：服务端只认 wflowToken 请求头 / wflowSession Cookie，
 * 浏览器 EventSource 无法带自定义头，因此用 fetch 流手动解析。
 */
export function subscribeNotify(onMessage: (note: NotificationItem) => void, onError?: () => void) {
  const controller = new AbortController();
  const token = localStorage.getItem('token') || '';
  const base = (import.meta as any).env.VITE_APP_BASE_API || '/api';
  void (async () => {
    try {
      const response = await fetch(`${base}/notify/subscribe`, {
        headers: token ? { wflowToken: token } : undefined,
        credentials: 'include',
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        onError?.();
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          const dataLine = chunk.split('\n').find((line) => line.startsWith('data:'));
          const raw = dataLine?.slice(5).trim();
          if (!raw || raw === '{}') continue;
          try {
            onMessage(JSON.parse(raw) as NotificationItem);
          } catch {
            /* ignore malformed frames */
          }
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) onError?.();
    }
  })();
  return () => controller.abort();
}
