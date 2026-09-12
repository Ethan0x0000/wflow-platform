import { z } from "zod";
import { actionableUsers, dataSchema, evaluate, type Data, type Node, type Snapshot, type Task } from "wflow-core";
import type { InstanceDetail, InstanceRow } from "@wflow/api-contract";
import { ApiError, array, decode, object, type Model } from "./models.js";
import { getUser, revisionSchema, type Runtime, type StoredInstance, type User } from "./runtime.js";

const permRank: Record<string, number> = { B: 0, E: 1, R: 2, H: 3 };
const unclaimed: User = { id: "", name: "待认领", avatar: "", type: "user", deptId: "", deptName: "", admin: false };
// InstanceStatus descriptions, verbatim.
const statusNames = { SUSPEND: "暂停中", RUNNING: "进行中", REFUSE: "被驳回", REVOKED: "被撤销", DELETED: "被删除", PASS: "审批通过", EXCEPTION: "流程异常" } as const satisfies Record<string, string>;

export function editorNodes(model: Model): Record<string, import("wflow-core").Json>[] {
  const result: ReturnType<typeof object>[] = [];
  const visit = (items: unknown) => { for (const raw of array(items)) { const node = object(raw); result.push(node); for (const branch of array(node.branch)) visit(branch); } };
  visit(decode(model.process));
  return result;
}
export const taskKey = (instance: StoredInstance, task: Task) => `${instance.id}:${task.id}`;
/** Java projections read wflow_form_data; instances without a stored row fall back to the engine snapshot. */
export function formDataOf(runtime: Runtime, instance: StoredInstance, snapshot: Snapshot): Data {
  const row = runtime.formData.get(instance.id);
  if (row) return Object.fromEntries(row.content.map(({ key, value }) => [key, value]));
  return Object.fromEntries(Object.entries(snapshot.data).filter(([key]) => !key.startsWith("_")));
}
export function row(runtime: Runtime, instance: StoredInstance, snapshot: Snapshot, task?: Task, action?: string | null): InstanceRow {
  const pending = task ?? snapshot.tasks.find((t) => t.status === "pending");
  const end = runtime.store.events(instance.id).findLast((event) => ["workflow.completed", "workflow.rejected", "workflow.cancelled", "workflow.failed"].includes(event.eventType));
  const nodes = editorNodes(instance.model);
  const status = snapshot.suspended && snapshot.status === "running" ? "SUSPEND" : ({ running: "RUNNING", completed: "PASS", rejected: "REFUSE", cancelled: "REVOKED", failed: "EXCEPTION" } as const)[snapshot.status];
  return {
    taskId: pending ? taskKey(instance, pending) : null, instId: instance.id, code: instance.code, title: instance.title,
    defineId: instance.model.defineId, defineName: instance.model.procName,
    initiator: instance.initiator, deptName: instance.initiator.deptName,
    // FlowInstTaskVo: submitter/userId/username/avatar copy the instance start user.
    submitter: instance.submitter?.id ?? instance.initiator.id,
    userId: instance.initiator.id, username: instance.initiator.name, avatar: instance.initiator.avatar,
    currentNodeId: pending?.nodeId ?? null,
    currentNodeName: nodes.find((node) => node.id === pending?.nodeId)?.name ?? "已结束",
    nodeName: task ? nodes.find((node) => node.id === task.nodeId)?.name ?? null : null,
    status, statusName: statusNames[status],
    // ProcInstVo.createTime is the instance timestamp, FlowInstTaskVo.createTime the task's.
    createTime: task ? task.createdAt : instance.createdAt, endTime: end?.occurredAt ?? null,
    candidate: pending?.mode === "candidate" && pending.assignees.length === 0,
    version: instance.model.version, parentInstId: instance.parentInstId ?? null,
    isAgent: instance.submitter !== undefined && instance.submitter.id !== instance.initiator.id,
    action: action ?? null,
    // ProcInstVo.fieldData: wflow_form_data.content parsed as FormFieldData[] ({key,value}).
    fieldData: Object.entries(formDataOf(runtime, instance, snapshot)).map(([key, value]) => ({ key, value: value ?? null })),
  };
}
const operations = { agree: "同意", reject: "拒绝", complete: "提交", forward: "转交", beforeAdd: "前加签", afterAdd: "后加签", fallback: "回退", delegate: "委派", withdraw: "撤回", urging: "催办", revise: "修改", revoke: "撤销", cancel: "取消", comment: "评论" };
export function detail(runtime: Runtime, instance: StoredInstance, snapshot: Snapshot, user: User, options: { admin?: boolean; taskId?: string; nodeId?: string } = {}): InstanceDetail {
  const admin = options.admin === true && user.admin;
  const tasks = snapshot.tasks.filter((t) => admin ? t.status === 'pending' : actionableUsers(t).includes(user.id));
  if (options.taskId) tasks.sort((a, b) => Number(taskKey(instance, b) === options.taskId) - Number(taskKey(instance, a) === options.taskId));
  const task = tasks[0];
  const prior = runtime.store.events(instance.id).findLast((event) => {
    const previousTask = object(event.details.task);
    return array(previousTask.assignees).includes(user.id) || array(previousTask.candidates).includes(user.id) || array(previousTask.additions).some((value) => object(value).userId === user.id) || array(event.details.recipients).includes(user.id);
  });
  const priorNodeId = prior?.details.nodeId ?? object(prior?.details.task).nodeId;
  const editor = editorNodes(instance.model).find((node) => node.id === (task?.nodeId ?? priorNodeId) || (!task && !prior && instance.initiator.id === user.id && node.type === 'Start'));
  const props = object(editor?.props), settings = object(decode(instance.model.setting));
  const configured = array(props.operationPerms).map(object);
  const permitted = (action: string) => admin ? ['agree', 'reject', 'complete', 'forward'].includes(action) : configured.length === 0 ? ["agree", "reject", "complete"].includes(action) : configured.some((p) => p.action === action && p.enable);
  const running = snapshot.status === "running" && !snapshot.suspended;
  const operationPerm = Object.fromEntries(Object.entries(operations).map(([action, alisa]) => [action, { alisa, enable: false }]));
  if (task && running) {
    for (const action of ["agree", "reject", "complete", "forward", "beforeAdd", "afterAdd", 'fallback']) operationPerm[action]!.enable = permitted(action);
    operationPerm.agree!.enable &&= task.type === "approval";
    operationPerm.reject!.enable &&= task.type === "approval";
    operationPerm.complete!.enable &&= task.type === "task";
    operationPerm.beforeAdd!.enable &&= task.mode !== "candidate";
    operationPerm.afterAdd!.enable &&= task.mode !== "candidate";
    if (operationPerm.beforeAdd!.enable) operationPerm.beforeAdd!.enable = object(object(editor?.props).taskMode).type === "NEXT";
  }
  operationPerm.withdraw!.enable = false;
  operationPerm.revoke!.enable = false;
  operationPerm.urging!.enable = false;
  operationPerm.comment!.enable = false;
  // loadProcInstActionPerms: ended instances compare against cancel.timeout since endTime.
  const endEvent = runtime.store.events(instance.id).findLast((event) => ["workflow.completed", "workflow.rejected", "workflow.cancelled", "workflow.failed"].includes(event.eventType));
  // status flips only when the end event is published; fall back to now if the projection lags a query beat.
  const endedAt = endEvent?.occurredAt ?? (snapshot.status === "running" ? null : new Date().toISOString());
  const cancel = object(settings.cancel), revise = object(settings.revise), comment = object(settings.comment);
  const withinTimeout = (timeout: unknown): boolean => endedAt !== null && Number.isFinite(Number(timeout)) && (Date.now() - Date.parse(endedAt)) / 86_400_000 <= Number(timeout);
  if (admin) {
    if (row(runtime, instance, snapshot).status !== "REVOKED") {
      if (endedAt !== null) operationPerm.revoke!.enable = cancel.enable === true && cancel.timeout != null && withinTimeout(cancel.timeout);
      else if (settings.enableCancel === true) operationPerm.revoke!.enable = true;
    }
    operationPerm.withdraw!.enable = settings.enableRevoke === true && endedAt === null;
  } else {
    if (instance.initiator.id === user.id && row(runtime, instance, snapshot).status !== "REVOKED") {
      if (endedAt !== null) operationPerm.revoke!.enable = cancel.enable === true && cancel.timeout != null && withinTimeout(cancel.timeout);
      else if (settings.enableCancel === true) operationPerm.revoke!.enable = true;
      if (endedAt !== null && revise.enable === true && withinTimeout(cancel.timeout) && !runtime.store.get("revision", instance.id, revisionSchema)) operationPerm.revise!.enable = true;
    }
    operationPerm.urging!.enable = settings.enableUrging === true && endedAt === null;
    operationPerm.withdraw!.enable = settings.enableRevoke === true && endedAt === null;
    if (comment.enable === true) operationPerm.comment!.enable = endedAt !== null ? comment.endEnable === true : true;
  }
  const fieldPerm: Record<string, string> = {};
  let defaultFieldPerm = "R";
  const data = formDataOf(runtime, instance, snapshot);
  if (admin) {
    for (const key of Object.keys(data)) fieldPerm[key] = "E";
    defaultFieldPerm = "E";
  } else {
    const dataKeys = Object.keys(data);
    const nodes = editorNodes(instance.model);
    const related = new Set<string>();
    for (const event of runtime.store.events(instance.id)) {
      const eventTask = object(event.details.task), id = String(event.details.nodeId ?? eventTask.nodeId ?? "");
      if (id && (array(eventTask.assignees).includes(user.id) || event.details.actorId === user.id || array(event.details.recipients).includes(user.id))) related.add(id);
    }
    if (instance.initiator.id === user.id) related.add("node_root");
    const myActiveNodes = new Set(snapshot.tasks.filter((t) => t.status === "pending" && t.assignees.includes(user.id)).map((t) => t.nodeId));
    const merge = (key: string, perm: string, capAtRead = false) => {
      const value = capAtRead && permRank[perm]! < permRank.R! ? "R" : perm;
      const previous = fieldPerm[key];
      if (previous === undefined || permRank[value]! < permRank[previous]!) fieldPerm[key] = value;
    };
    const mergeNode = (id: string, capAtRead: boolean, startDefaults: boolean) => {
      const target = nodes.find((n) => n.id === id);
      if (!target) return;
      const targetProps = object(target.props);
      if (startDefaults && String(target.type).toLowerCase() === "start" && array(targetProps.formPerms).length === 0) {
        defaultFieldPerm = "E";
        for (const key of dataKeys) merge(key, "E");
      }
      for (const raw of array(targetProps.formPerms)) { const perm = object(raw); merge(String(perm.key), String(perm.perm), capAtRead); }
    };
    if (options.nodeId) {
      const target = nodes.find((n) => n.id === options.nodeId);
      if (!related.has(options.nodeId) && !["child", "subproc"].includes(String(target?.type).toLowerCase())) throw new ApiError(403, "您不是该节点相关人员，无权限访问😢");
      const targetProps = object(target?.props);
      if (myActiveNodes.has(options.nodeId) && String(target?.type).toLowerCase() === "start") {
        defaultFieldPerm = "E";
        if (array(targetProps.formPerms).length === 0) for (const key of dataKeys) fieldPerm[key] = "E";
      }
      for (const raw of array(targetProps.formPerms)) {
        const perm = object(raw);
        fieldPerm[String(perm.key)] = !myActiveNodes.has(options.nodeId) && permRank[String(perm.perm)]! < permRank.R! ? "R" : String(perm.perm);
      }
    } else if (myActiveNodes.size) {
      for (const id of myActiveNodes) mergeNode(id, false, true);
    } else {
      for (const id of related) if (id !== "revise" && id !== "comment") mergeNode(id, true, false);
    }
  }
  const formData = Object.fromEntries(Object.entries(data).filter(([key]) => fieldPerm[key] !== "H"));
  return { ...row(runtime, instance, snapshot), defineId: instance.model.defineId, version: instance.model.version,
    startUser: instance.submitter ?? instance.initiator,
    startDept: instance.initiator.deptId, startDeptInfo: { id: instance.initiator.deptId, name: instance.initiator.deptName },
    parentNodeId: instance.parentNodeId ?? null,
    formType: instance.model.formType,
    // formSource: formJson for drag forms, formCode for code forms, formRef for referenced forms.
    formSource: instance.model.formType === 1 ? instance.model.formCode : instance.model.formType === 2 ? instance.model.formRef : instance.model.formJson,
    formData, fieldPerm, defaultFieldPerm, operationPerm,
    todoTasks: tasks.map((t) => ({ ...row(runtime, instance, snapshot, t), taskName: editorNodes(instance.model).find((n) => n.id === t.nodeId)?.name, needSign: t.needSign === true, nodeAssigns: [] })),
    todoUsers: [...new Set(snapshot.tasks.flatMap(actionableUsers))].map(getUser),
    discuss: { showDiscuss: object(settings.discuss).enable === true, enableDiscuss: object(settings.discuss).enable === true && (running || object(settings.discuss).endEnable === true) },
  };
}
const recordExcluded = new Set(["router", "trigger", "wait", "delay", "delayuntil"]);
const recordTypes: Record<string, string> = { approval: "Approval", task: "Task", cc: "Cc", child: "Subproc", subproc: "Subproc", exclusive: "Exclusive", inclusive: "Inclusive", parallel: "Parallel", loop: "Gateway", foreach: "Gateway", eventgateway: "Gateway", custom: "Other", condition: "Exclusive" };
export function records(runtime: Runtime, instance: StoredInstance) {
  const events = runtime.store.events(instance.id), nodes = editorNodes(instance.model);
  const first = { id: "node_root", nodeId: "node_root", nodeName: "发起人", nodeType: "Start", modeType: "USER", taskMode: { type: "AND", percentage: 100 }, count: 1, reason: null, isFuture: false, startTime: instance.createdAt, endTime: instance.createdAt, content: null,
    actualUsers: [{ assignee: instance.initiator, taskId: "start", result: "startup", action: "startup", createTime: instance.createdAt, endTime: instance.createdAt, comment: { text: "", images: [], files: [] }, signature: null }], recordItems: [] };
  const result: unknown[] = [first];
  const counts = new Map<string, number>();
  for (const entry of events.filter((event) => event.eventType === "workflow.nodeEntered")) {
    const node = nodes.find((n) => n.id === entry.details.nodeId);
    if (!node || recordExcluded.has(String(node.type).toLowerCase())) continue;
    const executionId = String(entry.details.executionId ?? ""), nodeId = String(node.id), count = (counts.get(nodeId) ?? 0) + 1;
    counts.set(nodeId, count);
    const completed = events.find((event) => event.eventType === "workflow.nodeCompleted" && event.details.executionId === executionId);
    const created = events.find((event) => event.eventType === "workflow.taskCreated" && String(object(event.details.task).id ?? "") === `task-${executionId}`);
    const cc = events.find((event) => event.eventType === "workflow.cc" && event.details.executionId === executionId);
    const task = object(created?.details.task);
    const changes = created ? events.filter((event) => event.eventType === "workflow.taskChanged" && object(event.details.task).id === task.id) : [];
    const latest = changes.at(-1), ids = array(task.assignees);
    let actualUsers: unknown[] = [];
    let content: unknown = null;
    if (created) {
      actualUsers = [...new Set([...ids.map(String), ...changes.filter((e) => e.details.actorId).map((e) => String(e.details.actorId))])].map((id) => {
        const action = changes.findLast((e) => e.details.actorId === id);
        const type = action?.details.overriddenAction ?? action?.details.action;
        const mapped = type === "approve" ? "agree" : type === "transfer" ? "forward" : type ?? null;
        return { assignee: getUser(id), taskId: `${instance.id}:${task.id}`, result: mapped, action: mapped, createTime: task.createdAt, endTime: action?.occurredAt ?? null, comment: { text: "", images: [], files: [], ...object(action?.details.comment) }, signature: object(latest?.details.task).signature ?? task.signature ?? null };
      });
      if (ids.length === 0 && task.status === "pending") actualUsers.push({ assignee: unclaimed, taskId: `${instance.id}:${task.id}`, result: "candidate", action: "candidate", createTime: task.createdAt, endTime: null, comment: { text: "", images: [], files: [] }, signature: null });
    } else if (cc) {
      actualUsers = array(cc.details.recipients).map((id) => ({ assignee: getUser(String(id)), taskId: cc.eventId, result: "cc", action: "cc", createTime: cc.occurredAt, endTime: cc.occurredAt, comment: { text: "", images: [], files: [] }, signature: null }));
    } else if (String(node.type).toLowerCase() === "child" || String(node.type).toLowerCase() === "subproc") {
      const started = events.find((event) => event.eventType === "workflow.childStarted" && event.details.executionId === executionId);
      if (started) {
        const initiator = getUser(String(started.details.initiatorId)), subproc = object(started.details.content);
        // SubprocNodeContent { initiator, code, name, version, subInstId }
        content = { initiator: initiator.id, code: subproc.code ?? "", name: subproc.name ?? "",
          version: subproc.version ?? null, subInstId: started.details.childInstanceId };
        actualUsers = [{ assignee: initiator, result: "startup", action: "startup", createTime: entry.occurredAt, endTime: null, comment: { text: "", images: [], files: [] }, signature: null }];
      }
    }
    const type = String(node.type).toLowerCase(), modeType = type === "terminate" ? (node.outcome === "approve" ? "AUTO_PASS" : "AUTO_REFUSE") : "USER";
    result.push({ id: `${node.id}:${executionId}`, nodeId: node.id, nodeName: node.name, nodeType: recordTypes[type] ?? "Other", modeType,
      taskMode: type === "approval" || type === "task" ? object(node.props).taskMode ?? { type: "AND", percentage: 100 } : null, count, reason: completed?.details.reason ?? null, isFuture: false, content,
      startTime: entry.occurredAt, endTime: completed?.occurredAt ?? (latest && object(latest.details.task).status !== "pending" ? latest.occurredAt : null), actualUsers, recordItems: [] });
  }
  const revision = runtime.store.get("revision", instance.id, revisionSchema);
  if (revision) result.push({ id: "revise", nodeId: "revise", nodeName: "修改数据", nodeType: "Other", modeType: "USER", taskMode: { type: "AND", percentage: 100 }, count: 1, reason: null, isFuture: false, content: null,
    startTime: revision.createTime, endTime: revision.createTime,
    actualUsers: [{ assignee: getUser(revision.operator), taskId: "revise", result: "revise", action: "revise", createTime: revision.createTime, endTime: revision.createTime, comment: { text: "", images: [], files: [], ...revision.comment }, signature: null }], recordItems: [] });
  // FlowTaskServiceImpl.doComment: comments append an "Other/添加评论" pseudo node to the timeline.
  const noteSchema = z.object({ id: z.string(), instId: z.string(), userId: z.string(), createTime: z.string(), content: dataSchema });
  for (const note of runtime.store.list("note", noteSchema).filter((note) => note.instId === instance.id)) {
    result.push({ id: `comment:${note.id}`, nodeId: "comment", nodeName: "添加评论", nodeType: "Other", modeType: "USER", taskMode: { type: "AND", percentage: 100 }, count: 0, reason: null, isFuture: false, content: null,
      startTime: note.createTime, endTime: note.createTime,
      actualUsers: [{ assignee: getUser(note.userId), taskId: `comment:${note.id}`, result: "comment", action: "comment", createTime: note.createTime, endTime: note.createTime, comment: { text: "", images: [], files: [], ...note.content }, signature: null }], recordItems: [] });
  }
  return result.sort((left, right) => Date.parse((left as { startTime: string }).startTime) - Date.parse((right as { startTime: string }).startTime));
}
export function graph(runtime: Runtime, instance: StoredInstance, snapshot: Snapshot) {
  const nodeRecords: Record<string, { count: number; result: string | null; endTime: string | null }> = { node_root: { count: 0, result: 'startup', endTime: instance.createdAt } };
  for (const event of runtime.store.events(instance.id)) {
    const nodeId = String(event.details.nodeId ?? object(event.details.task).nodeId ?? '');
    if (!nodeId) continue;
    if (event.eventType === 'workflow.nodeEntered') nodeRecords[nodeId] = { count: (nodeRecords[nodeId]?.count ?? -1) + 1, result: null, endTime: null };
    if (event.eventType === 'workflow.nodeCompleted') nodeRecords[nodeId] = { count: nodeRecords[nodeId]?.count ?? 0, result: 'pass', endTime: event.occurredAt };
    if (event.eventType === 'workflow.taskChanged' && object(event.details.task).status !== 'pending') {
      nodeRecords[nodeId] = { count: nodeRecords[nodeId]?.count ?? 0, result: event.details.action === 'reject' ? 'reject' : event.details.action === 'cancel' ? 'cancel' : 'agree', endTime: event.occurredAt };
    }
  }
  return { process: instance.model.process, nodeRecords, instStatus: row(runtime, instance, snapshot).status, instStatusName: ({ running: '流程进行中', completed: '流程已通过', rejected: '流程被驳回', cancelled: '流程已撤销', failed: '流程异常' })[snapshot.status] };
}
export async function forecast(runtime: Runtime, model: Model, user: User, data: Data): Promise<unknown[]> {
  const definition = runtime.models.published(model.code, model.version).definition;
  const editor = new Map(editorNodes(model).map((node) => [String(node.id), node]));
  // getEnableAddNumStart: ROOT_SELECT cc / NODE_SELECT pointing at the root node allow 1 or 2 assignees.
  const enableAddNum = (nodeId: string, type: string): number => {
    const props = object(editor.get(nodeId)?.props);
    if (props.ruleType === "ROOT_SELECT" && type === "cc") return object(props.rootAssign).multiple === true ? 2 : 1;
    const nodeAssign = object(props.nodeAssign);
    if (props.ruleType === "NODE_SELECT" && array(nodeAssign.nodeIds).map(String).includes("node_root")) return nodeAssign.multiple === true ? 2 : 1;
    return 0;
  };
  async function walk(nodes: Node[]): Promise<unknown[]> {
    const result: unknown[] = [];
    for (const node of nodes) {
      if (node.type === "exclusive" || node.type === "inclusive") {
        const matches = node.branches.filter((branch) => evaluate(branch.when, data));
        const chosen = node.type === "exclusive" ? matches.slice(0, 1) : matches;
        for (const branch of chosen.length ? chosen.map((b) => b.nodes) : [node.otherwise]) result.push(...await walk(branch));
      } else if (node.type === "parallel") {
        for (const branch of node.branches) result.push(...await walk(branch));
      } else if (node.type === "forEach") {
        result.push(...await walk(node.nodes));
      } else if (node.type === "eventGateway") {
        // Every branch is a possible outcome; the prediction lists them all rather than guessing a winner.
        for (const branch of node.branches) result.push(...await walk(branch.nodes));
      } else {
        // `custom` and every other automatic leaf participate with no assignees.
        const assignment = node.type === "cc" ? node.recipients : node.type === "approval" || node.type === "task" ? node.assignees : undefined;
        const orgs = assignment ? (await runtime.activities.resolveAssignees({ context: { tenantId: runtime.tenant, instanceId: "forecast", businessKey: "forecast", initiatorId: user.id, definition: { id: model.code, version: model.version } }, executionId: node.id, assignment, data })).users : [];
        result.push({ nodeId: node.id, nodeName: node.name, type: node.type === "approval" ? "Approval" : node.type === "task" ? "Task" : node.type === "cc" ? "Cc" : "Waiting", mode: "USER", icon: "Stamp", orgs: orgs.map(getUser), enableAddNum: enableAddNum(node.id, node.type) });
      }
    }
    return result;
  }
  return [{ nodeId: "node_root", nodeName: "发起人", type: "Start", icon: "User", mode: "USER", orgs: [user], enableAddNum: 0 }, ...await walk(definition.nodes)];
}
