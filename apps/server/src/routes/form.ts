import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError, object } from "../models.js";
import { getUser } from "../runtime.js";
import { NOT_HANDLED, admin, body, componentSchema, idSchema, page, required, type RouteContext } from "./shared.js";

const sfcValue = (value: unknown): string => typeof value === "string" ? value : JSON.stringify(value ?? "");

export async function formRoutes(context: RouteContext): Promise<unknown> {
  const { path, method, query, user, request, forms, store, permUser } = context;
  if (path === '/form/component/list' && method === 'GET') {
    admin(user);
    const name = query.get('name')?.toLowerCase() ?? '', active = query.has('active') ? query.get('active') === 'true' : undefined;
    const records = store.list('component', componentSchema).filter((component) => (!name || component.name.toLowerCase().includes(name)) && (active === undefined ? component.status >= 0 : component.status === (active ? 1 : 0)));
    return page(records, query, { pageSize: 50 });
  }
  if (path.startsWith('/form/component/type/') && method === 'GET') {
    admin(user); const type = path.split('/').at(-1)!; const component = store.list('component', componentSchema).find((item) => item.type === type && item.status >= 0);
    if (!component) throw new ApiError(404, '表单组件不存在'); return component;
  }
  if (path.startsWith('/form/component/') && method === 'GET') {
    admin(user); const id = path.split('/').at(-1)!; const component = store.get('component', id, componentSchema);
    if (!component) throw new ApiError(404, '表单组件不存在'); return component;
  }
  if (path === '/form/component' && method === 'POST') {
    admin(user);
    const input = object(await body(request));
    if (typeof input.id === 'string' && input.id) {
      if (typeof input.type !== 'string' || !input.type) throw new ApiError(422, '缺少必要字段');
      const current = store.get('component', input.id, componentSchema);
      if (!current) throw new ApiError(404, '表单组件不存在');
      if (sfcValue(current.sfc) !== sfcValue(input.sfc ?? '')) {
        // Java saveFormComponent: changed sfc opens a new version and expires the old row.
        const nextId = randomUUID();
        const next = componentSchema.parse({ ...current, name: input.name ?? current.name, type: current.type, valueType: input.valueType ?? current.valueType, icon: input.icon ?? current.icon,
          sfc: input.sfc ?? current.sfc, configSfc: input.configSfc ?? current.configSfc, id: nextId, version: current.version + 1, creator: user.id, status: current.status, createTime: new Date().toISOString() });
        store.transaction(() => { store.put('component', current.id, { ...current, status: -1 }); store.put('component', nextId, next); });
      } else {
        store.put('component', input.id, componentSchema.parse({ ...current, ...input, id: input.id, type: current.type, version: current.version, creator: current.creator, status: current.status, createTime: current.createTime }));
      }
      return '保存组件成功';
    }
    const id = randomUUID();
    const component = componentSchema.parse({ id, name: input.name, type: randomUUID().replace(/-/g, '').slice(0, 16), valueType: input.valueType, icon: input.icon ?? '', sfc: input.sfc ?? '', configSfc: input.configSfc ?? null, version: 1, creator: user.id, status: 0, createTime: new Date().toISOString() });
    store.put('component', id, component); return '保存组件成功';
  }
  if ((path.startsWith('/form/component/publish/') || path.startsWith('/form/component/disable/')) && method === 'PUT') {
    admin(user);
    const id = path.split('/').at(-1)!; const component = store.get('component', id, componentSchema);
    if (!component) throw new ApiError(404, '表单组件不存在');
    if (path.includes('/publish/')) {
      // Java publishFormComponent: the published row is ACTIVATED, every other version EXPIRED.
      store.transaction(() => {
        for (const other of store.list('component', componentSchema).filter((item) => item.type === component.type && item.id !== id)) store.put('component', other.id, { ...other, status: -1 });
        store.put('component', id, { ...component, status: 1 });
      });
      return '发布组件成功';
    }
    component.status = 0; store.put('component', id, component); return '禁用组件成功';
  }
  if (path.startsWith("/form/model")) {
    const manage = (code: string) => forms.canAdmin(code, permUser, user.admin);
    if (path === "/form/model/group") {
      if (method === "GET") return forms.groups(false, undefined);
      if (method === "POST") { forms.createGroup(required(query, "name")); return "创建分组成功"; }
      if (method === "DELETE") { forms.deleteGroup(required(query, "groupId")); return "删除分组成功"; }
    }
    if (path === "/form/model/group/name" && method === "PUT") { forms.renameGroup(required(query, "groupId"), required(query, "name")); return "修改成功"; }
    if (path === "/form/model/group/sort" && method === "PUT") { forms.sortGroups(z.array(idSchema).max(1000).parse(await body(request))); return "排序成功"; }
    if (path === "/form/model/group/items") return forms.groups(true, query.get("formName") ?? undefined, (model) => manage(model.code));
    if (path.startsWith("/form/model/sort/") && method === "PUT") { forms.sortModels(path.split("/").at(-1)!, z.array(idSchema).max(1000).parse(await body(request))); return "排序成功"; }
    if (path === "/form/model/save" && method === "POST") return forms.save(await body(request), permUser, user.admin);
    if (path === "/form/model" && method === "GET") {
      const model = forms.detailByCode(required(query, "code"));
      if (!model) throw new ApiError(404, "没有找到该表单模型");
      return { ...model, lastVersion: forms.draftVersion(model.code) };
    }
    if (path === "/form/model/ver" && method === "GET") {
      const ver = query.get("ver");
      const model = forms.byVer(required(query, "code"), ver === null || ver === "" ? undefined : Number(ver));
      return { ...model, lastVersion: forms.draftVersion(model.code) };
    }
    if (path === "/form/model/his/ver" && method === "GET") return page(forms.hisVersions(required(query, "code")), query);
    if (path === "/form/model/publish" && method === "POST") { forms.publish(required(query, "code"), permUser, user.admin); return "发布成功"; }
    if (path === "/form/model/update" && method === "POST") { forms.updateInfo(await body(request), permUser, user.admin); return "更新成功"; }
    if (path.startsWith("/form/model/active/") && method === "PUT") { forms.activate(path.split("/").at(-1)!, permUser, user.admin); return "切换成功"; }
    if (path === "/form/model/enable" && method === "PUT") {
      const status = z.enum(["true", "false"]).parse(query.get("status"));
      forms.enable(required(query, "code"), status === "true", permUser, user.admin); return status === "true" ? "启用成功" : "表单模型已停用";
    }
    if (path === "/form/model/copy" && method === "POST") return forms.copy(required(query, "code"), required(query, "name"), permUser);
    if (/^\/form\/model\/[^/]+$/.test(path) && method === "DELETE") { forms.remove(path.split("/").at(-1)!, permUser, user.admin); return "删除表单模型成功"; }
  }
  if (path.startsWith("/form/data")) {
    if (path === "/form/data/group/items") return forms.fillGroups(query.get("formName") ?? undefined, permUser);
    if (path === "/form/data/my/group/items") return forms.myGroups(query.get("formName") ?? undefined, permUser);
    if (path === "/form/data/model") {
      const model = forms.startup(required(query, "code"), permUser);
      return { ...model, lastVersion: forms.draftVersion(model.code) };
    }
    if (path === "/form/data/my/count") return forms.myCount(permUser);
    if (path === "/form/data/my/list") return page(forms.records(query, user.id).map((record) => forms.row(record, getUser)), query);
    if (path === "/form/data/list") return page(forms.records(query).map((record) => forms.row(record, getUser)), query);
    if (path === "/form/data/submit" && method === "POST") {
      const input = object(await body(request));
      forms.submit(idSchema.parse(input.code), z.string().parse(input.content), permUser); return "提交成功";
    }
  }
  return NOT_HANDLED;
}
