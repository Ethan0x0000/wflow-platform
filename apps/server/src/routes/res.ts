import { upload } from "../resources.js";
import { NOT_HANDLED, type RouteContext } from "./shared.js";

export async function resRoutes(context: RouteContext): Promise<unknown> {
  const { path, method, user, request, runtime } = context;
  if (path === '/res' && method === 'POST') return upload(runtime, user, request);
  if (path === '/res' && method === 'DELETE') return 'delete';
  return NOT_HANDLED;
}
