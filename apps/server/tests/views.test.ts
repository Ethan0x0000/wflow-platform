import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { parseDefinition } from 'wflow-core';
import { expect, it } from 'vitest';
import { startServer } from '../src/index';
import type { Model } from '../src/models';
import { getUser, type Runtime } from '../src/runtime';
import { forecast } from '../src/views';

it('projects Java-compatible field permissions and execution records', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'wflow-views-'));
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
    const employee = await api('/auth/login/u-employee'), manager = await api('/auth/login/u-manager'), admin = await api('/auth/login/u-admin');
    const model = await api('/startup/model/leave-request/undefined', employee.token);
    const instanceId = await api('/inst/startup', employee.token, { requestId: 'views-start', defineId: model.defineId, initiator: 'u-employee', startDeptId: 'dept-hr', formData: { reason: 'Views test' } });
    let taskId = '';
    await expect.poll(async () => { const tasks = await api('/task/todo', manager.token); taskId = tasks.records[0]?.taskId ?? ''; return taskId; }).not.toBe('');
    const managerDetail = await api(`/inst/detail?instId=${instanceId}&nodeId=node_approval`, manager.token);
    expect(managerDetail.defaultFieldPerm).toBe('R');
    expect(managerDetail.fieldPerm).toEqual({});
    expect(managerDetail.formData).toEqual({ reason: 'Views test' });
    await expect(api(`/inst/detail?instId=${instanceId}&nodeId=node_approval`, employee.token)).rejects.toThrow();
    const adminDetail = await api(`/manage/inst/detail?instId=${instanceId}&taskId=${taskId}`, admin.token);
    expect(adminDetail.defaultFieldPerm).toBe('E');
    expect(adminDetail.fieldPerm).toEqual({ reason: 'E' });
    const records = await api(`/inst/records/${instanceId}`, employee.token);
    expect(records[0]).toMatchObject({ nodeType: 'Start', reason: null, count: 1, actualUsers: [{ result: 'startup' }] });
    expect(records.find((record: { nodeId: string }) => record.nodeId === 'node_approval')).toMatchObject({ nodeType: 'Approval', reason: null, count: 1 });
    await api('/task/handler', manager.token, { requestId: 'views-approve', instId: instanceId, taskId, action: 'agree', formData: { reason: 'Views test' } });
    await expect.poll(async () => (await api(`/inst/detail?instId=${instanceId}`, manager.token)).status).toBe('PASS');
    const after = await api(`/inst/records/${instanceId}`, employee.token);
    const approval = after.find((record: { nodeId: string }) => record.nodeId === 'node_approval');
    expect(approval.actualUsers[0]).toMatchObject({ result: 'agree', action: 'agree', createTime: expect.any(String), endTime: expect.any(String) });
    expect(approval.endTime).toEqual(expect.any(String));
    expect(after.find((record: { nodeId: string }) => record.nodeId === 'node_cc')).toMatchObject({ nodeType: 'Cc' });

    // ProcAgent taskCreate replacement + 代提交（代理发起）投影
    const timeRange = [new Date(Date.now() - 60_000).toISOString(), new Date(Date.now() + 3_600_000).toISOString()];
    expect(await api('/handover', manager.token, { target: { id: 'u-admin' }, scope: ['leave-request'], timeRange, reason: '代理' })).toBe('新增代理规则成功');
    const agentInstance = await api('/inst/startup', employee.token, { requestId: 'views-agent-start', defineId: model.defineId, initiator: 'u-employee', startDeptId: 'dept-hr', formData: { reason: 'Agent' } });
    await expect.poll(async () => (await api('/task/todo', admin.token)).records.map((item: { instId: string }) => item.instId)).toContain(agentInstance);
    expect((await api('/task/todo', manager.token)).records.map((item: { instId: string }) => item.instId)).not.toContain(agentInstance);

    const proxyInstance = await api('/inst/startup', admin.token, { requestId: 'views-proxy-start', defineId: model.defineId, initiator: 'u-employee', startDeptId: 'dept-hr', formData: { reason: 'Proxy' } });
    let proxyRow: { isAgent: boolean } | undefined;
    await expect.poll(async () => { proxyRow = (await api('/inst/list', admin.token)).records.find((item: { instId: string }) => item.instId === proxyInstance); return Boolean(proxyRow); }).toBe(true);
    expect(proxyRow!.isAgent).toBe(true);
    const proxyDetail = await api(`/inst/detail?instId=${proxyInstance}`, admin.token);
    expect(proxyDetail).toMatchObject({ isAgent: true, initiator: { id: 'u-employee' }, startUser: { id: 'u-admin' } });
    expect((await api('/inst/mySubmit/list', admin.token)).records.map((item: { instId: string }) => item.instId)).toContain(proxyInstance);
    expect((await api('/inst/count', admin.token)).mySubmit).toBe(0);

    // startProcess processData -> NODE_USERS preset overrides the node's assignee rule.
    const presetInstance = await api('/inst/startup', employee.token, { requestId: 'views-preset-start', defineId: model.defineId, initiator: 'u-employee', startDeptId: 'dept-hr', processData: { node_approval: ['u-employee'] }, formData: { reason: 'Preset' } });
    await expect.poll(async () => (await api('/task/todo', employee.token)).records.map((item: { instId: string }) => item.instId)).toContain(presetInstance);
    expect((await api('/task/todo', manager.token)).records.map((item: { instId: string }) => item.instId)).not.toContain(presetInstance);
  } finally {
    await app?.close();
    for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    rmSync(folder, { recursive: true, force: true });
  }
}, 60_000);

it('predicts through forEach and eventGateway and keeps custom assignee-less', async () => {
  const definition = parseDefinition({
    schemaVersion: 1, id: 'nested-forecast', version: 1, name: '嵌套预测',
    nodes: [
      { id: 'lines', type: 'forEach', items: { value: [{ amount: 1 }] }, itemKey: 'line', maxIterations: 10, nodes: [
        { id: 'line-approval', name: '明细审批', type: 'approval', mode: 'all', assignees: { type: 'users', userIds: ['u-manager'] } },
      ] },
      { id: 'race', type: 'eventGateway', branches: [
        { event: 'contract.signed', nodes: [
          { id: 'signed-task', name: '签约办理', type: 'task', mode: 'all', assignees: { type: 'users', userIds: ['u-admin'] } },
        ] },
        { timeoutMs: 86_400_000, nodes: [
          { id: 'timeout-approval', name: '超时审批', type: 'approval', mode: 'any', assignees: { type: 'users', userIds: ['u-employee'] } },
        ] },
      ] },
      { id: 'risk', name: '风控校验', type: 'custom', kind: 'risk.check' },
    ],
  });
  const model = { code: 'nested-forecast', version: 1, process: '[]' } as unknown as Model;
  const runtime = {
    tenant: '1',
    models: { published: () => ({ definition }) },
    activities: { resolveAssignees: async (request: { assignment: { type: string; userIds?: string[] } }) => ({ users: request.assignment.type === 'users' ? request.assignment.userIds ?? [] : [] }) },
  } as unknown as Runtime;
  const result = await forecast(runtime, model, getUser('u-manager'), {});
  expect(result.map((entry) => (entry as { nodeId: string }).nodeId)).toEqual(['node_root', 'line-approval', 'signed-task', 'timeout-approval', 'risk']);
  expect(result[1]).toMatchObject({ type: 'Approval', orgs: [{ id: 'u-manager' }] });
  expect(result[2]).toMatchObject({ type: 'Task', orgs: [{ id: 'u-admin' }] });
  expect(result[3]).toMatchObject({ type: 'Approval', orgs: [{ id: 'u-employee' }] });
  expect(result[4]).toMatchObject({ type: 'Waiting', orgs: [] });
});
