import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import ExcelJS from 'exceljs';
import { expect, it } from 'vitest';
import { startServer } from '../src/index';

it('exports every page exactly once when the export spans multiple pages', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'wflow-export-'));
  const before = { WFLOW_DB: process.env.WFLOW_DB, WFLOW_TEMPORAL_DB: process.env.WFLOW_TEMPORAL_DB, WFLOW_DEMO: process.env.WFLOW_DEMO };
  process.env.WFLOW_DB = join(folder, 'host.sqlite'); process.env.WFLOW_TEMPORAL_DB = join(folder, 'temporal.sqlite'); process.env.WFLOW_DEMO = '1';
  let app: Awaited<ReturnType<typeof startServer>> | undefined;
  let base = '';
  async function api(path: string, token = '', data?: unknown) {
    const response = await fetch(`${base}${path}`, { method: data ? 'POST' : 'GET', headers: { wflowToken: token, 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
    const body = await response.json(); expect(body).toMatchObject({ code: 200 }); return body.data;
  }
  try {
    app = await startServer(0); base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
    const employee = await api('/auth/login/u-employee');
    const model = await api('/startup/model/leave-request/undefined', employee.token);
    const ids: string[] = [];
    for (let index = 0; index < 3; index++) {
      ids.push(await api('/inst/startup', employee.token, { requestId: `export-${index}`, defineId: model.defineId, initiator: 'u-employee', startDeptId: 'dept-hr', formData: { reason: `Export ${index}` } }));
    }
    await expect.poll(async () => (await api('/inst/list?code=leave-request', employee.token)).records.length).toBe(3);
    // Java exportInstData walks the query in pages; pageSize=2 forces three iterations over three rows.
    const response = await fetch(`${base}/inst/list/export?code=leave-request&pageSize=2`, { headers: { wflowToken: employee.token } });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    expect(response.headers.get('content-disposition')).toContain(encodeURIComponent('请假申请.xlsx'));
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(Buffer.from(await response.arrayBuffer()));
    const sheet = book.worksheets[0]!;
    const exported = new Set<string>();
    for (let row = 3; row <= sheet.rowCount; row++) exported.add(String(sheet.getRow(row).getCell(3).value));
    expect(sheet.rowCount).toBe(5);
    expect(exported.size).toBe(3);
    expect([...exported].sort()).toEqual([...ids].sort());
  } finally {
    await app?.close();
    for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    rmSync(folder, { recursive: true, force: true });
  }
}, 60_000);
