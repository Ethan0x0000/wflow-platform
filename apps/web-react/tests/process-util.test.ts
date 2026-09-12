import { describe, it, expect } from 'vitest';
import { getRandNodeId, reloadProcessId, getStatusText } from '../src/utils/ProcessUtil';
import { NodeTypes } from '../src/views/process/ProcessNodes';

describe('React Web: ProcessUtil and Node graph', () => {
  it('generates unique random node IDs', () => {
    const id1 = getRandNodeId();
    const id2 = getRandNodeId();
    expect(id1).not.toBe(id2);
    expect(id1.startsWith('node_')).toBe(true);
  });

  it('reloads parent and child IDs correctly in workflow chain', () => {
    const start = NodeTypes.Start.create()[0];
    const approval = NodeTypes.Approval.create()[0];
    const cc = NodeTypes.Cc.create()[0];

    const nodes = [start, approval, cc];
    reloadProcessId(nodes);

    expect(start.childId).toBe(approval.id);
    expect(approval.parentId).toBe(start.id);
    expect(approval.childId).toBe(cc.id);
    expect(cc.parentId).toBe(approval.id);
  });

  it('formats workflow status text correctly', () => {
    expect(getStatusText({ action: 'agree' })).toBe('已同意');
    expect(getStatusText({ action: 'reject' })).toBe('已拒绝');
    expect(getStatusText({ action: 'startup' }, false, '张三')).toBe('发起流程');
    expect(getStatusText({ action: 'startup' }, true, '张三')).toBe('代 张三 发起流程');
  });
});
