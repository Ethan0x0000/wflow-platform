import { test, expect } from '@playwright/test';

test('design a new workflow, save a draft and publish an immutable version', async ({ page }) => {
  const response = await page.request.get('/api/auth/login/u-admin');
  const { data: user } = await response.json();
  await page.addInitScript((user) => { localStorage.token = user.token; localStorage.loginUser = JSON.stringify(user); }, user);
  await page.goto('/designer?groupId=group-hr');
  const name = `设计器验收${Date.now().toString().slice(-6)}`;
  await page.getByPlaceholder('输入流程名称').fill(name);
  await page.getByText('无主表单模式', { exact: true }).click();
  await page.getByRole('menuitem', { name: /流程设计/ }).click();
  await page.getByRole('button', { name: '添加流程节点' }).first().click();
  await page.getByText('阻塞等待', { exact: true }).click();
  const [saved] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/model/save')),
    page.getByRole('button', { name: /保\s*存/ }).click(),
  ]);
  const savedBody = await saved.json();
  expect(savedBody).toMatchObject({ code: 200 });
  const code = savedBody.data;
  await page.getByRole('button', { name: /^发\s*布$/ }).click();
  await expect(page.getByRole('button', { name: '去发布' })).toBeVisible();
  await page.getByRole('button', { name: '去发布' }).click();
  await page.getByRole('button', { name: /确\s*定/ }).last().click();
  await expect.poll(async () => {
    const result = await page.request.get(`/api/model?code=${code}`, { headers: { wflowToken: user.token } });
    return (await result.json()).data?.version;
  }).toBe(1);
  await page.goto(`/designer?code=${code}`);
  await expect(page.getByPlaceholder('输入流程名称')).toHaveValue(name);
});
