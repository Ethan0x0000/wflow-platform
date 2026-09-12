import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { eventSchema, type WorkflowEvent } from "wflow-core";

/** Local adapter. Each write and event deduplication is committed synchronously in WAL mode. */
export class WorkflowStore {
  private readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(kind,id));
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, instance TEXT NOT NULL, sequence INTEGER NOT NULL, value TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS events_instance ON events(instance, sequence);`);
  }
  get<T>(kind: string, id: string, schema: z.ZodType<T>): T | undefined {
    const row = this.db.prepare("SELECT value FROM records WHERE kind=? AND id=?").get(kind, id);
    return row ? schema.parse(JSON.parse(String(row.value))) : undefined;
  }
  list<T>(kind: string, schema: z.ZodType<T>): T[] {
    return this.db.prepare("SELECT value FROM records WHERE kind=? ORDER BY rowid").all(kind).map((row) => schema.parse(JSON.parse(String(row.value))));
  }
  put(kind: string, id: string, value: unknown): void {
    this.db.prepare("INSERT INTO records(kind,id,value) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value").run(kind, id, JSON.stringify(value));
  }
  delete(kind: string, id: string): void { this.db.prepare("DELETE FROM records WHERE kind=? AND id=?").run(kind, id); }
  /** Remove every host projection belonging to an instance and leave a tombstone for late events. */
  purgeInstance(instanceId: string): void {
    this.transaction(() => {
      this.db.prepare("DELETE FROM events WHERE instance=?").run(instanceId);
      const rows = this.db.prepare("SELECT kind,id,value FROM records").all() as Array<{ kind: string; id: string; value: string }>;
      for (const row of rows) {
        if (row.kind === "deleted") continue;
        let value: unknown;
        try { value = JSON.parse(row.value); } catch { continue; }
        const record = value && typeof value === "object" ? value as Record<string, unknown> : undefined;
        const belongs = row.kind === "instance" && row.id === instanceId
          || row.kind === "revision" && row.id === instanceId
          || row.kind === "note" && record?.instId === instanceId
          || row.kind === "notification" && record?.instId === instanceId
          || row.kind === "command" && (record?.command as Record<string, unknown> | undefined)?.instanceId === instanceId
          || row.kind === "start" && record?.instanceId === instanceId
          || row.kind === "instFormData" && row.id === instanceId
          || row.kind === "assignment" && row.id.startsWith(`${instanceId}:`);
        if (belongs) this.db.prepare("DELETE FROM records WHERE kind=? AND id=?").run(row.kind, row.id);
      }
      this.put("deleted", instanceId, { id: instanceId });
    });
  }
  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const result = fn(); this.db.exec("COMMIT"); return result; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  append(event: WorkflowEvent): boolean {
    const value = eventSchema.parse(event);
    return this.db.prepare("INSERT OR IGNORE INTO events(id,instance,sequence,value) VALUES(?,?,?,?)").run(value.eventId, value.instanceId, value.sequence, JSON.stringify(value)).changes > 0;
  }
  events(instance: string): WorkflowEvent[] {
    return this.db.prepare("SELECT value FROM events WHERE instance=? ORDER BY sequence").all(instance).map((row) => eventSchema.parse(JSON.parse(String(row.value))));
  }
  close(): void { this.db.close(); }
}
