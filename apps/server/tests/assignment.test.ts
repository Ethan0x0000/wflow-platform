import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { WorkflowStore } from '../src/store';
import { Models, publishedSchema } from '../src/models';
import { agentFor, agentSchema, mapUser, validateAgent } from '../src/assignment-policy';
import { acquireHandoverLock, handoverSchema, releaseHandoverLock, rewriteModelUsers } from '../src/handover';
import { Runtime } from '../src/runtime';
import { createHandler } from '../src/index';

const now = Date.now();
const at = (offset: number) => new Date(now + offset).toISOString();
const target = (id: string, name = id) => ({ id, name, avatar: '' });

function rule(input: { id: string; userId: string; targetId: string; scope: string[] | null; start: number; end: number }) {
  return { id: input.id, userId: input.userId, target: target(input.targetId), scope: input.scope, timeRange: [at(input.start), at(input.end)], reason: '' };
}

describe('approval agent rules', () => {
  it('enforces the global/process exclusion and applies only effective rules', () => {
    const store = new WorkflowStore(':memory:');
    try {
      const global = validateAgent(store, rule({ id: 'a1', userId: 'u-employee', targetId: 'u-manager', scope: null, start: -60_000, end: 3_600_000 }));
      store.put('agent', 'a1', global);
      // An effective global rule blocks any scoped rule for the same source.
      expect(() => validateAgent(store, rule({ id: 'a2', userId: 'u-employee', targetId: 'u-admin', scope: ['leave-request'], start: -60_000, end: 3_600_000 }))).toThrow('流程leave-request已被全局设置，无法变更');
      // A pending (future) global rule never blocks.
      const future = validateAgent(store, rule({ id: 'a3', userId: 'u-admin', targetId: 'u-manager', scope: null, start: 3_600_000, end: 7_200_000 }));
      store.put('agent', 'a3', future);
      const scoped = validateAgent(store, rule({ id: 'a4', userId: 'u-admin', targetId: 'u-employee', scope: ['leave-request'], start: -60_000, end: 3_600_000 }));
      store.put('agent', 'a4', scoped);
      // Same process rule for another source is independent.
      expect(() => validateAgent(store, rule({ id: 'a5', userId: 'u-manager', targetId: 'u-admin', scope: ['leave-request'], start: -60_000, end: 3_600_000 }))).not.toThrow();

      expect(mapUser(store, 'u-employee', 'leave-request')).toBe('u-manager');
      expect(mapUser(store, 'u-employee', 'anything')).toBe('u-manager');
      expect(mapUser(store, 'u-admin', 'leave-request')).toBe('u-employee');
      expect(mapUser(store, 'u-admin', 'other-process')).toBe('u-admin');
      expect(agentFor(store, 'u-nobody', 'leave-request')).toBeUndefined();
      expect(agentSchema.parse(store.get('agent', 'a4', agentSchema))).toMatchObject({ scope: ['leave-request'] });
    } finally { store.close(); }
  });

  it('rewrites handed-over users in every model and published version', () => {
    const store = new WorkflowStore(':memory:');
    try {
      const models = new Models(store);
      store.put('group', 'g', { id: 'g', name: '交接分组', sort: 0 });
      models.save({ code: 'handover-proc', procName: '交接流程', groupId: 'g', process: [
        { id: 'node_approval', type: 'Approval', name: '审批', childId: null, props: {
          mode: 'USER', ruleType: 'ASSIGN_USER',
          assignUser: [{ id: 'u-employee', name: '申请人', type: 'user', avatar: '' }, { id: 'u-manager', name: '李经理', type: 'user', avatar: '' }],
        } },
      ], startupPerm: [{ id: 'u-employee', type: 'user' }], adminPerm: [{ id: 'u-employee', type: 'user' }] });
      models.deploy('handover-proc');

      const failed = rewriteModelUsers(store, 'u-employee', target('u-manager', '李经理'));
      expect(failed).toEqual([]);
      const saved = models.get('handover-proc');
      expect(JSON.parse(saved.process)[0].props.assignUser).toEqual([{ id: 'u-manager', name: '李经理', type: 'user', avatar: '' }]);
      expect(JSON.parse(saved.startupPerm)).toEqual([{ id: 'u-manager', name: '李经理', type: 'user', avatar: '' }]);
      expect(JSON.parse(saved.adminPerm)).toEqual([{ id: 'u-manager', name: '李经理', type: 'user', avatar: '' }]);
      const version = store.get('version', 'handover-proc:1', publishedSchema)!;
      const node = (version.definition as { nodes: Array<{ id: string; assignees?: { type: string; userIds: string[] } }> }).nodes.find((item) => item.id === 'node_approval')!;
      expect(node.assignees).toEqual({ type: 'users', userIds: ['u-manager'] });
      // Idempotent: a second handover of the same source changes nothing.
      expect(rewriteModelUsers(store, 'u-employee', target('u-admin'))).toEqual([]);
      expect(JSON.parse(models.get('handover-proc').process)[0].props.assignUser).toEqual([{ id: 'u-manager', name: '李经理', type: 'user', avatar: '' }]);
    } finally { store.close(); }
  });

  it('serves agent and work-handover endpoints with Java lifecycle semantics', async () => {
    const store = new WorkflowStore(':memory:');
    const runtime = new Runtime(store);
    const server = createServer((request, response) => { void createHandler(runtime)(request, response); });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const token = runtime.session('u-admin').token;
    const call = async (path: string, method = 'GET', data?: unknown) => {
      const response = await fetch(`${base}${path}`, { method, headers: { wflowToken: token, 'Content-Type': 'application/json' }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
      return response.json() as Promise<{ code: number; data: unknown; msg: string }>;
    };
    try {
      const range = [at(-60_000), at(3_600_000)];
      expect(await call('/handover', 'POST', { target: target('u-manager', '李经理'), scope: null, timeRange: range, reason: '出差' })).toMatchObject({ code: 200, data: '新增代理规则成功' });
      const listed = await call('/handover');
      expect(listed.data).toMatchObject({ total: 1, records: [{ target: { id: 'u-manager' }, scope: null, reason: '出差' }] });
      expect(await call('/handover', 'POST', { target: target('u-admin'), scope: ['leave-request'], timeRange: range })).toMatchObject({ code: 409, msg: '流程leave-request已被全局设置，无法变更' });
      const first = (listed.data as { records: Array<{ id: string }> }).records[0]!;
      expect(await call('/handover', 'PUT', { id: first.id, target: target('u-manager', '李经理'), scope: null, timeRange: range, reason: '休假' })).toMatchObject({ code: 200, data: '修改成功' });
      const updated = await call('/handover');
      expect(updated.data).toMatchObject({ total: 1, records: [{ reason: '休假' }] });
      expect((updated.data as { records: Array<{ id: string }> }).records[0]!.id).not.toBe(first.id);
      expect(await call(`/handover/${(updated.data as { records: Array<{ id: string }> }).records[0]!.id}`, 'DELETE')).toMatchObject({ code: 200, data: '删除成功' });

      expect(await call('/work-handover', 'POST', { source: target('u-employee', '王小明'), target: target('u-employee'), scope: null, reason: 'x' })).toMatchObject({ code: 422, msg: '交接人和接替人不能相同' });
      expect(await call('/work-handover', 'POST', { source: target('u-employee', '王小明'), target: target('u-manager', '李经理'), scope: null, reason: '离职交接' })).toMatchObject({ code: 200, data: '创建工作交接记录成功' });
      const records = await call('/work-handover?all=true');
      const handover = (records.data as { records: Array<{ id: string; status: number }> }).records[0]!;
      expect(handover.status).toBe(0);
      expect(await call(`/work-handover/retry/${handover.id}`, 'PUT')).toMatchObject({ code: 409, msg: '当前交接任务状态不允许重试' });
      expect(await call(`/work-handover/activate/${handover.id}`, 'PUT')).toMatchObject({ code: 200, data: '工作交接生效成功' });
      await expect.poll(async () => (store.get('handover', handover.id, handoverSchema)!.status)).toBe(2);
      expect(store.get('handover', handover.id, handoverSchema)).toMatchObject({ activatedBy: { id: 'u-admin' }, failedModels: null, activatedTime: expect.any(String) });

      // The handover lock blocks startup/handler/model mutations and concurrent runs.
      acquireHandoverLock(store, 'probe');
      expect(await call('/model/save', 'POST', { code: 'blocked-proc' })).toMatchObject({ code: 409, msg: '系统正在执行工作交接，暂时无法操作，请稍后重试' });
      expect(await call('/handover', 'POST', { target: target('u-manager'), scope: null, timeRange: range })).toMatchObject({ code: 200 });
      expect(await call('/work-handover', 'POST', { source: target('u-employee'), target: target('u-admin'), scope: null, reason: 'y' })).toMatchObject({ code: 200 });
      const blocked = store.list('handover', handoverSchema).find((record) => record.reason === 'y')!;
      expect(await call(`/work-handover/activate/${blocked.id}`, 'PUT')).toMatchObject({ code: 409, msg: '系统正在执行其他交接任务，请稍后重试' });
      releaseHandoverLock(store);

      store.put('handover', blocked.id, { ...blocked, status: 1 });
      expect(await call(`/work-handover/${blocked.id}`, 'DELETE')).toMatchObject({ code: 409, msg: '交接任务执行中，不允许删除' });
      store.put('handover', blocked.id, { ...blocked, status: 3, failedModels: [{ id: 'm1', code: 'c1', name: 'n1', version: 1, error: 'boom' }] });
      expect(await call(`/work-handover/retry/${blocked.id}`, 'PUT')).toMatchObject({ code: 200, data: '已开始重新执行交接任务' });
      await expect.poll(async () => (store.get('handover', blocked.id, handoverSchema)!.status)).toBe(2);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      store.close();
    }
  });
});
