import { defineConfig, devices } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'wflow-e2e-'));
const baseURL = process.env.WFLOW_WEB_URL ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: process.env.WFLOW_WEB_URL ? undefined : [
    { command: 'pnpm --dir ../.. --filter wflow-core build && pnpm --dir ../.. --filter server dev', url: 'http://localhost:2049/health', timeout: 120_000, env: { PORT: '2049', WFLOW_DB: join(directory, 'host.sqlite'), WFLOW_TEMPORAL_DB: join(directory, 'temporal.sqlite'), TEMPORAL_TASK_QUEUE: 'wflow-e2e' } },
    { command: 'pnpm dev --port 3001', url: baseURL, timeout: 60_000, env: { VITE_PROXY: 'http://localhost:2049' } },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
