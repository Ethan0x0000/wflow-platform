import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import { ApiError } from './models';
import type { Runtime, User } from './runtime';
import { dataSchema, type Json } from 'wflow-core';

const resourceSchema = z.object({
  id: z.string(), ownerId: z.string(), name: z.string(), type: z.string(), base64: z.string(), size: z.number(),
  isSign: z.boolean().default(false), isImage: z.boolean().default(false),
});
export function referencesResource(value: Json, id: string): boolean {
  if (typeof value === 'string') return value.split('?')[0] === `/res/${id}`;
  if (Array.isArray(value)) return value.some((item) => referencesResource(item, id));
  return value !== null && typeof value === 'object' && Object.values(value).some((item) => referencesResource(item, id));
}
/** FileManagerServiceImpl.uploadFile: id = md5(8..24) + extension, 20MB cap, isImg/isSign flags. */
export async function upload(runtime: Runtime, user: User, request: IncomingMessage) {
  const maxSize = Number(process.env.WFLOW_FILE_MAX_SIZE ?? 20);
  const chunks: Buffer[] = []; let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk); length += buffer.length;
    if (length > (maxSize + 1) * 1024 * 1024) throw new ApiError(413, `管理员限制了最大文件大小为${maxSize}MB`);
    chunks.push(buffer);
  }
  const form = await new Request('http://localhost/res', { method: 'POST', headers: { 'Content-Type': request.headers['content-type'] ?? '' }, body: Buffer.concat(chunks) }).formData();
  const file = form.get('file');
  if (!(file instanceof File) || !file.size) throw new ApiError(422, '未选择附件');
  // Java divides before comparing, so a file is accepted while floor(size/MB) <= maxSize.
  if (Math.floor(file.size / 1048576) > maxSize) throw new ApiError(413, `管理员限制了最大文件大小为${maxSize}MB`);
  const bytes = Buffer.from(await file.arrayBuffer());
  const name = file.name.replace(/[\r\n\x00-\x1f/\\]/g, '_').slice(0, 200);
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  const id = createHash('md5').update(bytes).digest('hex').slice(8, 24) + extension;
  const type = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg' : 'application/octet-stream';
  const isSign = form.get('isSign') === 'true', isImage = form.get('isImg') === 'true';
  const key = `${isSign ? 'sign' : 'file'}:${id}`;
  if (!runtime.store.get(key, id, resourceSchema)) {
    runtime.store.put(key, id, { id, ownerId: user.id, name, type, base64: bytes.toString('base64'), size: file.size, isSign, isImage });
  }
  return { id, name, isImage, url: `/res/${id}`, size: file.size };
}

async function accessible(runtime: Runtime, user: User, id: string, isSign: boolean): Promise<z.infer<typeof resourceSchema>> {
  const file = runtime.store.get(`${isSign ? 'sign' : 'file'}:${id}`, id, resourceSchema);
  if (!file) throw new ApiError(404, '文件不存在');
  let allowed = user.admin || file.ownerId === user.id;
  if (!allowed) {
    for (const instance of runtime.instances().filter((i) => runtime.canRead(i, user))) {
      const snapshot = await runtime.snapshot(instance);
      const notes = runtime.store.list('note', z.object({ instId: z.string(), content: dataSchema })).filter((note) => note.instId === instance.id);
      if (referencesResource(snapshot.data, id)
        || runtime.store.events(instance.id).some((event) => referencesResource((event.details.comment ?? {}) as Json, id) || referencesResource((event.details.task ?? {}) as Json, id))
        || notes.some((note) => referencesResource(note.content, id))) { allowed = true; break; }
    }
  }
  if (!allowed) throw new ApiError(403, '无权查看此附件');
  return file;
}
export async function assertResourceAccess(runtime: Runtime, user: User, data: Json): Promise<void> {
  const ids = new Set<string>();
  const walk = (value: Json) => {
    if (typeof value === 'string') { const match = /^\/res\/([^?\/]+)(?:\?|$)/.exec(value); if (match) ids.add(match[1]!); }
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value !== null && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(data);
  for (const id of ids) await accessible(runtime, user, id, false);
}

// FileManagerServiceImpl.generateThumbnail: fit inside 150x150 and encode as JPEG.
function thumbnail(bytes: Buffer, type: string): Buffer | undefined {
  let image: { width: number; height: number; data: Uint8Array } | undefined;
  try {
    if (type === 'image/png') image = PNG.sync.read(bytes);
    else if (type === 'image/jpeg') image = jpeg.decode(bytes, { useTArray: true }) as { width: number; height: number; data: Uint8Array };
  } catch { return undefined; }
  if (!image || !image.width || !image.height) return undefined;
  const ratio = Math.min(150 / image.width, 150 / image.height);
  const width = Math.max(1, Math.floor(image.width * ratio)), height = Math.max(1, Math.floor(image.height * ratio));
  const target = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sourceY = Math.min(image.height - 1, Math.floor(y / ratio));
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(image.width - 1, Math.floor(x / ratio));
      const source = (sourceY * image.width + sourceX) * 4, destination = (y * width + x) * 4;
      target[destination] = image.data[source]!; target[destination + 1] = image.data[source + 1]!; target[destination + 2] = image.data[source + 2]!; target[destination + 3] = 255;
    }
  }
  return jpeg.encode({ data: target, width, height }, 90).data;
}

/** FileManagerController.getRes: inline stream, `download` attachment or `zip` 150px JPEG thumbnail. */
export async function download(runtime: Runtime, user: User, id: string, query: URLSearchParams, response: ServerResponse): Promise<void> {
  const isSign = query.get('isSign') === 'true';
  const file = await accessible(runtime, user, id, isSign);
  if (query.get('zip') === 'true') {
    const image = thumbnail(Buffer.from(file.base64, 'base64'), file.type);
    if (!image) throw new ApiError(422, '文件不是支持的图片格式');
    response.writeHead(200, { 'content-type': 'image/jpeg', 'content-length': String(image.length), 'x-content-type-options': 'nosniff', 'cache-control': 'private, no-store' });
    response.end(image); return;
  }
  if (query.get('download') === 'true') {
    const name = query.get('name') || file.name || id;
    response.writeHead(200, { 'content-type': 'application/octet-stream', 'x-content-type-options': 'nosniff', 'cache-control': 'private, no-store', 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}` });
    response.end(Buffer.from(file.base64, 'base64')); return;
  }
  response.writeHead(200, { 'content-type': file.type, 'x-content-type-options': 'nosniff', 'cache-control': 'private, no-store', 'content-disposition': `${file.type.startsWith('image/') ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name)}` });
  response.end(Buffer.from(file.base64, 'base64'));
}
