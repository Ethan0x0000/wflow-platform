import { NOT_HANDLED, type RouteContext } from "./shared.js";

export async function miscRoutes(context: RouteContext): Promise<unknown> {
  const { path, user } = context;
  if (path === "/auth/me") return user;
  return NOT_HANDLED;
}
