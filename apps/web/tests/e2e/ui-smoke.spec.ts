import { test, expect } from '@playwright/test';

test('original wflow workspace pages load against the Temporal host', async ({ page }) => {
  const { data: user } = await (await page.request.get('/api/auth/login/u-admin')).json();
  await page.addInitScript((user) => { localStorage.token = user.token; localStorage.loginUser = JSON.stringify(user); }, user);
  const errors: string[] = [], failures: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.url().includes('/api/') && response.status() >= 400) failures.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  const pages = ['dashboard', 'todo', 'ido', 'submitted', 'cc', 'agent', 'model', 'instance', 'statistics', 'handover', 'components'];
  for (const route of pages) {
    await page.goto(`/workspace/${route}`);
    await expect(page.getByRole('menuitem', { name: '工作空间' })).toBeVisible();
    await expect(page.locator('.w-page')).not.toBeEmpty();
    await expect(page.locator('.el-loading-mask:visible')).toHaveCount(0);
  }
  expect(errors).toEqual([]); expect(failures).toEqual([]);
});

test('statistics display stored form values and download Excel through the original UI', async ({ page }) => {
  const { data: employee } = await (await page.request.get('/api/auth/login/u-employee')).json();
  const { data: model } = await (await page.request.get('/api/startup/model/leave-request', { headers: { wflowToken: employee.token } })).json();
  const reason = `UI report ${crypto.randomUUID()}`;
  const started = await page.request.post('/api/inst/startup', { headers: { wflowToken: employee.token }, data: { defineId: model.defineId, initiator: 'u-employee', startDeptId: 'dept-hr', requestId: crypto.randomUUID(), formData: { reason } } });
  expect(started.status()).toBe(200);
  const { data: user } = await (await page.request.get('/api/auth/login/u-admin')).json();
  await page.addInitScript((user) => { localStorage.token = user.token; localStorage.loginUser = JSON.stringify(user); }, user);
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/workspace/statistics');
  await page.getByRole('button', { name: '人事流程' }).click();
  await page.getByText('请假申请', { exact: true }).click();
  await expect(page.getByRole('cell', { name: reason, exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出数据' }).click();
  expect((await download).suggestedFilename()).toBe('请假申请.xlsx');
  expect(errors).toEqual([]);
});
