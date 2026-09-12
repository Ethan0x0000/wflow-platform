import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

async function login(page: Page, id: string) {
  const response = await page.request.get(`/api/auth/login/${id}`);
  expect(response.ok()).toBeTruthy();
  const { data } = await response.json();
  await page.addInitScript((user) => { localStorage.token = user.token; localStorage.loginUser = JSON.stringify(user); }, data);
}
test('employee submits the original wflow form; manager approves; HR receives a CC', async ({ page, browser }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page, 'u-employee');
  await page.goto('/workspace/startProc?code=leave-request');
  await expect(page.getByPlaceholder('请输入请假原因')).toBeVisible();
  const reason = `E2E leave ${Date.now()}`;
  await page.getByPlaceholder('请输入请假原因').fill(reason);
  const [startResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/inst/startup') && r.request().method() === 'POST'),
    page.getByRole('button', { name: /提\s*交/ }).click(),
  ]);
  expect(await startResponse.json()).toMatchObject({ code: 200 });
  const instanceId: string = (await startResponse.json()).data;
  const manager = await browser.newPage({ baseURL: test.info().project.use.baseURL });
  manager.on('pageerror', (error) => errors.push(error.message));
  await login(manager, 'u-manager');
  await manager.goto('/workspace/todo');
  await expect(manager.getByText('请假申请').first()).toBeVisible();
  const matchingRow = manager.getByRole('row').filter({ hasText: instanceId });
  await matchingRow.getByRole('button', { name: /处理|办理/ }).click();
  await expect(manager.getByRole('textbox', { name: '请假原因' })).toHaveValue(reason);
  await manager.getByRole('tab', { name: '流转记录' }).click();
  await expect(manager.getByText('部门负责人审批', { exact: true }).last()).toBeVisible();
  await manager.getByRole('tab', { name: '流程图' }).click();
  await expect(manager.getByText('流程进行中', { exact: true })).toBeVisible();
  await manager.getByRole('tab', { name: '表单信息' }).click();
  await manager.getByRole('button', { name: /同\s*意/ }).click();
  await manager.getByRole('dialog').last().getByRole('button', { name: /确\s*定|确\s*认/ }).click();
  await expect.poll(async () => {
    const token = await manager.evaluate(() => localStorage.token);
    const response = await manager.request.get(`/api/inst/detail?instId=${instanceId}`, { headers: { wflowToken: token } });
    return (await response.json()).data?.status;
  }).toBe('PASS');
  await manager.close();
  const hr = await browser.newPage({ baseURL: test.info().project.use.baseURL });
  await login(hr, 'u-admin');
  await hr.goto('/workspace/cc');
  await expect(hr.getByText('请假申请').first()).toBeVisible();
  await hr.close();
  expect(errors).toEqual([]);
});
