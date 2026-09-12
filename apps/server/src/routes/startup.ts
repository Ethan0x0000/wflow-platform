import { randomUUID } from "node:crypto";
import { ApiError, array, decode, object } from "../models.js";
import { editorNodes, forecast } from "../views.js";
import { NOT_HANDLED, body, draftSchema, idSchema, page, type RouteContext } from "./shared.js";

export async function startupRoutes(context: RouteContext): Promise<unknown> {
  const { path, method, query, user, request, models, store, permUser, runtime } = context;
  if (path.startsWith("/startup/model/")) {
    const [, , , code, version] = path.split("/");
    const published = models.published(idSchema.parse(code), version && version !== "undefined" && version !== "null" ? Number(version) : undefined).model;
    if (!models.canStart(models.get(published.code), permUser)) throw new ApiError(403, "不可发起该流程");
    const root = editorNodes(published).find((node) => node.type === "Start");
    return { ...published, enableAgent: object(decode(published.setting)).enableAgent === true,
      fieldPermMap: Object.fromEntries(array(object(root?.props).formPerms).map((p) => { const field = object(p); return [String(field.key), field.perm]; })) };
  }
  if (path.startsWith("/startup/forecast") && method === "POST") {
    const input = object(await body(request));
    const specified = path.split("/")[3];
    const model = specified ? models.published(specified, Number(path.split("/")[4]) || undefined).model : models.list().find((m) => m.defineId === input.defineId || m.code === input.code);
    if (!model) throw new ApiError(404, "流程模型不存在");
    if (!models.canStart(model, permUser)) throw new ApiError(403, "不可发起该流程");
    return forecast(runtime, model, user, object(input.formData));
  }
  if (path === "/startup/draft") {
    if (method === "GET") return page(store.list("draft", draftSchema).filter((d) => d.userId === user.id).map((d) => ({ ...models.get(d.code), ...d.data, id: d.id, createTime: d.createTime, formData: JSON.stringify(d.data.formData ?? {}) })), query);
    if (method === "POST") {
      const input = object(await body(request)); const id = typeof input.id === "string" ? input.id : randomUUID();
      const old = store.get("draft", id, draftSchema); if (old && old.userId !== user.id) throw new ApiError(403, "无权修改草稿");
      const model = models.list().find((m) => m.code === input.code || m.defineId === input.defineId); if (!model) throw new ApiError(404, "流程不存在");
      store.put("draft", id, { id, userId: user.id, code: model.code, createTime: new Date().toISOString(), data: { ...input, formData: object(decode(input.formData ?? {})), processData: object(decode(input.processData ?? {})) } }); return id;
    }
  }
  if (path.startsWith("/startup/draft/") && method === "DELETE") {
    const id = path.split("/").at(-1)!; const draft = store.get("draft", id, draftSchema);
    if (!draft || draft.userId !== user.id) throw new ApiError(404, "草稿不存在"); store.delete("draft", id); return "已删除";
  }
  return NOT_HANDLED;
}
