import { test, expect, type APIRequestContext } from '@playwright/test';

test.describe('Persistent wflow host services', () => {
  let tokens: Record<string, string>;
  test.beforeEach(async ({ request }) => {
    tokens = {};
    for (const user of ['u-employee', 'u-manager', 'u-admin']) tokens[user] = (await (await request.get(`/api/auth/login/${user}`)).json()).data.token;
  });
  async function call<T>(request: APIRequestContext, user: string, path: string, method = 'GET', data?: unknown): Promise<T> {
    const response = await request.fetch(`/api${path}`, { method, headers: { wflowToken: tokens[user]! }, ...(data === undefined ? {} : { data }) });
    expect(response.status(), `${method} ${path}`).toBe(200);
    return (await response.json()).data as T;
  }
  async function start(request: APIRequestContext, reason: string, requestId = crypto.randomUUID()) {
    const model = await call<{ defineId: string }>(request, 'u-employee', '/startup/model/leave-request');
    const payload = { defineId: model.defineId, initiator: 'u-employee', startDeptId: 'dept-hr', requestId, formData: { reason } };
    return { id: await call<string>(request, 'u-employee', '/inst/startup', 'POST', payload), payload };
  }
  async function pending(request: APIRequestContext, id: string) {
    let taskId = '';
    await expect.poll(async () => {
      const tasks = await call<{ records: { instId: string; taskId: string }[] }>(request, 'u-admin', '/manage/task?pageSize=100');
      taskId = tasks.records.find((task) => task.instId === id)?.taskId ?? ''; return taskId;
    }).not.toBe('');
    return taskId;
  }
  test('drafts round trip JSON strings and required fields are enforced', async ({ request }) => {
    const model = await call<{ defineId: string }>(request, 'u-employee', '/startup/model/leave-request');
    const reason = `draft-${crypto.randomUUID()}`;
    const id = await call<string>(request, 'u-employee', '/startup/draft', 'POST', { defineId: model.defineId, formData: JSON.stringify({ reason }), processData: '{}' });
    const drafts = await call<{ records: { id: string; formData: string }[] }>(request, 'u-employee', '/startup/draft');
    expect(JSON.parse(drafts.records.find((draft) => draft.id === id)!.formData)).toEqual({ reason });
    const missing = await request.post('/api/inst/startup', { headers: { wflowToken: tokens['u-employee']! }, data: { defineId: model.defineId, initiator: 'u-employee', startDeptId: 'dept-hr', formData: {} } });
    expect(missing.status()).toBe(422);
    await call(request, 'u-employee', `/startup/draft/${id}`, 'DELETE');
  });
  test('start retries return one instance and reject conflicting payloads', async ({ request }) => {
    const first = await start(request, 'Idempotency');
    expect(await call(request, 'u-employee', '/inst/startup', 'POST', first.payload)).toBe(first.id);
    const conflict = await request.post('/api/inst/startup', { headers: { wflowToken: tokens['u-employee']! }, data: { ...first.payload, formData: { reason: 'Changed payload' } } });
    expect(conflict.status()).toBe(409);
  });
  test('administrator physical deletion terminates Temporal and removes projections', async ({ request }) => {
    const { id } = await start(request, 'Physical deletion');
    await pending(request, id);
    expect((await request.delete(`/api/inst/${id}`, { headers: { wflowToken: tokens['u-employee']! } })).status()).toBe(403);
    await call(request, 'u-admin', `/inst/${id}`, 'DELETE');
    expect((await request.get(`/api/inst/detail?instId=${id}`, { headers: { wflowToken: tokens['u-admin']! } })).status()).toBe(404);
    const list = await call<{ records: { instId: string }[] }>(request, 'u-admin', '/inst/list?pageSize=100');
    expect(list.records.some((item) => item.instId === id)).toBe(false);
  });
  test('administrator intervenes without assigning the task to themselves', async ({ request }) => {
    const { id } = await start(request, 'Administrator intervention'), taskId = await pending(request, id);
    const detail = await call<{ operationPerm: { agree: { enable: boolean } } }>(request, 'u-admin', `/manage/inst/detail?instId=${id}&taskId=${taskId}`);
    expect(detail.operationPerm.agree.enable).toBe(true);
    const command = { requestId: crypto.randomUUID(), instId: id, taskId, action: 'agree', formData: {}, comment: { text: 'Reviewed by administrator' } };
    expect((await request.post('/api/manage/task/handler', { headers: { wflowToken: tokens['u-employee']! }, data: command })).status()).toBe(403);
    await call(request, 'u-admin', '/manage/task/handler', 'POST', command);
    await call(request, 'u-admin', '/manage/task/handler', 'POST', command);
    await expect.poll(async () => (await call<{ status: string }>(request, 'u-admin', `/inst/detail?instId=${id}`)).status).toBe('PASS');
    const history = await call<{ actualUsers: { assignee: { id: string }; action: string; comment: { text: string } }[] }[]>(request, 'u-admin', `/inst/records/${id}`);
    expect(history.flatMap((entry) => entry.actualUsers)).toContainEqual(expect.objectContaining({ assignee: expect.objectContaining({ id: 'u-admin' }), action: 'agree', comment: expect.objectContaining({ text: 'Reviewed by administrator' }) }));
  });
  test('attachments require ownership or participation in the referencing instance', async ({ request }) => {
    const upload = await request.post('/api/res', { headers: { wflowToken: tokens['u-employee']! }, multipart: { file: { name: 'attachment.txt', mimeType: 'text/plain', buffer: Buffer.from('workflow attachment') } } });
    expect(upload.status()).toBe(200);
    const resource = (await upload.json()).data as { id: string; url: string; name: string };
    const get = (user: string) => request.get(`/api${resource.url}`, { headers: { wflowToken: tokens[user]! } });
    expect((await get('u-manager')).status()).toBe(403);
    expect(await (await get('u-employee')).text()).toBe('workflow attachment');
    const { id } = await start(request, 'Attachment in discussion'); await pending(request, id);
    await call(request, 'u-employee', `/inst/discuss/${id}`, 'POST', { text: 'Supporting document', files: [resource], images: [] });
    expect(await (await get('u-manager')).text()).toBe('workflow attachment');
  });
  test('statistics return original field rows and export an actual Excel file', async ({ request }) => {
    const reason = `report-${crypto.randomUUID()}`, { id } = await start(request, reason); await pending(request, id);
    const query = `code=leave-request&fieldKey=reason&fieldValue=${reason}&compare=EQ`;
    const result = await call<{ total: number; records: { instId: string; fieldData: { key: string; value: string }[] }[] }>(request, 'u-admin', `/inst/list/count?${query}`);
    expect(result.total).toBe(1); expect(result.records[0]!.instId).toBe(id);
    expect(result.records[0]!.fieldData).toContainEqual(expect.objectContaining({ key: 'reason', value: reason }));
    const exported = await request.get(`/api/inst/list/export?${query}`, { headers: { wflowToken: tokens['u-admin']! } });
    expect(exported.status()).toBe(200); expect(exported.headers()['content-disposition']).toContain('.xlsx');
    expect((await exported.body()).subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect((await request.get(`/api/inst/list/export?${query}`, { headers: { wflowToken: tokens['u-employee']! } })).status()).toBe(403);
  });
  test('new task notifications arrive on the live SSE connection', async ({ request, baseURL }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const stream = await fetch(`${baseURL}/api/notify/subscribe`, { headers: { wflowToken: tokens['u-manager']! }, signal: controller.signal });
      expect(stream.status).toBe(200);
      const reader = stream.body!.getReader(), { id } = await start(request, 'Live notification');
      let data = '';
      while (!data.includes(id)) { const chunk = await reader.read(); if (chunk.done) break; data += new TextDecoder().decode(chunk.value); }
      expect(data).toContain(id); expect(data).toContain('data: ');
      await reader.cancel();
    } finally { clearTimeout(timeout); controller.abort(); }
  });
});
