import { randomUUID } from "node:crypto";
import { agentSchema, validateAgent } from "../assignment-policy.js";
import { ApiError, object } from "../models.js";
import { getUser } from "../runtime.js";
import { NOT_HANDLED, body, idSchema, page, type RouteContext } from "./shared.js";

export async function agentRoutes(context: RouteContext): Promise<unknown> {
  const { path, method, query, user, request, store } = context;
  if (path === '/handover') {
    if (method === 'GET') return page(store.list('agent', agentSchema).filter((rule) => rule.userId === user.id).map((rule) => ({ id: rule.id, target: rule.target, scope: rule.scope, timeRange: rule.timeRange, reason: rule.reason })), query);
    if (method === 'POST' || method === 'PUT') {
      const raw = object(await body(request));
      if (method === 'PUT') {
        const current = store.get('agent', typeof raw.id === 'string' ? raw.id : '', agentSchema);
        if (!current || current.userId !== user.id) throw new ApiError(404, '该代理设置已不存在');
        // FlowHandoverServiceImpl.updateProcAgent: delete first, then insert the new rule.
        store.delete('agent', current.id);
      }
      const rule = validateAgent(store, { ...raw, id: randomUUID(), userId: user.id, target: getUser(idSchema.parse(object(raw.target).id)) });
      store.put('agent', rule.id, rule);
      return method === 'POST' ? '新增代理规则成功' : '修改成功';
    }
  }
  if (path.startsWith('/handover/') && method === 'DELETE') {
    const id = path.split('/').at(-1)!, rule = store.get('agent', id, agentSchema);
    if (!rule || rule.userId !== user.id) throw new ApiError(404, '该代理设置已不存在');
    store.delete('agent', id); return '删除成功';
  }
  return NOT_HANDLED;
}
