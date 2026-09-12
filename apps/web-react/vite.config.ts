import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const matchesPackage = (id: string, names: string[]) =>
  names.some((name) => id.includes(`/node_modules/${name}/`));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          const normalized = id.replace(/\\/g, '/');

          if (normalized.includes('/@hufe921/canvas-editor')) {
            return 'vendor-canvas-editor';
          }
          if (
            matchesPackage(normalized, ['antd', '@ant-design', '@rc-component']) ||
            /\/node_modules\/rc-[^/]+\//.test(normalized)
          ) {
            return 'vendor-antd';
          }
          if (
            matchesPackage(normalized, ['@codemirror', '@lezer', '@uiw/react-codemirror', '@uiw/codemirror-extensions-basic-setup', 'codemirror'])
          ) {
            return 'vendor-codemirror';
          }
          if (
            matchesPackage(normalized, [
              'qrcode',
              'jsbarcode',
              '@zxing',
              'diagram-js',
              'diagram-js-direct-editing',
              'bpmn-js',
              'bpmn-moddle',
              '@bpmn-io',
              'jszip',
            ])
          ) {
            return 'vendor-doc-tools';
          }

          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY || 'http://localhost:2048',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
