import { orgService } from "../org.js";
import { object } from "../models.js";
import { NOT_HANDLED, body, type RouteContext } from "./shared.js";

export async function orgRoutes(context: RouteContext): Promise<unknown> {
  const { path, method, query, user, request } = context;
  if (path === "/org/tree") {
    return orgService.getOrgTree(query.get("deptId") ?? "0", query.get("type") ?? "org");
  }
  if (path === "/org/reload" && method === "PUT") return "重载组织架构关系完成";
  if (path === "/org/search") {
    return orgService.searchOrg(query.get("name") ?? "", query.get("type") ?? "user");
  }
  if (path === "/org/roles") return orgService.getRoles();
  if (path === "/org/user/groups") return orgService.getSysUserGroups();
  if (path === "/org/user/signature") {
    if (method === "POST") {
      const input = object(await body(request));
      orgService.updateUserSignature(user.id, String(input.signature ?? ""));
      return "已保存";
    }
    return orgService.getUserSignature(user.id);
  }
  if (/^\/org\/user\/(depts\/[^/]+|[^/]+\/dept)$/.test(path)) {
    const parts = path.split("/");
    const targetUserId = parts.at(-1) === "dept" ? parts.at(-2)! : parts.at(-1)!;
    return orgService.getUserDepts(targetUserId);
  }
  if (path.startsWith("/org/user/detail/")) return orgService.getUserDetail(path.split("/").at(-1)!);
  return NOT_HANDLED;
}
