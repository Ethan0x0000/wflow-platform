import { randomUUID } from "node:crypto";
import { z } from "zod";
import { actionableUsers, dataSchema, type Command, type Data } from "wflow-core";
import type { IdoTaskRow } from "@wflow/api-contract";
import { ApiError, array, object } from "../models.js";
import { executeCommand, fingerprint, getUser, revisionSchema } from "../runtime.js";
import { detail, editorNodes, row, taskKey } from "../views.js";
import { assertResourceAccess } from "../resources.js";
import { assertNoHandoverLock } from "../handover.js";
import { orgService } from "../org.js";
import { byCreateDesc, instanceViews, todoRows } from "./queries.js";
import { NOT_HANDLED, body, commandRecordSchema, idSchema, idoActions, matchesQuery, noteSchema, page, required, type RouteContext } from "./shared.js";

export async function taskRoutes(context: RouteContext): Promise<unknown> {
  const { path, method, query, user, request, runtime, store } = context;
  if (path === "/task/todo" || path === "/task/ido") {
    const all = await instanceViews(runtime);
    if (path === "/task/todo") {
      // Java getTodoTasks filters by process definition key (the model code), not the instance code.
      const requested = query.get('code');
      const modelCode = new Map(all.map(({ instance }) => [instance.id, instance.model.code]));
      const params = new URLSearchParams(query);
      if (requested) params.delete('code');
      const rows = todoRows(runtime, all, user.id).filter((item) => matchesQuery(item, {}, params) && (!requested || modelCode.get(item.instId) === requested));
      return page(byCreateDesc(rows), query);
    }
    // selectIdoTaskPage: records by source UNION completed tasks by assignee (excluding cc/startup), filtered by action.
    const requested = query.get("action");
    const ido: IdoTaskRow[] = [];
    const push = (instance: (typeof all)[number]["instance"], snapshot: (typeof all)[number]["snapshot"], nodeId: string, mapped: string, at: string, taskId: string | null) => {
      if (requested && mapped !== requested) return;
      const base = row(runtime, instance, snapshot);
      const name = editorNodes(instance.model).find((node) => node.id === nodeId)?.name
        ?? (nodeId === "comment" ? "添加评论" : nodeId === "revise" ? "修改数据" : null);
      ido.push({ ...base, taskId, nodeName: name, action: mapped, endTime: at, createTime: at });
    };
    for (const entry of all) {
      const { instance, snapshot } = entry;
      // Task completions are event-projected; the task table is only the fallback for rows without an actor event.
      const covered = new Set<string>();
      for (const event of entry.events) {
        const eventTask = object(event.details.task);
        if (event.eventType !== "workflow.taskChanged" || event.details.actorId !== user.id) continue;
        const mapped = idoActions[String(event.details.overriddenAction ?? event.details.action)];
        if (!mapped) continue;
        if (eventTask.id) covered.add(String(eventTask.id));
        push(instance, snapshot, String(event.details.nodeId ?? eventTask.nodeId ?? ""), mapped, event.occurredAt, eventTask.id ? `${instance.id}:${String(eventTask.id)}` : null);
      }
      for (const task of snapshot.tasks) {
        if (task.status === "pending" || !task.assignees.includes(user.id) || covered.has(task.id)) continue;
        push(instance, snapshot, task.nodeId, task.status === "approved" ? "agree" : task.status === "rejected" ? "reject" : "cancel", task.createdAt, taskKey(instance, task));
      }
      const revision = store.get("revision", instance.id, revisionSchema);
      if (revision && revision.operator === user.id) push(instance, snapshot, "revise", "revise", revision.createTime, null);
      for (const note of store.list("note", noteSchema).filter((item) => item.instId === instance.id && item.userId === user.id)) push(instance, snapshot, "comment", "comment", note.createTime, null);
    }
    return page(ido.sort((a, b) => Date.parse(String(b.endTime)) - Date.parse(String(a.endTime))), query);
  }
  if (path === "/task/handler" && method === "POST") {
    assertNoHandoverLock(store);
    const input = z.object({ requestId: idSchema.optional(), instId: idSchema, taskId: z.string().nullable().optional(), action: z.enum(["agree", "reject", "complete", "forward", "beforeAdd", "afterAdd", 'fallback', 'withdraw', "revoke", "cancel", "comment"]), targetNode: z.string().nullable().optional(), formData: dataSchema.optional(), targetUsers: z.array(idSchema).max(1).optional(), otherNodeUsers: z.record(idSchema, z.array(idSchema).max(200)).optional(), signature: z.string().max(500_000).optional(), saveSign: z.boolean().optional(), comment: dataSchema.optional() }).parse(await body(request));
    await assertResourceAccess(runtime, user, input.formData ?? {});
    await assertResourceAccess(runtime, user, input.comment ?? {});
    const requestId = input.requestId ?? randomUUID();
    const commandKey = `${user.id}:${requestId}`, digest = fingerprint(input);
    const previous = store.get('command', commandKey, commandRecordSchema);
    if (previous) {
      if (previous.fingerprint !== digest) throw new ApiError(409, '请求编号已用于其他操作');
      if (!previous.completed) {
        await executeCommand(runtime, previous.command);
        const command = previous.command;
        if ((command.type === "approve" || command.type === "complete") && command.data && Object.keys(command.data).length) {
          const previousInstance = runtime.instance(command.instanceId);
          runtime.formData.update(previousInstance.id, previousInstance.model.defineId, command.data);
        }
        if (input.signature && previous.saveSign) orgService.updateUserSignature(user.id, input.signature);
        store.put('command', commandKey, { ...previous, completed: true });
      }
      return '处理成功';
    }
    const instance = runtime.instance(input.instId); runtime.assertRead(instance, user);
    const snapshot = await runtime.snapshot(instance), permissions = detail(runtime, instance, snapshot, user).operationPerm;
    if (!permissions[input.action]?.enable && !(input.action === "cancel" && permissions.revoke?.enable)) throw new ApiError(403, "无权执行此操作");
    if (input.action === "comment") { store.put("note", requestId, { id: requestId, instId: instance.id, userId: user.id, createTime: new Date().toISOString(), content: input.comment ?? {} }); return "已评论"; }
    const base = { requestId, tenantId: runtime.tenant, instanceId: instance.id, actorId: user.id, comment: input.comment ?? {} };
    let command: Command;
    if (input.action === "revoke" || input.action === "cancel") command = { ...base, type: "cancel" };
    else if (input.action === 'withdraw') command = { ...base, type: 'withdraw', nodeId: idSchema.parse(input.targetNode) };
    else {
      const taskId = input.taskId?.replace(`${instance.id}:`, "") ?? "";
      const task = snapshot.tasks.find((t) => t.id === taskId); if (!task) throw new ApiError(409, "任务已结束");
      if (!actionableUsers(task).includes(user.id)) throw new ApiError(403, "不是当前任务处理人");
      if (input.action === 'fallback') command = { ...base, taskId, type: 'returnTo', nodeId: idSchema.parse(input.targetNode) };
      else if (input.action === "forward" || input.action === "beforeAdd" || input.action === "afterAdd") {
        const target = getUser(idSchema.parse(input.targetUsers?.[0]));
        command = input.action === "forward" ? { ...base, taskId, type: "transfer", userId: target.id } : { ...base, taskId, type: "addAssignee", userId: target.id, position: input.action === "beforeAdd" ? "before" : "after" };
      } else if (input.action === "reject") command = { ...base, taskId, type: "reject", ...(input.otherNodeUsers ? { otherNodeUsers: input.otherNodeUsers } : {}) };
      else {
        const data: Data = {};
        for (const [key, value] of Object.entries(input.formData ?? {})) {
          if (task.fields.some((field) => field.key === key)) data[key] = value;
          else if (JSON.stringify(snapshot.data[key]) !== JSON.stringify(value)) throw new ApiError(403, "不能修改只读字段");
        }
        command = { ...base, taskId, type: input.action === "agree" ? "approve" : "complete", data, ...(input.signature ? { signature: input.signature } : {}), ...(input.otherNodeUsers ? { otherNodeUsers: input.otherNodeUsers } : {}) };
      }
    }
    store.put('command', commandKey, { fingerprint: digest, command, completed: false, saveSign: input.saveSign });
    await executeCommand(runtime, command);
    // Java completeTaskBefore persists the submitted form data and, when saveSign is set, the reusable signature.
    if (["approve", "complete", "reject"].includes(command.type) && input.formData && Object.keys(input.formData).length) runtime.formData.update(instance.id, instance.model.defineId, input.formData);
    if (input.signature && input.saveSign && ["approve", "complete", "reject"].includes(command.type)) orgService.updateUserSignature(user.id, input.signature);
    store.put('command', commandKey, { fingerprint: digest, command, completed: true, saveSign: input.saveSign });
    return "处理成功";
  }
  if (path === "/task/revise" && method === "POST") {
    const input = z.object({ requestId: idSchema.optional(), instId: idSchema, formData: dataSchema.optional(), comment: dataSchema.optional() }).parse(await body(request));
    const instance = runtime.instance(input.instId); runtime.assertRead(instance, user);
    const snapshot = await runtime.snapshot(instance);
    if (snapshot.status === "running") throw new ApiError(409, "该流程未结束，不支持本操作");
    if (store.get("revision", instance.id, revisionSchema)) throw new ApiError(409, "该流程已归档，不允许修改");
    await assertResourceAccess(runtime, user, input.formData ?? {});
    await assertResourceAccess(runtime, user, input.comment ?? {});
    const createTime = new Date().toISOString();
    store.put("revision", instance.id, { instId: instance.id, data: input.formData ?? {}, comment: input.comment ?? {}, operator: user.id, createTime });
    if (input.formData && Object.keys(input.formData).length) runtime.formData.update(instance.id, instance.model.defineId, input.formData);
    const recipients = new Set<string>();
    for (const event of store.events(instance.id)) {
      const task = object(event.details.task);
      for (const id of [...array(task.assignees), ...array(task.candidates), ...array(task.approved), ...array(task.additions).map((addition) => object(addition).userId)]) recipients.add(String(id));
      for (const id of array(event.details.recipients)) recipients.add(String(id));
    }
    for (const userId of recipients) {
      const id = randomUUID();
      runtime.notify({ id, level: "WARNING", title: "您参与的流程在结束后被修改", content: `${instance.title}数据被修改`, target: userId, instId: instance.id, unread: true, createTime });
    }
    return "修改成功";
  }
  if (path.startsWith("/task/claim/") || path.startsWith("/task/candidate/")) {
    const external = path.split("/").at(-1)!; const index = external.indexOf(":task-"); if (index < 0) throw new ApiError(404, "任务不存在");
    const instance = runtime.instance(external.slice(0, index)); runtime.assertRead(instance, user);
    const taskId = external.slice(index + 1), snapshot = await runtime.snapshot(instance), task = snapshot.tasks.find((t) => t.id === taskId);
    if (!task) throw new ApiError(404, "任务已结束");
    if (path.startsWith("/task/candidate/")) return task.candidates.map(getUser);
    await executeCommand(runtime, { type: "claim", tenantId: runtime.tenant, instanceId: instance.id, taskId, actorId: user.id, requestId: randomUUID() }); return "签收成功";
  }
  if (path === '/task/fallback/nodes' || path === '/task/withdraw/nodes') {
    const instance = runtime.instance(required(query, 'instId')); runtime.assertRead(instance, user);
    const snapshot = await runtime.snapshot(instance);
    if (path === '/task/withdraw/nodes') {
      // Java getWithdrawNodes: only the newest handled node, and only while the next node has no processing records.
      const last = snapshot.returnTargets.at(-1);
      const unhandled = snapshot.tasks.length > 0 && snapshot.tasks.every((task) => !task.approved.length && !(task.additions ?? []).some((addition) => addition.completed));
      return last && last.actorIds.includes(user.id) && unhandled
        ? [{ id: last.nodeId, nodeId: last.nodeId, name: last.name, nodeName: last.name }] : [];
    }
    return snapshot.returnTargets.map((target) => ({ id: target.nodeId, nodeId: target.nodeId, name: target.name, nodeName: target.name }));
  }
  if (path === "/task/urging" && method === "POST") {
    // FlowTaskServiceImpl.urgingTask: notify exactly the requested users with the urger's name and remark.
    const input = z.object({ instId: idSchema, targetUserIds: z.array(idSchema), remark: z.string().max(500).optional() }).parse(await body(request));
    const instance = runtime.instance(input.instId), createTime = new Date().toISOString();
    for (const target of new Set(input.targetUserIds)) {
      const id = randomUUID();
      runtime.notify({ id, level: "WARNING", title: "您有一条流程催办消息", content: `${user.name} 提醒您处理[${instance.title}] ${input.remark ?? ""}`, target, instId: instance.id, unread: true, createTime });
    }
    return "催办成功";
  }
  return NOT_HANDLED;
}
