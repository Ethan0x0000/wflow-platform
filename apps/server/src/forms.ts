import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Json } from "wflow-core";
import { ApiError, array, decode, groupSchema, matchesPerm, object, type PermUser } from "./models.js";
import { WorkflowStore } from "./store.js";

export const formModelSchema = z.object({
  id: z.string(), code: z.string(), formName: z.string().min(1).max(120), groupId: z.string(),
  version: z.number().int().positive(), status: z.number().int(),
  logo: z.string(), remark: z.string().default(""),
  formKey: z.string().default(""), formType: z.number().int().min(0).max(4), formCode: z.string().default(""),
  formJson: z.string(), formRef: z.string().default(""), formFields: z.string(), setting: z.string(),
  startupRange: z.string().default("ALL"), startupPerm: z.string().default("[]"), adminPerm: z.string().default("[]"),
  sort: z.number().default(0), creator: z.string(), createTime: z.string(), updateTime: z.string(),
});
export type FormModel = z.infer<typeof formModelSchema>;
export const formDataSchema = z.object({
  id: z.string(), code: z.string(), formVersion: z.number().int().positive(), content: z.string(),
  status: z.number().int(), creator: z.string(), createTime: z.string(), updateTime: z.string(),
});
export type FormData = z.infer<typeof formDataSchema>;

const DISABLED = 0, ACTIVATED = 1, EXPIRED = -1;
const stringify = (value: Json | undefined, fallback: string): string => value === undefined ? fallback : JSON.stringify(decode(value));

/** wflow_form_* host projection: standalone form models, versions, permissions and submissions. */
export class Forms {
  constructor(readonly store: WorkflowStore) {}
  private list(): FormModel[] { return this.store.list("formModel", formModelSchema); }
  private byCode(code: string): FormModel[] { return this.list().filter((model) => model.code === code); }
  private last(models: FormModel[], status?: number): FormModel | undefined {
    const filtered = status === undefined ? models : models.filter((model) => model.status === status);
    return filtered.slice().sort((a, b) => b.version - a.version)[0];
  }
  private visible(models: FormModel[]): FormModel | undefined {
    return models.filter((model) => model.status === ACTIVATED).sort((a, b) => b.version - a.version)[0] ?? this.last(models);
  }
  private baseVo(model: FormModel, hasNewVersion: boolean, hasManagePerm?: boolean) {
    return { id: model.id, code: model.code, logo: model.logo, formName: model.formName, groupId: model.groupId,
      version: model.version, status: model.status, remark: model.remark, startupRange: model.startupRange,
      startupPerm: model.startupPerm, adminPerm: model.adminPerm, setting: model.setting, hasNewVersion,
      ...(hasManagePerm === undefined ? {} : { hasManagePerm }), createTime: model.createTime, updateTime: model.updateTime };
  }
  private permUser(user: PermUser | string): PermUser { return typeof user === "string" ? { id: user } : user; }
  // Java validateAdminFormPerm + selectUserHasAdminPermission: blank code or empty adminPerm grants everyone.
  canAdmin(code: string, user: PermUser | string, admin = false): boolean {
    if (!code) return true;
    const model = this.visible(this.byCode(code));
    if (!model) return false;
    return admin || array(decode(model.adminPerm)).length === 0 || matchesPerm(this.permUser(user), array(decode(model.adminPerm)));
  }
  // Java selectUserHasStartupPermission: enabled model, NONE denies, ALL allows, RANGE needs a link.
  canFill(model: FormModel, user: PermUser | string): boolean {
    if (model.status !== ACTIVATED || model.startupRange === "NONE") return false;
    return model.startupRange === "ALL" || matchesPerm(this.permUser(user), array(decode(model.startupPerm)));
  }
  groups(hasModel: boolean, formName: string | undefined, manage?: (model: FormModel) => boolean) {
    const groups = this.store.list("formGroup", groupSchema).sort((a, b) => a.sort - b.sort);
    if (!hasModel) return groups.map((group) => ({ ...group, items: [] }));
    const models = this.list().filter((model) => (model.status === DISABLED || model.status === ACTIVATED) && (!formName || model.formName.includes(formName)));
    const items = [...new Set(models.map((model) => model.code))].map((code) => {
      const versions = models.filter((model) => model.code === code), model = this.visible(versions)!;
      return this.baseVo(model, versions.some((version) => version.status === DISABLED), manage?.(model));
    });
    return groups.map((group) => ({ ...group, items: items.filter((item) => item.groupId === group.id) }));
  }
  fillGroups(formName: string | undefined, user: PermUser | string) {
    const groups = this.store.list("formGroup", groupSchema).sort((a, b) => a.sort - b.sort);
    const models = this.list().filter((model) => model.status === ACTIVATED && (!formName || model.formName.includes(formName)) && this.canFill(model, user));
    return groups.map((group) => ({ ...group, items: models.filter((model) => model.groupId === group.id).map((model) => this.baseVo(model, false)) }));
  }
  myGroups(formName: string | undefined, user: PermUser | string) {
    const groups = this.store.list("formGroup", groupSchema).sort((a, b) => a.sort - b.sort);
    const codes = new Set(this.store.list("formData", formDataSchema).filter((record) => record.creator === this.permUser(user).id).map((record) => record.code));
    const models = this.list().filter((model) => codes.has(model.code) && (!formName || model.formName.includes(formName)));
    const visible = [...codes].map((code) => this.visible(models.filter((model) => model.code === code))).filter((model): model is FormModel => Boolean(model));
    return groups.map((group) => ({ ...group, items: visible.filter((model) => model.groupId === group.id).map((model) => this.baseVo(model, false)) }));
  }
  createGroup(name: string): void {
    if (this.store.list("formGroup", groupSchema).some((group) => group.name === name)) throw new ApiError(422, "分组名已存在，请更换");
    const id = randomUUID(); this.store.put("formGroup", id, { id, name, sort: 1 });
  }
  deleteGroup(id: string): void {
    if (this.list().some((model) => model.groupId === id && model.status >= DISABLED)) throw new ApiError(422, "分组不为空，不允许直接删除");
    this.store.delete("formGroup", id);
  }
  renameGroup(id: string, name: string): void {
    const groups = this.store.list("formGroup", groupSchema);
    if (groups.some((group) => group.name === name)) throw new ApiError(422, "分组名已存在，请更换");
    const group = groups.find((item) => item.id === id);
    if (group) this.store.put("formGroup", id, { ...group, name });
  }
  sortGroups(ids: string[]): void {
    this.store.transaction(() => ids.forEach((id, sort) => { const group = this.store.get("formGroup", id, groupSchema); if (group) this.store.put("formGroup", id, { ...group, sort }); }));
  }
  sortModels(groupId: string, codes: string[]): void {
    this.store.transaction(() => codes.forEach((code, sort) => {
      for (const model of this.byCode(code).filter((item) => item.groupId === groupId && item.status >= DISABLED)) this.store.put("formModel", model.id, { ...model, sort });
    }));
  }
  detailByCode(code: string): FormModel | undefined { return this.visible(this.byCode(code)); }
  byVer(code: string, ver?: number): FormModel {
    const model = ver === undefined ? this.byCode(code).find((item) => item.status === ACTIVATED) : this.byCode(code).find((item) => item.version === ver);
    if (!model) throw new ApiError(404, "表单模型版本不存在或已被删除");
    return model;
  }
  // Java getFormModelLastVer(code, false): highest draft (disabled) version, used as "lastVersion".
  draftVersion(code: string): number | null {
    const models = this.byCode(code).filter((model) => model.status === DISABLED);
    return models.length ? Math.max(...models.map((model) => model.version)) : null;
  }
  startup(code: string, user: PermUser | string): FormModel {
    const model = this.byCode(code).find((item) => item.status === ACTIVATED);
    if (!model) throw new ApiError(404, "表单模型未启用或已被删除");
    if (!this.canFill(model, user)) throw new ApiError(403, "无本表单填报权限");
    return model;
  }
  save(raw: unknown, user: PermUser, admin = false): string {
    const input = object(raw);
    const code = typeof input.code === "string" && input.code ? input.code : `WF${randomUUID().replace(/-/g, "").slice(0, 24)}`;
    if (input.code && !this.canAdmin(code, user, admin)) throw new ApiError(403, "无本表单模型管理权限");
    const versions = this.byCode(code), draft = this.last(versions, DISABLED), latest = this.last(versions);
    const now = new Date().toISOString(), base = draft ?? latest;
    const version = draft?.version ?? (latest?.version ?? 0) + 1;
    const model = formModelSchema.parse({
      id: draft?.id ?? `${code}:${version}`, code, version, status: DISABLED, creator: draft?.creator ?? user.id,
      formName: input.formName ?? base?.formName ?? "", groupId: input.groupId ?? base?.groupId ?? "",
      logo: stringify(input.logo, base?.logo ?? "{}"), remark: typeof input.remark === "string" ? input.remark : base?.remark ?? "",
      formKey: typeof input.formKey === "string" ? input.formKey : base?.formKey ?? "",
      formType: input.formType === undefined ? base?.formType ?? 0 : Number(input.formType),
      formCode: typeof input.formCode === "string" ? input.formCode : base?.formCode ?? "",
      formJson: stringify(input.formJson, base?.formJson ?? '{"components":[]}'),
      formRef: typeof input.formRef === "string" ? input.formRef : base?.formRef ?? "",
      formFields: stringify(input.formFields, base?.formFields ?? "[]"),
      setting: stringify(input.setting, base?.setting ?? "{}"),
      startupRange: typeof input.startupRange === "string" ? input.startupRange : base?.startupRange ?? "ALL",
      startupPerm: stringify(input.startupPerm, base?.startupPerm ?? "[]"),
      adminPerm: stringify(input.adminPerm, base?.adminPerm ?? "[]"),
      sort: input.sort === undefined ? base?.sort ?? 0 : Number(input.sort),
      createTime: draft?.createTime ?? now, updateTime: now,
    });
    this.store.put("formModel", model.id, model);
    return code;
  }
  publish(code: string, user: PermUser, admin = false): void {
    const draft = this.last(this.byCode(code), DISABLED);
    if (!draft) throw new ApiError(404, "表单模型不存在需要发布的版本");
    if (!this.canAdmin(code, user, admin)) throw new ApiError(403, "无本表单模型管理权限");
    this.store.transaction(() => {
      for (const model of this.byCode(code)) this.store.put("formModel", model.id, { ...model, status: model.id === draft.id ? ACTIVATED : model.status === ACTIVATED ? EXPIRED : model.status, updateTime: new Date().toISOString() });
    });
  }
  updateInfo(raw: unknown, user: PermUser, admin = false): void {
    const input = object(raw), code = String(input.code ?? "");
    if (!this.canAdmin(code, user, admin)) throw new ApiError(403, "无本表单模型管理权限");
    const active = this.byCode(code).find((model) => model.status === ACTIVATED);
    if (!active) throw new ApiError(404, "仅可更新已启用的表单模型");
    if (active.id !== String(input.id ?? "")) throw new ApiError(422, "仅可修改当前已启用的表单模型版本");
    this.store.put("formModel", active.id, formModelSchema.parse({ ...active,
      formName: typeof input.formName === "string" ? input.formName : active.formName,
      groupId: typeof input.groupId === "string" ? input.groupId : active.groupId,
      logo: stringify(input.logo, active.logo), remark: typeof input.remark === "string" ? input.remark : active.remark,
      setting: stringify(input.setting, active.setting),
      startupRange: typeof input.startupRange === "string" ? input.startupRange : active.startupRange,
      startupPerm: stringify(input.startupPerm, active.startupPerm), adminPerm: stringify(input.adminPerm, active.adminPerm),
      updateTime: new Date().toISOString(),
    }));
  }
  enable(code: string, status: boolean, user: PermUser, admin = false): void {
    if (status) {
      const draft = this.last(this.byCode(code), DISABLED);
      if (!draft) throw new ApiError(404, "表单模型没有可启用的版本");
      if (!this.canAdmin(code, user, admin)) throw new ApiError(403, "无本表单模型管理权限");
      this.store.transaction(() => {
        for (const model of this.byCode(code)) this.store.put("formModel", model.id, { ...model, status: model.id === draft.id ? ACTIVATED : model.status === ACTIVATED ? EXPIRED : model.status, updateTime: new Date().toISOString() });
      });
      return;
    }
    const active = this.byCode(code).find((model) => model.status === ACTIVATED);
    if (!active) throw new ApiError(404, "表单模型未启用");
    if (!this.canAdmin(code, user, admin)) throw new ApiError(403, "无本表单模型管理权限");
    this.store.put("formModel", active.id, { ...active, status: DISABLED, updateTime: new Date().toISOString() });
  }
  activate(id: string, user: PermUser, admin = false): void {
    const target = this.store.get("formModel", id, formModelSchema);
    if (!target) throw new ApiError(404, "表单模型版本不存在");
    if (target.status === ACTIVATED) throw new ApiError(422, "该版本已激活");
    if (!this.canAdmin(target.code, user, admin)) throw new ApiError(403, "无本表单模型管理权限");
    this.store.transaction(() => {
      for (const model of this.byCode(target.code)) this.store.put("formModel", model.id, { ...model, status: model.id === id ? ACTIVATED : model.status === ACTIVATED ? EXPIRED : model.status, updateTime: new Date().toISOString() });
    });
  }
  remove(code: string, user: PermUser, admin = false): void {
    if (!this.canAdmin(code, user, admin)) throw new ApiError(403, "无本表单模型管理权限");
    this.store.transaction(() => { for (const model of this.byCode(code)) this.store.delete("formModel", model.id); });
  }
  copy(code: string, name: string, user: PermUser): string {
    const source = this.detailByCode(code);
    if (!source) throw new ApiError(404, "表单模型不存在");
    const newCode = `WF${randomUUID().replace(/-/g, "").slice(0, 24)}`, now = new Date().toISOString();
    this.store.put("formModel", `${newCode}:1`, { ...source, id: `${newCode}:1`, code: newCode, formName: name, version: 1, status: DISABLED, creator: user.id, createTime: now, updateTime: now });
    return newCode;
  }
  hisVersions(code: string): Pick<FormModel, "id" | "formName" | "version" | "status" | "createTime">[] {
    return this.byCode(code).sort((a, b) => b.version - a.version).map(({ id, formName, version, status, createTime }) => ({ id, formName, version, status, createTime }));
  }
  submit(code: string, content: string, user: PermUser | string): FormData {
    const model = this.startup(code, user);
    try { JSON.parse(content); } catch { throw new ApiError(422, "表单数据必须是合法JSON"); }
    const now = new Date().toISOString(), record: FormData = { id: randomUUID(), code: model.code, formVersion: model.version, content, status: 0, creator: this.permUser(user).id, createTime: now, updateTime: now };
    this.store.put("formData", record.id, record);
    return record;
  }
  myCount(user: PermUser | string): number {
    return this.store.list("formData", formDataSchema).filter((record) => record.creator === this.permUser(user).id).length;
  }
  records(query: URLSearchParams, creator?: string): FormData[] {
    const range = query.get("startRange")?.split(",").map((part) => Date.parse(part));
    if (range && (range.length !== 2 || range.some((bound) => !Number.isFinite(bound)) || range[0]! > range[1]!)) throw new ApiError(422, "时间范围不合法");
    return this.store.list("formData", formDataSchema)
      .filter((record) => (query.get("code") ? record.code === query.get("code") : true) && (creator ? record.creator === creator : true))
      .filter((record) => { if (!range) return true; const time = Date.parse(record.createTime); return time >= range[0]! && time <= range[1]!; })
      .filter((record) => this.matchesField(this.parse(record.content), query))
      .sort((a, b) => b.createTime.localeCompare(a.createTime));
  }
  private parse(content: string): Json {
    try { return decode(content); } catch { return content; }
  }
  private matchesField(content: Json, query: URLSearchParams): boolean {
    const key = query.get("fieldKey"), value = query.get("fieldValue");
    if (!key || value === null) return true;
    const current = content && typeof content === "object" && !Array.isArray(content) ? (content as Record<string, Json>)[key] : undefined;
    if (current == null) return false;
    const compare = query.get("compare") ?? "LIKE";
    if (compare === "LIKE") return String(current).includes(value);
    const text = typeof current === "object" ? JSON.stringify(current) : String(current);
    if (compare === "EQ") return text === value;
    if (compare === "NEQ") return text !== value;
    const left = Number(text), right = Number(value), numeric = Number.isFinite(left) && Number.isFinite(right);
    if (!numeric) return compare === "GT" ? text > value : compare === "GE" ? text >= value : compare === "LT" ? text < value : text <= value;
    return compare === "GT" ? left > right : compare === "GE" ? left >= right : compare === "LT" ? left < right : left <= right;
  }
  row(record: FormData, userOf: (id: string) => unknown) {
    const model = this.detailByCode(record.code);
    return { id: record.id, code: record.code, formName: model?.formName ?? record.code, formVersion: record.formVersion,
      fieldData: this.parse(record.content), status: record.status, creator: userOf(record.creator), createTime: record.createTime, updateTime: record.updateTime };
  }
}
