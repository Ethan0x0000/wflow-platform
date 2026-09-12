import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { expect, it } from 'vitest';
import { startServer } from '../src/index';

it('recovers an open workflow, model and authenticated session after host and Temporal restart', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'wflow-recovery-'));
  const before = { WFLOW_DB: process.env.WFLOW_DB, WFLOW_TEMPORAL_DB: process.env.WFLOW_TEMPORAL_DB, WFLOW_DEMO: process.env.WFLOW_DEMO };
  process.env.WFLOW_DB = join(folder, 'host.sqlite'); process.env.WFLOW_TEMPORAL_DB = join(folder, 'temporal.sqlite'); process.env.WFLOW_DEMO = '1';
  let app: Awaited<ReturnType<typeof startServer>> | undefined;
  let base = '';
  async function api(path: string, token = '', data?: unknown) {
    const response = await fetch(`${base}${path}`, { method: data ? 'POST' : 'GET', headers: { wflowToken: token, 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
    const body = await response.json(); expect(body).toMatchObject({ code: 200 }); return body.data;
  }
  try {
    app = await startServer(0); base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
    const employee = await api('/auth/login/u-employee'), manager = await api('/auth/login/u-manager');
    const model = await api('/startup/model/leave-request/undefined', employee.token);
    const instanceId = await api('/inst/startup', employee.token, { requestId: 'recovery-start', defineId: model.defineId, initiator: 'u-employee', startDeptId: 'dept-hr', formData: { reason: 'Recovery test' } });
    let taskId = '';
    await expect.poll(async () => { const tasks = await api('/task/todo', manager.token); taskId = tasks.records[0]?.taskId ?? ''; return taskId; }).not.toBe('');
    await app.close(); app = undefined;
    app = await startServer(0); base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
    const tasks = await api('/task/todo', manager.token);
    expect(tasks.records[0]?.taskId).toBe(taskId);
    const detail = await api(`/inst/detail?instId=${instanceId}`, manager.token);
    expect(detail.formData).toEqual({ reason: 'Recovery test' });
    const command = { requestId: 'recovery-approve', instId: instanceId, taskId, action: 'agree', formData: { reason: 'Recovery test' } };
    await api('/task/handler', manager.token, command);
    await expect.poll(async () => (await api(`/inst/detail?instId=${instanceId}`, manager.token)).status).toBe('PASS');
    await api('/task/handler', manager.token, command);
  } finally {
    await app?.close();
    for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    rmSync(folder, { recursive: true, force: true });
  }
}, 60_000);
