import { randomUUID } from "node:crypto";
import { z } from "zod";
import { WorkflowIdReusePolicy, WorkflowIdConflictPolicy, WorkflowExecutionAlreadyStartedError } from "@temporalio/client";
import { actionableUsers, canonical, dataSchema, validateFields, WORKFLOW_TYPE, workflowId, type Data } from "wflow-core";
import { ApiError, array, decode, formFieldsOf, instanceCode, object, settingsOf } from "../models.js";
import { fingerprint, getUser, revisionSchema } from "../runtime.js";
import { detail, editorNodes, formDataOf, graph, records, row } from "../views.js";
import { assertResourceAccess } from "../resources.js";
import { orgService } from "../org.js";
import { byCreateDesc, ccRows, instanceViews, submittedRows, todoRows } from "./queries.js";
import { NOT_HANDLED, admin, body, idSchema, matchesQuery, noteSchema, page, required, revokeTimeout, startRecordSchema, workbook, type RouteContext } from "./shared.js";

export async function instRoutes(context: RouteContext): Promise<unknown> {
  const { path, method, query, user, request, runtime, models, store, permUser } = context;
  if (path === "/inst/startup" && method === "POST") {
    const input = z.object({ requestId: idSchema.optional(), defineId: idSchema, initiator: idSchema.optional(), startDeptId: idSchema, formData: dataSchema, title: z.string().max(200).optional(), processData: dataSchema.optional() }).parse(await body(request));
    await assertResourceAccess(runtime, user, input.formData);
    const initiator = getUser(input.initiator ?? user.id);
    if (input.startDeptId !== initiator.deptId && input.startDeptId !== user.deptId) throw new ApiError(403, "发起人或部门不匹配");
    const requestId = input.requestId ?? randomUUID();
    const startKey = `${user.id}:${requestId}`, startDigest = fingerprint(input);
    const previousRequest = store.get('start', startKey, startRecordSchema);
    if (previousRequest && previousRequest.fingerprint !== startDigest) throw new ApiError(409, '请求编号已用于其他流程');
    const previous = previousRequest ? runtime.instance(previousRequest.instanceId) : undefined;
    const current = previous?.model ?? models.list().find((m) => m.defineId === input.defineId); if (!current) throw new ApiError(404, "发布版本不存在");
    if (!models.canStart(current, permUser)) throw new ApiError(403, "不可发起该流程");
    // 代他人发起（ProcessUtil.getUserAgent 之外）：Java 同时校验发起人与提交人的发起权限。
    if (initiator.id !== user.id && !models.canStart(current, { id: initiator.id, deptLevels: orgService.getDeptLevels(initiator.deptId), roleIds: orgService.getUserRoleIds(initiator.id) })) throw new ApiError(403, "不可发起该流程");
    const { model, definition } = models.published(current.code, current.version);
    const settings = settingsOf(models.get(current.code));
    validateFields(definition.inputFields ?? [], input.formData, true);
    for (const field of definition.inputFields ?? []) if (field.required && (input.formData[field.key] === "" || input.formData[field.key] === null)) throw new ApiError(422, "必填字段不能为空");
    const id = previous?.id ?? instanceCode(store, decode(model.setting));
    const instance = previous ?? { id, code: model.code, title: input.title ?? `${initiator.name}发起的${model.procName}`, initiator, submitter: user, model, createdAt: new Date().toISOString(), startRequestId: requestId };
    store.transaction(() => { store.put("instance", id, instance); store.put('start', startKey, { fingerprint: startDigest, instanceId: id }); if (!previous) runtime.formData.save(id, model.defineId, input.formData); });
    const executionData: Data = {
      ...input.formData,
      _initiatorId: initiator.id,
      _submitterId: user.id,
      _initiatorDeptId: initiator.deptId,
      _initiatorDeptLevels: orgService.getDeptLevels(initiator.deptId),
      _initiatorRoles: orgService.getUserRoleIds(initiator.id),
      ...(input.processData && Object.keys(input.processData).length ? { _nodeUsers: input.processData } : {}),
    };
    try { await runtime.client.workflow.start(WORKFLOW_TYPE, { workflowId: workflowId(runtime.tenant, id), taskQueue: runtime.taskQueue,
      workflowIdReusePolicy: WorkflowIdReusePolicy.REJECT_DUPLICATE, workflowIdConflictPolicy: WorkflowIdConflictPolicy.FAIL,
      // `_initiator*` data keys stay for existing consumers; the first-class context drives initiator conditions.
      args: [{ tenantId: runtime.tenant, instanceId: id, businessKey: id, initiatorId: initiator.id,
        initiator: { deptLevels: orgService.getDeptLevels(initiator.deptId), roles: orgService.getUserRoleIds(initiator.id) },
        definition: settings ? { ...definition, settings } : definition, data: executionData }] }); }
    catch (error) { if (!(error instanceof WorkflowExecutionAlreadyStartedError)) throw error; }
    return id;
  }
  if (path.startsWith("/inst/") && path.split("/").length === 3 && method === "DELETE") {
    admin(user);
    const instanceId = idSchema.parse(path.split("/").at(-1));
    await runtime.deleteInstance(instanceId);
    return `删除流程实例 ${instanceId} 成功`;
  }
  if (["/inst/list", "/inst/mySubmit/list", "/inst/cc/list", "/inst/count", "/inst/list/count", "/inst/list/export"].includes(path)) {
    // Java selectInstPage/selectCcInstPage/selectIdoTaskPage carry no admin or participant filter.
    const all = await instanceViews(runtime);
    const todo = todoRows(runtime, all, user.id);
    const submitted = submittedRows(runtime, all, user.id);
    const cc = ccRows(runtime, all, user.id);
    if (path === "/inst/count") return { todo: todo.length, mySubmit: all.filter(({ instance }) => instance.initiator.id === user.id).length, ccMe: cc.length };
    if (path === '/inst/list/count' || path === '/inst/list/export') {
      const code = query.get('code');
      const matched = all.filter(({ instance, snapshot }) => (!code || instance.code === code) && matchesQuery(row(runtime, instance, snapshot), formDataOf(runtime, instance, snapshot), query));
      const makeRow = ({ instance, snapshot }: (typeof all)[number]) => {
        const fields = formFieldsOf(instance.model).filter((field) => object(field.props).isContainer !== true);
        const basic = row(runtime, instance, snapshot), data = formDataOf(runtime, instance, snapshot);
        const fieldData = Object.fromEntries(fields.map((field) => [String(field.key), { key: String(field.key), name: String(field.name ?? field.key), valueType: String(field.valueType ?? 'all'), value: data[String(field.key)] ?? null }]));
        return { ...basic, fieldData };
      };
      if (path === '/inst/list/export') {
        // Java exportInstData: walk the filtered query in 200-row pages without skipping or duplicating.
        const requested = query.get('pageSize');
        const exportPageSize = requested && /^\d+$/.test(requested) ? Math.min(100_000, Math.max(1, Number(requested))) : 200;
        const rows: ReturnType<typeof makeRow>[] = [];
        let pageNo = 0, total = 0;
        do {
          pageNo++;
          total = matched.length;
          rows.push(...matched.slice((pageNo - 1) * exportPageSize, pageNo * exportPageSize).map(makeRow));
        } while (exportPageSize * pageNo <= total);
        const fields = matched[0] ? formFieldsOf(matched[0].instance.model).filter((field) => object(field.props).isContainer !== true) : [];
        const binary = await workbook(rows, fields, matched[0]?.instance.model.procName ?? '流程数据');
        return { __binary: binary.toString('base64'), filename: `${matched[0]?.instance.model.procName ?? '流程数据'}.xlsx` };
      }
      const rows = matched.map(makeRow);
      return page(rows.map((item) => ({ ...item, startDept: item.deptName, fieldData: Object.values(item.fieldData) })), query);
    }
    if (path === "/inst/list") {
      const rows = all.filter(({ instance, snapshot }) => matchesQuery(row(runtime, instance, snapshot), formDataOf(runtime, instance, snapshot), query)).map(({ instance, snapshot }) => ({ ...row(runtime, instance, snapshot), todoUsers: [...new Set(snapshot.tasks.flatMap(actionableUsers))].map(getUser) }));
      return page(rows.sort((a, b) => Date.parse(b.createTime) - Date.parse(a.createTime)), query);
    }
    const rows = path === "/inst/mySubmit/list" ? submitted : cc;
    return page(byCreateDesc(rows.filter((r) => matchesQuery(r, {}, query))), query);
  }
  if (path === "/inst/detail" || path.startsWith("/inst/process/") || path.startsWith("/inst/records/")) {
    const instance = runtime.instance(path === "/inst/detail" ? required(query, "instId") : path.split("/").at(-1)!); runtime.assertRead(instance, user);
    if (path.startsWith("/inst/records/")) return records(runtime, instance);
    const snapshot = await runtime.snapshot(instance);
    if (path.startsWith("/inst/process/")) return graph(runtime, instance, snapshot);
    return detail(runtime, instance, snapshot, user, { nodeId: query.get("nodeId") ?? undefined });
  }
  if (path === "/inst/discuss" && method === "GET") {
    const instance = runtime.instance(required(query, "instId"));
    return page(store.list("note", noteSchema).filter((note) => note.instId === instance.id).map((note) => ({ id: note.id, instId: instance.id, owner: getUser(note.userId), createTime: note.createTime, content: note.content })), query);
  }
  if (path.startsWith("/inst/discuss/") && method === "POST") {
    const instance = runtime.instance(path.split("/").at(-1)!);
    const content = object(await body(request)); await assertResourceAccess(runtime, user, content);
    const id = randomUUID(); store.put("note", id, { id, instId: instance.id, userId: user.id, createTime: new Date().toISOString(), content });
    // FlowTaskServiceImpl.commentAtUser: @mentions push an INFO notification.
    for (const at of new Set(array(content.atUsers).map((entry) => String(object(entry).id ?? "")).filter(Boolean))) {
      const note = randomUUID();
      runtime.notify({ id: note, level: "INFO", title: `${user.name} 在流程中@了你`, content: `${user.name}在[${instance.title}]中@了你，请注意`, target: at, instId: instance.id, unread: true, createTime: new Date().toISOString() });
    }
    return id;
  }
  if (path.startsWith("/inst/discuss/") && method === "DELETE") {
    // FlowInstanceServiceImpl.withdrawFlowInstDiscuss: only the configurable revoke timeout is enforced.
    const id = path.split("/").at(-1)!, note = store.get("note", id, noteSchema);
    if (!note) throw new ApiError(404, "该消息不存在");
    if (Date.now() - Date.parse(note.createTime) > revokeTimeout * 1000) throw new ApiError(409, "消息已超过撤回时间");
    store.delete("note", id); return "撤回消息成功";
  }
  return NOT_HANDLED;
}
