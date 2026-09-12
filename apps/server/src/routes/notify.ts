import { z } from "zod";
import type { NotificationRow } from "@wflow/api-contract";
import { notificationSchema } from "../runtime.js";
import { NOT_HANDLED, body, idSchema, page, type RouteContext } from "./shared.js";

export async function notifyRoutes(context: RouteContext): Promise<unknown> {
  const { path, method, query, user, request, store } = context;
  if (path === "/notify/list") return page<NotificationRow>(store.list("notification", notificationSchema).filter((n) => n.target === user.id && n.unread).reverse(), query);
  if (path === "/notify/testSend") return "ok";
  if (path === "/notify/confirm" && method === "POST") {
    const input = await body(request), ids = Array.isArray(input) ? z.array(idSchema).parse(input) : undefined;
    store.transaction(() => { for (const note of store.list("notification", notificationSchema).filter((n) => n.target === user.id && n.unread && (!ids || ids.includes(n.id)))) store.put("notification", note.id, { ...note, unread: false }); }); return "消息已读";
  }
  return NOT_HANDLED;
}
