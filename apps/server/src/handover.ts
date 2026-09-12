import { z } from 'zod';
import { importWflowDefinition, importWflowProcessEvents, parseDefinition, type Json } from 'wflow-core';
import { ApiError, type Model } from './models.js';
import { modelSchema, publishedSchema, decode, fieldsOf } from './models.js';
import { WorkflowStore } from './store.js';
import { executeCommand, getUser, type Runtime } from './runtime.js';
import { personSchema, scopeSchema } from './assignment-policy.js';

export const failedModelSchema = z.object({ id: z.string(), code: z.string(), name: z.string(), version: z.number().int(), error: z.string() });
export type FailedModel = z.infer<typeof failedModelSchema>;
// status: 0-待执行 1-交接中 2-交接完成 3-部分交接失败（Java WorkHandoverVo）
export const handoverSchema = z.object({
  id: z.string(), source: personSchema, target: personSchema, scope: scopeSchema, reason: z.string().max(500).default(''),
  status: z.number().int().min(0).max(3), createTime: z.string(), updateTime: z.string().nullable().default(null),
  activatedTime: z.string().nullable().default(null), activatedBy: personSchema.nullable().default(null),
  failedModels: z.array(failedModelSchema).nullable().default(null),
});
export type Handover = z.infer<typeof handoverSchema>;

const lockSchema = z.object({ value: z.string(), expires: z.number() });
const LOCK_KEY = 'work-handover';
/** WflowPublicConst.LOCK_KEY_WORK_HANDOVER + HandoverLockUtil: a globally exclusive lock with a 3600s TTL. */
export function handoverLock(store: WorkflowStore): string | null {
  const row = store.get('lock', LOCK_KEY, lockSchema);
  if (!row || row.expires < Date.now()) return null;
  return row.value;
}
export function assertNoHandoverLock(store: WorkflowStore): void {
  if (handoverLock(store)) throw new ApiError(409, '系统正在执行工作交接，暂时无法操作，请稍后重试');
}
export function acquireHandoverLock(store: WorkflowStore, handoverId: string): boolean {
  if (handoverLock(store)) return false;
  store.put('lock', LOCK_KEY, { value: `WORK_HANDOVER_IN_PROGRESS:${handoverId}`, expires: Date.now() + 3_600_000 });
  return true;
}
export function releaseHandoverLock(store: WorkflowStore): void {
  store.delete('lock', LOCK_KEY);
}

type TargetUser = { id: string; name: string; avatar: string };

// WorkHandoverServiceImpl.handleUserArray: replace {type:'user',id:source} inside an array,
// deduplicating when the target is already present.
function replaceUserArray(items: Json[], sourceId: string, target: TargetUser): void {
  let targetExists = false;
  const sourceIndexes: number[] = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const entry = item as Record<string, Json>;
    if (entry.type !== 'user' || typeof entry.id !== 'string') continue;
    if (entry.id === target.id) targetExists = true;
    if (entry.id === sourceId) sourceIndexes.push(index);
  }
  for (const index of sourceIndexes.reverse()) {
    if (targetExists) { items.splice(index, 1); continue; }
    items[index] = { id: target.id, name: target.name, type: 'user', avatar: target.avatar };
    targetExists = true;
  }
}
function traverseAndReplace(node: Json, sourceId: string, target: TargetUser): void {
  if (Array.isArray(node)) {
    replaceUserArray(node, sourceId, target);
    for (const item of node) traverseAndReplace(item, sourceId, target);
  } else if (node && typeof node === 'object') {
    for (const value of Object.values(node)) traverseAndReplace(value, sourceId, target);
  }
}
// Java updateSingleModel: process is traversed recursively, startupPerm/adminPerm only as JSON arrays.
function rewriteModel(model: Model, sourceId: string, target: TargetUser): boolean {
  let changed = false;
  const rewrite = (json: string, recursive: boolean): string => {
    const root = JSON.parse(json) as Json;
    if (recursive) traverseAndReplace(root, sourceId, target);
    else if (Array.isArray(root)) replaceUserArray(root, sourceId, target);
    return JSON.stringify(root);
  };
  if (model.process) {
    const updated = rewrite(model.process, true);
    if (updated !== model.process) { model.process = updated; changed = true; }
  }
  for (const key of ['startupPerm', 'adminPerm'] as const) {
    if (!model[key]) continue;
    try {
      const parsed: Json = JSON.parse(model[key]);
      if (!Array.isArray(parsed)) continue;
      replaceUserArray(parsed, sourceId, target);
      const updated = JSON.stringify(parsed);
      if (updated !== model[key]) { model[key] = updated; changed = true; }
    } catch { throw new Error(`模型[${model.code}] ${key} 解析失败`); }
  }
  return changed;
}
// Rebuild a published definition snapshot so runtime assignment resolves the new handler immediately.
function rebuildDefinition(published: { model: Model; definition: unknown }) {
  const { model } = published;
  const base = importWflowDefinition({ id: model.code, version: model.version, name: model.procName, nodes: decode(model.process), fields: fieldsOf(model) });
  const events = importWflowProcessEvents(decode(model.events));
  return events ? parseDefinition({ ...base, events }) : base;
}

/** WorkHandoverServiceImpl.updateProcessDefinitionsWithRetry: rewrite every model version, retrying once. */
export function rewriteModelUsers(store: WorkflowStore, sourceId: string, target: TargetUser): FailedModel[] {
  const failed: FailedModel[] = [];
  for (const model of store.list('model', modelSchema)) {
    try { if (rewriteModel(model, sourceId, target)) store.put('model', model.code, model); }
    catch (error) {
      // second round: re-read the row and retry once
      try {
        const latest = store.get('model', model.code, modelSchema);
        if (latest && rewriteModel(latest, sourceId, target)) store.put('model', latest.code, latest);
      } catch (retry) {
        failed.push({ id: model.id, code: model.code, name: model.procName, version: model.version, error: retry instanceof Error ? retry.message : String(retry) });
      }
    }
  }
  for (const published of store.list('version', publishedSchema)) {
    try {
      if (!rewriteModel(published.model, sourceId, target)) continue;
      store.put('version', `${published.model.code}:${published.model.version}`, { model: published.model, definition: rebuildDefinition(published) });
    } catch (error) {
      failed.push({ id: published.model.id, code: published.model.code, name: published.model.procName, version: published.model.version, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return failed;
}

function pendingForHandover(task: { status: string; mode: string; assignees: string[]; candidates: string[]; approved: string[]; additions?: { userId: string; ownerId: string; completed: boolean }[] }, sourceId: string): boolean {
  if (task.status !== 'pending') return false;
  if (task.assignees.includes(sourceId) && !task.approved.includes(sourceId)) return true;
  if (task.mode === 'candidate' && task.assignees.length === 0 && task.candidates.includes(sourceId)) return true;
  return (task.additions ?? []).some((addition) => !addition.completed && (addition.userId === sourceId || addition.ownerId === sourceId));
}

/** WorkHandoverServiceImpl.executeHandover: transfer pending tasks, rewrite definitions, then report the result. */
export async function runHandover(runtime: Runtime, id: string): Promise<void> {
  const store = runtime.store;
  try {
    const record = store.get('handover', id, handoverSchema);
    if (!record) return;
    for (const instance of runtime.instances().filter((item) => !record.scope || record.scope.includes(item.code))) {
      let snapshot;
      try { snapshot = await runtime.snapshot(instance); } catch { continue; }
      for (const task of snapshot.tasks.filter((candidate) => pendingForHandover(candidate, record.source.id))) {
        try {
          await executeCommand(runtime, {
            type: 'reassign', requestId: `${record.id}:${task.id}`, tenantId: runtime.tenant, instanceId: instance.id, taskId: task.id,
            actorId: record.source.id, fromUserId: record.source.id, userId: record.target.id,
          });
        } catch { /* task already reassigned or closed; keep transferring the rest */ }
      }
    }
    const failedModels = rewriteModelUsers(store, record.source.id, record.target);
    const now = new Date().toISOString();
    record.updateTime = now;
    record.activatedTime = now;
    record.failedModels = failedModels.length ? failedModels : null;
    record.status = failedModels.length ? 3 : 2;
    store.put('handover', id, record);
  } catch {
    const current = store.get('handover', id, handoverSchema);
    if (current) { current.status = 3; current.updateTime = new Date().toISOString(); store.put('handover', id, current); }
  } finally {
    releaseHandoverLock(store);
  }
}

/** WorkHandoverServiceImpl.activateHandover/retryHandover: mark running, then execute asynchronously. */
export function startHandover(runtime: Runtime, id: string, activatedBy: string): void {
  const record = runtime.store.get('handover', id, handoverSchema);
  if (!record) throw new ApiError(404, '工作交接记录不存在');
  record.status = 1;
  record.activatedBy = getUser(activatedBy);
  record.updateTime = new Date().toISOString();
  runtime.store.put('handover', id, record);
  void runHandover(runtime, id);
}
