import { actionableUsers, type Snapshot, type WorkflowEvent } from "wflow-core";
import { array } from "../models.js";
import { row } from "../views.js";
import type { Runtime, StoredInstance } from "../runtime.js";

export interface InstanceView { instance: StoredInstance; snapshot: Snapshot; events: WorkflowEvent[]; }

export async function instanceViews(runtime: Runtime): Promise<InstanceView[]> {
  const instances = runtime.instances();
  return Promise.all(instances.map(async (instance) => ({ instance, snapshot: await runtime.snapshot(instance), events: runtime.store.events(instance.id) })));
}
export function todoRows(runtime: Runtime, all: InstanceView[], userId: string): ReturnType<typeof row>[] {
  return all.flatMap(({ instance, snapshot }) => snapshot.tasks.filter((t) => actionableUsers(t).includes(userId) || (t.mode === "candidate" && !t.assignees.length && t.candidates.includes(userId))).map((task) => row(runtime, instance, snapshot, task)));
}
// Java selectInstPage: 提交列表按 initiator OR submitter，计数只按 initiator。
export function submittedRows(runtime: Runtime, all: InstanceView[], userId: string): ReturnType<typeof row>[] {
  return all.filter(({ instance }) => instance.initiator.id === userId || instance.submitter?.id === userId).map(({ instance, snapshot }) => row(runtime, instance, snapshot));
}
export function ccRows(runtime: Runtime, all: InstanceView[], userId: string): ReturnType<typeof row>[] {
  return all.filter(({ events }) => events.some((e) => e.eventType === "workflow.cc" && array(e.details.recipients).includes(userId))).map(({ instance, snapshot }) => row(runtime, instance, snapshot));
}
export const byCreateDesc = <T extends { createTime: string }>(list: T[]): T[] => list.sort((a, b) => Date.parse(b.createTime) - Date.parse(a.createTime));
