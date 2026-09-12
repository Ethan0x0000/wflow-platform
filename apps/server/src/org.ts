import { ApiError } from "./models.js";

export interface DeptItem {
  id: string;
  name: string;
  parentId: string;
  leaders?: string;
  sort?: number;
}

export interface UserItem {
  id: string;
  name: string;
  avatar: string;
  deptId: string;
  deptName: string;
  admin: boolean;
  mobile?: string;
  email?: string;
  status?: string;
  motto?: string;
  signature?: string;
  sex?: boolean;
}

export interface RoleItem {
  id: string;
  name: string;
}

export interface GroupItem {
  id: string;
  name: string;
}

export class OrgService {
  private depts: Map<string, DeptItem> = new Map();
  private users: Map<string, UserItem> = new Map();
  private roles: Map<string, RoleItem> = new Map();
  private groups: Map<string, GroupItem> = new Map();
  private userDepts: Map<string, Set<string>> = new Map();
  private userRoles: Map<string, Set<string>> = new Map();
  private userGroups: Map<string, Set<string>> = new Map();

  constructor() {
    this.seed();
  }

  private seed(): void {
    const rawDepts: DeptItem[] = [
      { id: "1486186", name: "wflow软件技术", parentId: "0", leaders: "381496", sort: 0 },
      { id: "231535", name: "生产管理部", parentId: "1486186", sort: 1 },
      { id: "264868", name: "行政人事部", parentId: "1486186", sort: 2 },
      { id: "589958", name: "财务部", parentId: "1486186", sort: 3 },
      { id: "4319868", name: "销售服务部", parentId: "1486186", leaders: "927438", sort: 4 },
      { id: "689698", name: "客服部", parentId: "4319868", leaders: "489564", sort: 5 },
      { id: "6179678", name: "研发部", parentId: "1486186", leaders: "6418616", sort: 6 },
      { id: "dept-hr", name: "人事部", parentId: "1486186", leaders: "u-manager", sort: 7 },
    ];
    for (const d of rawDepts) this.depts.set(d.id, d);

    const rawRoles: RoleItem[] = [
      { id: "1", name: "管理员" },
      { id: "2", name: "人事" },
      { id: "3", name: "财务" },
      { id: "4", name: "研发" },
      { id: "5", name: "销售" },
      { id: "role-admin", name: "系统管理员" },
    ];
    for (const r of rawRoles) this.roles.set(r.id, r);

    const rawGroups: GroupItem[] = [
      { id: "1", name: "大头组" },
      { id: "2", name: "项目一组" },
      { id: "3", name: "骨干员工" },
    ];
    for (const g of rawGroups) this.groups.set(g.id, g);

    const rawUsers: UserItem[] = [
      { id: "u-employee", name: "申请人 · 王小明", avatar: "", deptId: "dept-hr", deptName: "人事部", admin: false, email: "employee@wflow.com", mobile: "18800000001" },
      { id: "u-manager", name: "审批人 · 李经理", avatar: "", deptId: "dept-hr", deptName: "人事部", admin: false, email: "manager@wflow.com", mobile: "18800000002" },
      { id: "u-admin", name: "流程管理员", avatar: "", deptId: "dept-hr", deptName: "人事部", admin: true, email: "admin@wflow.com", mobile: "18800000000" },
      { id: "381496", name: "旅人", avatar: "https://foruda.gitee.com/avatar/1677027673763890815/4928216_willianfu_1594015042.png", deptId: "1486186", deptName: "wflow软件技术", admin: true, email: "lvren@wflow.com", mobile: "13654789954", motto: "今天不学习，明天变垃圾🤔", status: "疯狂工作中😭" },
      { id: "327382", name: "李富贵", avatar: "https://dd-static.jd.com/ddimg/jfs/t1/188230/26/28979/10654/633026fdEf64e5e84/fc5c07ab3d5eac19.png", deptId: "6179678", deptName: "研发部", admin: false, email: "fugui@wflow.com", mobile: "18945687745" },
      { id: "489564", name: "李秋香", avatar: "", deptId: "689698", deptName: "客服部", admin: false, email: "qiuxiang@wflow.com", mobile: "18970452254" },
      { id: "568898", name: "王翠花", avatar: "https://dd-static.jd.com/ddimg/jfs/t1/204270/25/26917/8646/63302601E2794a142/5b75f81e6d0c4856.png", deptId: "4319868", deptName: "销售服务部", admin: false, email: "cuihua@wflow.com", mobile: "1978456879" },
      { id: "927438", name: "隔壁老王", avatar: "https://dd-static.jd.com/ddimg/jfs/t1/21515/30/18678/11719/633025abEe734404d/c2950fef75e96028.png", deptId: "4319868", deptName: "销售服务部", admin: false, email: "laowang@wflow.com", mobile: "18544665522" },
      { id: "3243678", name: "狗剩", avatar: "https://dd-static.jd.com/ddimg/jfs/t1/177987/31/29200/17909/63302676E5c00167f/13c59e53269e9f67.png", deptId: "1486186", deptName: "wflow软件技术", admin: false, email: "gousheng@wflow.com", mobile: "17895487458" },
      { id: "3286432", name: "铁蛋", avatar: "https://dd-static.jd.com/ddimg/jfs/t1/203154/8/26845/14302/633026b7Ea9b381f7/7e7c5d96fcda0d39.png", deptId: "1486186", deptName: "wflow软件技术", admin: false, email: "tiedan@wflow.com", mobile: "13517552465" },
      { id: "6418616", name: "张三", avatar: "", deptId: "6179678", deptName: "研发部", admin: false, email: "zhangsan@wflow.com", mobile: "13544123549" },
      { id: "8902743", name: "张秋梅", avatar: "", deptId: "689698", deptName: "客服部", admin: false, email: "qiumei@wflow.com", mobile: "17894578965" },
      { id: "61769798", name: "李四", avatar: "", deptId: "231535", deptName: "生产管理部", admin: false, email: "lisi@wflow.com", mobile: "17254879854" },
    ];
    for (const u of rawUsers) {
      this.users.set(u.id, u);
      this.userDepts.set(u.id, new Set([u.deptId]));
    }

    this.userRoles.set("u-admin", new Set(["1", "role-admin"]));
    this.userRoles.set("381496", new Set(["1"]));
    this.userRoles.set("489564", new Set(["2"]));
    this.userRoles.set("568898", new Set(["3"]));
    this.userRoles.set("6418616", new Set(["4"]));
    this.userRoles.set("327382", new Set(["4"]));
    this.userRoles.set("927438", new Set(["5"]));

    this.userGroups.set("381496", new Set(["1"]));
    this.userGroups.set("927438", new Set(["1"]));
    this.userGroups.set("6418616", new Set(["1", "2"]));
    this.userGroups.set("327382", new Set(["2"]));
    this.userGroups.set("568898", new Set(["3"]));
    this.userGroups.set("489564", new Set(["3"]));
  }

  getUser(id: string): UserItem {
    const user = this.users.get(id);
    if (!user) throw new ApiError(404, `用户[${id}]不存在`);
    return user;
  }

  findUser(id: string): UserItem | undefined {
    return this.users.get(id);
  }

  listUsers(): UserItem[] {
    return [...this.users.values()];
  }

  getDept(id: string): DeptItem | undefined {
    return this.depts.get(id);
  }

  listDepts(): DeptItem[] {
    return [...this.depts.values()];
  }

  getRoles(): { id: string; name: string; type: "role" }[] {
    return [...this.roles.values()].map((r) => ({ id: r.id, name: r.name, type: "role" }));
  }

  getSysUserGroups(): { id: string; name: string; type: "group" }[] {
    return [...this.groups.values()].map((g) => ({ id: g.id, name: g.name, type: "group" }));
  }

  getOrgTree(deptId = "0", type = "org"): Array<{ id: string | number; name: string; type: "dept" | "user"; avatar?: string; isLeader?: boolean }> {
    const targetDeptId = String(deptId);
    const result: Array<{ id: string | number; name: string; type: "dept" | "user"; avatar?: string; isLeader?: boolean }> = [];
    for (const d of this.depts.values()) {
      if (d.parentId === targetDeptId) {
        result.push({ id: /^\d+$/.test(d.id) ? Number(d.id) : d.id, name: d.name, type: "dept" });
      }
    }
    if (type !== "dept") {
      const parentDept = this.depts.get(targetDeptId);
      for (const u of this.users.values()) {
        const depts = this.userDepts.get(u.id);
        if (depts && depts.has(targetDeptId)) {
          const isLeader = parentDept?.leaders ? parentDept.leaders.split(",").includes(u.id) : false;
          result.push({
            id: /^\d+$/.test(u.id) ? Number(u.id) : u.id,
            name: u.name,
            type: "user",
            avatar: u.avatar,
            isLeader,
          });
        }
      }
    }
    return result;
  }

  searchOrg(name: string, type = "user"): Array<{ id: string | number; name: string; type: "dept" | "user"; avatar?: string }> {
    const term = name.toLowerCase();
    const result: Array<{ id: string | number; name: string; type: "dept" | "user"; avatar?: string }> = [];
    if (type !== "dept") {
      for (const u of this.users.values()) {
        if (u.name.toLowerCase().includes(term) || u.id.includes(term)) {
          result.push({ id: /^\d+$/.test(u.id) ? Number(u.id) : u.id, name: u.name, type: "user", avatar: u.avatar });
          if (result.length >= 30) break;
        }
      }
    }
    if (type === "dept" || type === "org") {
      for (const d of this.depts.values()) {
        if (d.name.toLowerCase().includes(term)) {
          result.push({ id: /^\d+$/.test(d.id) ? Number(d.id) : d.id, name: d.name, type: "dept" });
          if (result.length >= 30) break;
        }
      }
    }
    return result;
  }

  getUserDetail(userId: string | number): unknown {
    const id = String(userId);
    const u = this.getUser(id);
    const depts = [...(this.userDepts.get(id) ?? [])].map((dId) => {
      const d = this.depts.get(dId);
      return { id: dId, name: d?.name ?? dId, type: "dept", leader: d?.leaders ?? null };
    });
    const roles = [...(this.userRoles.get(id) ?? [])].map((rId) => {
      const r = this.roles.get(rId);
      return { id: rId, name: r?.name ?? rId, type: "role" };
    });
    const groups = [...(this.userGroups.get(id) ?? [])].map((gId) => {
      const g = this.groups.get(gId);
      return { id: gId, name: g?.name ?? gId, type: "group" };
    });
    return {
      id: /^\d+$/.test(u.id) ? Number(u.id) : u.id,
      name: u.name,
      avatar: u.avatar,
      sex: u.sex ?? true,
      depts,
      roles,
      groups,
      mobile: u.mobile ?? "18888888888",
      email: u.email ?? "wflow@wflow.com",
      status: u.status ?? "疯狂工作中😭",
      motto: u.motto ?? "今天不学习，明天变垃圾🤔",
      signature: u.signature ?? null,
    };
  }

  getUserDepts(userId: string | number): unknown[] {
    const id = String(userId);
    return [...(this.userDepts.get(id) ?? [])].map((dId) => {
      const d = this.depts.get(dId);
      return { id: dId, name: d?.name ?? dId, type: "dept", leader: d?.leaders ?? null };
    });
  }

  getUserRoleIds(userId: string | number): string[] {
    return [...(this.userRoles.get(String(userId)) ?? [])];
  }

  getUserSignature(userId: string | number): string | null {
    return this.findUser(String(userId))?.signature ?? null;
  }

  updateUserSignature(userId: string | number, signature: string): void {
    const u = this.findUser(String(userId));
    if (u) u.signature = signature;
  }

  getDeptLevels(deptId: string): string[] {
    const levels: string[] = [];
    let current: string | undefined = deptId;
    while (current && current !== "0") {
      levels.push(current);
      const d = this.depts.get(current);
      current = d?.parentId;
    }
    return levels;
  }

  getParentDepts(deptId: string): DeptItem[] {
    const parents: DeptItem[] = [];
    let current = this.depts.get(deptId)?.parentId;
    while (current && current !== "0") {
      const d = this.depts.get(current);
      if (!d) break;
      parents.push(d);
      current = d.parentId;
    }
    return parents;
  }

  getDeptLeaders(userId: string, deptId: string, level = 1, single = true, emptySkip = false): string[] {
    const dept = this.depts.get(deptId);
    if (!dept) return [];
    const chain = this.getParentDepts(deptId);
    if (dept.leaders !== userId) {
      chain.unshift(dept);
    }
    let leaders = chain.map((d) => d.leaders).filter((l): l is string => Boolean(l));
    if (emptySkip) leaders = leaders.filter(Boolean);
    if (single) {
      if (leaders.length < level) return [];
      return [leaders[level - 1]!];
    }
    if (level > 0) return leaders.slice(0, Math.min(level, leaders.length));
    return leaders;
  }

  getUsersByDept(deptIds: string[], nested = false): string[] {
    const allDeptIds = new Set<string>(deptIds);
    if (nested) {
      for (const d of this.depts.values()) {
        if (this.getDeptLevels(d.id).some((p) => deptIds.includes(p))) {
          allDeptIds.add(d.id);
        }
      }
    }
    const userIds = new Set<string>();
    for (const [uId, dIds] of this.userDepts) {
      for (const d of dIds) {
        if (allDeptIds.has(d)) userIds.add(uId);
      }
    }
    return [...userIds];
  }

  getUsersByDeptRole(deptIds: string[], roleIds: string[]): string[] {
    const deptUsers = new Set(this.getUsersByDept(deptIds, true));
    const roleUsers = new Set(this.getUsersByRoles(roleIds));
    return [...deptUsers].filter((u) => roleUsers.has(u));
  }

  getUsersByDeptGroup(deptIds: string[], groupIds: string[]): string[] {
    const deptUsers = new Set(this.getUsersByDept(deptIds, true));
    const groupUsers = new Set(this.getUsersByGroups(groupIds));
    return [...deptUsers].filter((u) => groupUsers.has(u));
  }

  getUsersByRoles(roleIds: string[]): string[] {
    const userIds = new Set<string>();
    for (const [uId, rIds] of this.userRoles) {
      for (const r of roleIds) {
        if (rIds.has(r)) userIds.add(uId);
      }
    }
    return [...userIds];
  }

  getUsersByGroups(groupIds: string[]): string[] {
    const userIds = new Set<string>();
    for (const [uId, gIds] of this.userGroups) {
      for (const g of groupIds) {
        if (gIds.has(g)) userIds.add(uId);
      }
    }
    return [...userIds];
  }
}

export const orgService = new OrgService();
