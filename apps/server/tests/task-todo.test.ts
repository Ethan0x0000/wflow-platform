import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { expect, it } from 'vitest';
import { instanceSchema } from '../src/runtime';
import { startServer } from '../src/index';

it('filters /task/todo by the process definition key (model code), not the instance number', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'wflow-todo-'));
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
    const instanceId = await api('/inst/startup', employee.token, { requestId: 'todo-filter-start', defineId: model.defineId, initiator: 'u-employee', startDeptId: 'dept-hr', formData: { reason: 'Todo filter' } });
    await expect.poll(async () => (await api('/task/todo?code=leave-request', manager.token)).records.map((item: { instId: string }) => item.instId)).toContain(instanceId);
    // Simulate a stored instance whose 流程编号 field differs from the model code.
    const stored = app.runtime.store.get('instance', instanceId, instanceSchema)!;
    app.runtime.store.put('instance', instanceId, { ...stored, code: 'INST-0099' });
    const byModel = await api('/task/todo?code=leave-request', manager.token);
    expect(byModel.records.map((item: { instId: string }) => item.instId)).toContain(instanceId);
    expect((await api('/task/todo?code=INST-0099', manager.token)).records.map((item: { instId: string }) => item.instId)).not.toContain(instanceId);
    expect((await api('/task/todo?code=other-proc', manager.token)).records).toEqual([]);
  } finally {
    await app?.close();
    for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    rmSync(folder, { recursive: true, force: true });
  }
}, 60_000);
