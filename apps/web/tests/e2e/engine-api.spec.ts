import { test, expect, type APIRequestContext } from '@playwright/test';

type Detail = { status: string; todoTasks: { taskId: string }[]; formData: Record<string, unknown> };
type Model = Record<string, unknown> & { code: string; defineId: string; version: number; procName: string };

test.describe('Temporal business behavior through the wflow API', () => {
  let tokens: Record<string, string>;
  test.beforeEach(async ({ request }) => {
    tokens = {};
    for (const id of ['u-employee', 'u-manager', 'u-admin']) tokens[id] = (await (await request.get(`/api/auth/login/${id}`)).json()).data.token;
  });
  async function call<T>(request: APIRequestContext, user: string, path: string, method = 'GET', data?: unknown): Promise<T> {
    const response = await request.fetch(`/api${path}`, { method, headers: { wflowToken: tokens[user]! }, ...(data === undefined ? {} : { data }) });
    const result = await response.json();
    expect(result, `${method} ${path}`).toMatchObject({ code: 200 });
    return result.data as T;
  }
  async function deploy(request: APIRequestContext, mode: string, users = ['u-manager', 'u-admin'], candidate = false): Promise<Model> {
    const code = `test-${crypto.randomUUID()}`;
    const nodes = [{ id: 'start', type: 'Start' }, { id: 'approval', type: 'Approval', name: 'Review', props: {
      ruleType: 'ASSIGN_USER', assignUser: users, taskMode: { type: mode, percentage: 50 }, candidate,
      operationPerms: ['agree', 'reject', 'forward', 'beforeAdd', 'afterAdd', 'fallback'].map((action) => ({ action, enable: true })),
    } }, { id: 'cc', type: 'Cc', name: 'CC', props: { ruleType: 'ASSIGN_USER', assignUser: ['u-employee'] } }];
    await call(request, 'u-admin', '/model/save', 'POST', { code, procName: code, groupId: 'group-hr', process: nodes, formType: 4, setting: { enableRevoke: true } });
    await call(request, 'u-admin', `/model/deploy?code=${code}`, 'POST');
    return call(request, 'u-admin', `/model?code=${code}`);
  }
  async function start(request: APIRequestContext, model: Model): Promise<string> {
    return call(request, 'u-employee', '/inst/startup', 'POST', { requestId: crypto.randomUUID(), defineId: model.defineId, initiator: 'u-employee', startDeptId: 'dept-hr', formData: {}, processData: {} });
  }
  async function pending(request: APIRequestContext, id: string, user = 'u-manager'): Promise<string> {
    let taskId = '';
    await expect.poll(async () => {
      const tasks = await call<{ records: { instId: string; taskId: string }[] }>(request, user, '/task/todo?pageSize=100');
      taskId = tasks.records.find((task) => task.instId === id)?.taskId ?? '';
      return taskId;
    }).not.toBe('');
    return taskId;
  }
  async function status(request: APIRequestContext, id: string, value: string) {
    await expect.poll(async () => (await call<Detail>(request, 'u-admin', `/inst/detail?instId=${id}`)).status).toBe(value);
  }
  async function act(request: APIRequestContext, id: string, taskId: string, user: string, action = 'agree', targetUsers?: string[]) {
    return call(request, user, '/task/handler', 'POST', { requestId: crypto.randomUUID(), instId: id, taskId, action, formData: {}, ...(targetUsers ? { targetUsers } : {}) });
  }
  for (const mode of ['AND', 'OR', 'NEXT', 'CUSTOM']) test(`${mode} voting and duplicate delivery`, async ({ request }) => {
    const model = await deploy(request, mode), id = await start(request, model), taskId = await pending(request, id);
    if (mode === 'NEXT') {
      const denied = await request.post('/api/task/handler', { headers: { wflowToken: tokens['u-admin']! }, data: { instId: id, taskId, action: 'agree' } });
      expect(denied.status()).toBe(403);
    }
    const command = { requestId: crypto.randomUUID(), instId: id, taskId, action: 'agree', formData: {} };
    await call(request, 'u-manager', '/task/handler', 'POST', command);
    await call(request, 'u-manager', '/task/handler', 'POST', command);
    if (mode === 'AND' || mode === 'NEXT') { await status(request, id, 'RUNNING'); await act(request, id, taskId, 'u-admin'); }
    await status(request, id, 'PASS');
    const history = await call<unknown[]>(request, 'u-admin', `/inst/records/${id}`);
    expect(history.length).toBeGreaterThanOrEqual(3);
  });
  test('candidate claim, transfer and rejection', async ({ request }) => {
    const model = await deploy(request, 'AND', ['u-manager', 'u-admin'], true), id = await start(request, model);
    let taskId = '';
    await expect.poll(async () => {
      const tasks = await call<{ records: { instId: string; taskId: string }[] }>(request, 'u-manager', '/task/todo?pageSize=100');
      taskId = tasks.records.find((t) => t.instId === id)?.taskId ?? ''; return taskId;
    }).not.toBe('');
    await call(request, 'u-manager', `/task/claim/${taskId}`);
    const conflict = await request.get(`/api/task/claim/${taskId}`, { headers: { wflowToken: tokens['u-admin']! } });
    expect(conflict.ok()).toBeFalsy();
    await act(request, id, taskId, 'u-manager', 'forward', ['u-admin']);
    await pending(request, id, 'u-admin');
    await act(request, id, taskId, 'u-admin', 'reject');
    await status(request, id, 'REFUSE');
  });
  for (const action of ['beforeAdd', 'afterAdd']) test(`${action} preserves approval order`, async ({ request }) => {
    const model = await deploy(request, 'OR', ['u-manager']), id = await start(request, model), taskId = await pending(request, id);
    await act(request, id, taskId, 'u-manager', action, ['u-admin']);
    const first = action === 'beforeAdd' ? 'u-admin' : 'u-manager';
    const second = action === 'beforeAdd' ? 'u-manager' : 'u-admin';
    await pending(request, id, first); await act(request, id, taskId, first);
    await status(request, id, 'RUNNING');
    await pending(request, id, second); await act(request, id, taskId, second);
    await status(request, id, 'PASS');
  });
  test('suspend prevents approval until administrator resumes', async ({ request }) => {
    const model = await deploy(request, 'OR', ['u-manager']), id = await start(request, model), taskId = await pending(request, id);
    await call(request, 'u-admin', `/manage/suspend/${id}`, 'PUT'); await status(request, id, 'SUSPEND');
    const denied = await request.post('/api/task/handler', { headers: { wflowToken: tokens['u-manager']! }, data: { instId: id, taskId, action: 'agree' } });
    expect(denied.ok()).toBeFalsy();
    await call(request, 'u-admin', `/manage/resume/${id}`, 'PUT');
    await act(request, id, taskId, 'u-manager'); await status(request, id, 'PASS');
  });
  test('authentication, model ownership and readonly fields are enforced', async ({ request }) => {
    expect((await request.get('/api/inst/list', { headers: { wflowToken: 'u-admin' } })).status()).toBe(401);
    expect((await request.post('/api/model/save', { headers: { wflowToken: tokens['u-employee']! }, data: {} })).status()).toBe(403);
    const model = await deploy(request, 'OR', ['u-manager']), id = await start(request, model), taskId = await pending(request, id);
    const forged = await request.post('/api/task/handler', { headers: { wflowToken: tokens['u-manager']! }, data: { instId: id, taskId, action: 'agree', formData: { unexpectedField: 7 } } });
    expect(forged.status()).toBe(403); await status(request, id, 'RUNNING');
    await act(request, id, taskId, 'u-manager', 'reject');
  });
  test('return to initiator creates a new task and allows resubmission', async ({ request }) => {
    const model = await deploy(request, 'OR', ['u-manager']), id = await start(request, model), taskId = await pending(request, id);
    await call(request, 'u-manager', '/task/handler', 'POST', { requestId: crypto.randomUUID(), instId: id, taskId, action: 'fallback', targetNode: 'start' });
    const resubmit = await pending(request, id, 'u-employee');
    expect(resubmit).not.toBe(taskId);
    await act(request, id, resubmit, 'u-employee', 'complete');
    const newTask = await pending(request, id);
    expect(newTask).not.toBe(taskId);
    await act(request, id, newTask, 'u-manager'); await status(request, id, 'PASS');
  });
  test('withdraw only before the next handler approves', async ({ request }) => {
    const model = await deploy(request, 'OR', ['u-manager']), id = await start(request, model);
    await pending(request, id);
    await call(request, 'u-employee', '/task/handler', 'POST', { instId: id, action: 'withdraw', targetNode: 'start', requestId: crypto.randomUUID() });
    await pending(request, id, 'u-employee');
  });
  test('delegation applies to future assignments and preserves its rule', async ({ request }) => {
    const model = await deploy(request, 'OR', ['u-manager']);
    await call(request, 'u-manager', '/handover', 'POST', { target: { id: 'u-admin' }, scope: [model.code], timeRange: [new Date(Date.now() - 1000).toISOString(), new Date(Date.now() + 86_400_000).toISOString()], reason: 'E2E delegation' });
    const id = await start(request, model), taskId = await pending(request, id, 'u-admin');
    const managerTasks = await call<{ records: { instId: string }[] }>(request, 'u-manager', '/task/todo?pageSize=100');
    expect(managerTasks.records.some((r) => r.instId === id)).toBe(false);
    await act(request, id, taskId, 'u-admin'); await status(request, id, 'PASS');
  });
  test('work handover transfers open and future tasks', async ({ request }) => {
    const model = await deploy(request, 'OR', ['u-manager']), id = await start(request, model);
    await pending(request, id);
    await call(request, 'u-admin', '/work-handover', 'POST', { source: { id: 'u-manager' }, target: { id: 'u-admin' }, scope: [model.code], reason: 'E2E handover' });
    const history = await call<{ records: { id: string }[] }>(request, 'u-admin', '/work-handover');
    await call(request, 'u-admin', `/work-handover/activate/${history.records[0]!.id}`, 'PUT');
    await pending(request, id, 'u-admin');
    const future = await start(request, model); await pending(request, future, 'u-admin');
  });
});
