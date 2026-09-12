import type { InstanceStatus, OperationPermItem } from '@wflow/api-contract';

export type { InstanceStatus, OperationPermItem };

export interface OrgUser {
  id: string;
  name: string;
  avatar?: string;
  deptId?: string;
  deptName?: string;
  admin?: boolean;
  email?: string;
  mobile?: string;
  type?: 'user';
}

export interface OrgDept {
  id: string;
  name: string;
  parentId?: string;
  children?: OrgDept[];
  users?: OrgUser[];
  type?: 'dept';
}

export interface OrgRole {
  id: string;
  name: string;
  userCount?: number;
}

export type OrgTarget = {
  id: string;
  name: string;
  type: 'user' | 'dept' | 'role' | 'group';
  avatar?: string;
};

export interface FormItemConfig {
  id: string;
  key?: string;
  type?: string;
  title?: string;
  name: string;
  valueType?: string;
  icon?: string;
  props: Record<string, any>;
  placeholder?: string;
  required?: boolean;
  perm?: 'R' | 'E' | 'H' | 'D'; // Read, Edit, Hide, Disable
}

export interface FormModel {
  id?: string;
  code?: string;
  name?: string;
  version?: number;
  groupId?: string;
  icon?: string;
  logo?: string;
  remark?: string;
  formItems: FormItemConfig[];
  processConfig?: any;
  settings?: Record<string, any>;
}

export interface ProcessNode {
  id: string;
  parentId?: string | null;
  childId?: string | null;
  name: string;
  type:
    | 'ROOT'
    | 'APPROVAL'
    | 'TASK'
    | 'CC'
    | 'GATEWAY'
    | 'BRANCH'
    | 'ROUTER'
    | 'TRIGGER'
    | 'WAITING'
    | 'SUBPROC'
    | 'JOIN';
  desc?: string;
  props: Record<string, any>;
  children?: ProcessNode | null;
  branchs?: ProcessNode[];
  branch?: ProcessNode[][];
}

export interface TaskRecord {
  id: string;
  taskId?: string;
  nodeId?: string;
  nodeName: string;
  userName: string;
  userId: string;
  userAvatar?: string;
  action: string;
  actionDesc?: string;
  comment?: string;
  createTime: string;
  finishTime?: string;
  duration?: string;
  status: 'PENDING' | 'PASS' | 'REFUSE' | 'TRANSFER' | 'ADD_SIGN' | 'BACK' | 'CANCEL';
}

export interface OperationPerm {
  agree?: OperationPermItem;
  reject?: OperationPermItem;
  complete?: OperationPermItem;
  forward?: OperationPermItem;
  beforeAdd?: OperationPermItem;
  afterAdd?: OperationPermItem;
  fallback?: OperationPermItem;
  delegate?: OperationPermItem;
  withdraw?: OperationPermItem;
  urging?: OperationPermItem;
  revise?: OperationPermItem;
  revoke?: OperationPermItem;
  cancel?: OperationPermItem;
  comment?: OperationPermItem;
}

export interface TodoTask {
  taskId: string;
  taskName?: string;
  nodeId?: string;
  nodeName?: string;
  needSign?: boolean;
  nodeAssigns?: Array<{ nodeId: string; name?: string; users?: OrgUser[] }>;
}

export interface InstanceDetail {
  instId: string;
  defineId?: string;
  defineName: string;
  code?: string;
  title?: string;
  version?: number;
  status: InstanceStatus;
  statusName?: string;
  initiator: OrgUser;
  startUser?: OrgUser;
  submitter?: string;
  deptName?: string;
  startDept?: string;
  startDeptInfo?: { id: string; name: string };
  startTime?: string;
  createTime: string;
  endTime?: string | null;
  duration?: string;
  currentNodeName?: string;
  currentNodeId?: string;
  parentInstId?: string | null;
  parentNodeId?: string | null;
  isAgent?: boolean;
  formType?: number;
  formSource?: string;
  formData: Record<string, any>;
  formConfig?: FormItemConfig[];
  conf?: any;
  process?: ProcessNode;
  statusDesc?: string;
  fieldPerm?: Record<string, 'R' | 'E' | 'H' | 'D' | string>;
  defaultFieldPerm?: string;
  operationPerm?: OperationPerm;
  todoTasks?: TodoTask[];
  todoUsers?: OrgUser[];
  discuss?: { showDiscuss: boolean; enableDiscuss: boolean };
  records?: TaskRecord[];
}

export interface ForecastNode {
  nodeId: string;
  nodeName: string;
  type: string;
  mode?: string;
  icon?: string;
  orgs?: OrgUser[];
  enableAddNum?: number;
}
