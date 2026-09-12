import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { expect, it } from 'vitest';
import { startServer } from '../src/index';

it('returns signature image URLs on execution records and persists reusable signatures', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'wflow-signature-'));
  const before = { WFLOW_DB: process.env.WFLOW_DB, WFLOW_TEMPORAL_DB: process.env.WFLOW_TEMPORAL_DB, WFLOW_DEMO: process.env.WFLOW_DEMO };
  process.env.WFLOW_DB = join(folder, 'host.sqlite'); process.env.WFLOW_TEMPORAL_DB = join(folder, 'temporal.sqlite'); process.env.WFLOW_DEMO = '1';
  let app: Awaited<ReturnType<typeof startServer>> | undefined;
  let base = '';
  async function call(path: string, token = '', method = 'GET', data?: unknown) {
    const response = await fetch(`${base}${path}`, { method, headers: { wflowToken: token, 'Content-Type': 'application/json' }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
    const body = await response.json() as { code: number; data: unknown; msg: string };
    expect(body, body.msg).toMatchObject({ code: 200 });
    return body.data;
  }
  const todoTaskId = async (token: string, instId: string) => {
    let taskId = '';
    await expect.poll(async () => {
      const tasks = await call('/task/todo', token) as { records: Array<{ instId: string; taskId: string }> };
      taskId = tasks.records.find((item) => item.instId === instId)?.taskId ?? '';
      return taskId;
    }).not.toBe('');
    return taskId;
  };
  try {
    app = await startServer(0); base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
    const employee = await call('/auth/login/u-employee') as { token: string };
    const manager = await call('/auth/login/u-manager') as { token: string };
    const admin = await call('/auth/login/u-admin') as { token: string };

    // FlowOrgController.user/signature: the reusable personal signature URL.
    expect(await call('/org/user/signature', employee.token)).toBeNull();
    await call('/org/user/signature', employee.token, 'POST', { signature: '/res/emp-sign?isSign=true' });
    expect(await call('/org/user/signature', employee.token)).toBe('/res/emp-sign?isSign=true');
    expect(await call('/org/user/detail/u-employee', employee.token)).toMatchObject({ signature: '/res/emp-sign?isSign=true' });

    const model = await call('/startup/model/leave-request/undefined', employee.token) as { defineId: string };
    const instanceId = await call('/inst/startup', employee.token, 'POST', { requestId: 'signature-start', defineId: model.defineId, initiator: 'u-employee', startDeptId: 'dept-hr', formData: { reason: 'Signature' } }) as string;
    const taskId = await todoTaskId(manager.token, instanceId);
    const managerSignature = '/res/sign-manager?isSign=true';
    await call('/task/handler', manager.token, 'POST', { requestId: 'signature-approve', instId: instanceId, taskId, action: 'agree', formData: { reason: 'Signature' }, signature: managerSignature, saveSign: true });
    await expect.poll(async () => (await call(`/inst/detail?instId=${instanceId}`, manager.token) as { status: string }).status).toBe('PASS');

    // TaskHandlerParamsVo.saveSign persists the submitted signature for later tasks.
    expect(await call('/org/user/signature', manager.token)).toBe(managerSignature);
    const records = await call(`/inst/records/${instanceId}`, employee.token) as Array<{ nodeId: string; actualUsers: Array<Record<string, unknown>> }>;
    expect(records.find((record) => record.nodeId === 'node_root')!.actualUsers[0]).toMatchObject({ signature: null });
    expect(records.find((record) => record.nodeId === 'node_approval')!.actualUsers[0]).toMatchObject({
      result: 'agree', action: 'agree', signature: managerSignature, comment: expect.objectContaining({ text: '' }),
    });

    // FlowManagerServiceImpl stores the admin signature on the overridden task record too.
    const overrideInstance = await call('/inst/startup', employee.token, 'POST', { requestId: 'signature-override-start', defineId: model.defineId, initiator: 'u-employee', startDeptId: 'dept-hr', formData: { reason: 'Override signature' } }) as string;
    const overrideTaskId = await todoTaskId(manager.token, overrideInstance);
    await call('/manage/task/handler', admin.token, 'POST', { requestId: 'signature-override', instId: overrideInstance, taskId: overrideTaskId, action: 'agree', signature: '/res/sign-admin?isSign=true' });
    await expect.poll(async () => (await call(`/inst/detail?instId=${overrideInstance}`, manager.token) as { status: string }).status).toBe('PASS');
    const overrideRecords = await call(`/inst/records/${overrideInstance}`, employee.token) as Array<{ nodeId: string; actualUsers: Array<Record<string, unknown>> }>;
    const overrideUsers = overrideRecords.find((record) => record.nodeId === 'node_approval')!.actualUsers;
    expect(overrideUsers.map((user) => user.signature)).toContain('/res/sign-admin?isSign=true');
    expect(overrideUsers.some((user) => user.result === 'agree')).toBe(true);
    // Admin override never touches the prior assignee's reusable signature.
    expect(await call('/org/user/signature', manager.token)).toBe(managerSignature);
  } finally {
    await app?.close();
    for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    rmSync(folder, { recursive: true, force: true });
  }
}, 60_000);
