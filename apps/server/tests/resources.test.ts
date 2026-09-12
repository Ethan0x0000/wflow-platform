import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import ExcelJS from 'exceljs';
import { WorkflowStore } from '../src/store';
import { Runtime } from '../src/runtime';
import { createHandler, workbook } from '../src/index';

function tinyPng(width = 4, height = 2): Buffer {
  const png = new PNG({ width, height });
  for (let index = 0; index < width * height; index++) {
    png.data[index * 4] = 255; png.data[index * 4 + 1] = 0; png.data[index * 4 + 2] = 0; png.data[index * 4 + 3] = 255;
  }
  return PNG.sync.write(png);
}

describe('file resources', () => {
  it('uploads md5-named files with isImg/isSign flags and serves inline/attachment/thumbnail variants', async () => {
    const store = new WorkflowStore(':memory:');
    const runtime = new Runtime(store);
    const server = createServer((request, response) => { void createHandler(runtime)(request, response); });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const token = runtime.session('u-employee').token;
    const upload = async (bytes: Buffer, name: string, extra: Record<string, string> = {}) => {
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(bytes)], { type: 'application/octet-stream' }), name);
      for (const [key, value] of Object.entries(extra)) form.append(key, value);
      const response = await fetch(`${base}/res`, { method: 'POST', headers: { wflowToken: token }, body: form });
      return response.json() as Promise<{ code: number; data: { id: string; name: string; isImage: boolean; url: string; size: number }; msg: string }>;
    };
    try {
      const png = tinyPng();
      const first = await upload(png, '图纸.png', { isImg: 'true' });
      expect(first.code).toBe(200);
      expect(first.data.id).toMatch(/^[0-9a-f]{16}\.png$/);
      expect(first.data).toMatchObject({ name: '图纸.png', isImage: true, url: `/res/${first.data.id}`, size: png.length });
      // Identical content deduplicates to the same md5 id.
      expect((await upload(png, '副本.png', { isImg: 'true' })).data.id).toBe(first.data.id);

      const inline = await fetch(`${base}/res/${first.data.id}`, { headers: { wflowToken: token } });
      expect(inline.headers.get('content-type')).toBe('image/png');
      expect(Buffer.from(await inline.arrayBuffer()).equals(png)).toBe(true);

      const attachment = await fetch(`${base}/res/${first.data.id}?download=true&name=%E9%87%8D%E5%91%BD%E5%90%8D.png`, { headers: { wflowToken: token } });
      expect(attachment.headers.get('content-type')).toBe('application/octet-stream');
      expect(attachment.headers.get('content-disposition')).toContain(encodeURIComponent('重命名.png'));

      const thumbnail = await fetch(`${base}/res/${first.data.id}?zip=true`, { headers: { wflowToken: token } });
      expect(thumbnail.headers.get('content-type')).toBe('image/jpeg');
      const decoded = jpeg.decode(Buffer.from(await thumbnail.arrayBuffer()));
      expect(decoded.width).toBe(150);
      expect(decoded.height).toBe(75);

      // Sign files live in their own namespace and require isSign=true.
      const sign = await upload(tinyPng(3, 3), '签名.png', { isImg: 'true', isSign: 'true' });
      expect((await fetch(`${base}/res/${sign.data.id}`, { headers: { wflowToken: token } })).status).toBe(404);
      expect((await fetch(`${base}/res/${sign.data.id}?isSign=true`, { headers: { wflowToken: token } })).status).toBe(200);

      const deleted = await fetch(`${base}/res?path=x`, { method: 'DELETE', headers: { wflowToken: token } });
      expect(await deleted.json()).toMatchObject({ code: 200, data: 'delete' });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      store.close();
    }
  });
});

describe('excel export', () => {
  it('builds the Java multi-level header and FieldValueType formatted cells', async () => {
    const fields = [
      { key: 'text', name: '文本', type: 'TextInput', valueType: 'string' },
      { key: 'rich', name: '富文本', type: 'RichText', valueType: 'string' },
      { key: 'pick', name: '单选', type: 'Select', valueType: 'option' },
      { key: 'picks', name: '多选', type: 'MultiSelect', valueType: 'options' },
      { key: 'span', name: '日期范围', type: 'DateRange', valueType: 'dateTimeRange' },
      { key: 'people', name: '人员', type: 'UserPicker', valueType: 'orgArray' },
      { key: 'files', name: '附件', type: 'FileUpload', valueType: 'fileArray' },
    ];
    const buffer = await workbook([{
      taskId: null, instId: 'WF1', code: 'leave', title: '请假单', defineName: '请假流程', initiator: { id: 'u-employee', name: '王小明', avatar: '', type: 'user', deptId: 'dept-hr', deptName: '人事部', admin: false },
      deptName: '人事部', currentNodeId: null, currentNodeName: '已结束', status: 'PASS', createTime: '2026-01-02T03:04:05.000Z', endTime: '2026-01-03T04:05:06.000Z', candidate: false,
      version: 3, parentInstId: null, isAgent: false,
      fieldData: {
        text: { value: '事假' }, rich: { value: '<p>加粗<b>说明</b></p>' }, pick: { value: { label: '年假', value: 'annual' } },
        picks: { value: [{ label: '年假' }, { label: '调休' }] }, span: { value: ['2026-01-01 09:00', '2026-01-02 18:00'] },
        people: { value: [{ id: 'u-manager', name: '李经理' }] }, files: { value: [{ url: '/res/abc.png' }] },
      },
    }], fields, '请假流程');
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(buffer);
    const sheet = book.worksheets[0]!;
    expect(sheet.getCell('A1').value).toBe('流程类型');
    expect(sheet.getCell('E1').value).toBe('表单数据');
    expect(sheet.getCell('E2').value).toBe('文本');
    expect(sheet.getCell('L1').value).toBe('版本号');
    const data = sheet.getRow(3);
    expect(data.getCell(1).value).toBe('请假流程');
    expect(data.getCell(3).value).toBe('WF1');
    expect(data.getCell(5).value).toBe('事假');
    expect(data.getCell(6).value).toBe('加粗说明');
    expect(data.getCell(7).value).toBe('年假');
    expect(data.getCell(8).value).toBe('年假、调休');
    expect(data.getCell(9).value).toBe('2026-01-01 09:00 ~ 2026-01-02 18:00');
    expect(data.getCell(10).value).toBe('李经理');
    expect(data.getCell(11).value).toBe('/res/abc.png?download=true');
    expect(data.getCell(12).value).toBe(3);
    expect(data.getCell(13).value).toBe('王小明');
    expect(data.getCell(16).value).toBe('审批通过');
    expect(String(data.getCell(17).value)).toMatch(/^2026-01-0[23] /);
    expect(sheet.getCell('E1').isMerged).toBe(true);
  });
});
