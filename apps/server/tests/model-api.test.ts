import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { expect, it } from 'vitest';
import { startServer } from '../src/index';

it('serves Java-shaped form field metadata, group rules and list projections', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'wflow-model-api-'));
  const before = { WFLOW_DB: process.env.WFLOW_DB, WFLOW_TEMPORAL_DB: process.env.WFLOW_TEMPORAL_DB, WFLOW_DEMO: process.env.WFLOW_DEMO };
  process.env.WFLOW_DB = join(folder, 'host.sqlite'); process.env.WFLOW_TEMPORAL_DB = join(folder, 'temporal.sqlite'); process.env.WFLOW_DEMO = '1';
  let app: Awaited<ReturnType<typeof startServer>> | undefined;
  let base = '';
  async function api(path: string, token = '', data?: unknown, method?: string) {
    const response = await fetch(`${base}${path}`, { method: method ?? (data ? 'POST' : 'GET'), headers: { wflowToken: token, 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
    const body = await response.json(); expect(body).toMatchObject({ code: 200 }); return body.data;
  }
  async function raw(path: string, token = '', data?: unknown, method?: string) {
    const response = await fetch(`${base}${path}`, { method: method ?? (data ? 'POST' : 'GET'), headers: { wflowToken: token, 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
    return response.json() as Promise<{ code: number; data: unknown; msg: string }>;
  }
  try {
    app = await startServer(0); base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
    const employee = await api('/auth/login/u-employee'), manager = await api('/auth/login/u-manager'), admin = await api('/auth/login/u-admin');

    // FormFieldData[{id,name,key,type,value,valueType,required,parent}]
    const fields = await api('/model/formFields?code=leave-request', admin.token);
    expect(fields).toMatchObject({ formType: 0 });
    expect(typeof fields.formJson).toBe('string');
    expect(fields.formFields).toEqual([{ id: 'reason', name: '请假原因', key: 'reason', type: 'TextInput', value: null, valueType: 'String', required: true }]);
    expect(await api('/model/formFields/by/leave-request', admin.token)).toEqual(fields.formFields);

    // EL validation: single success message, batch returns failing expressions only.
    expect(await api('/model/el/validate?el=1%2B1', admin.token)).toBe('表达式校验成功');
    expect((await raw('/model/el/validate?el=' + encodeURIComponent('a b c ??'), admin.token)).code).not.toBe(200);
    expect(await api('/model/el/validate/list', admin.token, ['1 + 1', 'a b c ??', '"ok"'])).toEqual(['a b c ??']);

    // Groups sort from 1 and refuse non-empty deletion.
    const second = await api(`/model/group?name=${encodeURIComponent('测试分组')}`, admin.token, undefined, 'POST');
    await api('/model/group/sort', admin.token, [second, 'group-hr'], 'PUT');
    expect((await api('/model/group', admin.token)).map((group: { id: string; sort: number }) => [group.id, group.sort])).toEqual([[second, 1], ['group-hr', 2]]);
    expect((await raw(`/model/group?groupId=group-hr`, admin.token, undefined, 'DELETE')).msg).toBe('分组不为空，不允许直接删除');
    expect(await api(`/model/group?groupId=${second}`, admin.token, undefined, 'DELETE')).toBe('已删除');

    // Java allows deploying code (1) and referenced (2) forms; detail returns formSource per formType.
    const process = (await api('/model?code=leave-request', admin.token)).process;
    await api('/model/save', admin.token, { code: 'code-form', procName: '代码表单流程', groupId: 'group-hr', formType: 1, formCode: '{"components":[]}', process, setting: { enableCancel: true, cancel: { enable: true, timeout: 7 }, revise: { enable: true }, enableUrging: true, enableRevoke: true, comment: { enable: true, endEnable: true } } });
    expect(await api('/model/deploy?code=code-form', admin.token, undefined, 'POST')).toBe('发布成功');
    expect(await api('/model?code=code-form', admin.token)).toMatchObject({ formType: 1, formCode: '{"components":[]}', status: 1 });

    // A completed instance exposes Java action perms and list/ido projections.
    await api('/model/update', admin.token, { code: 'leave-request', setting: { enableCancel: true, cancel: { enable: true, timeout: 7 }, revise: { enable: true }, enableUrging: true, enableRevoke: true, comment: { enable: true, endEnable: true } } });
    const model = await api('/startup/model/leave-request/undefined', employee.token);
    const instanceId = await api('/inst/startup', employee.token, { requestId: 'model-api-start', defineId: model.defineId, initiator: 'u-employee', startDeptId: 'dept-hr', formData: { reason: 'List projection' } });
    let taskId = '';
    await expect.poll(async () => { const tasks = await api('/task/todo', manager.token); taskId = tasks.records[0]?.taskId ?? ''; return taskId; }).not.toBe('');
    // /inst/list is visible to non-admins, with fieldData + todoUsers projections.
    const list = await api(`/inst/list?code=leave-request`, employee.token);
    interface ListRow { instId: string; fieldData: { key: string; value: unknown }[]; todoUsers: { id: string }[]; statusName: string }
    const mine = (list.records as ListRow[]).find((item) => item.instId === instanceId)!;
    expect(mine.fieldData).toContainEqual({ key: 'reason', value: 'List projection' });
    expect(mine.todoUsers.map((user) => user.id)).toContain('u-manager');
    expect(mine.statusName).toBe('进行中');

    await api('/task/handler', manager.token, { requestId: 'model-api-approve', instId: instanceId, taskId, action: 'agree', formData: { reason: 'List projection' } });
    await expect.poll(async () => (await api(`/inst/detail?instId=${instanceId}`, manager.token)).status).toBe('PASS');
    await api('/task/handler', manager.token, { requestId: 'model-api-comment', instId: instanceId, action: 'comment', comment: { text: '收到' } });

    const employeeDetail = await api(`/inst/detail?instId=${instanceId}`, employee.token);
    expect(employeeDetail.statusName).toBe('审批通过');
    expect(employeeDetail.operationPerm).toMatchObject({
      revoke: { enable: true }, revise: { enable: true }, delegate: { alisa: '委派', enable: false },
      urging: { enable: false }, withdraw: { enable: false }, comment: { enable: true },
    });

    const ido = await api('/task/ido', manager.token);
    expect(ido.records.map((item: { action: string }) => item.action)).toEqual(expect.arrayContaining(['agree', 'comment']));
    expect(ido.records.find((item: { action: string }) => item.action === 'agree')).toMatchObject({ instId: instanceId, nodeName: '部门负责人审批', statusName: '审批通过' });
    expect((await api('/task/ido?action=reject', manager.token)).records).toEqual([]);
    expect((await api('/inst/count', manager.token)).mySubmit).toBe(0);

    // Model lifecycle: his/ver statuses, enable toggling, version activation, copy resets, hard delete.
    expect(await api('/model/enable?status=false&code=code-form', admin.token, undefined, 'PUT')).toBe('模型已停用');
    expect((await raw('/model/enable?status=false&code=code-form', admin.token, undefined, 'PUT')).msg).toBe('该流程未启用');
    expect(await api('/model/enable?status=true&code=code-form', admin.token, undefined, 'PUT')).toBe('启用成功');
    expect((await raw('/model/enable?status=true&code=code-form', admin.token, undefined, 'PUT')).msg).toBe('该流程早已启用');
    const history = await api('/model/his/ver?code=code-form', admin.token);
    expect(history.records).toEqual([{ id: 'code-form:v1', defineId: 'code-form:1', procName: '代码表单流程', version: 1, status: 1, createTime: expect.any(String) }]);

    const redeployed = await api('/model/deploy?code=leave-request', admin.token, undefined, 'POST');
    expect(redeployed).toBe('发布成功');
    expect((await api('/model/his/ver?code=leave-request', admin.token)).records.map((row: { version: number; status: number }) => [row.version, row.status])).toEqual([[2, 1], [1, 2]]);
    expect((await raw('/model/active/leave-request:v1', admin.token, undefined, 'PUT')).data).toBe('切换成功');
    expect((await raw('/model/active/leave-request:v1', admin.token, undefined, 'PUT')).msg).toBe('该版本已激活，请刷新数据');

    expect(await api('/model/copy?code=leave-request&name=' + encodeURIComponent('请假副本'), admin.token, undefined, 'POST')).toBe('复制成功');
    const copy = (await api('/model/group/items/list', admin.token)).flatMap((group: { items: Array<{ code: string; procName: string; version: number; status: number; startupRange: string; startupPerm: string }> }) => group.items).find((item) => item.procName === '请假副本')!;
    expect(copy).toMatchObject({ version: 1, status: 0, startupRange: 'ALL', startupPerm: '[]' });
    expect(await api(`/model/${copy.code}`, admin.token, undefined, 'DELETE')).toBe('删除模型成功');
    expect((await raw(`/model?code=${copy.code}`, admin.token)).code).toBe(404);

    const codeFormDefine = (await api('/model/his/ver?code=code-form', admin.token)).records[0].defineId;
    expect(await api(`/model/code-form?defineId=${codeFormDefine}`, admin.token, undefined, 'DELETE')).toBe('删除模型成功');
    expect((await raw('/model?code=code-form', admin.token)).code).toBe(404);

    // Java getPrintTemplate returns PrintRule.template (a JSON string) as-is: the client JSON.parses once.
    const printTemplate = JSON.stringify({ version: '0.9.104', data: { header: [], main: [], footer: [] }, options: {} });
    await api('/model/save', admin.token, { code: 'print-conf-test', procName: '打印配置流程', groupId: 'group-hr', formType: 0, process, setting: { print: { type: 'CUSTOM', template: printTemplate } } });
    expect(await api('/model/deploy?code=print-conf-test', admin.token, undefined, 'POST')).toBe('发布成功');
    const printDefine = (await api('/model?code=print-conf-test', admin.token)).defineId;
    const printConf = await api(`/model/print/conf/${printDefine}`, admin.token);
    expect(printConf).toMatchObject({ type: 'CUSTOM' });
    expect(typeof printConf.template).toBe('string');
    expect(JSON.parse(printConf.template)).toMatchObject({ version: '0.9.104' });
  } finally {
    await app?.close();
    for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    rmSync(folder, { recursive: true, force: true });
  }
}, 60_000);
