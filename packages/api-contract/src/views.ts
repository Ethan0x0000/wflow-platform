import type { Data, Json } from "./common.js";
import type { FormDataField } from "./form-data.js";

export interface ApiUser {
  id: string;
  name: string;
  avatar: string;
  type: "user";
  deptId: string;
  deptName: string;
  admin: boolean;
}

export type InstanceStatus = "RUNNING" | "SUSPEND" | "PASS" | "REFUSE" | "REVOKED" | "EXCEPTION";

export interface OperationPermItem {
  alisa: string;
  enable: boolean;
}

export type OperationPermMap = Record<string, OperationPermItem>;

export interface InstanceRow {
  taskId: string | null;
  instId: string;
  code: string;
  title: string;
  defineId: string;
  defineName: string;
  initiator: ApiUser;
  deptName: string;
  submitter: string;
  userId: string;
  username: string;
  avatar: string;
  currentNodeId: string | null;
  currentNodeName: Json;
  nodeName: Json | null;
  status: InstanceStatus;
  statusName: string;
  createTime: string;
  endTime: string | null;
  candidate: boolean;
  version: number;
  parentInstId: string | null;
  isAgent: boolean;
  action: string | null;
  fieldData: FormDataField[];
}

export interface TaskAssigneeGroup {
  nodeId: string;
  name?: string;
  users?: ApiUser[];
}

export interface TodoTaskRow extends InstanceRow {
  taskName?: Json;
  needSign?: boolean;
  nodeAssigns?: TaskAssigneeGroup[];
}

export type IdoTaskRow = InstanceRow & {
  action: string;
  endTime: string;
};

export interface InstanceDetail extends InstanceRow {
  startUser: ApiUser;
  startDept: string;
  startDeptInfo: { id: string; name: string };
  parentNodeId: string | null;
  formType: number;
  formSource: string | null;
  formData: Data;
  fieldPerm: Record<string, string>;
  defaultFieldPerm: string;
  operationPerm: OperationPermMap;
  todoTasks: TodoTaskRow[];
  todoUsers: ApiUser[];
  discuss: { showDiscuss: boolean; enableDiscuss: boolean };
}
