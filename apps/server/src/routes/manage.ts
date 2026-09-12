import { randomUUID } from "node:crypto";
import { z } from "zod";
import { actionableUsers, canonical, dataSchema, type Data } from "wflow-core";
import { ApiError, object } from "../models.js";
import { executeCommand, fingerprint, getUser } from "../runtime.js";
import { detail, editorNodes, row } from "../views.js";
import { assertResourceAccess } from "../resources.js";
import { NOT_HANDLED, admin, body, commandRecordSchema, idSchema, matchesQuery, page, required, type RouteContext } from "./shared.js";

export async function manageRoutes(context: RouteContext): Promise<unknown> {
  const { path, method, query, user, request, runtime, store } = context;
  if (path.startsWith('/manage/')) {
    admin(user);
    if (path === '/manage/task') {
      const results = await Promise.all(runtime.instances().map(async (instance) => { const snapshot = await runtime.snapshot(instance); return snapshot.tasks.map((task) => ({ ...row(runtime, instance, snapshot, task), assignees: task.assignees.map(getUser) })); }));
      return page(results.flat().filter((item) => matchesQuery(item, {}, query)), query);
    }
    if (path === '/manage/inst/detail') {
      const instance = runtime.instance(required(query, 'instId'));
      return detail(runtime, instance, await runtime.snapshot(instance), user, { admin: true, taskId: query.get('taskId') ?? undefined });
    }
    if (path === '/manage/task/handler' && method === 'POST') {
      const input = z.object({ requestId: idSchema, instId: idSchema, taskId: idSchema.nullish(), action: z.enum(['agree', 'complete', 'reject', 'forward', 'revoke']), formData: dataSchema.optional(), targetUsers: z.array(idSchema).length(1).optional(), otherNodeUsers: z.record(idSchema, z.array(idSchema).max(200)).optional(), signature: z.string().max(500_000).optional(), comment: dataSchema.optional() }).parse(await body(request));
      await assertResourceAccess(runtime, user, input.formData ?? {});
      await assertResourceAccess(runtime, user, input.comment ?? {});
      const commandKey = `${user.id}:${input.requestId}`, digest = fingerprint(input);
      const previous = store.get('command', commandKey, commandRecordSchema);
      if (previous && previous.fingerprint !== digest) throw new ApiError(409, '请求编号已用于其他操作');
      if (previous?.completed) return '处理成功';
      let command = previous?.command;
      let forwarded: { target: string; nodeName: string } | undefined;
      if (!command) {
        const instance = runtime.instance(input.instId), snapshot = await runtime.snapshot(instance);
        const base = { requestId: input.requestId, tenantId: runtime.tenant, instanceId: instance.id, actorId: user.id, comment: input.comment ?? {} };
        if (input.action === 'revoke') command = { ...base, type: 'cancel' };
        else {
          const task = snapshot.tasks.find((t) => `${instance.id}:${t.id}` === input.taskId);
          const assignee = task && actionableUsers(task)[0];
          if (!task || !assignee) throw new ApiError(409, '没有可介入的处理人');
          if (input.action === 'forward') {
            const target = getUser(idSchema.parse(input.targetUsers?.[0])).id;
            command = { ...base, type: 'reassign', taskId: task.id, fromUserId: assignee, userId: target };
            // FlowManagerServiceImpl.sendNotification: the admin transfer pushes a WARNING notification.
            forwarded = { target, nodeName: String(editorNodes(instance.model).find((node) => node.id === task.nodeId)?.name ?? task.nodeId) };
          }
          else {
            const data: Data = {};
            for (const [key, value] of Object.entries(input.formData ?? {})) {
              if (task.fields.some((field) => field.key === key)) data[key] = value;
              else if (canonical(snapshot.data[key]) !== canonical(value)) throw new ApiError(403, '不能修改只读字段');
            }
            command = { ...base, type: 'override', taskId: task.id, userId: assignee, action: input.action === 'agree' ? 'approve' : input.action, data, ...(input.signature ? { signature: input.signature } : {}), ...(input.otherNodeUsers ? { otherNodeUsers: input.otherNodeUsers } : {}) };
          }
        }
        store.put('command', commandKey, { fingerprint: digest, command, completed: false });
      }
      await executeCommand(runtime, command!);
      if (command!.type === 'override' && input.formData && Object.keys(input.formData).length) {
        const instance = runtime.instance(input.instId);
        runtime.formData.update(instance.id, instance.model.defineId, input.formData);
      }
      if (forwarded && !previous?.completed) {
        const id = randomUUID(), text = object(input.comment ?? {}).text;
        runtime.notify({ id, level: 'WARNING', title: '管理员干预：您收到一条新任务', content: `管理员 ${user.name} 在[${forwarded.nodeName}]环节执行了转交操作${text ? `：${text}` : ''}`, target: forwarded.target, instId: input.instId, unread: true, createTime: new Date().toISOString() });
      }
      store.put('command', commandKey, { fingerprint: digest, command, completed: true });
      return '处理成功';
    }
    if ((path.startsWith('/manage/suspend/') || path.startsWith('/manage/resume/')) && method === 'PUT') {
      const instance = runtime.instance(path.split('/').at(-1)!);
      const command = { type: path.includes('/suspend/') ? 'suspend' : 'resume', tenantId: runtime.tenant, instanceId: instance.id, actorId: user.id, requestId: randomUUID() };
      await executeCommand(runtime, command); return '已更新';
    }
  }
  return NOT_HANDLED;
}
