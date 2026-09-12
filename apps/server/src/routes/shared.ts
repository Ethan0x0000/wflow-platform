import type { IncomingMessage, ServerResponse } from "node:http";
import ExcelJS from "exceljs";
import { z } from "zod";
import { commandSchema, dataSchema, type Data, type Json } from "wflow-core";
import type { ApiResponse, PageResult } from "@wflow/api-contract";
import { ApiError, object, type PermUser } from "../models.js";
import type { Runtime, User } from "../runtime.js";
import { row } from "../views.js";

/** Sentinel returned by a domain router when it did not match the request. */
export const NOT_HANDLED = Symbol("WFLOW_ROUTE_NOT_HANDLED");

export interface RouteContext {
  path: string;
  method: string;
  query: URLSearchParams;
  user: User;
  request: IncomingMessage;
  runtime: Runtime;
  models: Runtime["models"];
  forms: Runtime["forms"];
  store: Runtime["store"];
  permUser: PermUser;
}
export type RouteModule = (context: RouteContext) => Promise<unknown>;

export const idSchema = z.string().min(1).max(200);
export const revokeTimeout = Number(process.env.WFLOW_REVOKE_TIMEOUT ?? 120);
export const serverAddress = process.env.WFLOW_SERVER_ADDRESS ?? "";
export const noteSchema = z.object({ id: z.string(), instId: z.string(), userId: z.string(), createTime: z.string(), content: dataSchema });
// HandlerAction values recorded per handled action (views.records mapping plus completions).
export const idoActions: Record<string, string> = { approve: 'agree', auto_agree: 'agree', complete: 'complete', reject: 'reject', transfer: 'forward', fallback: 'fallback', withdraw: 'withdraw', beforeAdd: 'beforeAdd', afterAdd: 'afterAdd', reassign: 'forward', cancel: 'cancel' };
export const draftSchema = z.object({ id: z.string(), userId: z.string(), code: z.string(), createTime: z.string(), data: dataSchema });
export const commandRecordSchema = z.object({ fingerprint: z.string(), command: commandSchema, completed: z.boolean(), saveSign: z.boolean().optional() });
export const startRecordSchema = z.object({ fingerprint: z.string(), instanceId: z.string() });
export const componentSchema = z.object({ id: z.string(), name: z.string().min(1).max(255), type: z.string().min(1).max(128), valueType: z.string().min(1).max(32), icon: z.string().max(256), sfc: z.union([z.string().max(500_000), dataSchema]), configSfc: z.string().max(500_000).nullable(), version: z.number().int().default(1), creator: z.string().default(""), status: z.number().int(), createTime: z.string() });
export function required(query: URLSearchParams, key: string): string { return idSchema.parse(query.get(key)); }
export function admin(user: User): void { if (!user.admin) throw new ApiError(403, "需要流程管理权限"); }
export function page<T>(records: T[], query: URLSearchParams, defaults: { pageSize?: number; maxPageSize?: number } = {}): PageResult<T> {
  const pageNo = z.coerce.number().int().min(1).parse(query.get("pageNo") ?? 1);
  const pageSize = z.coerce.number().int().min(1).max(defaults.maxPageSize ?? 100).parse(query.get("pageSize") ?? defaults.pageSize ?? 10);
  return { records: records.slice((pageNo - 1) * pageSize, pageNo * pageSize), total: records.length, pages: Math.ceil(records.length / pageSize), pageNo, pageSize };
}
export const exportStatus: Record<string, string> = { RUNNING: '进行中', SUSPEND: '暂停中', PASS: '审批通过', REFUSE: '被驳回', REVOKED: '被撤销', EXCEPTION: '流程异常' };
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value); if (!Number.isFinite(date.getTime())) return value;
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
export function cleanHtml(value: string): string { return value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'); }
// FieldValueType.getValue: export formatting per form component type.
export function exportValue(field: Record<string, Json>, value: Json | undefined): string | number | boolean {
  if (value === null || value === undefined) return '';
  const type = String(field.valueType ?? 'all');
  const list = (input: Json): Json[] => Array.isArray(input) ? input : [input];
  const join = (input: Json, separator: string) => list(input).map(String).join(separator);
  try {
    switch (type) {
      case 'option': return String(object(value).label ?? '');
      case 'options': return list(value).map((entry) => String(object(entry).label ?? '')).join('、');
      case 'string': if (String(field.type) === 'RichText') return cleanHtml(String(value)); return String(value);
      case 'number': case 'bool': case 'time': case 'dateTime': return typeof value === 'object' ? JSON.stringify(value) : value;
      case 'timeRange': case 'dateTimeRange': return join(value, ' ~ ');
      case 'object': case 'objArray': case 'all': return JSON.stringify(value);
      case 'array': return join(value, ' 、 ');
      case 'orgArray': return list(value).map((entry) => String(object(entry).name ?? '')).join('、');
      case 'dept': case 'position': case 'role': return String(object(value).name ?? '');
      case 'image': case 'imageArray': case 'fileArray':
        return list(value).map((entry) => `${serverAddress}${typeof entry === 'string' ? entry : String(object(entry).url ?? '')}?download=true`).join('、\n');
      default: return typeof value === 'object' ? JSON.stringify(value) : value;
    }
  } catch { return typeof value === 'object' ? JSON.stringify(value) : String(value); }
}
export async function workbook(records: Array<Omit<ReturnType<typeof row>, 'fieldData'> & { fieldData: Record<string, { value: Json }> }>, fields: Record<string, Json>[], name: string): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet(name.replace(/[\\/*?:\[\]]/g, '_').slice(0, 31));
  const totalColumns = 4 + fields.length + 7;
  sheet.addRow(['流程类型', '标题', '流水号', '父级流水号', '表单数据', ...fields.slice(1).map(() => ''), '版本号', '发起人', '发起部门', '当前节点', '流程状态', '提交时间', '结束时间']);
  sheet.addRow(['', '', '', '', ...fields.map((field) => String(field.name ?? field.key)), '', '', '', '', '', '', '']);
  for (const column of [1, 2, 3, 4]) sheet.mergeCells(1, column, 2, column);
  if (fields.length) sheet.mergeCells(1, 5, 1, 4 + fields.length);
  for (let column = 5 + fields.length; column <= totalColumns; column++) sheet.mergeCells(1, column, 2, column);
  for (const item of records) sheet.addRow([item.defineName, item.title, item.instId, item.parentInstId ?? '', ...fields.map((field) => exportValue(field, item.fieldData[String(field.key)]?.value)),
    item.version, item.initiator.name, item.deptName, item.currentNodeName, exportStatus[item.status] ?? item.status, formatDateTime(item.createTime), formatDateTime(item.endTime)]);
  for (const row of [sheet.getRow(1), sheet.getRow(2)]) { row.font = { bold: true }; row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; }); }
  sheet.views = [{ state: 'frozen', ySplit: 2 }];
  for (let column = 1; column <= totalColumns; column++) { const header = String(sheet.getRow(2).getCell(column).value ?? sheet.getRow(1).getCell(column).value ?? ''); sheet.getColumn(column).width = Math.min(40, Math.max(12, header.length + 4)); }
  return Buffer.from(await book.xlsx.writeBuffer());
}
export function matchesQuery(item: ReturnType<typeof row>, data: Data, query: URLSearchParams): boolean {
  if (query.get('code') && item.code !== query.get('code')) return false;
  if (query.get('status') && item.status !== query.get('status')) return false;
  if (query.get('title') && ![item.title, item.defineName, item.initiator.name].some((value) => value.includes(query.get('title')!))) return false;
  if (query.get('userId') && item.initiator.id !== query.get('userId')) return false;
  for (const [key, value] of [['startRange', item.createTime], ['endRange', item.endTime]] as const) {
    const input = query.get(key); if (!input) continue;
    const bounds = input.split(',').map((part) => Date.parse(part));
    if (bounds.length !== 2 || bounds.some((bound) => !Number.isFinite(bound)) || bounds[0]! > bounds[1]!) throw new ApiError(422, '时间范围不合法');
    const time = value ? Date.parse(value) : NaN;
    if (!Number.isFinite(time) || time < bounds[0]! || time > bounds[1]!) return false;
  }
  const key = query.get('fieldKey'), value = query.get('fieldValue');
  if (key && value !== null) {
    const current = data[key], compare = z.enum(['LIKE', 'EQ', 'NEQ', 'GT', 'GE', 'LT', 'LE']).parse(query.get('compare'));
    if (compare === 'LIKE') return typeof current === 'string' && current.includes(value);
    const typed = typeof current === 'number' ? Number(value) : typeof current === 'boolean' ? value === 'true' : value;
    if (compare === 'EQ') return current === typed;
    if (compare === 'NEQ') return current !== typed;
    if (typeof current !== 'number' || typeof typed !== 'number' || !Number.isFinite(typed)) return false;
    return compare === 'GT' ? current > typed : compare === 'GE' ? current >= typed : compare === 'LT' ? current < typed : current <= typed;
  }
  return true;
}
export async function body(request: IncomingMessage): Promise<unknown> {
  let length = 0; const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const data = Buffer.from(chunk); length += data.length;
    if (length > 512_000) throw new ApiError(413, "请求内容过大");
    chunks.push(data);
  }
  return length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}
export function send(response: ServerResponse, status: number, data: unknown, msg = "success"): void {
  const payload: ApiResponse<unknown> = { code: status, data, msg };
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(payload));
}
