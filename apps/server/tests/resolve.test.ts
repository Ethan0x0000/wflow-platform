import { describe, expect, it } from 'vitest';
import { WorkflowStore } from '../src/store';
import { Runtime } from '../src/runtime';

const context = { tenantId: '1', instanceId: 'inst-1', businessKey: 'inst-1', initiatorId: 'u-employee', definition: { id: 'leave-request', version: 1 } };
const request = (assignment: unknown, data: import('wflow-core').Data = {}) => ({ context, executionId: 'n1', nodeId: 'review', assignment, data }) as Parameters<Runtime['resolve']>[0];

describe('wflow assignment resolver parity', () => {
  it('resolves FORM_DEPT by role/group/user/leader with nested departments', async () => {
    const store = new WorkflowStore(':memory:');
    try {
      const runtime = new Runtime(store);
      const base = { ruleType: 'FORM_DEPT', formDept: { dept: [{ id: 'deptField' }], type: 'ROLE', roles: [{ id: '4' }] } };
      const role = await runtime.resolve(request({ type: 'resolver', name: 'wflow:FORM_DEPT', params: base }, { deptField: [{ id: '6179678' }] }));
      expect(role.users.sort()).toEqual(['327382', '6418616']);
      const group = await runtime.resolve(request({ type: 'resolver', name: 'wflow:FORM_DEPT', params: { ...base, formDept: { ...base.formDept, type: 'GROUP', groups: [{ id: '2' }] } } }, { deptField: [{ id: '6179678' }] }));
      expect(group.users.sort()).toEqual(['327382', '6418616']);
      const users = await runtime.resolve(request({ type: 'resolver', name: 'wflow:FORM_DEPT', params: { ...base, formDept: { ...base.formDept, type: 'USER' } } }, { deptField: [{ id: 'dept-hr' }] }));
      expect(users.users.sort()).toEqual(['u-admin', 'u-employee', 'u-manager']);
      const leader = await runtime.resolve(request({ type: 'resolver', name: 'wflow:FORM_DEPT', params: { ...base, formDept: { ...base.formDept, type: 'LEADER' } } }, { deptField: [{ id: '4319868' }] }));
      expect(leader.users).toEqual(['927438']);
    } finally { store.close(); }
  });

  it('reports NodeReason for empty-handler transfers and same-root leader replacement', async () => {
    const store = new WorkflowStore(':memory:');
    try {
      const runtime = new Runtime(store);
      const admin = await runtime.resolve(request({ type: 'resolver', name: 'wflow:FORM_USER', params: { formUser: { id: 'missing' }, noUserHandler: { type: 'TO_ADMIN' } } }));
      expect(admin).toMatchObject({ reason: 'TRANSFER_EMPTY' });
      expect(admin.users.length).toBeGreaterThan(0);
      const none = await runtime.resolve(request({ type: 'resolver', name: 'wflow:FORM_USER', params: { formUser: { id: 'missing' }, noUserHandler: { type: 'TO_USER', assigned: ['u-admin'] } } }));
      expect(none).toEqual({ users: ['u-admin'], reason: 'TRANSFER_EMPTY' });
      // sameRoot TO_LEADER replaces the initiator with their direct leader and marks TRANSFER_LEADER.
      const leader = await runtime.resolve(request({ type: 'resolver', name: 'wflow:ASSIGN_USER', params: { assignUser: ['u-employee'], sameRoot: { type: 'TO_LEADER' } } }));
      expect(leader).toMatchObject({ reason: 'TRANSFER_LEADER' });
      expect(leader.users).not.toContain('u-employee');
    } finally { store.close(); }
  });
});
