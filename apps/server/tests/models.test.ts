import { describe, it, expect } from 'vitest';
import { WorkflowStore } from '../src/store';
import { Models, instanceCode, seedModels, decode, object } from '../src/models';

describe('published models', () => {
  it('retains immutable versions when the editor changes a draft', () => {
    const store = new WorkflowStore(':memory:');
    try {
      const models = new Models(store); seedModels(models);
      const old = models.published('leave-request');
      models.save({ ...old.model, procName: 'Updated leave' });
      expect(models.published('leave-request').model.procName).toBe('请假申请');
      const updated = models.deploy('leave-request');
      expect(updated.version).toBe(2);
      expect(models.published('leave-request', 1).model.procName).toBe('请假申请');
      expect(models.published('leave-request', 2).model.procName).toBe('Updated leave');
      expect(old.definition.inputFields).toEqual([{ key: 'reason', type: 'string', required: true, minLength: 0, maxLength: 200 }]);
    } finally { store.close(); }
  });
  it('matches startup and admin permissions by user, parent dept and role', () => {
    const store = new WorkflowStore(':memory:');
    try {
      const models = new Models(store); seedModels(models);
      const model = models.get('leave-request');
      models.save({ ...model, startupRange: 'RANGE', startupPerm: JSON.stringify([{ id: 'role-mgr', type: 'role' }]), adminPerm: JSON.stringify([{ id: 'dept-hr', type: 'dept' }]) });
      const employee = { id: 'u-employee', deptLevels: ['dept-human', 'dept-hr'], roleIds: ['role-emp'] };
      const manager = { id: 'u-manager', deptLevels: ['dept-sales'], roleIds: ['role-mgr'] };
      expect(models.canStart(models.get('leave-request'), employee)).toBe(false);
      expect(models.canStart(models.get('leave-request'), manager)).toBe(true);
      expect(models.canManage(models.get('leave-request'), employee)).toBe(true);
      expect(models.canManage(models.get('leave-request'), { id: 'u-outsider', deptLevels: ['dept-it'], roleIds: [] })).toBe(false);
      models.save({ ...models.get('leave-request'), startupRange: 'NONE' });
      expect(models.canStart(models.get('leave-request'), manager)).toBe(false);
    } finally { store.close(); }
  });
  it('generates Java-compatible instance codes with daily and monthly counters', () => {
    const store = new WorkflowStore(':memory:');
    try {
      expect(instanceCode(store, {})).toMatch(/^WF\d{17}$/);
      const setting = { code: { type: 'CUSTOM', rules: ['WO', '-', '${dateTime}', '-', '${dayAdd}', '-', '${monthAdd}'] } };
      expect(instanceCode(store, setting)).toMatch(/^WO-\d{14}-0001-000002$/);
      expect(instanceCode(store, setting)).toMatch(/^WO-\d{14}-0003-000004$/);
      expect(instanceCode(store, { code: { type: 'CUSTOM', rules: ['${randNumber}'] } })).toMatch(/^[1-9]\d{3}$/);
    } finally { store.close(); }
  });
  it('publishes trigger nodes as engine triggers', () => {
    const store = new WorkflowStore(':memory:');
    try {
      const models = new Models(store); seedModels(models);
      const model = models.get('leave-request');
      models.save({ ...model, process: JSON.stringify([{ id: 'script', type: 'Trigger', props: { type: 'EL', el: 'ctx.amount' } }]) });
      const deployed = models.deploy(model.code);
      expect(deployed.version).toBe(2);
      expect((models.published(model.code).definition.nodes[0] as { type: string }).type).toBe('trigger');
    } finally { store.close(); }
  });
});
