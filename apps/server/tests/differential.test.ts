import { describe, it, expect, beforeAll } from 'vitest';
import { orgService } from '../src/org';
import { importWflowDefinition, importWflowCondition, evaluate } from 'wflow-core';

describe('Differential and Parity Verification against Java workflow-base', () => {
  const javaBase = 'http://127.0.0.1:8080';
  const tsBase = 'http://127.0.0.1:2048';
  let javaAlive = false;
  let javaToken = '';
  let tsToken = '';

  beforeAll(async () => {
    try {
      const ping = await fetch(`${javaBase}/auth/login/381496`, { headers: { TenantId: '1' } });
      if (ping.ok) {
        const body = (await ping.json()) as { code: number; data: { token: string } };
        if (body.code === 200) {
          javaAlive = true;
          javaToken = body.data.token;
        }
      }
    } catch {
      javaAlive = false;
    }

    try {
      const tsLogin = await fetch(`${tsBase}/auth/login/381496`);
      if (tsLogin.ok) {
        const body = (await tsLogin.json()) as { code: number; data: { token: string } };
        if (body.code === 200) tsToken = body.data.token;
      }
    } catch {
      // TS server check
    }
  });

  it('verifies orgService hierarchy and leadership logic mirrors Java FlowOrgServiceImpl', () => {
    // Test direct department leader
    const directLeader = orgService.getDeptLeaders('327382', '6179678', 1, true, false);
    expect(directLeader).toEqual(['6418616']); // 张三 is leader of 研发部

    // If current user is already the leader, level 1 ascends to parent dept leader
    const parentLeader = orgService.getDeptLeaders('6418616', '6179678', 1, true, false);
    expect(parentLeader).toEqual(['381496']); // 旅人 is leader of wflow软件技术 (parent)

    // Multi-level leadership traversal (toEnd: false, level 2)
    const topLeaders = orgService.getDeptLeaders('327382', '6179678', 2, false, false);
    expect(topLeaders).toEqual(['6418616', '381496']);

    // Dept ancestor chain
    const levels = orgService.getDeptLevels('689698'); // 客服部 -> 销售服务部 -> wflow软件技术
    expect(levels).toEqual(['689698', '4319868', '1486186']);
  });

  it('verifies live Java and TypeScript API outputs match on key endpoints when Java backend is running', async () => {
    if (!javaAlive || !tsToken) return;

    // 1. Root Org Tree comparison
    const [javaTreeRes, tsTreeRes] = await Promise.all([
      fetch(`${javaBase}/org/tree?deptId=0`, { headers: { TenantId: '1', wflowToken: javaToken } }),
      fetch(`${tsBase}/org/tree?deptId=0`, { headers: { wflowToken: tsToken } }),
    ]);
    const javaTree = ((await javaTreeRes.json()) as { data: Array<{ id: number; name: string }> }).data;
    const tsTree = ((await tsTreeRes.json()) as { data: Array<{ id: number; name: string }> }).data;
    expect(javaTree.map((d) => d.name)).toEqual(tsTree.map((d) => d.name));
    expect(javaTree[0]?.name).toBe('wflow软件技术');

    // 2. Roles comparison
    const [javaRolesRes, tsRolesRes] = await Promise.all([
      fetch(`${javaBase}/org/roles`, { headers: { TenantId: '1', wflowToken: javaToken } }),
      fetch(`${tsBase}/org/roles`, { headers: { wflowToken: tsToken } }),
    ]);
    const javaRoles = ((await javaRolesRes.json()) as { data: Array<{ id: number | string; name: string }> }).data;
    const tsRoles = ((await tsRolesRes.json()) as { data: Array<{ id: number | string; name: string }> }).data;
    // Every role present in Java must be present in TS
    for (const r of javaRoles) {
      expect(tsRoles.some((tr) => tr.name === r.name)).toBe(true);
    }

    // 3. User details comparison (381496 旅人)
    const [javaUserRes, tsUserRes] = await Promise.all([
      fetch(`${javaBase}/org/user/detail/381496`, { headers: { TenantId: '1', wflowToken: javaToken } }),
      fetch(`${tsBase}/org/user/detail/381496`, { headers: { wflowToken: tsToken } }),
    ]);
    const javaUser = ((await javaUserRes.json()) as { data: { name: string; avatar: string } }).data;
    const tsUser = ((await tsUserRes.json()) as { data: { name: string; avatar: string } }).data;
    expect(tsUser.name).toBe(javaUser.name);
    expect(tsUser.avatar).toBe(javaUser.avatar);

    // 4. EL Validation comparison
    const [javaElRes, tsElRes] = await Promise.all([
      fetch(`${javaBase}/model/el/validate?el=ctx.amount%3E100`, { headers: { TenantId: '1', wflowToken: javaToken } }),
      fetch(`${tsBase}/model/el/validate?el=ctx.amount%3E100`, { headers: { wflowToken: tsToken } }),
    ]);
    const javaEl = ((await javaElRes.json()) as { data: string }).data;
    const tsEl = ((await tsElRes.json()) as { data: string }).data;
    expect(tsEl).toBe(javaEl);
  });

  it('evaluates advanced wflow router and initiator conditions in TypeScript', () => {
    const wflowJson = {
      id: 'advanced-wflow',
      name: 'Advanced Flow',
      nodes: [
        { id: 'start', type: 'Start', childId: 'router1' },
        {
          id: 'router1',
          type: 'Router',
          childId: 'node_hr',
          props: {
            hasCondition: true,
            groups: [
              {
                conditions: [
                  { group: 'INITIATOR', valueType: 'dept', compare: 'IN', compareVal: [{ id: '1486186' }] },
                  { group: 'FORM', symbol: 'amount', compare: 'GT', compareVal: [5000] },
                ],
              },
            ],
            target: { id: 'node_exec' },
          },
        },
        { id: 'node_hr', type: 'Approval', name: 'HR审批', props: { ruleType: 'ROOT_SELF', mode: 'USER' }, childId: null },
        { id: 'node_exec', type: 'Approval', name: '高管审批', props: { ruleType: 'ROOT_SELF', mode: 'USER' }, childId: null },
      ],
    };

    const def = importWflowDefinition(wflowJson);
    const routerNode = def.nodes[0] as { type: string; targetNodeId: string; when: any };
    expect(routerNode.type).toBe('router');
    expect(routerNode.targetNodeId).toBe('node_exec');

    // Matching: initiator is in dept 1486186 (or child dept) and amount > 5000
    expect(evaluate(routerNode.when, { _initiatorDeptLevels: ['264868', '1486186'], amount: 6000 })).toBe(true);

    // Non-matching amount
    expect(evaluate(routerNode.when, { _initiatorDeptLevels: ['264868', '1486186'], amount: 3000 })).toBe(false);

    // Non-matching dept
    expect(evaluate(routerNode.when, { _initiatorDeptLevels: ['999999'], amount: 6000 })).toBe(false);
  });
});
