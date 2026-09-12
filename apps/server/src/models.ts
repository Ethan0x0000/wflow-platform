import { randomUUID } from "node:crypto";
import { z } from "zod";
import { dataSchema, importWflowDefinition, importWflowProcessEvents, jsonSchema, parseDefinition, settingsSchema, syncRuleSchema, type Definition, type Field, type Json, type Settings } from "wflow-core";
import { WorkflowStore } from "./store.js";

export function object(value: unknown): Record<string, Json> { return dataSchema.parse(value ?? {}); }
export function array(value: unknown): Json[] { return z.array(jsonSchema).parse(value ?? []); }
export function decode(value: unknown): Json { return jsonSchema.parse(typeof value === "string" ? JSON.parse(value) : value); }
export type PermUser = { id: string; deptLevels?: string[]; roleIds?: string[] };
// wflow_proc_perm: match the user directly, or via one of their depts (including parent levels) or roles.
export function matchesPerm(user: PermUser, values: Json[]): boolean {
  const depts = new Set(user.deptLevels ?? []), roles = new Set(user.roleIds ?? []);
  return values.some((raw) => {
    if (typeof raw === "string") return raw === user.id;
    const perm = object(raw), target = String(perm.id ?? ""), type = String(perm.type ?? "user");
    return type === "dept" ? depts.has(target) : type === "role" ? roles.has(target) : target === user.id;
  });
}
// Stable error taxonomy: the HTTP status stays the response `code`, the taxonomy code is logged.
const errorCodes: Record<number, string> = { 400: "BAD_REQUEST", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT", 413: "PAYLOAD_TOO_LARGE", 422: "UNPROCESSABLE_ENTITY", 500: "INTERNAL_ERROR", 501: "NOT_IMPLEMENTED", 503: "SERVICE_UNAVAILABLE" };
export class ApiError extends Error {
  readonly code: string;
  constructor(public status: number, message: string, code?: string) { super(message); this.name = "ApiError"; this.code = code ?? errorCodes[status] ?? "API_ERROR"; }
}
export const modelSchema = z.object({
  id: z.string(), code: z.string(), procName: z.string().min(1).max(120), groupId: z.string(),
  version: z.number().int().nonnegative(), status: z.number().int(), defineId: z.string(),
  logo: z.string(), process: z.string(), formType: z.number().int().min(0).max(4), formJson: z.string(),
  setting: z.string(), startupRange: z.string(), startupPerm: z.string(), adminPerm: z.string(),
  formFields: z.string(), events: z.string(), formRef: z.string().nullable(), formCode: z.string().nullable(),
  hasNewVersion: z.boolean(), createTime: z.string(), sort: z.number().default(0), remark: z.string().nullish().transform((value) => value ?? ""),
});
export type Model = z.infer<typeof modelSchema>;
export const groupSchema = z.object({ id: z.string(), name: z.string().min(1).max(80), sort: z.number() });
export const publishedSchema = z.object({ model: modelSchema, definition: z.unknown() });

const serializedKeys = ["logo", "process", "formJson", "setting", "startupPerm", "adminPerm", "formFields", "events", "formRef", "formCode"] as const;
export function formFieldsOf(model: Model): Record<string, Json>[] {
  const fields: Record<string, Json>[] = [];
  function visit(items: Json[]): void {
    for (const raw of items) {
      if (Array.isArray(raw)) { visit(raw); continue; }
      const component = object(raw), props = object(component.props);
      if (typeof component.key === 'string' && component.valueType && component.valueType !== 'none' && !props.isContainer && !component.parent) fields.push(component);
      if (component.type === 'TableList' || component.type === 'FormList') continue;
      for (const key of ['components', 'items', 'columns']) {
        if (Array.isArray(component[key])) visit(component[key]);
        if (Array.isArray(props[key])) visit(props[key]);
      }
    }
  }
  const components = array(object(decode(model.formJson)).components);
  visit(model.formType === 0 ? components : array(decode(model.formFields)));
  return fields;
}
// FormFieldData: flat field list returned by /model/formFields*, with parent component info.
export function formFieldDataOf(model: Model): Record<string, Json>[] {
  const fields: Record<string, Json>[] = [];
  function visit(items: Json[], parent?: Record<string, Json>): void {
    for (const raw of items) {
      if (Array.isArray(raw)) { visit(raw, parent); continue; }
      const component = object(raw), props = object(component.props);
      if (typeof component.key === 'string' && component.valueType && component.valueType !== 'none' && !props.isContainer && !component.parent) {
        fields.push({
          id: component.id ?? component.key, name: component.name ?? component.key, key: component.key,
          type: component.type ?? null, value: component.value ?? null, valueType: component.valueType,
          required: props.required === true || component.required === true,
          ...(parent ? { parent: { key: String(parent.key ?? ''), name: String(parent.name ?? parent.key ?? '') } } : {}),
        });
      }
      if (component.type === 'TableList' || component.type === 'FormList') continue;
      const nested = [...(['components', 'items', 'columns'] as const).flatMap((key) => Array.isArray(component[key]) ? [component[key] as Json[]] : []),
        ...(['components', 'items', 'columns'] as const).flatMap((key) => Array.isArray(props[key]) ? [props[key] as Json[]] : [])];
      for (const list of nested) visit(list, props.isContainer ? component : parent);
    }
  }
  const components = array(object(decode(model.formJson)).components);
  visit(model.formType === 0 ? components : array(decode(model.formFields)));
  return fields;
}
// ProcSetting fields the engine consumes (deduplication, returnSkip, reloadUser).
export function settingsOf(model: Model): Settings | undefined {
  const setting = object(decode(model.setting));
  const dedup = object(setting.deduplication ?? {});
  const settings: Settings = {
    ...(dedup.type === "ONCE" ? { deduplication: { type: "ONCE" as const, skip: dedup.isSkip === true } } : {}),
    ...(typeof setting.returnSkip === "boolean" ? { returnSkip: setting.returnSkip } : {}),
    ...(typeof setting.reloadUser === "boolean" ? { reloadUser: setting.reloadUser } : {}),
    ...(setting.formSync && typeof setting.formSync === "object" && !Array.isArray(setting.formSync) ? { formSync: syncRuleSchema.parse(setting.formSync) } : {}),
  };
  return Object.keys(settings).length ? settingsSchema.parse(settings) : undefined;
}
export function fieldsOf(model: Model): Field[] {
  return formFieldsOf(model).map((component) => {
        const props = object(component.props);
        const types: Record<string, Field["type"]> = { String: "string", Number: "number", Boolean: "boolean", Array: "array", Object: "object", User: "array", Dept: "array", Date: "string",
          string: 'string', number: 'number', bool: 'boolean', object: 'object', array: 'array', option: 'object', options: 'array', time: 'string', dateTime: 'string', timeRange: 'array', dateTimeRange: 'array', org: 'object', orgArray: 'array', objArray: 'array', image: 'string', imageArray: 'array', fileArray: 'array' };
        const type = types[String(component.valueType)];
        if (!type) throw new ApiError(422, `Unsupported form value type: ${component.valueType}`);
        const range = Array.isArray(props.length) ? props.length : [];
        const number = (value: Json | undefined) => value == null || value === '' ? undefined : z.coerce.number().finite().parse(value);
        const minLength = type === 'string' ? number(range[0]) : undefined;
        const maxLength = type === 'string' ? number(range[1] ?? (component.type === 'TextareaInput' ? props.max : undefined)) : undefined;
        const minimum = type === 'number' ? number(props.min) : undefined, maximum = type === 'number' ? number(props.max) : undefined;
        const regex = object(props.regex), pattern = type === 'string' && typeof regex.exp === 'string' && regex.exp ? regex.exp : undefined;
        return { key: String(component.key), type, required: props.required === true || component.required === true,
          ...(minLength === undefined ? {} : { minLength }), ...(maxLength === undefined ? {} : { maxLength }),
          ...(minimum === undefined ? {} : { minimum }), ...(maximum === undefined ? {} : { maximum }),
          ...(pattern === undefined ? {} : { pattern }) };
  });
}

// ProcSetting.CodeRule: default "WF" + yyyyMMddHHmmssSSS, or CUSTOM token list.
export function instanceCode(store: WorkflowStore, setting: Json): string {
  const rule = object(object(setting).code);
  const now = new Date();
  const pad = (value: number, length: number) => String(value).padStart(length, "0");
  const stamp = (milliseconds: boolean) => `${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}${milliseconds ? pad(now.getMilliseconds(), 3) : ""}`;
  const bump = (kind: string, id: string): number => {
    const key = `${kind}:${id}`, counter = store.get("counter", key, z.object({ value: z.number().int().nonnegative() }));
    const value = (counter?.value ?? 0) + 1;
    store.put("counter", key, { value });
    return value;
  };
  if (rule.type !== "CUSTOM" || !Array.isArray(rule.rules)) return `WF${stamp(true)}`;
  return (rule.rules as Json[]).map((raw) => {
    const token = String(raw);
    if (token === "${dateTime}") return stamp(false);
    if (token === "${randNumber}") return String(1000 + Math.floor(Math.random() * 9000));
    if (token === "${dayAdd}") { bump("month", stamp(false).slice(0, 6)); return pad(bump("day", stamp(false).slice(0, 8)), 4); }
    if (token === "${monthAdd}") { bump("day", stamp(false).slice(0, 8)); return pad(bump("month", stamp(false).slice(0, 6)), 6); }
    return token;
  }).join("");
}
export class Models {
  constructor(readonly store: WorkflowStore) {}
  list(): Model[] { return this.store.list("model", modelSchema).filter((m) => m.status !== -1).sort((a, b) => a.sort - b.sort); }
  get(code: string): Model {
    const model = this.store.get("model", code, modelSchema);
    if (!model) throw new ApiError(404, "流程模型不存在");
    return model;
  }
  published(code: string, version?: number): { model: Model; definition: Definition } {
    const active = this.get(code);
    const found = this.store.get("version", `${code}:${version || active.version}`, publishedSchema);
    if (!found) throw new ApiError(404, "流程版本未发布");
    return { model: found.model, definition: parseDefinition(found.definition) };
  }
  // Java selectUserHasStartupPermission: NONE denies, ALL allows, RANGE needs a wflow_proc_perm link.
  canStart(model: Model, user: string | PermUser): boolean {
    if (model.status !== 1 || model.startupRange === "NONE") return false;
    if (model.startupRange === "ALL") return true;
    return matchesPerm(typeof user === "string" ? { id: user } : user, array(decode(model.startupPerm)));
  }
  // Java selectUserHasAdminPermission: empty admin_perm (or never deployed) leaves the model open to everyone.
  canManage(model: Model, user: string | PermUser, admin = false): boolean {
    const values = array(decode(model.adminPerm));
    return admin || !model.version || values.length === 0 || matchesPerm(typeof user === "string" ? { id: user } : user, values);
  }
  save(raw: unknown): Model {
    const input = object(raw);
    const code = typeof input.code === "string" && input.code ? input.code : `proc-${randomUUID()}`;
    const existing = this.store.get("model", code, modelSchema);
    const defaults = {
      id: code, code, version: 0, status: 0, defineId: code, logo: "{}", formType: 4, formJson: '{"components":[],"conf":{}}',
      process: "[]", setting: "{}", startupRange: "ALL", startupPerm: "[]", adminPerm: "[]", formFields: "[]", events: "{}",
      formRef: null, formCode: null, createTime: new Date().toISOString(), hasNewVersion: true,
    };
    const merged = { ...defaults, ...existing, ...input, code, id: existing?.id ?? code, defineId: existing?.defineId ?? code,
      version: existing?.version ?? 1, status: existing?.status ?? 0, hasNewVersion: true };
    for (const key of serializedKeys) {
      const value = merged[key];
      if (value === null) continue;
      merged[key] = JSON.stringify(decode(value));
    }
    const model = modelSchema.parse(merged);
    if (!this.store.get("group", model.groupId, groupSchema)) throw new ApiError(422, "流程分组不存在");
    this.store.put("model", code, model);
    return model;
  }
  // Mirrors Java updateModelInfo: metadata/permissions only, no new version, active timestamp refreshed.
  updateInfo(raw: unknown): string {
    const input = object(raw);
    const current = this.get(String(input.code ?? ""));
    const json = (value: Json | undefined, fallback: string): string => value === undefined ? fallback : JSON.stringify(decode(value));
    const merged = modelSchema.parse({ ...current,
      procName: typeof input.procName === "string" ? input.procName : current.procName,
      groupId: typeof input.groupId === "string" ? input.groupId : current.groupId,
      logo: json(input.logo, current.logo),
      remark: typeof input.remark === "string" ? input.remark : current.remark,
      setting: json(input.setting, current.setting),
      startupRange: typeof input.startupRange === "string" ? input.startupRange : current.startupRange,
      startupPerm: json(input.startupPerm, current.startupPerm),
      adminPerm: json(input.adminPerm, current.adminPerm),
    });
    if (!this.store.get("group", merged.groupId, groupSchema)) throw new ApiError(422, "流程分组不存在");
    this.store.transaction(() => {
      this.store.put("model", merged.code, merged);
      const active = this.store.get("version", `${merged.code}:${merged.version}`, publishedSchema);
      if (active) this.store.put("version", `${merged.code}:${merged.version}`, { ...active, model: merged });
    });
    return "更新成功";
  }

  deploy(code: string): Model {
    const current = this.get(code);
    const versions = this.store.list("version", publishedSchema).filter((v) => v.model.code === code);
    const version = Math.max(0, ...versions.map((v) => v.model.version)) + 1;
    const model = { ...current, id: `${code}:v${version}`, version, defineId: `${code}:${version}`, status: 1, hasNewVersion: false };
    // Java deployModel accepts every formType; external/code/mount forms are host-registered on the client.
    const base = importWflowDefinition({ id: code, version, name: model.procName, nodes: decode(model.process), fields: fieldsOf(model) });
    const events = importWflowProcessEvents(decode(model.events));
    const definition = events ? parseDefinition({ ...base, events }) : base;
    this.store.transaction(() => {
      // Deploying a version expires the previously activated one (DataStatus.EXPIRED).
      for (const snapshot of versions) if (snapshot.model.status === 1) this.store.put("version", `${code}:${snapshot.model.version}`, { ...snapshot, model: { ...snapshot.model, status: 2 } });
      this.store.put("version", `${code}:${version}`, { model, definition });
      this.store.put("model", code, model);
    });
    return model;
  }
}

export function seedModels(models: Models): void {
  if (models.store.list('model', modelSchema).length) return;
  models.store.put("group", "group-hr", { id: "group-hr", name: "人事流程", sort: 0 });
  const process = [
    { id: "node_root", type: "Start", name: "发起人", childId: "node_approval", props: {} },
    { id: "node_approval", type: "Approval", name: "部门负责人审批", childId: "node_cc", props: {
      mode: "USER", assignUser: ["u-manager"], ruleType: "ASSIGN_USER", taskMode: { type: "AND", percentage: 100 },
      operationPerms: ["agree", "reject", "forward", "beforeAdd", "afterAdd"].map((action) => ({ action, enable: true })),
    } },
    { id: "node_cc", type: "Cc", name: "抄送人事", childId: null, props: { assignUser: ["u-admin"], ruleType: "ASSIGN_USER" } },
  ];
  models.save({ code: "leave-request", procName: "请假申请", groupId: "group-hr", formType: 0,
    logo: { name: "material-symbols:calendar-month-outline", bgc: "#5b8ff9", color: "#ffffff" }, process,
    setting: { enableUrging: true, enableCancel: true, cancel: { enable: true }, discuss: { enable: true, endEnable: true }, comment: { enable: true, endEnable: true } },
    formJson: { conf: { labelPosition: "right", labelWidth: 100, _labelPosition: "top", _labelWidth: 100, size: "default", valid: { type: "SIMPLE", rules: [] }, showHide: { type: "SIMPLE", rules: [] }, actionRule: { type: "SIMPLE", rules: [] }, onLoad: { type: "SIMPLE", actions: [] } }, datasource: [], components: [
      { id: "reason", key: "reason", type: "TextInput", name: "请假原因", valueType: "String", props: { required: true, length: [0, 200], regex: { exp: null, error: null }, placeholder: "请输入请假原因", enableClear: true } },
    ] },
  });
  models.deploy("leave-request");
}
