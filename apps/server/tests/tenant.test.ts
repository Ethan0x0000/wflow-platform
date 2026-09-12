import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { expect, it } from 'vitest';
import { startServer } from '../src/index';

it('isolates tenants by TenantId header store and task queue', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'wflow-tenant-'));
  const before = { WFLOW_DB: process.env.WFLOW_DB, WFLOW_TEMPORAL_DB: process.env.WFLOW_TEMPORAL_DB, WFLOW_DEMO: process.env.WFLOW_DEMO };
  process.env.WFLOW_DB = join(folder, 'host.sqlite'); process.env.WFLOW_TEMPORAL_DB = join(folder, 'temporal.sqlite'); process.env.WFLOW_DEMO = '1';
  let app: Awaited<ReturnType<typeof startServer>> | undefined;
  let base = '';
  async function call(path: string, token = '', tenant = '1', data?: unknown) {
    const response = await fetch(`${base}${path}`, { method: data ? 'POST' : 'GET', headers: { wflowToken: token, TenantId: tenant, 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
    return response.json() as Promise<{ code: number; data: unknown; msg: string }>;
  }
  try {
    app = await startServer(0); base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
    const first = await call('/auth/login/u-employee');
    const second = await call('/auth/login/u-employee', '', 't2');
    const firstToken = (first.data as { token: string }).token, secondToken = (second.data as { token: string }).token;
    expect(firstToken).not.toBe(secondToken);

    const model = (await call('/startup/model/leave-request/undefined', secondToken, 't2')).data as { defineId: string };
    const instanceId = (await call('/inst/startup', secondToken, 't2', { requestId: 'tenant-start', defineId: model.defineId, initiator: 'u-employee', startDeptId: 'dept-hr', formData: { reason: 'Tenant two' } })).data;
    await expect.poll(async () => (await call('/inst/count', secondToken, 't2')).data).toMatchObject({ mySubmit: 1 });
    expect((await call('/inst/list', firstToken)).data).toMatchObject({ records: [] });
    expect((await call('/inst/count', firstToken)).data).toMatchObject({ mySubmit: 0 });

    // The tenant store is a sibling SQLite file; the shared Temporal environment runs a per-tenant task queue.
    const manager = await call('/auth/login/u-manager', '', 't2');
    await expect.poll(async () => {
      const todos = (await call('/task/todo', (manager.data as { token: string }).token, 't2')).data as { records: Array<{ instId: string }> };
      return todos.records.map((item) => item.instId);
    }).toContain(instanceId);
    const detail = (await call(`/inst/detail?instId=${instanceId}`, secondToken, 't2')).data as { tenantId?: string; title: string };
    expect(detail.title).toBe('申请人 · 王小明发起的请假申请');

    // A token minted for one tenant is not valid for another.
    expect((await call('/inst/count', secondToken)).code).not.toBe(200);
  } finally {
    await app?.close();
    for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    rmSync(folder, { recursive: true, force: true });
  }
}, 60_000);
