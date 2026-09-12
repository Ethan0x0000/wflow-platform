import { getRandNodeId } from '@/utils/ProcessUtil';
import { describeConditionGroups } from '@/utils/ConditionCompare';
import { t } from '@/i18n';
import { formatMessage } from '@/utils/i18n';

export interface NodeTypeDef {
  name?: string;
  icon: string;
  color: string;
  create: () => any[];
}

export const NodeMeta: Record<string, { name: string; color: string }> = {
  Start: { get name() { return t('process.node.start'); }, color: '#80929C' },
  Approval: { get name() { return t('process.node.approval'); }, color: '#EC8151' },
  Task: { get name() { return t('process.node.task'); }, color: '#E6B039' },
  Cc: { get name() { return t('process.node.cc'); }, color: '#5994F3' },
  Exclusive: { get name() { return t('process.node.exclusive'); }, color: '#1BB782' },
  Inclusive: { get name() { return t('process.node.inclusive'); }, color: '#345DA2' },
  Parallel: { get name() { return t('process.node.parallel'); }, color: '#718DFF' },
  Waiting: { get name() { return t('process.node.waiting'); }, color: '#E04765' },
  Trigger: { get name() { return t('process.node.trigger'); }, color: '#15BC83' },
  Subproc: { get name() { return t('process.node.subproc'); }, color: '#9274E7' },
  Router: { get name() { return t('process.node.router'); }, color: '#FF4500' },
  Gateway: { get name() { return t('process.node.gateway'); }, color: '#13C2C2' },
  Join: { get name() { return t('process.node.join'); }, color: '#8C8C8C' },
};

export const DEFAULT_EVENTS = (withCalc = false) => {
  const events: Record<string, any> = {
    async: true,
    retry: 0,
    enter: [],
    leave: [],
    created: [],
    complete: [],
  };
  if (withCalc) events.calcComplete = [];
  return events;
};

const perm = (nameKey: string, action: string, enable = true) => ({
  get name() {
    return t(nameKey);
  },
  get alisa() {
    return t(nameKey);
  },
  action,
  enable,
});

export const APPROVAL_OPERATION_PERMS = [
  perm('process.perm.agree', 'agree'),
  perm('process.perm.reject', 'reject'),
  perm('process.perm.forward', 'forward'),
  perm('process.perm.fallback', 'fallback'),
  perm('process.perm.beforeAdd', 'beforeAdd'),
  perm('process.perm.afterAdd', 'afterAdd'),
  perm('process.perm.withdraw', 'withdraw', false),
  perm('process.perm.urging', 'urging', false),
  perm('process.perm.revise', 'revise', false),
  perm('process.perm.revoke', 'revoke', false),
  perm('process.perm.comment', 'comment', false),
];

export const TASK_OPERATION_PERMS = [
  perm('process.perm.complete', 'complete'),
  perm('process.perm.forward', 'forward'),
  perm('process.perm.fallback', 'fallback'),
  perm('process.perm.beforeAdd', 'beforeAdd'),
  perm('process.perm.afterAdd', 'afterAdd'),
  perm('process.perm.withdraw', 'withdraw', false),
  perm('process.perm.urging', 'urging', false),
  perm('process.perm.revise', 'revise', false),
  perm('process.perm.revoke', 'revoke', false),
  perm('process.perm.comment', 'comment', false),
];

export const START_OPERATION_PERMS = [
  perm('process.perm.complete', 'complete'),
  perm('process.perm.withdraw', 'withdraw', false),
  perm('process.perm.urging', 'urging', false),
  perm('process.perm.revise', 'revise', false),
  perm('process.perm.revoke', 'revoke', false),
  perm('process.perm.comment', 'comment', false),
];

export const defaultDynamic = () => ({
  type: 'EL',
  el: '',
  script: 'return []',
  http: {},
});

export const defaultLeader = () => ({ level: 1, emptySkip: false });
export const defaultLeaderTop = () => ({ level: 0, toEnd: false, emptySkip: false });
export const defaultSuperior = () => ({ level: 1, emptySkip: false });
export const defaultSuperiorTop = () => ({ level: 0, toEnd: false, emptySkip: false });

const deptRule = () => ({ dept: [], type: 'LEADER', nested: false, roles: [], groups: [] });

export const approvalProps = () => ({
  formPerms: [],
  operationPerms: APPROVAL_OPERATION_PERMS.map((item) => ({ ...item })),
  enableMountForm: false,
  mountForms: [],
  mode: 'USER',
  ruleType: 'ASSIGN_USER',
  customRuleType: null,
  taskMode: { type: 'AND', percentage: 100 },
  candidate: false,
  needSign: false,
  assignUser: [],
  nodeAssign: { nodeIds: [], multiple: false },
  leader: defaultLeader(),
  leaderTop: defaultLeaderTop(),
  superior: defaultSuperior(),
  superiorTop: defaultSuperiorTop(),
  assignDept: deptRule(),
  formDept: deptRule(),
  dynamic: defaultDynamic(),
  assignGroup: [],
  formUser: null,
  assignRole: [],
  noUserHandler: { type: 'TO_NEXT', assigned: [] },
  sameRoot: { type: 'TO_SELF', assigned: [] },
  rejectRule: { type: 'END', target: null },
  timeout: { enable: false, time: 1, timeUnit: 'M', type: 'TO_PASS' },
  events: DEFAULT_EVENTS(true),
});

const taskProps = () => {
  const props = approvalProps();
  props.operationPerms = TASK_OPERATION_PERMS.map((item) => ({ ...item }));
  return props;
};

export const ccProps = () => ({
  formPerms: [],
  enableMountForm: false,
  mountForms: [],
  mode: 'USER',
  ruleType: 'ASSIGN_USER',
  customRuleType: null,
  taskMode: { type: 'AND', percentage: 100 },
  candidate: false,
  needSign: false,
  assignUser: [],
  rootAssign: { multiple: false },
  leader: defaultLeader(),
  leaderTop: defaultLeaderTop(),
  superior: defaultSuperior(),
  superiorTop: defaultSuperiorTop(),
  assignDept: deptRule(),
  formDept: deptRule(),
  dynamic: defaultDynamic(),
  assignGroup: [],
  formUser: null,
  assignRole: [],
  events: DEFAULT_EVENTS(),
});

export function createBranchHeader(type: string, i?: number): any {
  if (type === 'Parallel') {
    return {
      id: getRandNodeId(),
      type: 'Parallel',
      name: formatMessage(t('process.branch.parallelPath'), { n: i || 2 }),
      parentId: null,
      childId: null,
      props: {},
    };
  }
  const label = type === 'Inclusive' ? t('process.branch.inclusiveCondition') : t('process.branch.condition');
  return {
    id: getRandNodeId(),
    type,
    name: i ? `${label}${i}` : t('process.branch.default'),
    parentId: null,
    childId: null,
    props: {
      logic: true,
      groups: [{ logic: true, conditions: [] }],
    },
  };
}

const createGateway = (type: 'Exclusive' | 'Inclusive' | 'Parallel') => {
  const id = getRandNodeId();
  return [
    {
      id: `${id}_fork`,
      type: 'Gateway',
      name: type === 'Parallel' ? t('process.node.parallel') : t('process.node.exclusiveBranch'),
      parentId: null,
      childId: null,
      props: {
        type,
        branch: [createBranchHeader(type, 1), createBranchHeader(type)],
      },
      branch: [[], []],
    },
    {
      id: `${id}_join`,
      type: 'Join',
      name: t('process.node.join'),
      parentId: null,
      childId: null,
      props: { type },
    },
  ];
};

export const NodeTypes: Record<string, NodeTypeDef> = {
  Approval: {
    get name() {
      return t('process.node.approval');
    },
    icon: 'Stamp',
    color: NodeMeta.Approval.color,
    create() {
      return [
        {
          id: getRandNodeId(),
          type: 'Approval',
          name: t('process.node.approval'),
          parentId: null,
          childId: null,
          props: approvalProps(),
        },
      ];
    },
  },
  Task: {
    get name() {
      return t('process.node.task');
    },
    icon: 'Checked',
    color: NodeMeta.Task.color,
    create() {
      return [
        {
          id: getRandNodeId(),
          type: 'Task',
          name: t('process.node.task'),
          parentId: null,
          childId: null,
          props: taskProps(),
        },
      ];
    },
  },
  Cc: {
    get name() {
      return t('process.node.cc');
    },
    icon: 'Promotion',
    color: NodeMeta.Cc.color,
    create() {
      return [
        {
          id: getRandNodeId(),
          type: 'Cc',
          name: t('process.node.cc'),
          parentId: null,
          childId: null,
          props: ccProps(),
        },
      ];
    },
  },
  Exclusive: {
    get name() {
      return t('process.node.exclusiveBranch');
    },
    icon: 'Share',
    color: NodeMeta.Exclusive.color,
    create: () => createGateway('Exclusive'),
  },
  Inclusive: {
    get name() {
      return t('process.node.inclusiveBranch');
    },
    icon: 'Connection',
    color: NodeMeta.Inclusive.color,
    create: () => createGateway('Inclusive'),
  },
  Parallel: {
    get name() {
      return t('process.node.parallel');
    },
    icon: 'Operation',
    color: NodeMeta.Parallel.color,
    create: () => createGateway('Parallel'),
  },
  Waiting: {
    get name() {
      return t('process.node.waiting');
    },
    icon: 'Timer',
    color: NodeMeta.Waiting.color,
    create() {
      return [
        {
          id: getRandNodeId(),
          type: 'Waiting',
          name: t('process.node.waiting'),
          parentId: null,
          childId: null,
          props: {
            type: 'FIXED',
            timeout: 1,
            timeUnit: 'M',
            dateTime: null,
            time: null,
            signalScope: 'processInstance',
            signal: null,
          },
        },
      ];
    },
  },
  Trigger: {
    get name() {
      return t('process.node.trigger');
    },
    icon: 'SetUp',
    color: NodeMeta.Trigger.color,
    create() {
      return [
        {
          id: getRandNodeId(),
          type: 'Trigger',
          name: t('process.node.trigger'),
          parentId: null,
          childId: null,
          props: {
            type: 'EL',
            el: null,
            jsCode: '//code here',
            signal: {
              name: null,
              scope: 'INSTANCE',
              code: null,
              instId: null,
            },
            http: {},
          },
        },
      ];
    },
  },
  Subproc: {
    get name() {
      return t('process.node.subproc');
    },
    icon: 'money',
    color: NodeMeta.Subproc.color,
    create() {
      return [
        {
          id: getRandNodeId(),
          type: 'Subproc',
          name: t('process.node.subproc'),
          parentId: null,
          childId: null,
          props: {
            formPerms: [],
            enableMountForm: false,
            mountForms: [],
            code: null,
            name: null,
            defineId: null,
            version: null,
            initiatorType: 'PARENT',
            fixedUser: null,
            fixedDept: null,
            isBindVer: false,
            isSyncAllVar: false,
            isSyncBizKey: false,
            isAsync: false,
            statusSync: false,
            formAutoMapping: true,
            contextMap: [
              {
                isFixed: false,
                source: null,
                isVar: false,
                sync: false,
                target: null,
              },
            ],
          },
        },
      ];
    },
  },
  Router: {
    get name() {
      return t('process.node.router');
    },
    icon: 'Paperclip',
    color: NodeMeta.Router.color,
    create() {
      return [
        {
          id: getRandNodeId(),
          type: 'Router',
          name: t('process.node.router'),
          parentId: null,
          childId: null,
          props: {
            hasCondition: false,
            logic: false,
            groups: [],
            target: null,
          },
        },
      ];
    },
  },
  Start: {
    icon: 'UserFilled',
    color: NodeMeta.Start.color,
    create() {
      return [
        {
          id: 'node_root',
          type: 'Start',
          name: t('process.node.start'),
          parentId: 'start',
          childId: null,
          props: {
            formPerms: [],
            operationPerms: START_OPERATION_PERMS.map((item) => ({ ...item })),
            enableMountForm: false,
            mountForms: [],
            events: DEFAULT_EVENTS(),
          },
        },
      ];
    },
  },
};

export function getInsertableNodeTypes(): Array<[string, NodeTypeDef]> {
  return Object.entries(NodeTypes).filter(([, def]) => Boolean(def.name));
}

const getDeptRuleDesc = (deptRule: any) => {
  const sep = t('process.common.listSep');
  const dept = (deptRule?.dept || []).map((v: any) => v?.name).join(sep);
  let user = t('process.nodeContent.deptLeader');
  if (deptRule?.type === 'USER') user = t('process.nodeContent.deptAllUsers');
  if (deptRule?.type === 'ROLE') {
    const roles = (deptRule.roles || []).map((v: any) => v?.name).join(sep);
    user = formatMessage(t('process.nodeContent.deptRoleMembers'), { roles });
  }
  if (deptRule?.type === 'GROUP') {
    const groups = (deptRule.groups || []).map((v: any) => v?.name).join(sep);
    user = formatMessage(t('process.nodeContent.deptGroupMembers'), { groups });
  }
  return formatMessage(t('process.nodeContent.inDept'), { dept, user });
};

const rangeLabel = (toEnd: boolean, level?: number) =>
  toEnd ? t('process.range.eachLevel') : formatMessage(t('process.range.levelsUp'), { level: String(level) });

function approvalDesc(props: any, isApproval: boolean): string {
  const sep = t('process.common.listSep');
  const action = isApproval ? t('process.action.approve') : t('process.action.handle');
  const verb = isApproval ? t('process.action.approveVerb') : t('process.action.handleVerb');
  const verb3 = isApproval ? t('process.action.approveVerb3') : t('process.action.handleVerb3');
  let desc = formatMessage(t('process.nodeContent.setActionUser'), { action });
  const mode = props?.mode || 'USER';
  if (mode === 'AUTO_REFUSE') desc = t('process.nodeContent.autoRefuse');
  else if (mode === 'AUTO_PASS') desc = t('process.nodeContent.autoPass');
  else {
    switch (props?.ruleType) {
      case 'ASSIGN_USER':
        desc = (props.assignUser || []).length === 0
          ? formatMessage(t('process.nodeContent.assignActionUser'), { action })
          : (props.assignUser || []).map((v: any) => v?.name).join(sep);
        break;
      case 'FORM_USER':
        desc = props.formUser
          ? formatMessage(t('process.nodeContent.formUserAction'), { name: props.formUser?.name, verb })
          : t('process.nodeContent.selectFormUserField');
        break;
      case 'NODE_SELECT':
        desc = formatMessage(t('process.nodeContent.nodeSelectSpecified'), {
          multiple: props.nodeAssign?.multiple ? t('process.common.multiplePeople') : t('process.common.onePerson'),
        });
        break;
      case 'ROOT_SELF':
        desc = formatMessage(t('process.nodeContent.rootSelfAction'), { verb3 });
        break;
      case 'ROOT_SELECT':
        desc = t('process.nodeContent.rootSelect');
        break;
      case 'LEADER':
        desc = (props.leader?.level || 1) > 1
          ? formatMessage(t('process.nodeContent.leaderN'), { level: props.leader.level })
          : t('process.nodeContent.directLeader');
        break;
      case 'LEADER_TOP':
        desc = formatMessage(t('process.nodeContent.leaderTopAction'), {
          range: rangeLabel(Boolean(props.leaderTop?.toEnd), props.leaderTop?.level),
          verb3,
        });
        break;
      case 'SUPERIOR':
        desc = (props.superior?.level || 1) > 1
          ? formatMessage(t('process.nodeContent.superiorN'), { level: props.superior.level })
          : t('process.nodeContent.directSuperior');
        break;
      case 'SUPERIOR_TOP':
        desc = formatMessage(t('process.nodeContent.superiorTopAction'), {
          range: rangeLabel(Boolean(props.superiorTop?.toEnd), props.superiorTop?.level),
          verb3,
        });
        break;
      case 'ASSIGN_DEPT':
        desc = formatMessage(t('process.nodeContent.deptAction'), { rule: getDeptRuleDesc(props.assignDept), action });
        break;
      case 'FORM_DEPT':
        desc = formatMessage(t('process.nodeContent.formDeptAction'), { rule: getDeptRuleDesc(props.formDept), action });
        break;
      case 'ASSIGN_ROLE': {
        const roles = (props.assignRole || []).map((v: any) => v?.name).join(sep);
        desc = formatMessage(t('process.nodeContent.roleMembersAction'), { roles, action });
        break;
      }
      case 'ASSIGN_GROUP': {
        const groups = (props.assignGroup || []).map((v: any) => v?.name).join(sep);
        desc = formatMessage(t('process.nodeContent.groupMembersAction'), { groups, action });
        break;
      }
      case 'DYNAMIC':
        if (props.dynamic?.type === 'EL') desc = formatMessage(t('process.nodeContent.elParse'), { expr: props.dynamic.el || '?' });
        else if (props.dynamic?.type === 'JS') desc = t('process.nodeContent.jsParse');
        else if (props.dynamic?.type === 'HTTP') {
          desc = formatMessage(t('process.nodeContent.httpParse'), {
            method: props.dynamic.http?.method || '',
            url: props.dynamic.http?.url || '?',
          });
        }
        break;
      case 'CUSTOM':
        desc = t('process.nodeContent.customRule');
        break;
      default:
        break;
    }
  }
  if (props?.candidate) desc = formatMessage(t('process.nodeContent.candidate'), { desc });
  return desc;
}

function ccDesc(props: any): string {
  const sep = t('process.common.listSep');
  switch (props?.ruleType) {
    case 'ASSIGN_USER':
      return (props.assignUser || []).length === 0
        ? t('process.nodeContent.assignCc')
        : (props.assignUser || []).map((v: any) => v?.name).join(sep);
    case 'ROOT_SELECT':
      return formatMessage(t('process.nodeContent.initiatorSpecify'), {
        multiple: props.rootAssign?.multiple ? t('process.common.multiplePeople') : t('process.common.onePerson'),
      });
    case 'ROOT_SELF':
      return t('process.nodeContent.ccInitiator');
    case 'LEADER':
      return (props.leader?.level || 1) > 1
        ? formatMessage(t('process.nodeContent.leaderN'), { level: props.leader.level })
        : t('process.nodeContent.directLeader');
    case 'LEADER_TOP':
      return formatMessage(t('process.nodeContent.leaderTop'), { range: rangeLabel(Boolean(props.leaderTop?.toEnd), props.leaderTop?.level) });
    case 'SUPERIOR':
      return (props.superior?.level || 1) > 1
        ? formatMessage(t('process.nodeContent.superiorN'), { level: props.superior.level })
        : t('process.nodeContent.directSuperior');
    case 'SUPERIOR_TOP':
      return formatMessage(t('process.nodeContent.superiorTop'), { range: rangeLabel(Boolean(props.superiorTop?.toEnd), props.superiorTop?.level) });
    case 'ASSIGN_DEPT':
      return formatMessage(t('process.nodeContent.deptMembers'), { rule: getDeptRuleDesc(props.assignDept) });
    case 'FORM_DEPT':
      return formatMessage(t('process.nodeContent.formDeptMembers'), { rule: getDeptRuleDesc(props.formDept) });
    case 'ASSIGN_ROLE': {
      const roles = (props.assignRole || []).map((v: any) => v?.name).join(sep);
      return formatMessage(t('process.nodeContent.roleMembers'), { roles });
    }
    case 'ASSIGN_GROUP': {
      const groups = (props.assignGroup || []).map((v: any) => v?.name).join(sep);
      return formatMessage(t('process.nodeContent.groupMembers'), { groups });
    }
    case 'FORM_USER':
      return props.formUser
        ? formatMessage(t('process.nodeContent.formUserMembers'), { name: props.formUser?.name })
        : t('process.nodeContent.selectFormUserField');
    case 'DYNAMIC':
      if (props.dynamic?.type === 'EL') return formatMessage(t('process.nodeContent.elParse'), { expr: props.dynamic.el || '?' });
      if (props.dynamic?.type === 'JS') return t('process.nodeContent.jsParse');
      if (props.dynamic?.type === 'HTTP') {
        return formatMessage(t('process.nodeContent.httpParse'), {
          method: props.dynamic.http?.method || '',
          url: props.dynamic.http?.url || '?',
        });
      }
      return t('process.nodeContent.dynamicParse');
    default:
      return t('process.nodeContent.setCc');
  }
}

export function getNodeContent(node: any): string {
  const props = node?.props || {};
  switch (node?.type) {
    case 'Start':
      return t('process.nodeContent.startHere');
    case 'Approval':
      return approvalDesc(props, true);
    case 'Task':
      return approvalDesc(props, false);
    case 'Cc':
      return ccDesc(props);
    case 'Waiting': {
      const unitMap: Record<string, string> = { D: t('process.unit.day'), H: t('process.unit.hour'), M: t('process.unit.minute'), S: t('process.unit.second') };
      switch (props.type) {
        case 'FIXED':
          return formatMessage(t('process.nodeContent.waitFixed'), { timeout: props.timeout || '?', unit: unitMap[props.timeUnit] || '' });
        case 'TODAY':
          return formatMessage(t('process.nodeContent.waitToday'), { time: props.time || '?' });
        case 'DATETIME':
          return formatMessage(t('process.nodeContent.waitDateTime'), { dateTime: props.dateTime || '?' });
        case 'SIGNAL':
          return formatMessage(t('process.nodeContent.waitSignal'), {
            scope: props.signalScope === 'global' ? t('process.nodeContent.signalGlobal') : t('process.nodeContent.signalLocal'),
            signal: props.signal || '?',
          });
        default:
          return t('process.nodeContent.setWait');
      }
    }
    case 'Trigger': {
      const scopeMap: Record<string, string> = {
        GLOBAL: t('process.nodeContent.triggerScopeGlobal'),
        PROCESS: formatMessage(t('process.nodeContent.triggerScopeProcess'), { code: props.signal?.code || '?' }),
        LOCAL: t('process.nodeContent.triggerScopeLocal'),
        INSTANCE: formatMessage(t('process.nodeContent.triggerScopeInstance'), { instId: props.signal?.instId || '?' }),
      };
      switch (props.type) {
        case 'EL':
          return formatMessage(t('process.nodeContent.elExecute'), { expr: props.el || '?' });
        case 'JS':
          return t('process.nodeContent.jsExecute');
        case 'SIGNAL':
          return formatMessage(t('process.nodeContent.signalEmit'), { name: props.signal?.name || '?', scope: scopeMap[props.signal?.scope] || '' });
        case 'HTTP':
          return formatMessage(t('process.nodeContent.httpExecute'), { method: props.http?.method || '?', url: props.http?.url || '?' });
        default:
          return t('process.nodeContent.setTrigger');
      }
    }
    case 'Router': {
      if (!props.hasCondition) {
        return props.target?.name
          ? formatMessage(t('process.nodeContent.routeTo'), { name: props.target.name })
          : t('process.nodeContent.routeNoTarget');
      }
      const desc = describeConditionGroups(props);
      return formatMessage(t('process.nodeContent.routeWhen'), { desc, name: props.target?.name || '?' });
    }
    case 'Subproc':
      return props.name
        ? formatMessage(t('process.nodeContent.startProcess'), { name: props.name, version: props.isBindVer ? `-v${props.version}` : '' })
        : t('process.nodeContent.selectSubproc');
    case 'Parallel':
      return t('process.nodeContent.parallelBranch');
    case 'Exclusive':
    case 'Inclusive':
      return describeConditionGroups(props);
    default:
      return '';
  }
}
