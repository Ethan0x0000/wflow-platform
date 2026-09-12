import { randomUUID } from "node:crypto";
import { ApiError, object } from "../models.js";
import { acquireHandoverLock, handoverSchema, startHandover } from "../handover.js";
import { getUser } from "../runtime.js";
import { NOT_HANDLED, body, idSchema, page, type RouteContext } from "./shared.js";

export async function handoverRoutes(context: RouteContext): Promise<unknown> {
  const { path, method, query, user, request, store, runtime } = context;
  if (path.startsWith('/work-handover')) {
    if (path === '/work-handover' && method === 'GET') {
      const all = query.get('all') === 'true';
      return page(store.list('handover', handoverSchema).filter((record) => all || record.source.id === user.id).reverse(), query);
    }
    if (path === '/work-handover' && method === 'POST') {
      const raw = object(await body(request)), id = randomUUID();
      const source = getUser(idSchema.parse(object(raw.source).id)), target = getUser(idSchema.parse(object(raw.target).id));
      if (source.id === target.id) throw new ApiError(422, '交接人和接替人不能相同');
      const record = handoverSchema.parse({ ...raw, id, source, target, scope: Array.isArray(raw.scope) ? raw.scope : null, status: 0, createTime: new Date().toISOString() });
      store.put('handover', id, record); return '创建工作交接记录成功';
    }
    const id = path.split('/').at(-1)!, record = store.get('handover', id, handoverSchema);
    if (!record) throw new ApiError(404, '工作交接记录不存在');
    if (method === 'DELETE') {
      if (record.status === 1) throw new ApiError(409, '交接任务执行中，不允许删除');
      store.delete('handover', id); return '删除成功';
    }
    if (method === 'PUT' && path.includes('/activate/')) {
      if (record.status !== 0) throw new ApiError(409, '该工作交接记录已生效，无法重复生效');
      if (!acquireHandoverLock(store, id)) throw new ApiError(409, '系统正在执行其他交接任务，请稍后重试');
      startHandover(runtime, id, user.id);
      return '工作交接生效成功';
    }
    if (method === 'PUT' && path.includes('/retry/')) {
      if (record.status !== 3) throw new ApiError(409, '当前交接任务状态不允许重试');
      if (!acquireHandoverLock(store, id)) throw new ApiError(409, '系统正在执行其他交接任务，请稍后重试');
      startHandover(runtime, id, user.id);
      return '已开始重新执行交接任务';
    }
  }
  return NOT_HANDLED;
}
