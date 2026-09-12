import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { WorkflowStore } from '../src/store';
import { FORM_DATA_TTL_MS, InstanceFormData, formDataRowSchema, isExpired } from '../src/form-data';

const reasonForm = {
  conf: { labelPosition: 'right', labelWidth: 100, size: 'default' }, datasource: [], components: [
    { id: 'reason', key: 'reason', type: 'TextInput', name: '请假原因', valueType: 'String', props: { required: true } },
  ],
};

describe('wflow_form_data storage rows', () => {
  it('writes one row per instance, merges updates, drops nulls and stops at the 48h boundary', () => {
    const store = new WorkflowStore(':memory:');
    try {
      const formData = new InstanceFormData(store);
      const saved = formData.save('inst-1', 'leave-request:1', { reason: 'A', amount: 3, empty: null });
      expect(saved).toMatchObject({ instId: 'inst-1', defineId: 'leave-request:1', content: [{ key: 'reason', value: 'A' }, { key: 'amount', value: 3 }] });
      expect(Date.parse(saved.expireTime) - Date.parse(saved.cacheTime)).toBe(FORM_DATA_TTL_MS);
      expect(store.get('instFormData', 'inst-1', formDataRowSchema)).toMatchObject({ content: saved.content });

      const updated = formData.update('inst-1', 'leave-request:1', { amount: 5, extra: true });
      expect(updated.content).toEqual([{ key: 'reason', value: 'A' }, { key: 'amount', value: 5 }, { key: 'extra', value: true }]);
      expect(formData.map('inst-1')).toEqual({ reason: 'A', amount: 5, extra: true });
      expect(store.get('instFormData', 'inst-1', formDataRowSchema)!.updateTime).toBe(updated.updateTime);

      // Java filters null values out of the merged content.
      formData.update('inst-1', 'leave-request:1', { amount: null });
      expect(formData.map('inst-1')).toEqual({ reason: 'A', extra: true });

      // TS upserts when update runs before save (Java's UPDATE affects zero rows).
      expect(formData.update('inst-2', 'other:1', { a: 1 }).content).toEqual([{ key: 'a', value: 1 }]);
      expect(formData.get('missing')).toBeUndefined();

      formData.remove('inst-1');
      expect(formData.get('inst-1')).toBeUndefined();
      expect(store.get('instFormData', 'inst-1', formDataRowSchema)).toBeUndefined();
    } finally { store.close(); }
  });

  it('expires exactly at 48h and refills an expired cache entry', () => {
    const boundary = { instId: 'i', defineId: 'd', content: [], createTime: '', updateTime: '', cacheTime: new Date(0).toISOString(), expireTime: new Date(FORM_DATA_TTL_MS).toISOString() };
    expect(isExpired(boundary, FORM_DATA_TTL_MS - 1)).toBe(false);
    expect(isExpired(boundary, FORM_DATA_TTL_MS)).toBe(true);

    const store = new WorkflowStore(':memory:');
    try {
      const formData = new InstanceFormData(store);
      formData.save('i', 'd', { a: 1 });
      store.put('instFormData', 'i', { ...formData.get('i')!, cacheTime: new Date(0).toISOString(), expireTime: new Date(0).toISOString() });
      const reloaded = new InstanceFormData(store).get('i')!;
      expect(isExpired(reloaded)).toBe(false);
      expect(Date.parse(reloaded.expireTime)).toBeGreaterThan(Date.now());
      expect(store.get('instFormData', 'i', formDataRowSchema)!.expireTime).toBe(reloaded.expireTime);
    } finally { store.close(); }
  });

  it('purges the form data row together with the instance', () => {
    const store = new WorkflowStore(':memory:');
    try {
      const formData = new InstanceFormData(store);
      formData.save('inst-1', 'd:1', { a: 1 });
      formData.save('inst-2', 'd:1', { a: 2 });
      store.purgeInstance('inst-1');
      expect(store.get('instFormData', 'inst-1', formDataRowSchema)).toBeUndefined();
      expect(store.get('instFormData', 'inst-2', formDataRowSchema)).toBeDefined();
    } finally { store.close(); }
  });
});

describe('wflow_form_data through the instance endpoints', () => {
  it('writes on startup, updates on approve and purges on delete', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'wflow-form-data-'));
    const before = { WFLOW_DB: process.env.WFLOW_DB, WFLOW_TEMPORAL_DB: process.env.WFLOW_TEMPORAL_DB, WFLOW_DEMO: process.env.WFLOW_DEMO };
    process.env.WFLOW_DB = join(folder, 'host.sqlite'); process.env.WFLOW_TEMPORAL_DB = join(folder, 'temporal.sqlite'); process.env.WFLOW_DEMO = '1';
    const { startServer } = await import('../src/index');
    let app: Awaited<ReturnType<typeof startServer>> | undefined;
    let base = '';
    async function call(path: string, token: string, method = 'GET', data?: unknown) {
      const response = await fetch(`${base}${path}`, { method, headers: { wflowToken: token, 'Content-Type': 'application/json' }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
      const body = await response.json() as { code: number; data: unknown; msg: string };
      expect(body).toMatchObject({ code: 200 });
      return body.data;
    }
    try {
      app = await startServer(0); base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
      const employee = await call('/auth/login/u-employee', '') as { token: string };
      const manager = await call('/auth/login/u-manager', '') as { token: string };
      const admin = await call('/auth/login/u-admin', '') as { token: string };
      // The Approval node grants write access to `reason` so the manager may change it.
      app.runtime.models.save({ code: 'form-data-proc', procName: '表单数据流程', groupId: 'group-hr', formType: 0, formJson: reasonForm,
        process: [
          { id: 'node_root', type: 'Start', name: '发起人', childId: 'node_approval', props: {} },
          { id: 'node_approval', type: 'Approval', name: '部门审批', childId: null, props: { mode: 'USER', ruleType: 'ASSIGN_USER', assignUser: ['u-manager'], formPerms: [{ key: 'reason', perm: 'E' }] } },
        ] });
      const model = app.runtime.models.deploy('form-data-proc');
      const instanceId = await call('/inst/startup', employee.token, 'POST', { requestId: 'form-data-start', defineId: model.defineId, initiator: 'u-employee', startDeptId: 'dept-hr', formData: { reason: 'Stored' } }) as string;
      expect(app.runtime.store.get('instFormData', instanceId, formDataRowSchema)).toMatchObject({ instId: instanceId, defineId: model.defineId, content: [{ key: 'reason', value: 'Stored' }] });

      let taskId = '';
      await expect.poll(async () => {
        const tasks = await call('/task/todo', manager.token) as { records: Array<{ taskId: string }> };
        taskId = tasks.records[0]?.taskId ?? ''; return taskId;
      }).not.toBe('');

      // Java projections read wflow_form_data, not the engine snapshot.
      app.runtime.formData.update(instanceId, model.defineId, { reason: 'StoreOnly' });
      const list = await call('/inst/list?code=form-data-proc', employee.token) as { records: Array<{ instId: string; fieldData: Array<{ key: string; value: unknown }> }> };
      const projected = list.records.find((item) => item.instId === instanceId)!;
      expect(projected.fieldData).toContainEqual({ key: 'reason', value: 'StoreOnly' });
      expect((await call(`/inst/detail?instId=${instanceId}`, manager.token) as { formData: unknown }).formData).toEqual({ reason: 'StoreOnly' });

      await call('/task/handler', manager.token, 'POST', { requestId: 'form-data-approve', instId: instanceId, taskId, action: 'agree', formData: { reason: 'Approved' } });
      await expect.poll(async () => (await call(`/inst/detail?instId=${instanceId}`, manager.token) as { status: string }).status).toBe('PASS');
      expect(app.runtime.store.get('instFormData', instanceId, formDataRowSchema)).toMatchObject({ content: [{ key: 'reason', value: 'Approved' }] });

      await call(`/inst/${instanceId}`, admin.token, 'DELETE');
      expect(app.runtime.store.get('instFormData', instanceId, formDataRowSchema)).toBeUndefined();
      expect(app.runtime.formData.get(instanceId)).toBeUndefined();
    } finally {
      await app?.close();
      for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
      rmSync(folder, { recursive: true, force: true });
    }
  }, 60_000);
});
