import { z } from 'zod';
import { WorkflowStore } from './store';
import { ApiError } from './models';

export const personSchema = z.object({ id: z.string().min(1), name: z.string().default(''), avatar: z.string().default('') });
export const scopeSchema = z.array(z.string().min(1)).min(1).nullable();
export const agentSchema = z.object({ id: z.string(), userId: z.string(), target: personSchema, scope: scopeSchema, timeRange: z.tuple([z.string(), z.string()]), reason: z.string().max(500).default('') });
export type Agent = z.infer<typeof agentSchema>;

function effective(rule: Agent, now: number): boolean {
  const start = Date.parse(rule.timeRange[0]), end = Date.parse(rule.timeRange[1]);
  return Number.isFinite(start) && Number.isFinite(end) && start <= now && now <= end;
}

/** FlowHandoverServiceImpl.getUserAgent: global rule first, then the process-specific one. */
export function agentFor(store: WorkflowStore, userId: string, code: string | null, now = Date.now()): Agent | undefined {
  const rules = store.list('agent', agentSchema).filter((rule) => rule.userId === userId && effective(rule, now));
  const global = rules.findLast((rule) => rule.scope === null);
  return global ?? (code === null ? undefined : rules.findLast((rule) => rule.scope?.includes(code)));
}

// FlowHandoverServiceImpl.checkRepeatTimeRange(byCache=true): an effective global rule blocks everything,
// an effective same-process rule blocks that process. Pending/expired rules never block.
export function validateAgent(store: WorkflowStore, raw: unknown): Agent {
  const rule = agentSchema.parse(raw);
  const now = Date.now();
  const global = (): boolean => store.list('agent', agentSchema).some((other) => other.id !== rule.id && other.userId === rule.userId && other.scope === null && effective(other, now));
  if (!rule.scope) {
    if (global()) throw new ApiError(409, '所有流程已被全局设置，无法变更');
    return rule;
  }
  for (const code of rule.scope) {
    if (global() || store.list('agent', agentSchema).some((other) => other.id !== rule.id && other.userId === rule.userId && effective(other, now) && other.scope?.includes(code))) {
      throw new ApiError(409, `流程${code}已被全局设置，无法变更`);
    }
  }
  return rule;
}

/** ProcAgent taskCreate replacement: swap the original handler for their effective agent. */
export function mapUser(store: WorkflowStore, userId: string, code: string): string {
  return agentFor(store, userId, code)?.target.id ?? userId;
}
