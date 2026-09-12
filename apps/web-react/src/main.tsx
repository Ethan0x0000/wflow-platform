import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { t } from './i18n';
import { useWflowStore } from './stores/wflow';
import './index.css';

async function bootstrap() {
  const token = localStorage.getItem('token');
  let response = token
    ? await fetch('/api/auth/me', { headers: { wflowToken: token }, credentials: 'include' })
    : await fetch('/api/auth/demo', { credentials: 'include' });
  if (response.status === 401) response = await fetch('/api/auth/demo', { credentials: 'include' });
  const session = await response.json();
  if (session.code !== 200) throw new Error(session.msg || t('workspace.bootstrap.loginFailed'));
  if (session.data?.token) localStorage.setItem('token', session.data.token);
  localStorage.setItem('loginUser', JSON.stringify(session.data));
  useWflowStore.getState().setLoginUser(session.data, session.data.token || undefined);
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

bootstrap()
  .then(() => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch((error: Error) => {
    root.render(
      <div style={{ padding: 40, color: '#cf1322' }}>
        <h3>{t('workspace.bootstrap.initFailed')}</h3>
        <p>{error.message}</p>
      </div>
    );
  });
