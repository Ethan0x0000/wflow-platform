import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import 'dayjs/locale/zh-cn';
import { router } from './router';
import { useWflowStore } from './stores/wflow';

const locales = { zhCn: zhCN, en: enUS } as const;

export const App: React.FC = () => {
  const lang = useWflowStore((state) => state.lang) || 'zhCn';
  const mode = useWflowStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [mode]);

  return (
    <ConfigProvider
      locale={locales[lang as keyof typeof locales] || zhCN}
      theme={{
        algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  );
};

export default App;
