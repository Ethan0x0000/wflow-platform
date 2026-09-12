import axios, { type AxiosRequestConfig } from 'axios';
import { message } from 'antd';
import { t } from '@/i18n';
import { formatMessage } from '@/utils/i18n';

const requestClient = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API || '/api',
  timeout: 50000,
  withCredentials: true,
});

requestClient.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};
    config.headers.TenantId = '1';
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.wflowToken = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let lastTipTime = 0;
function showLoginTip() {
  const now = Date.now();
  if (now - lastTipTime > 2000) {
    lastTipTime = now;
    message.warning(t('workspace.api.loginExpired'));
  }
}

requestClient.interceptors.response.use(
  (rsp) => {
    if (rsp.status === 200) {
      const contentType = rsp.headers['content-type'];
      if (contentType && (contentType.includes('application/octet-stream') || contentType.includes('application/vnd.openxmlformats-officedocument'))) {
        return rsp as any;
      }
      if (rsp.data && typeof rsp.data === 'object') {
        if (rsp.data.code === 200) {
          return rsp.data;
        } else if (rsp.data.code === 401) {
          showLoginTip();
          return Promise.reject(rsp.data);
        } else {
          return Promise.reject(rsp.data);
        }
      }
      return rsp.data;
    }
    return Promise.reject({ msg: t('workspace.api.systemError') });
  },
  (err) => {
    const status = err.response?.status;
    if (status === 401) showLoginTip();
    const data = err.response?.data || {
      msg: formatMessage(t('workspace.api.requestError'), { msg: err.message }),
    };
    return Promise.reject(data);
  }
);

export function downloadBlob(blob: Blob, filename?: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'download.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function request<T = any>(config: AxiosRequestConfig): Promise<{ code: number; data: T; msg: string }> {
  return requestClient(config) as any;
}

export default request;
