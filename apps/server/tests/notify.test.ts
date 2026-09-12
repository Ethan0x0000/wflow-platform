import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import type { WorkflowEvent } from 'wflow-core';
import { WorkflowStore } from '../src/store';
import { Models } from '../src/models';
import { Runtime, getUser, notificationSchema, tenantId } from '../src/runtime';
import { createHandler } from '../src/index';

const task = (overrides: Record<string, unknown> = {}) => ({ id: 'task-n1', nodeId: 'approve', type: 'approval', mode: 'all', assignees: ['u-manager'], candidates: [], approved: [], status: 'pending', createdAt: '2026-01-01T00:00:00.000Z', fields: [], signature: null, ...overrides });

function fixture() {
  const store = new WorkflowStore(':memory:');
  const runtime = new Runtime(store);
  store.put('group', 'g', { id: 'g', name: '通知分组', sort: 0 });
  const models = new Models(store);
  models.save({ code: 'notify-proc', procName: '通知流程', groupId: 'g', process: [
    { id: 'node_root', type: 'Start', name: '发起人', childId: 'approve', props: {} },
    { id: 'approve', type: 'Approval', name: '部门审批', childId: null, props: { mode: 'USER', ruleType: 'ASSIGN_USER', assignUser: ['u-manager'] } },
  ] });
  models.deploy('notify-proc');
  store.put('instance', 'inst-1', { id: 'inst-1', code: 'notify-proc', title: '王小明发起的通知流程', initiator: getUser('u-employee'), submitter: getUser('u-employee'), model: models.get('notify-proc'), createdAt: '2026-01-01T00:00:00.000Z', startRequestId: 'start' });
  return { store, runtime };
}

function publish(runtime: Runtime, sequence: number, eventType: WorkflowEvent['eventType'], details: WorkflowEvent['details']): void {
  void runtime.adapters.publishEvent!({
    eventId: `event-${sequence}`, eventType, version: 1, occurredAt: new Date(Date.parse('2026-01-01T00:00:00.000Z') + sequence * 60_000).toISOString(),
    tenantId, instanceId: 'inst-1', businessKey: 'inst-1', definition: { id: 'notify-proc', version: 1 }, sequence, details,
  } as WorkflowEvent);
}

describe('Java notification templates', () => {
  it('pushes task, cc, result, timeout, transfer and add-assignee messages with Java titles/levels', () => {
    const { store, runtime } = fixture();
    try {
      const notes = () => store.list('notification', notificationSchema);
      publish(runtime, 1, 'workflow.taskCreated', { task: task() });
      expect(notes()).toMatchObject([{ target: 'u-manager', level: 'WARNING', title: '您有一个新任务待处理', content: '您有一个新任务[部门审批]待处理', unread: true, instId: 'inst-1' }]);

      // The initiator root node never notifies.
      publish(runtime, 2, 'workflow.taskCreated', { task: task({ id: 'task-root', nodeId: 'node_root', assignees: ['u-employee'] }) });
      expect(notes()).toHaveLength(1);

      publish(runtime, 3, 'workflow.taskChanged', { task: task(), action: 'timeout' });
      expect(notes().find((note) => note.title === '您有一项任务已超时')).toMatchObject({ target: 'u-manager', level: 'WARNING', content: '王小明发起的通知流程在节点[部门审批] 超时，请及时处理' });

      publish(runtime, 4, 'workflow.taskChanged', { task: task({ assignees: ['u-admin'] }), action: 'transfer', actorId: 'u-manager', comment: { text: '请处理' } });
      expect(notes().find((note) => note.title === '您被转交了一条待办任务')).toMatchObject({ target: 'u-admin', level: 'WARNING', content: '审批人 · 李经理在[部门审批]环节的任务被转交给您：请处理' });

      publish(runtime, 5, 'workflow.taskChanged', { task: task({ additions: [{ userId: 'u-admin', ownerId: 'u-manager', position: 'after', completed: false }] }), action: 'addAssignee' });
      expect(notes().find((note) => note.target === 'u-admin' && note.content === '您有一个新任务[部门审批]待处理')).toMatchObject({ level: 'WARNING' });

      publish(runtime, 6, 'workflow.cc', { recipients: ['u-admin'], nodeId: 'approve' });
      expect(notes().find((note) => note.title === '您收到一条流程抄送')).toMatchObject({ target: 'u-admin', level: 'SUCCESS', content: '[王小明发起的通知流程]在[部门审批]环节抄送给您，请知晓' });

      publish(runtime, 7, 'workflow.completed', {});
      expect(notes().find((note) => note.target === 'u-employee')).toMatchObject({ level: 'SUCCESS', title: '您有发起的流程审批通过', content: '您发起的流程 [王小明发起的通知流程] 审批通过' });
      publish(runtime, 8, 'workflow.rejected', {});
      expect(notes().find((note) => note.title === '您有发起的流程被驳回')).toMatchObject({ level: 'DANGER' });

      // Ordinary handler events do not notify the remaining assignees (Java only pushes taskCreate/timeout).
      const before = notes().length;
      publish(runtime, 9, 'workflow.taskChanged', { task: task(), action: 'approve' });
      expect(notes()).toHaveLength(before);
    } finally { store.close(); }
  });
});

describe('discuss, urging and notification endpoints', () => {
  it('aligns @mentions, revoke window, urging targets and notification payloads', async () => {
    const { store, runtime } = fixture();
    const server = createServer((request, response) => { void createHandler(runtime)(request, response); });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const adminToken = runtime.session('u-admin').token, managerToken = runtime.session('u-manager').token;
    const call = async (path: string, token: string, method = 'GET', data?: unknown) => {
      const response = await fetch(`${base}${path}`, { method, headers: { wflowToken: token, 'Content-Type': 'application/json' }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
      return response.json() as Promise<{ code: number; data: unknown; msg: string }>;
    };
    try {
      const posted = await call('/inst/discuss/inst-1', adminToken, 'POST', { text: '审批意见见附件', atUsers: [{ id: 'u-manager', name: '李经理' }], images: [], files: [] });
      expect(posted.code).toBe(200);
      const listed = await call('/inst/discuss?instId=inst-1', employeeToken(runtime), 'GET');
      expect(listed.data).toMatchObject({ total: 1, records: [{ instId: 'inst-1', owner: { id: 'u-admin', name: '流程管理员' }, content: { text: '审批意见见附件' } }] });

      const managerNotes = await call('/notify/list', managerToken, 'GET');
      expect(managerNotes.data).toMatchObject({ records: [{ level: 'INFO', title: '流程管理员 在流程中@了你', target: 'u-manager', unread: true, instId: 'inst-1' }] });
      expect((managerNotes.data as { records: Array<{ content: string }> }).records[0]!.content).toContain('@了你，请注意');

      // Revoke within the window, then reject stale messages.
      const messageId = (listed.data as { records: Array<{ id: string }> }).records[0]!.id;
      expect(await call(`/inst/discuss/${messageId}`, adminToken, 'DELETE')).toMatchObject({ code: 200, data: '撤回消息成功' });
      store.put('note', 'old-note', { id: 'old-note', instId: 'inst-1', userId: 'u-admin', createTime: new Date(Date.now() - 180_000).toISOString(), content: { text: '过期' } });
      expect(await call('/inst/discuss/old-note', adminToken, 'DELETE')).toMatchObject({ code: 409, msg: '消息已超过撤回时间' });
      expect(await call('/inst/discuss/missing', adminToken, 'DELETE')).toMatchObject({ code: 404, msg: '该消息不存在' });

      expect(await call('/task/urging', adminToken, 'POST', { instId: 'inst-1', targetUserIds: ['u-manager'], remark: '请尽快处理' })).toMatchObject({ code: 200, data: '催办成功' });
      const urgent = (await call('/notify/list', managerToken, 'GET')).data as { records: Array<{ id: string; level: string; title: string; content: string }> };
      const urging = urgent.records.find((note) => note.title === '您有一条流程催办消息')!;
      expect(urging).toMatchObject({ level: 'WARNING', content: '流程管理员 提醒您处理[王小明发起的通知流程] 请尽快处理' });

      expect(await call('/notify/confirm', managerToken, 'POST', [urging.id])).toMatchObject({ code: 200, data: '消息已读' });
      const remaining = (await call('/notify/list', managerToken, 'GET')).data as { records: Array<{ id: string }> };
      expect(remaining.records.map((note) => note.id)).not.toContain(urging.id);
      // Confirmations never leak to other users.
      const adminNotes = (await call('/notify/list', adminToken, 'GET')).data as { records: unknown[] };
      expect(adminNotes.records).toHaveLength(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      store.close();
    }
  });
});

function employeeToken(runtime: Runtime): string { return runtime.session('u-employee').token; }
