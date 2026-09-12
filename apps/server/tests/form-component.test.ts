import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { WorkflowStore } from '../src/store';
import { Runtime } from '../src/runtime';
import { createHandler } from '../src/index';

interface ComponentRow { id: string; name: string; type: string; valueType: string; icon: string; sfc: string; version: number; status: number; creator: string }

describe('custom form components', () => {
  it('versions sfc changes and publishes the requested version like Java', async () => {
    const store = new WorkflowStore(':memory:');
    const runtime = new Runtime(store);
    const server = createServer((request, response) => { void createHandler(runtime)(request, response); });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const adminToken = runtime.session('u-admin').token, employeeToken = runtime.session('u-employee').token;
    const call = async (path: string, method = 'GET', data?: unknown, token = adminToken) => {
      const response = await fetch(`${base}${path}`, { method, headers: { wflowToken: token, 'Content-Type': 'application/json' }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
      return response.json() as Promise<{ code: number; data: unknown; msg: string }>;
    };
    try {
      // New components start DISABLED at version 1 with a generated type.
      expect(await call('/form/component', 'POST', { name: '签字组件', valueType: 'String', icon: 'mdi:pen', sfc: 'v1' })).toMatchObject({ code: 200, data: '保存组件成功' });
      let list = await call('/form/component/list');
      expect((list.data as { records: ComponentRow[] }).records).toHaveLength(1);
      const first = (list.data as { records: ComponentRow[] }).records[0]!;
      expect(first).toMatchObject({ name: '签字组件', version: 1, status: 0, creator: 'u-admin' });
      expect(await call(`/form/component/type/${first.type}`)).toMatchObject({ code: 200, data: { id: first.id, version: 1 } });

      // Unchanged sfc updates in place, keeping the row and version.
      await call('/form/component', 'POST', { id: first.id, type: first.type, name: '签字组件 v1', valueType: first.valueType, icon: first.icon, sfc: 'v1' });
      list = await call('/form/component/list');
      expect((list.data as { records: ComponentRow[] }).records).toHaveLength(1);
      expect((list.data as { records: ComponentRow[] }).records[0]).toMatchObject({ id: first.id, name: '签字组件 v1', version: 1 });

      // Changed sfc opens version 2 and expires the old row.
      await call('/form/component', 'POST', { id: first.id, type: first.type, name: '签字组件 v1', valueType: first.valueType, icon: first.icon, sfc: 'v2' });
      list = await call('/form/component/list');
      const second = (list.data as { records: ComponentRow[] }).records[0]!;
      expect((list.data as { records: ComponentRow[] }).records).toHaveLength(1);
      expect(second).toMatchObject({ version: 2, status: 0 });
      expect(second.id).not.toBe(first.id);
      expect(await call(`/form/component/${first.id}`)).toMatchObject({ code: 200, data: { id: first.id, version: 1, status: -1 } });
      expect(await call(`/form/component/type/${first.type}`)).toMatchObject({ code: 200, data: { id: second.id } });

      // Publishing replaces the host-registry refusal: this version is ACTIVATED and siblings stay EXPIRED.
      expect(await call(`/form/component/publish/${second.id}`, 'PUT')).toMatchObject({ code: 200, data: '发布组件成功' });
      expect((await call('/form/component/list?active=true')).data).toMatchObject({ records: [{ id: second.id, version: 2, status: 1 }] });
      expect((await call('/form/component/list?active=false')).data).toMatchObject({ records: [] });
      expect((await call('/form/component/list')).data).toMatchObject({ records: [{ id: second.id, status: 1 }] });

      // Disabling only flips the requested row.
      expect(await call(`/form/component/disable/${second.id}`, 'PUT')).toMatchObject({ code: 200, data: '禁用组件成功' });
      expect((await call('/form/component/list?active=false')).data).toMatchObject({ records: [{ id: second.id, status: 0 }] });
      expect((await call(`/form/component/publish/${second.id}`, 'PUT', undefined, employeeToken)).code).toBe(403);
      expect((await call('/form/component/list', 'GET', undefined, employeeToken)).code).toBe(403);
    } finally {
      server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); store.close();
    }
  });
});
