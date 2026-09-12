import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { ApiError } from "./models.js";
import { createRuntime, notificationSchema, tenantId, type Notification, type Runtime } from "./runtime.js";
import { download } from "./resources.js";
import { classifyError } from "./errors.js";
import { orgService } from "./org.js";
import { routeModules } from "./routes/index.js";
import { NOT_HANDLED, send } from "./routes/shared.js";

export { workbook } from "./routes/shared.js";

function createRouter(runtime: Runtime) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    let path = request.url ?? "/";
    try {
      const parsed = new URL(request.url ?? "/", "http://localhost");
      path = decodeURIComponent(parsed.pathname.replace(/^\/api\/?/, "/"));
      if (path === "/health") { send(response, runtime.workerError ? 503 : 200, { status: runtime.workerError ? "unhealthy" : "ready", engine: "temporal" }); return; }
      if ((path.startsWith("/auth/login/") || path === "/auth/demo") && process.env.WFLOW_DEMO === "1") {
        const session = runtime.session(path === "/auth/demo" ? "u-employee" : path.split("/").at(-1)!);
        response.setHeader('Set-Cookie', `wflowSession=${session.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
        send(response, 200, { ...session.user, token: session.token }); return;
      }
      const cookie = request.headers.cookie?.split(';').map((c) => c.trim()).find((c) => c.startsWith('wflowSession='))?.slice('wflowSession='.length);
      const token = typeof request.headers.wflowtoken === "string" ? request.headers.wflowtoken : cookie ?? "";
      const user = runtime.authenticate(token);
      if (path.startsWith('/res/') && request.method === 'GET') { await download(runtime, user, path.split('/').at(-1)!, parsed.searchParams, response); return; }
      if (path === "/notify/subscribe") {
        response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
        const seen = new Set<string>();
        const deliver = (note: Notification): void => {
          if (seen.has(note.id)) return;
          seen.add(note.id);
          response.write(`id: ${note.id}\ndata: ${JSON.stringify(note)}\n\n`);
        };
        const iterator = runtime.broadcaster.subscribe(user.id)[Symbol.asyncIterator]();
        response.write("data: {}\n\n");
        const pump = (async () => {
          for (;;) {
            const { value, done } = await iterator.next();
            if (done) break;
            const parsed = notificationSchema.safeParse(value.data);
            if (parsed.success && parsed.data.target === user.id && parsed.data.unread) deliver(parsed.data);
          }
        })();
        const heartbeat = setInterval(() => response.write("data: {}\n\n"), 30_000);
        response.on("close", () => { clearInterval(heartbeat); void iterator.return?.(); });
        void pump.catch(() => undefined);
        return;
      }
      const method = request.method ?? "GET";
      const context = { path, method, query: parsed.searchParams, user, request, runtime, models: runtime.models, forms: runtime.forms, store: runtime.store,
        permUser: { id: user.id, deptLevels: orgService.getDeptLevels(user.deptId), roleIds: orgService.getUserRoleIds(user.id) } };
      for (const route of routeModules) {
        const result = await route(context);
        if (result === NOT_HANDLED) continue;
        if (result && typeof result === 'object' && '__binary' in result) {
          const binary = result as { __binary: string; filename: string };
          response.writeHead(200, { 'content-type': 'application/octet-stream', 'cache-control': 'no-store', 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(binary.filename)}`, 'access-control-expose-headers': 'Content-Disposition' });
          response.end(Buffer.from(binary.__binary, 'base64')); return;
        }
        send(response, 200, result); return;
      }
      throw new ApiError(501, `该功能尚未迁移: ${method} ${path}`);
    } catch (error) {
      const payload = classifyError(error, { method: request.method ?? "GET", path, tenant: runtime.tenant });
      send(response, payload.status, null, payload.message);
    }
  };
}

export function createHandler(base: Runtime) {
  const routers = new Map<string, (request: IncomingMessage, response: ServerResponse) => Promise<void>>();
  const routerFor = (runtime: Runtime) => {
    let router = routers.get(runtime.tenant);
    if (!router) { router = createRouter(runtime); routers.set(runtime.tenant, router); }
    return router;
  };
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    // Java TenantUtil: requests carry the tenant id; each tenant runs on its own store and task queue.
    const header = request.headers.tenantid ?? request.headers['tenant-id'] ?? request.headers['x-tenant-id'];
    const tenant = (Array.isArray(header) ? header[0] : header)?.trim() || tenantId;
    try {
      const runtime = await base.forTenant(tenant);
      await routerFor(runtime)(request, response);
    } catch (error) {
      const payload = classifyError(error, { method: request.method ?? "GET", path: request.url ?? "/", tenant });
      response.statusCode = payload.status; response.setHeader('content-type', 'application/json'); response.end(JSON.stringify({ code: payload.status, data: null, msg: payload.message }));
    }
  };
}

export async function startServer(port = Number(process.env.PORT ?? 2048)) {
  const runtime = await createRuntime();
  const handler = createHandler(runtime), server = createServer((request, response) => { void handler(request, response); });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  return { server, runtime, async close() { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); await runtime.close(); } };
}
if (require.main === module) {
  startServer().then((app) => {
    console.info(`Workflow API: http://localhost:${process.env.PORT ?? 2048}`);
    let closing = false;
    const close = () => { if (!closing) { closing = true; void app.close().then(() => process.exit(0)); } };
    process.once("SIGINT", close); process.once("SIGTERM", close);
  }).catch(() => { console.error("Workflow service failed to start. Check Temporal connection and local storage configuration."); process.exitCode = 1; });
}
