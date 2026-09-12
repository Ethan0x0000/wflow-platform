import { z } from "zod";
import { jsonSchema, type Data } from "wflow-core";
import type { FormDataField, FormDataRow } from "@wflow/api-contract";
import { WorkflowStore } from "./store.js";

/** Java FormDataServiceImpl caches `inst-form-data:<instId>` for 48 hours (48 * 3600 seconds). */
export const FORM_DATA_TTL_MS = 48 * 3_600_000;

export const formDataFieldSchema = z.object({ key: z.string(), value: jsonSchema });
export type { FormDataField };
// Mirrors Java WflowFormDataDo: one row per instance, content is a JSON array of {key,value}.
// cacheTime/expireTime model the RedisFlowCatch 48h read cache Java keeps under the same key.
export const formDataRowSchema = z.object({
  instId: z.string(),
  defineId: z.string(),
  content: z.array(formDataFieldSchema),
  createTime: z.string(),
  updateTime: z.string(),
  cacheTime: z.string(),
  expireTime: z.string(),
});
export type { FormDataRow };

/** Redis TTL semantics: the cache entry is gone once `expireTime` is reached. */
export function isExpired(row: Pick<FormDataRow, "expireTime">, now = Date.now()): boolean {
  return now >= Date.parse(row.expireTime);
}

function fields(data: Data): FormDataField[] {
  return Object.entries(data).filter(([, value]) => value !== null && value !== undefined).map(([key, value]) => ({ key, value }));
}

function fieldMap(content: FormDataField[]): Data {
  return Object.fromEntries(content.map(({ key, value }) => [key, value]));
}

export class InstanceFormData {
  private readonly cache = new Map<string, FormDataRow>();
  constructor(private readonly store: WorkflowStore) {}

  /** Java saveInstFormData: insert the startup payload, dropping null fields. */
  save(instId: string, defineId: string, data: Data): FormDataRow {
    const now = new Date();
    const row = formDataRowSchema.parse({
      instId, defineId, content: fields(data),
      createTime: now.toISOString(), updateTime: now.toISOString(),
      cacheTime: now.toISOString(), expireTime: new Date(now.getTime() + FORM_DATA_TTL_MS).toISOString(),
    });
    this.store.put("instFormData", instId, row);
    this.cache.set(instId, row);
    return row;
  }

  /** Java updateInstFormData: merge into the stored content, invalidate and refill the 48h cache. */
  update(instId: string, defineId: string, data: Data): FormDataRow {
    const current = this.get(instId);
    const now = new Date();
    const row = formDataRowSchema.parse({
      instId, defineId: current?.defineId ?? defineId, content: fields({ ...fieldMap(current?.content ?? []), ...data }),
      createTime: current?.createTime ?? now.toISOString(), updateTime: now.toISOString(),
      cacheTime: now.toISOString(), expireTime: new Date(now.getTime() + FORM_DATA_TTL_MS).toISOString(),
    });
    this.store.put("instFormData", instId, row);
    this.cache.set(instId, row);
    return row;
  }

  get(instId: string): FormDataRow | undefined {
    const cached = this.cache.get(instId);
    if (cached && !isExpired(cached)) return cached;
    const row = this.store.get("instFormData", instId, formDataRowSchema);
    if (!row) { this.cache.delete(instId); return undefined; }
    const value = isExpired(row) ? this.refresh(row) : row;
    if (value !== row) this.store.put("instFormData", instId, value);
    this.cache.set(instId, value);
    return value;
  }

  fields(instId: string): FormDataField[] {
    return this.get(instId)?.content ?? [];
  }

  map(instId: string): Data {
    return fieldMap(this.fields(instId));
  }

  remove(instId: string): void {
    this.cache.delete(instId);
    this.store.delete("instFormData", instId);
  }

  private refresh(row: FormDataRow): FormDataRow {
    const now = new Date();
    return { ...row, cacheTime: now.toISOString(), expireTime: new Date(now.getTime() + FORM_DATA_TTL_MS).toISOString() };
  }
}
