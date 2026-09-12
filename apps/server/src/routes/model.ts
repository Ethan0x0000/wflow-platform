import { randomUUID } from "node:crypto";
import { z } from "zod";
import { compileScript } from "wflow-core";
import type { ModelListItem, ModelVersionRow } from "@wflow/api-contract";
import { ApiError, array, decode, formFieldDataOf, groupSchema, modelSchema, object, publishedSchema } from "../models.js";
import { assertNoHandoverLock } from "../handover.js";
import { NOT_HANDLED, admin, body, idSchema, page, required, type RouteContext } from "./shared.js";

export async function modelRoutes(context: RouteContext): Promise<unknown> {
  const { path, method, query, user, request, models, store, permUser, runtime } = context;
  if (path.startsWith("/model")) {
    if (path.startsWith("/model/group/items")) {
      return store.list("group", groupSchema).sort((a, b) => a.sort - b.sort).map((group) => ({ ...group, items: models.list().filter((m) => m.groupId === group.id && (!path.endsWith("byUser") || models.canStart(m, permUser))).map((m): ModelListItem => ({ ...m, hasManagePerm: models.canManage(m, permUser, user.admin), updateTime: m.createTime })) }));
    }
    if (path === "/model/group") {
      if (method === "GET") return store.list("group", groupSchema).sort((a, b) => a.sort - b.sort);
      admin(user);
      if (method === "POST") { const group = groupSchema.parse({ id: randomUUID(), name: query.get("name"), sort: store.list("group", groupSchema).length }); store.put("group", group.id, group); return group.id; }
      if (method === "DELETE") { const id = required(query, "groupId"); if (models.list().some((m) => m.groupId === id)) throw new ApiError(409, "分组不为空，不允许直接删除"); store.delete("group", id); return "已删除"; }
    }
    if (path === "/model/group/name" && method === "PUT") {
      admin(user);
      const group = store.get("group", required(query, "groupId"), groupSchema); if (!group) throw new ApiError(404, "分组不存在");
      store.put("group", group.id, groupSchema.parse({ ...group, name: query.get("name") })); return "已更新";
    }
    if (path === "/model/group/move" && method === "PUT") {
      admin(user);
      const model = models.list().find((m) => m.id === required(query, "modelId")); if (!model) throw new ApiError(404, "模型不存在");
      const groupId = required(query, "groupId"); if (!store.get("group", groupId, groupSchema)) throw new ApiError(404, "分组不存在");
      store.put("model", model.code, { ...model, groupId }); return "已移动";
    }
    if ((path === "/model/group/sort" || path.startsWith("/model/sort/")) && method === "PUT") {
      admin(user);
      const ids = z.array(idSchema).max(1000).parse(await body(request));
      store.transaction(() => ids.forEach((id, index) => {
        const sort = index + 1;
        if (path === "/model/group/sort") { const group = store.get("group", id, groupSchema); if (!group) throw new ApiError(404, "分组不存在"); store.put("group", id, { ...group, sort }); }
        else { const model = models.get(id); if (model.groupId !== path.split("/").at(-1)) throw new ApiError(409, "分组不匹配"); store.put("model", id, { ...model, sort }); }
      })); return "已排序";
    }
    if (path === "/model/save" && method === "POST") {
      assertNoHandoverLock(store);
      const input = object(await body(request));
      if (typeof input.code === "string" && input.code && store.get("model", input.code, modelSchema) && !models.canManage(models.get(input.code), permUser, user.admin)) throw new ApiError(403, "无本流程模型编辑权限");
      return models.save(input).code;
    }
    if (path === "/model/update" && method === "POST") {
      assertNoHandoverLock(store);
      const input = object(await body(request)), target = models.get(String(input.code ?? ""));
      if (!models.canManage(target, permUser, user.admin)) throw new ApiError(403, "无本流程模型编辑权限");
      return models.updateInfo(input);
    }
    if (path === "/model/deploy" && method === "POST") {
      assertNoHandoverLock(store);
      const model = models.get(required(query, "code"));
      if (!models.canManage(model, permUser, user.admin)) throw new ApiError(403, "无本流程模型编辑权限");
      models.deploy(model.code); return "发布成功";
    }
    if (path === "/model" && method === "GET") { const model = models.get(required(query, "code")); return { ...model, lastVersion: model.version }; }
    if (path === "/model/ver") return models.published(required(query, "code"), Number(required(query, "ver"))).model;
    if (path === "/model/his/ver") {
      // Java getHisModelsPage: all version rows including the undeployed draft, newest first.
      const code = required(query, "code"), current = models.get(code);
      const rows: ModelVersionRow[] = store.list("version", publishedSchema).filter((v) => v.model.code === code).map((v) => ({ id: v.model.id, defineId: v.model.defineId, procName: v.model.procName, version: v.model.version, status: v.model.status, createTime: v.model.createTime }));
      if (!rows.some((row) => row.version === current.version)) rows.push({ id: current.id, defineId: current.defineId, procName: current.procName, version: current.version, status: current.status, createTime: current.createTime });
      return page(rows.sort((a, b) => b.version - a.version), query);
    }
    if (path.startsWith("/model/active/") && method === "PUT") {
      const id = path.split("/").at(-1)!;
      const version = store.list("version", publishedSchema).find((v) => v.model.id === id);
      if (!version) throw new ApiError(404, "版本不存在");
      if (!models.canManage(version.model, permUser, user.admin)) throw new ApiError(403, "无本流程模型编辑权限");
      if (version.model.status === 1) throw new ApiError(409, "该版本已激活，请刷新数据");
      store.transaction(() => {
        for (const snapshot of store.list("version", publishedSchema).filter((v) => v.model.code === version.model.code && v.model.status === 1)) store.put("version", `${snapshot.model.code}:${snapshot.model.version}`, { ...snapshot, model: { ...snapshot.model, status: 2 } });
        store.put("version", `${version.model.code}:${version.model.version}`, { ...version, model: { ...version.model, status: 1 } });
        store.put("model", version.model.code, { ...version.model, status: 1 });
      });
      return "切换成功";
    }
    if (path === "/model/enable" && method === "PUT") {
      const model = models.get(required(query, "code"));
      if (!models.canManage(model, permUser, user.admin)) throw new ApiError(403, "无本流程模型编辑权限");
      const status = z.enum(["true", "false", "1", "0"]).transform((value) => value === "true" || value === "1").parse(query.get('status'));
      const versions = store.list("version", publishedSchema).filter((v) => v.model.code === model.code);
      const activeVersion = versions.find((v) => v.model.status === 1);
      if (status) {
        if (activeVersion) throw new ApiError(409, "该流程早已启用");
        if (!versions.length) throw new ApiError(409, "该流程还未发布，无法启用");
        store.transaction(() => {
          const latest = versions.reduce((left, right) => right.model.version > left.model.version ? right : left);
          store.put("version", `${model.code}:${latest.model.version}`, { ...latest, model: { ...latest.model, status: 1 } });
          store.put("model", model.code, { ...model, status: 1, version: latest.model.version });
        });
        return "启用成功";
      }
      if (!activeVersion) throw new ApiError(409, "该流程未启用");
      store.transaction(() => {
        for (const snapshot of versions) if (snapshot.model.status >= 0) store.put("version", `${model.code}:${snapshot.model.version}`, { ...snapshot, model: { ...snapshot.model, status: 2 } });
        store.put("model", model.code, { ...model, status: 0 });
      });
      return "模型已停用";
    }
    if (path === "/model/copy" && method === "POST") {
      const original = models.get(required(query, "code"));
      if (!models.canManage(original, permUser, user.admin)) throw new ApiError(403, "无本流程模型编辑权限");
      // Java copyModel: WF<objectId> code, version=1, DISABLED, perms cleared.
      models.save({ ...original, code: `WF${randomUUID().replace(/-/g, '').slice(0, 24)}`, id: null, procName: required(query, "name"), version: 1, status: 0, defineId: null,
        startupRange: "ALL", startupPerm: [], adminPerm: [] });
      return "复制成功";
    }
    if (/^\/model\/[^/]+$/.test(path) && method === "DELETE") {
      const model = models.get(path.split('/').at(-1)!);
      if (!models.canManage(model, permUser, user.admin)) throw new ApiError(403, "无本流程模型编辑权限");
      const defineId = query.get("defineId");
      // Java deleteModel: delModelVer cascades deployment data (instances) before the rows go away.
      const removed: string[] = [];
      if (defineId) {
        const version = store.list("version", publishedSchema).find((v) => v.model.code === model.code && v.model.defineId === defineId);
        if (!version) throw new ApiError(404, "版本不存在");
        store.delete("version", `${model.code}:${version.model.version}`);
        if (model.defineId === defineId) store.delete("model", model.code);
        removed.push(defineId);
      } else {
        for (const version of store.list("version", publishedSchema).filter((v) => v.model.code === model.code)) { store.delete("version", `${model.code}:${version.model.version}`); removed.push(version.model.defineId); }
        store.delete("model", model.code);
      }
      for (const instance of runtime.instances().filter((entry) => removed.includes(entry.model.defineId))) { try { await runtime.deleteInstance(instance.id); } catch { /* instance may already be purged */ } }
      return "删除模型成功";
    }
    if (path.startsWith('/model/print/conf/')) {
      const published = store.list('version', publishedSchema).find((v) => v.model.defineId === path.split('/').at(-1));
      if (!published) throw new ApiError(404, '版本不存在');
      const conf = object(object(decode(published.model.setting)).print);
      // Java getPrintTemplate returns ProcSetting.PrintRule directly: `template` is the stored
      // JSON string, returned as-is (the client runs JSON.parse once). Only stringify objects.
      const template = typeof conf.template === 'string' ? conf.template : conf.template == null ? null : JSON.stringify(conf.template);
      return { type: conf.type ?? 'DEFAULT', template };
    }
    if (path.startsWith("/model/formFields/by/")) return formFieldDataOf(models.published(path.split("/").at(-1)!).model);
    if (path === "/model/formFields") { const model = models.published(required(query, "code"), query.has("ver") ? Number(query.get("ver")) : undefined).model; return { formType: model.formType, formJson: model.formJson, formFields: formFieldDataOf(model) }; }
    if (path === "/model/el/validate") {
      const el = query.get("el") ?? "";
      try { compileScript("EL", el); return "表达式校验成功"; } catch { throw new ApiError(400, "表达式语法错误"); }
    }
    if (path === "/model/el/validate/list" && method === "POST") {
      // Java returns the expressions that failed to parse.
      const list = array(await body(request));
      return list.filter((item) => {
        try { compileScript("EL", String(item)); return false; } catch { return true; }
      });
    }
  }
  return NOT_HANDLED;
}
