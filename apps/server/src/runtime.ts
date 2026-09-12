import { Client, Connection, WorkflowNotFoundError } from "@temporalio/client";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { NativeConnection } from "@temporalio/worker";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { createContext, Script } from "node:vm";
import { z } from "zod";
import { canonical, commandSchema, createWorkflowWorker, createActivities, actionableUsers, dataSchema, executeScript, jsonSchema, COMMAND_UPDATE, type Adapters, type AssignmentRequest, type Data, type Definition, type IntegrationRequest, type Json, type Snapshot, type SyncRequest, type WorkflowEvent, workflowId, SNAPSHOT_QUERY } from "wflow-core";
import { WorkflowStore } from "./store.js";
import { InstanceFormData } from "./form-data.js";
import { InProcessBroadcaster, type Broadcaster } from "./broadcaster.js";
import { ApiError, Models, array, object, seedModels, settingsOf, modelSchema } from "./models.js";
import { Forms } from "./forms.js";
import { mapUser } from './assignment-policy';
import { orgService } from './org.js';

// ProcSetting.formSync host adapter: preCover JS -> fieldMapping/range -> DB (host store) / EL / API.
export async function applySyncRule(store: WorkflowStore, request: SyncRequest): Promise<void> {
  const { rule, data, event, context } = request;
  if (!rule.enable || !rule.events.includes(event)) return;
  let fields: Data = data;
  if (rule.preCover && rule.preJs) {
    const output = executeScript("JS", rule.preJs, { ...data, event, ctx: data });
    if (output !== null && typeof output === "object" && !Array.isArray(output)) fields = output as Data;
  }
  const mapped: Data = {};
  const keep = new Set<string>();
  for (const entry of rule.fieldMapping ?? []) {
    const value = fields[entry.source];
    if (value !== undefined && value !== null) mapped[entry.target ?? entry.source] = value;
    if (rule.range) keep.add(entry.source);
  }
  if (rule.range) for (const [key, value] of Object.entries(fields)) if (!keep.has(key)) mapped[key] = value;
  if (rule.type === "EL") { if (rule.el) executeScript("EL", rule.el, { ...mapped, event, ctx: mapped }); return; }
  if (rule.type === "API") {
    const response = await fetch(`${rule.apiUrl ?? ""}/${event}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(mapped), signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new ApiError(502, `数据同步接口返回 ${response.status}`);
    return;
  }
  const key = `${rule.tbName ?? context.definition.id}:${context.instanceId}`;
  if (event !== "create") store.delete("business", key);
  if (event !== "delete") store.put("business", key, { id: context.instanceId, ...mapped });
}
export const tenantId = "1";
export const adminRoleId = process.env.WFLOW_ADMIN_ROLE_ID ?? "1";
export const fingerprint = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export async function executeCommand(runtime: Runtime, raw: unknown) {
  const command = commandSchema.parse(raw);
  return runtime.client.workflow.getHandle(workflowId(command.tenantId, command.instanceId)).executeUpdate(COMMAND_UPDATE, { args: [command], updateId: `${command.requestId}:${fingerprint(command)}` });
}
export const userSchema = z.object({ id: z.string(), name: z.string(), avatar: z.string(), type: z.literal("user"), deptId: z.string(), deptName: z.string(), admin: z.boolean() });
export type User = z.infer<typeof userSchema>;
export const users: User[] = orgService.listUsers().map((u) => ({
  id: u.id,
  name: u.name,
  avatar: u.avatar,
  type: "user",
  deptId: u.deptId,
  deptName: u.deptName,
  admin: u.admin,
}));
export function getUser(id: string): User {
  const orgUser = orgService.findUser(id);
  if (orgUser) {
    return {
      id: orgUser.id,
      name: orgUser.name,
      avatar: orgUser.avatar,
      type: "user",
      deptId: orgUser.deptId,
      deptName: orgUser.deptName,
      admin: orgUser.admin,
    };
  }
  const found = users.find((u) => u.id === id);
  if (!found) throw new ApiError(404, `用户[${id}]不存在`);
  return found;
}
export const instanceSchema = z.object({ id: z.string(), code: z.string(), title: z.string(), initiator: userSchema, submitter: userSchema.optional(), parentInstId: z.string().optional(), parentNodeId: z.string().optional(), model: modelSchema, createdAt: z.string(), startRequestId: z.string() });
export type StoredInstance = z.infer<typeof instanceSchema>;
const sessionSchema = z.object({ userId: z.string(), expires: z.number() });
export const notificationSchema = z.object({ id: z.string(), level: z.string(), title: z.string(), content: z.string(), target: z.string(), instId: z.string(), unread: z.boolean(), createTime: z.string() });
export type Notification = z.infer<typeof notificationSchema>;
export const revisionSchema = z.object({ instId: z.string(), data: dataSchema, comment: dataSchema, operator: z.string(), createTime: z.string() });

export class Runtime {
  readonly models: Models;
  readonly forms: Forms;
  readonly formData: InstanceFormData;
  readonly broadcaster: Broadcaster;
  readonly taskQueue: string;
  readonly adapters: Adapters;
  readonly activities: ReturnType<typeof createActivities>;
  client!: Client;
  private readonly tenants = new Map<string, Promise<Runtime>>();
  private environment?: TestWorkflowEnvironment;
  private connection?: NativeConnection;
  private clientConnection?: Connection;
  private worker?: Awaited<ReturnType<typeof createWorkflowWorker>>;
  private running?: Promise<void>;
  workerError?: Error;

  constructor(readonly store: WorkflowStore, readonly tenant: string = tenantId, private shared?: SharedTemporal, broadcaster?: Broadcaster) {
    const baseQueue = process.env.TEMPORAL_TASK_QUEUE ?? "wflow-workflows";
    this.taskQueue = tenant === tenantId ? baseQueue : `${baseQueue}-${tenant}`;
    this.models = new Models(store);
    this.forms = new Forms(store);
    this.formData = new InstanceFormData(store);
    this.broadcaster = broadcaster ?? new InProcessBroadcaster();
    this.adapters = {
      definitions: { get: async (tenant, reference) => {
        if (tenant !== this.tenant) throw new ApiError(403, "FORBIDDEN");
        return this.models.published(reference.id, reference.version || undefined).definition;
      } },
      authorize: async (request) => {
        if (request.tenantId !== this.tenant || !users.some((user) => user.id === request.actorId)) return false;
        const user = getUser(request.actorId);
        // Visibility listing has no instance scope; the reference host keeps it admin-only.
        if (request.operation === "list") return user.admin;
        // External signals are conservatively admin-only and are checked before an instance record
        // exists (startOrSignal authorizes before starting the instance that will consume it).
        if (request.operation === "signal") return user.admin;
        if (request.operation === "start") {
          if (!request.definition) return false;
          return this.models.canStart(this.models.get(request.definition.id), { id: user.id, deptLevels: orgService.getDeptLevels(user.deptId), roleIds: orgService.getUserRoleIds(user.id) });
        }
        if (!request.instanceId) return false;
        const instance = this.store.get("instance", request.instanceId, instanceSchema);
        if (!instance) return false;
        if (request.operation === "read") return this.canRead(instance, user);
        const command = request.command;
        if (!command) return false;
        if (command.type === "cancel") return user.admin || (instance.initiator.id === user.id && object(JSON.parse(instance.model.setting)).enableCancel === true);
        if (command.type === "event") return user.admin;
        if (["suspend", "resume", "override", "migrate"].includes(command.type)) return user.admin;
        // A handler may hand their own task over (work-handover executes as the source user).
        if (command.type === "reassign") return user.admin || command.actorId === command.fromUserId;
        return this.canRead(instance, user);
      },
      resolveAssignees: async (request) => this.resolve(request),
      integrate: async (request) => this.integrate(request),
      syncBusinessData: async (request) => this.syncBusiness(request),
      mapAssignees: async (request, ids) => {
        const key = `${request.context.instanceId}:${request.executionId}`;
        const previous = this.store.get('assignment', key, z.object({ originals: z.array(z.string()), assigned: z.array(z.string()) }));
        if (previous) return previous.assigned;
        const assigned = ids.map((id) => getUser(mapUser(this.store, getUser(id).id, request.context.definition.id)).id);
        if (request.context.instanceId !== 'forecast') this.store.put('assignment', key, { originals: ids, assigned });
        return assigned;
      },
      actions: new Map(),
      publishEvent: async (event) => this.project(event),
    };
    this.activities = createActivities(this.adapters);
  }
  instances(): StoredInstance[] { return this.store.list("instance", instanceSchema).filter((instance) => this.store.events(instance.id).some((event) => event.eventType === 'workflow.started')); }
  instance(id: string): StoredInstance {
    const instance = this.store.get("instance", id, instanceSchema);
    if (!instance) throw new ApiError(404, "流程实例不存在");
    return instance;
  }
  /** Java NotifyService.createNotify: persist the message and fan it out to live subscribers. */
  notify(note: Notification): void {
    this.store.put("notification", note.id, note);
    this.broadcaster.publish(note.target, { id: note.id, target: note.target, data: note });
  }
  session(userId: string): { token: string; user: User } {
    const user = getUser(userId), token = randomBytes(32).toString("hex");
    this.store.put("session", token, { userId, expires: Date.now() + 8 * 3_600_000 });
    return { token, user };
  }
  authenticate(token: string): User {
    const session = this.store.get("session", token, sessionSchema);
    if (!session || session.expires < Date.now()) throw new ApiError(401, "登录已失效");
    return getUser(session.userId);
  }
  canRead(instance: StoredInstance, user: User): boolean {
    if (user.admin || instance.initiator.id === user.id) return true;
    return this.store.events(instance.id).some((event) => {
      const task = object(event.details.task);
      return event.details.actorId === user.id || array(task.assignees).includes(user.id) || array(task.candidates).includes(user.id) || array(task.additions).some((a) => object(a).userId === user.id) || array(event.details.recipients).includes(user.id);
    });
  }
  // Java validateAccessPerms only gates detail when ProcSetting.accessPerm is on; the SQL checks record.source or task.assignee.
  assertRead(instance: StoredInstance, user: User): void {
    const setting = object(JSON.parse(instance.model.setting));
    if (setting.accessPerm !== true) return;
    if (!this.participated(instance, user)) throw new ApiError(403, "无流程访问权限");
  }
  private participated(instance: StoredInstance, user: User): boolean {
    if (instance.initiator.id === user.id || instance.submitter?.id === user.id) return true;
    return this.store.events(instance.id).some((event) => {
      const task = object(event.details.task);
      return event.details.actorId === user.id || array(task.assignees).includes(user.id) || array(task.candidates).includes(user.id)
        || array(task.additions).some((addition) => object(addition).userId === user.id) || array(event.details.recipients).includes(user.id);
    });
  }
  async snapshot(instance: StoredInstance): Promise<Snapshot> {
    const snapshot = await this.client.workflow.getHandle(workflowId(this.tenant, instance.id)).query<Snapshot>(SNAPSHOT_QUERY);
    const revision = this.store.get("revision", instance.id, revisionSchema);
    return revision ? { ...snapshot, data: { ...snapshot.data, ...revision.data } } : snapshot;
  }
  private async syncBusiness(request: SyncRequest): Promise<void> {
    await applySyncRule(this.store, request);
  }
  async deleteInstance(instanceId: string): Promise<void> {
    const instance = this.instance(instanceId);
    const rule = settingsOf(instance.model)?.formSync;
    if (rule?.enable && rule.events.includes("delete")) {
      await this.adapters.syncBusinessData!({ context: { tenantId: this.tenant, instanceId, businessKey: instanceId, initiatorId: instance.initiator.id, definition: { id: instance.model.defineId, version: instance.model.version } }, event: "delete", rule, data: (await this.snapshot(instance)).data });
    }
    const handle = this.client.workflow.getHandle(workflowId(this.tenant, instanceId));
    try {
      const description = await handle.describe();
      if (description.status.name === "RUNNING") await handle.terminate("deleted by administrator");
    } catch (error) {
      if (!(error instanceof WorkflowNotFoundError)) throw error;
    }
    this.store.purgeInstance(instanceId);
    this.formData.remove(instanceId);
  }
  async resolve(request: AssignmentRequest): Promise<{ users: string[]; reason?: string }> {
    const assignment = request.assignment;
    if (assignment.type === "users") return { users: assignment.userIds };
    if (assignment.type === "initiator") return { users: [request.context.initiatorId] };
    const params = (assignment.params ?? {}) as Record<string, unknown>;
    const initiator = getUser(request.context.initiatorId);
    let resolved: string[] = [];
    let reason: string | undefined;
    // AssignUserParser.getDeptRuleUsers: shared by ASSIGN_DEPT and FORM_DEPT.
    const deptRuleUsers = (deptIds: string[], setup: Record<string, unknown>): string[] => {
      const type = String(setup.type ?? "USER").toUpperCase();
      if (type === "LEADER") return deptIds.map((dId) => orgService.getDept(dId)?.leaders).filter((leader): leader is string => Boolean(leader));
      if (type === "ROLE") return orgService.getUsersByDeptRole(deptIds, array(setup.roles).map((r) => typeof r === "string" ? r : String(object(r).id)));
      if (type === "GROUP") return orgService.getUsersByDeptGroup(deptIds, array(setup.groups).map((g) => typeof g === "string" ? g : String(object(g).id)));
      if (type === "USER") return orgService.getUsersByDept(deptIds, setup.nested === true);
      return [];
    };
    switch (assignment.name) {
      case "wflow:ASSIGN_USER": {
        resolved = array(params.assignUser).map((u) => typeof u === "string" ? u : String(object(u).id));
        break;
      }
      case "wflow:ASSIGN_DEPT": {
        const deptSetup = object(params.assignDept);
        const deptIds = array(deptSetup.dept).map((d) => typeof d === "string" ? d : String(object(d).id));
        resolved = deptRuleUsers(deptIds, deptSetup);
        break;
      }
      case "wflow:FORM_DEPT": {
        const formDeptSetup = object(params.formDept);
        const deptFieldKey = array(formDeptSetup.dept)[0] ? (typeof array(formDeptSetup.dept)[0] === 'string' ? String(array(formDeptSetup.dept)[0]) : String(object(array(formDeptSetup.dept)[0]).id)) : "";
        const rawDepts = request.data[deptFieldKey];
        const deptIds = Array.isArray(rawDepts) ? rawDepts.map((d) => typeof d === "string" ? d : String(object(d).id)) : [];
        resolved = deptRuleUsers(deptIds, formDeptSetup);
        break;
      }
      case "wflow:FORM_USER": {
        const formUser = params.formUser;
        const fieldKey = typeof formUser === "string" ? formUser : String(object(formUser).id);
        resolved = array(request.data[fieldKey]).map((v) => typeof v === "string" ? getUser(v).id : getUser(String(object(v).id)).id);
        break;
      }
      case "wflow:NODE_SELECT": {
        const nodeUsers = (request.data._nodeUsers ?? {}) as Record<string, unknown>;
        const key = request.nodeId ?? request.executionId;
        const list = Array.isArray(nodeUsers[key]) ? nodeUsers[key] as unknown[] : [];
        resolved = list.map(String);
        break;
      }
      case "wflow:ROOT_SELF":
      case "wflow:SELF":
      case "wflow:INITIATOR":
        resolved = [request.context.initiatorId];
        break;
      case "wflow:LEADER": {
        const leader = object(params.leader);
        const leaders = orgService.getDeptLeaders(initiator.id, initiator.deptId, typeof leader.level === "number" ? leader.level : 1, true, leader.emptySkip === true);
        resolved = leaders.length ? leaders : ["u-manager"];
        break;
      }
      case "wflow:LEADER_TOP": {
        const leaderTop = object(params.leaderTop);
        const leaders = orgService.getDeptLeaders(initiator.id, initiator.deptId, leaderTop.toEnd ? -1 : (typeof leaderTop.level === "number" ? leaderTop.level : 1), false, leaderTop.emptySkip === true);
        resolved = leaders.length ? leaders : ["u-manager"];
        break;
      }
      case "wflow:SUPERIOR": {
        const superior = object(params.superior);
        const leaders = orgService.getDeptLeaders(initiator.id, initiator.deptId, typeof superior.level === "number" ? superior.level : 1, true, superior.emptySkip === true);
        resolved = leaders.length ? leaders : ["u-manager"];
        break;
      }
      case "wflow:SUPERIOR_TOP": {
        const superiorTop = object(params.superiorTop);
        const leaders = orgService.getDeptLeaders(initiator.id, initiator.deptId, typeof superiorTop.level === "number" ? superiorTop.level : 1, false, superiorTop.emptySkip === true);
        resolved = leaders.length ? leaders : ["u-manager"];
        break;
      }
      case "wflow:ASSIGN_ROLE": {
        const roleIds = array(params.assignRole).map((v) => typeof v === "string" ? v : String(object(v).id));
        resolved = orgService.getUsersByRoles(roleIds);
        break;
      }
      case "wflow:ASSIGN_GROUP": {
        const groupIds = array(params.assignGroup).map((v) => typeof v === "string" ? v : String(object(v).id));
        resolved = orgService.getUsersByGroups(groupIds);
        break;
      }
      case "wflow:DYNAMIC": {
        const dynamic = object(params.dynamic);
        try {
          const result = dynamic.type === "EL" && typeof dynamic.el === "string" ? executeScript("EL", dynamic.el, request.data)
            : dynamic.type === "JS" && typeof dynamic.script === "string" ? executeScript("JS", dynamic.script, request.data)
            : null;
          if (Array.isArray(result)) resolved = result.map(String);
        } catch {
          resolved = [];
        }
        break;
      }
      default:
        resolved = [];
    }

    // sameRootHandler
    const sameRoot = object(params.sameRoot);
    if (resolved.includes(initiator.id)) {
      if (sameRoot.type === "TO_LEADER") {
        const leaders = orgService.getDeptLeaders(initiator.id, initiator.deptId, 1, true, true);
        const idx = resolved.indexOf(initiator.id);
        if (leaders.length) { resolved[idx] = leaders[0]!; reason = "TRANSFER_LEADER"; }
      } else if (sameRoot.type === "TO_SKIP") {
        resolved = resolved.filter((u) => u !== initiator.id);
      }
    }

    // noUserHandler
    if (!resolved.length && params.noUserHandler) {
      const noUser = object(params.noUserHandler);
      if (noUser.type === "TO_USER" && Array.isArray(noUser.assigned)) {
        reason = "TRANSFER_EMPTY";
        resolved = array(noUser.assigned).map((u) => typeof u === "string" ? u : String(object(u).id));
      } else if (noUser.type === "TO_ADMIN") {
        reason = "TRANSFER_EMPTY";
        // wflow.admin-role-id (default 1)
        resolved = orgService.getUsersByRoles([adminRoleId]);
      }
    }

    return { users: resolved, ...(reason ? { reason } : {}) };
  }

  async integrate(request: IntegrationRequest): Promise<Json> {
    if (request.type === "HTTP") return executeHttp(request.config, request.data);
    const scope = String(request.config.scope ?? "GLOBAL");
    const name = String(request.config.name ?? "");
    const code = request.config.code === undefined ? undefined : String(request.config.code);
    const targets = scope === "INSTANCE" ? [String(request.config.instId ?? "")]
      : this.instances().filter((instance) => scope === "PROCESS" ? instance.code === code : true).map((instance) => instance.id);
    let delivered = 0;
    for (const id of new Set(targets)) {
      if (!id) continue;
      if (scope === "LOCAL" && id !== request.context.instanceId) continue;
      const instance = this.store.get("instance", id, instanceSchema);
      if (!instance) continue;
      const snapshot = await this.snapshot(instance);
      for (const wait of snapshot.waits.filter((entry) => entry.event === name)) {
        const requestId = randomUUID();
        await this.client.workflow.getHandle(workflowId(this.tenant, id)).executeUpdate(COMMAND_UPDATE, {
          args: [{ type: "event", requestId, tenantId: this.tenant, instanceId: id, actorId: "u-admin", event: name, waitId: wait.id, data: {} }],
          updateId: `${requestId}:signal`,
        });
        delivered += 1;
      }
    }
    return { delivered };
  }

  private project(event: WorkflowEvent): void {
    this.store.transaction(() => {
      if (this.store.get("deleted", event.instanceId, z.object({ id: z.string() }))) return;
      if (!this.store.append(event)) return;
      if (event.eventType === 'workflow.childStarted') {
        const reference = object(event.details.childDefinition), id = String(event.details.childInstanceId);
        const { model } = this.models.published(String(reference.id), Number(reference.version) || undefined);
        this.store.put('instance', id, { id, code: model.code, title: model.procName, initiator: getUser(String(event.details.initiatorId)), parentInstId: event.instanceId, parentNodeId: String(event.details.nodeId ?? ''), model, createdAt: event.occurredAt, startRequestId: event.eventId });
      }
      const instance = this.store.get("instance", event.instanceId, instanceSchema);
      let definition: Definition | undefined;
      try { definition = this.models.published(event.definition.id, event.definition.version || undefined).definition; } catch { definition = undefined; }
      // Java EventHandler notification templates use the node name from the deployed definition.
      const nodeName = (id: unknown): string => {
        const target = String(id ?? "");
        const find = (nodes: unknown[]): Record<string, Json> | undefined => {
          for (const raw of nodes) {
            const node = object(raw);
            if (node.id !== undefined && String(node.id) === target) return node;
            const nested = [...array(node.branch).flatMap((branch) => array(branch)), ...array(node.nodes)];
            const found = find(nested);
            if (found) return found;
          }
          return undefined;
        };
        return String(find(definition?.nodes ?? [])?.name ?? target);
      };
      const instanceName = instance?.title ?? event.businessKey;
      const notifyTarget = (target: string, message: { title: string; content: string; level: string }) => {
        const id = `${event.eventId}:${target}`;
        this.notify({ id, ...message, target, instId: event.instanceId, unread: true, createTime: event.occurredAt });
      };
      const assigneesOf = (task: Record<string, Json>): string[] => [...array(task.assignees), ...array(task.additions).filter((raw) => !object(raw).completed).map((raw) => object(raw).userId)]
        .map(String).filter((id) => id && !array(task.approved).includes(id));

      if (event.eventType === "workflow.taskCreated") {
        const task = object(event.details.task);
        // The initiator root node never sends notifications (Java EventHandler.taskCreate).
        if (definition?.resubmit?.id === task.nodeId) return;
        for (const target of new Set(assigneesOf(task))) notifyTarget(target, { title: "您有一个新任务待处理", content: `您有一个新任务[${nodeName(task.nodeId)}]待处理`, level: "WARNING" });
      } else if (event.eventType === "workflow.taskChanged") {
        const task = object(event.details.task), action = String(event.details.action ?? "");
        if (action === "timeout") for (const target of new Set(assigneesOf(task))) notifyTarget(target, { title: "您有一项任务已超时", content: `${instanceName}在节点[${nodeName(task.nodeId)}] 超时，请及时处理`, level: "WARNING" });
        else if (action === "transfer") for (const target of new Set(array(task.assignees).map(String))) notifyTarget(target, { title: "您被转交了一条待办任务", content: `${getUser(String(event.details.actorId)).name}在[${nodeName(task.nodeId)}]环节的任务被转交给您${object(event.details.comment).text ? `：${object(event.details.comment).text}` : ""}`, level: "WARNING" });
        else if (action === "addAssignee") for (const addition of array(task.additions).map(object).filter((entry) => !entry.completed)) notifyTarget(String(addition.userId), { title: "您有一个新任务待处理", content: `您有一个新任务[${nodeName(task.nodeId)}]待处理`, level: "WARNING" });
      } else if (event.eventType === "workflow.cc") {
        for (const target of new Set(array(event.details.recipients).map(String))) notifyTarget(target, { title: "您收到一条流程抄送", content: `[${instanceName}]在[${nodeName(event.details.nodeId)}]环节抄送给您，请知晓`, level: "SUCCESS" });
      } else if (instance && ["workflow.completed", "workflow.rejected", "workflow.cancelled", "workflow.failed"].includes(event.eventType)) {
        const results: Record<string, { text: string; level: string }> = {
          "workflow.completed": { text: "审批通过", level: "SUCCESS" }, "workflow.rejected": { text: "被驳回", level: "DANGER" },
          "workflow.cancelled": { text: "被撤销", level: "INFO" }, "workflow.failed": { text: "流程异常", level: "INFO" },
        };
        const result = results[event.eventType]!;
        notifyTarget(instance.initiator.id, { title: `您有发起的流程${result.text}`, content: `您发起的流程 [${instanceName}] ${result.text}`, level: result.level });
      }
    });
  }
  async start(): Promise<void> {
    if (process.env.WFLOW_DEMO !== "1") throw new Error("This reference host requires WFLOW_DEMO=1. Integrate SDK adapters with your host authentication for production.");
    seedModels(this.models);
    if (this.shared) {
      this.environment = this.shared.environment;
      this.connection = this.shared.connection;
      this.client = this.shared.client;
      this.clientConnection = this.shared.clientConnection;
    } else if (process.env.TEMPORAL_ADDRESS) {
      this.connection = await NativeConnection.connect({ address: process.env.TEMPORAL_ADDRESS });
      this.clientConnection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS });
      this.client = new Client({ connection: this.clientConnection, namespace: process.env.TEMPORAL_NAMESPACE ?? "default" });
    } else {
      this.environment = await TestWorkflowEnvironment.createLocal({ server: { dbFilename: resolve(process.env.WFLOW_TEMPORAL_DB ?? ".data/temporal.sqlite"), namespace: "default" } });
      this.connection = this.environment.nativeConnection;
      this.client = this.environment.client;
    }
    this.worker = await createWorkflowWorker({ connection: this.connection, namespace: process.env.TEMPORAL_NAMESPACE ?? "default", taskQueue: this.taskQueue, adapters: this.adapters });
    this.running = this.worker.run().catch((error: unknown) => { this.workerError = error instanceof Error ? error : new Error("WORKER_FAILED"); });
  }
  async close(): Promise<void> {
    this.broadcaster.close();
    for (const entry of this.tenants.values()) { try { await (await entry).close(); } catch { /* child teardown must not block the host */ } }
    this.tenants.clear();
    if (this.worker?.getState() === "RUNNING") this.worker.shutdown();
    await this.running;
    if (this.shared) { this.store.close(); return; }
    if (this.environment) await this.environment.teardown();
    else { await this.connection?.close(); await this.clientConnection?.close(); }
    this.store.close();
  }
  // TenantId header routing: each tenant gets its own store file and task queue on the shared Temporal server.
  forTenant(tenant: string): Promise<Runtime> {
    if (tenant === this.tenant) return Promise.resolve(this);
    let runtime = this.tenants.get(tenant);
    if (!runtime) {
      const base = resolve(process.env.WFLOW_DB ?? ".data/workflow.sqlite");
      const path = /\.sqlite$/.test(base) ? base.replace(/\.sqlite$/, `-${tenant}.sqlite`) : `${base}-${tenant}`;
      const shared = { environment: this.environment, connection: this.connection!, client: this.client, clientConnection: this.clientConnection };
      runtime = (async () => { const child = new Runtime(new WorkflowStore(path), tenant, shared); await child.start(); return child; })()
        .catch((error: unknown) => { this.tenants.delete(tenant); throw error; });
      this.tenants.set(tenant, runtime);
    }
    return runtime;
  }
}
type SharedTemporal = { environment?: TestWorkflowEnvironment; connection: NativeConnection; client: Client; clientConnection?: Connection };

export async function createRuntime(): Promise<Runtime> {
  const runtime = new Runtime(new WorkflowStore(resolve(process.env.WFLOW_DB ?? ".data/workflow.sqlite")));
  try { await runtime.start(); return runtime; }
  catch (error) { await runtime.close(); throw error; }
}

function resolveHttpFields(fields: Json | undefined, ctx: Data): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const raw of Array.isArray(fields) ? fields : []) {
    const field = object(raw);
    const name = String(field.name ?? "");
    if (!name) continue;
    const value = field.isDynamic === true ? ctx[String(field.value)] : field.value;
    resolved[name] = value === undefined || value === null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  }
  return resolved;
}
/** Runs a Java-style handler body in an isolated vm context with a hard time budget. */
export function runScript(body: string, values: Record<string, unknown>, names: string[]): unknown {
  const sandbox = Object.create(null) as Record<string, unknown>;
  for (const name of names) sandbox[name] = values[name];
  // Only the declared handler names are in scope; node globals (process/require/...) are absent
  // and runaway scripts are cut off after the GraalVM-like time budget.
  try {
    return new Script(`(function(){${body}\n})()`, { filename: "integration-script.js" }).runInContext(createContext(sandbox), { timeout: 1000 });
  } catch (error) {
    // Sandboxed errors belong to another realm; rethrow host-realm built-ins so instanceof works.
    const name = error && typeof error === "object" && "name" in error ? String((error as { name: unknown }).name) : "";
    const message = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : String(error);
    if (name === "ReferenceError") throw new ReferenceError(message);
    if (name === "TypeError") throw new TypeError(message);
    if (name === "RangeError") throw new RangeError(message);
    throw error;
  }
}
/** Executes a Java-style HttpProps configuration; preJs/data/aftJs follow the handler-body convention. */
async function executeHttp(config: Data, ctx: Data): Promise<Json> {
  const url = String(config.url ?? "");
  if (!url) throw new ApiError(422, "HTTP 集成缺少 url");
  const method = String(config.method ?? "GET").toUpperCase();
  const request: { params: Record<string, string>; data: Record<string, Json>; headers: Record<string, string> } = {
    params: resolveHttpFields(config.params, ctx),
    data: config.isJson === true ? (config.data ? jsonSchema.parse(runScript(String(config.data), { ctx }, ["ctx"]) ?? {}) as Record<string, Json> : {}) : resolveHttpFields(config.bodyForms, ctx),
    headers: resolveHttpFields(config.headers, ctx),
  };
  if (config.preJs) runScript(String(config.preJs), { request, ctx }, ["request", "ctx"]);
  const target = new URL(url);
  for (const [key, value] of Object.entries(request.params)) target.searchParams.set(key, value);
  let body: string | undefined;
  if (config.isJson === true) {
    body = JSON.stringify(request.data);
    if (!Object.keys(request.headers).some((key) => key.toLowerCase() === "content-type")) request.headers["Content-Type"] = "application/json";
  } else if (Object.keys(request.data).length) {
    body = new URLSearchParams(request.data as Record<string, string>).toString();
    if (!Object.keys(request.headers).some((key) => key.toLowerCase() === "content-type")) request.headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  const response = await fetch(target, { method, headers: request.headers, ...(body === undefined || method === "GET" || method === "HEAD" ? {} : { body }), signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new ApiError(502, `HTTP 集成失败: ${response.status}`);
  const text = await response.text();
  let parsed: Json = null;
  try { parsed = text ? JSON.parse(text) as Json : null; } catch { parsed = text; }
  if (!config.aftJs) return null;
  try { return jsonSchema.parse(runScript(String(config.aftJs), { ctx, rsp: parsed }, ["ctx", "rsp"]) ?? null); } catch { return null; }
}
