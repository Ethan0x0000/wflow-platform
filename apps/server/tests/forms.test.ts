import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, it, expect } from 'vitest';
import { WorkflowStore } from '../src/store';
import { Forms } from '../src/forms';
import { ApiError } from '../src/models';
import { Runtime } from '../src/runtime';
import { createHandler } from '../src/index';

const admin = { id: 'u-admin', deptLevels: ['dept-it'], roleIds: ['role-admin'] };
const employee = { id: 'u-employee', deptLevels: ['dept-human', 'dept-hr'], roleIds: ['role-emp'] };
const outsider = { id: 'u-outsider', deptLevels: ['dept-sales'], roleIds: [] };
const draft = { formName: '费用报销', groupId: '', formType: 0, logo: { name: 'mdi:cash' }, formFields: '[]',
  formJson: { components: [{ id: 'amount', key: 'amount', type: 'NumberInput', name: '金额', valueType: 'Number', props: {} }] },
  startupRange: 'RANGE', startupPerm: [{ id: 'dept-hr', type: 'dept' }], adminPerm: [{ id: 'u-admin', type: 'user' }] };

describe('standalone form models', () => {
  it('versions drafts through publish, update, activate, copy and delete', () => {
    const store = new WorkflowStore(':memory:');
    try {
      const forms = new Forms(store);
      forms.createGroup('财务表单');
      expect(() => forms.createGroup('财务表单')).toThrow('分组名已存在，请更换');
      const groupId = forms.groups(false, undefined)[0]!.id;
      forms.createGroup('行政表单');
      const groups = forms.groups(false, undefined);
      forms.renameGroup(groups[1]!.id, '行政人事');
      expect(forms.groups(false, undefined).map((group) => group.name)).toEqual(['财务表单', '行政人事']);
      forms.sortGroups([groups[1]!.id, groups[0]!.id]);
      expect(forms.groups(false, undefined).map((group) => group.name)).toEqual(['行政人事', '财务表单']);

      const code = forms.save({ ...draft, groupId }, admin);
      expect(code).toMatch(/^WF[0-9a-f]{24}$/);
      const listed = forms.groups(true, undefined, (model) => forms.canAdmin(model.code, admin));
      const item = listed.find((group) => group.id === groupId)!.items[0]!;
      expect(item).toMatchObject({ code, formName: '费用报销', version: 1, status: 0, hasNewVersion: true, hasManagePerm: true });
      expect(forms.draftVersion(code)).toBe(1);
      expect(forms.byVer(code, 1).version).toBe(1);
      expect(() => forms.byVer(code)).toThrow('表单模型版本不存在或已被删除');

      forms.save({ ...draft, code, groupId, formName: '费用报销单' }, admin);
      expect(forms.draftVersion(code)).toBe(1);
      expect(forms.detailByCode(code)!.formName).toBe('费用报销单');

      forms.publish(code, admin);
      expect(forms.startup(code, employee)).toMatchObject({ version: 1, formName: '费用报销单' });
      expect(() => forms.startup(code, outsider)).toThrow('无本表单填报权限');
      expect(forms.draftVersion(code)).toBeNull();

      forms.updateInfo({ ...forms.detailByCode(code), id: forms.detailByCode(code)!.id, formName: '报销单' }, admin);
      expect(forms.detailByCode(code)!.formName).toBe('报销单');

      forms.save({ ...draft, code, groupId }, admin);
      expect(forms.draftVersion(code)).toBe(2);
      expect(forms.hisVersions(code).map((version) => version.version)).toEqual([2, 1]);
      forms.publish(code, admin);
      expect(forms.detailByCode(code)!.version).toBe(2);
      expect(forms.hisVersions(code)[1]).toMatchObject({ version: 1, status: -1 });

      forms.save({ ...draft, code, groupId, formName: '报销单 v3' }, admin);
      forms.publish(code, admin);
      const first = forms.hisVersions(code).find((version) => version.version === 1)!;
      forms.activate(first.id, admin);
      expect(forms.detailByCode(code)!.version).toBe(1);
      expect(() => forms.activate(first.id, admin)).toThrow('该版本已激活');
      forms.enable(code, false, admin);
      expect(forms.hisVersions(code).find((version) => version.version === 1)!.status).toBe(0);
      expect(() => forms.startup(code, employee)).toThrow('表单模型未启用或已被删除');

      const copied = forms.copy(code, '报销单副本', admin);
      expect(copied).not.toBe(code);
      expect(forms.detailByCode(copied)).toMatchObject({ formName: '报销单副本', version: 1, status: 0 });
      expect(() => forms.remove(code, employee)).toThrow('无本表单模型管理权限');
      forms.remove(code, admin);
      expect(forms.detailByCode(code)).toBeUndefined();
      expect(() => forms.deleteGroup(groupId)).toThrow('分组不为空，不允许直接删除');
      forms.remove(copied, admin);
      expect(() => forms.deleteGroup(groupId)).not.toThrow();
    } finally { store.close(); }
  });

  it('gates management by the admin perm list and leaves unconfigured models open', () => {
    const store = new WorkflowStore(':memory:');
    try {
      const forms = new Forms(store);
      forms.createGroup('表单');
      const groupId = forms.groups(false, undefined)[0]!.id;
      const open = forms.save({ ...draft, groupId, adminPerm: [] }, admin);
      expect(forms.canAdmin(open, outsider)).toBe(true);
      expect(forms.canAdmin(open, outsider, false)).toBe(true);
      const restricted = forms.save({ ...draft, groupId, formName: '受限表单', adminPerm: [{ id: 'dept-it', type: 'dept' }] }, admin);
      expect(forms.canAdmin(restricted, admin)).toBe(true);
      expect(forms.canAdmin(restricted, outsider)).toBe(false);
      expect(forms.canAdmin('', outsider)).toBe(true);
      expect(forms.canAdmin('missing-code', outsider)).toBe(false);
    } finally { store.close(); }
  });

  it('submits form data with version freeze, personal lists and field queries', () => {
    const store = new WorkflowStore(':memory:');
    try {
      const forms = new Forms(store);
      forms.createGroup('表单');
      const groupId = forms.groups(false, undefined)[0]!.id;
      const code = forms.save({ ...draft, groupId, startupRange: 'ALL', startupPerm: [], adminPerm: [] }, admin);
      expect(() => forms.submit(code, '{"amount":1}', employee)).toThrow('表单模型未启用或已被删除');
      forms.publish(code, admin);
      expect(() => forms.submit(code, 'not-json', employee)).toThrow('表单数据必须是合法JSON');
      const record = forms.submit(code, JSON.stringify({ amount: 12, reason: 'taxi' }), employee.id);
      expect(record).toMatchObject({ code, formVersion: 1, status: 0, creator: 'u-employee' });
      forms.submit(code, JSON.stringify({ amount: 80, reason: 'hotel' }), 'u-manager');
      expect(forms.myCount(employee)).toBe(1);
      expect(forms.records(new URLSearchParams(), employee.id).map((item) => item.creator)).toEqual(['u-employee']);
      expect(forms.records(new URLSearchParams('code=' + code))).toHaveLength(2);
      expect(forms.records(new URLSearchParams('fieldKey=reason&fieldValue=hot&compare=LIKE'))).toHaveLength(1);
      expect(forms.records(new URLSearchParams('fieldKey=amount&fieldValue=50&compare=GT'))).toHaveLength(1);
      expect(forms.records(new URLSearchParams('fieldKey=amount&fieldValue=12&compare=EQ'))).toHaveLength(1);
      const row = forms.row(record, (id) => ({ id, name: id }));
      expect(row).toMatchObject({ formName: '费用报销', fieldData: { amount: 12, reason: 'taxi' }, creator: { id: 'u-employee' } });

      expect(forms.fillGroups(undefined, employee).flatMap((group) => group.items).map((item) => item.code)).toEqual([code]);
      expect(forms.myGroups(undefined, employee).flatMap((group) => group.items).map((item) => item.code)).toEqual([code]);
      expect(forms.myGroups(undefined, 'u-nobody').flatMap((group) => group.items)).toEqual([]);
    } finally { store.close(); }
  });

  it('serves the standalone form endpoints over http', async () => {
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
      expect(await call('/auth/me')).toMatchObject({ code: 200, data: { id: 'u-admin' } });
      expect((await call('/form/model/group', 'POST')).code).toBe(422);
      await call(`/form/model/group?name=${encodeURIComponent('移动表单')}`, 'POST');
      const groups = await call('/form/model/group');
      const groupId = (groups.data as { id: string }[])[0]!.id;
      const saved = await call('/form/model/save', 'POST', { ...draft, groupId, startupRange: 'ALL', adminPerm: [] });
      expect(saved).toMatchObject({ code: 200 });
      const code = saved.data as string;
      const items = await call('/form/model/group/items');
      expect((items.data as { items: { code: string }[] }[])[0]!.items[0]).toMatchObject({ code, hasNewVersion: true, hasManagePerm: true });
      expect((await call(`/form/model?code=${code}`)).data).toMatchObject({ code, lastVersion: 1 });
      await call(`/form/model/publish?code=${code}`, 'POST');
      expect((await call(`/form/data/model?code=${code}`)).data).toMatchObject({ code, version: 1 });
      const submitted = await call('/form/data/submit', 'POST', { code, content: JSON.stringify({ amount: 5 }) });
      expect(submitted).toMatchObject({ code: 200, data: '提交成功' });
      expect((await call('/form/data/my/count')).data).toBe(1);
      const list = await call('/form/data/my/list?pageNo=1&pageSize=10');
      expect((list.data as { records: unknown[] }).records).toHaveLength(1);
      expect((await call(`/form/model/his/ver?code=${code}`)).data).toMatchObject({ total: 1, records: [{ version: 1, status: 1 }] });
      await call(`/form/model/enable?status=false&code=${code}`, 'PUT');
      expect((await call(`/form/data/model?code=${code}`)).msg).toBe('表单模型未启用或已被删除');
      await call(`/form/model/${code}`, 'DELETE');
      expect((await call(`/form/model?code=${code}`)).msg).toBe('没有找到该表单模型');
    } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); store.close(); }
  });

  it('reports permission errors as api errors', () => {
    const store = new WorkflowStore(':memory:');
    try {
      const forms = new Forms(store);
      try { forms.save({ ...draft, code: 'WFmissing', groupId: 'g' }, admin); expect.unreachable(); }
      catch (error) { expect(error).toBeInstanceOf(ApiError); expect((error as ApiError).status).toBe(403); }
      try { forms.byVer('WFmissing', 9); expect.unreachable(); }
      catch (error) { expect((error as ApiError).status).toBe(404); }
    } finally { store.close(); }
  });
});
