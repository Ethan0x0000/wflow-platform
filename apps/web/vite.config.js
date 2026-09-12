import {fileURLToPath, URL} from 'node:url'

import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {loadEnv} from 'vite'
import VueDevTools from "vite-plugin-vue-devtools";
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, './')
  return {
    optimizeDeps: { entries: ['index.html'] },
    define: {
      'import.meta.env.VITE_APP_BASE_API': JSON.stringify(env.VITE_APP_BASE_API || '/api'),
      'import.meta.env.VITE_APP_TITLE': JSON.stringify(env.VITE_APP_TITLE || 'wflow'),
    },
    base: env.VITE_APP_BASE_PATH,
    plugins: [
      vue(),
      vueJsx(), //开启JSX支持
      VueDevTools(), //这个是vue开发调试工具插件，页面底部那个vue图标，不需要的话可以去掉
      AutoImport({
        imports: [
          'vue', // 自动导入 Vue 的 API
          {
            'vue-i18n': [
              'useI18n', // 自动导入 useI18n，让每个页面不用手写import
            ]
          }
        ]
      })
    ],
    server: {
      port: Number(env.VITE_PORT || 3000), // 本地开发端口
      host: '0.0.0.0',
      proxy: { //配置本地开发代理，避免跨域
        '/api': {
          target: env.VITE_PROXY || 'http://localhost:2048', // 目标服务器的地址
          changeOrigin: true, // 是否改变源地址
          rewrite: (path) => path.replace(/^\/api/, ''), // 重写路径
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
})
