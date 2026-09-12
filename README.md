# wflow-platform

> 通用声明式工作流平台：**TypeScript + Temporal** 驱动，可持久化、可重放、可扩展。
> 引擎核心 [`wflow-core`](https://github.com/Ethan0x0000/wflow-core) 独立开源，本仓库提供宿主服务、可视化设计器与工作台。

---

## 🌟 平台定位

`wflow-platform` 是一套面向业务系统的工作流平台参考实现：引擎只负责**确定性的流程编排**，组织、权限、表单、通知、存储等全部通过 Host Adapter 注入。它不绑定任何行业或数据库，可嵌入任意 TypeScript 后端。

| 维度 | 平台能力 |
|---|---|
| **执行模型** | Durable Execution：代码即状态机，长时等待零线程/零轮询，崩溃后事件重放自愈 |
| **流程定义** | JSON DSL（`schemaVersion: 1`），严格校验；人工审批、自动化动作、网关、子流程、`forEach`、`eventGateway` 等 |
| **状态管理** | Temporal Event Sourcing + 确定性重放，引擎核心零 DB 依赖 |
| **系统解耦** | CQRS 读写分离：命令走 Temporal Update，读模型由宿主投影落库 |
| **组织与选人** | 部门层级、递归向上穿透、逐级主管、角色/组、多维动态规则（由宿主 `resolveAssignees` 实现） |
| **条件表达式** | 确定性条件 AST + SpEL 翻译白名单；JS/EL 脚本在受控预算内执行 |
| **可观测与安全** | 活动级 telemetry hook；AES-256-GCM Payload Codec；结构化错误码目录 |

---

## 📂 仓库结构

```text
wflow-platform/
├── packages/
│   └── api-contract/             # 【共享】前后端共享 DTO 契约
├── apps/
│   ├── server/                   # 【宿主】Temporal Worker + REST API + 组织树/存储适配
│   ├── web/                      # 【前端·Vue 3】设计器与工作台（迁移参考）
│   └── web-react/                # 【前端·React】设计器与工作台（当前主线）
├── docs/                         # 【文档】架构、快速上手、SDK 指南与能力矩阵
└── .github/workflows/ci.yml      # CI：install → type-check → test → build
```

引擎 SDK 位于独立仓库 <https://github.com/Ethan0x0000/wflow-core>，本仓库通过 git 依赖 `github:Ethan0x0000/wflow-core#v0.1.0` 引用。

---

## 🚀 快速启动

### 环境要求
- **Node.js** `>= 22.0.0`
- **pnpm** `>= 10.0.0`
- **Temporal**：可选，`apps/server` 默认内置本地开发实例（`@temporalio/testing`）

### 1. 安装与构建
```bash
pnpm install

pnpm build          # server + Vue 前端
# 或：pnpm build:react   # server + React 前端
```

### 2. 启动开发环境

```bash
pnpm dev:server     # 宿主服务，http://localhost:2048（自动拉起本地 Temporal + SQLite）
pnpm dev:web        # Vue 3 前端，http://localhost:3000
pnpm dev:react      # React 前端，http://localhost:3001（当前主线）
```
两个前端都会把 `/api` 代理到 `2048`。默认演示账户：右上角头像可切换管理员、各部门主管与普通员工。

### 3. 功能体验
- **流程设计器**：审批节点、分支条件、Router 路由跳转、抄送、表单权限的可视化拖拽配置与发布。
- **发起与审批**：发起流程、待办任务（签名/同意/加签/驳回）、实时流程图预览与流转历史。
- **打印**：实例详情支持默认打印与自定义模板设计。

---

## 🧪 测试与质量保障

| 套件 | 命令 | 通过数 |
|---|---|---|
| Server | `pnpm --filter server test` | 45 |
| React 前端 | `pnpm --filter web-react test` | 48 |
| Vue 前端 | `pnpm --filter web test` | 3 |
| SDK 单元 | 在 [wflow-core 仓库](https://github.com/Ethan0x0000/wflow-core) 运行 `pnpm test` | 159 |
| SDK 重放/集成 | 在 wflow-core 仓库运行 `pnpm test:integration` | 64 |

```bash
pnpm type-check      # server + React 前端类型检查
pnpm lint            # ESLint（CI 同款）
pnpm test            # server + Vue + React
pnpm test:react      # server + React
```

> CI（`.github/workflows/ci.yml`）执行 install → type-check → test → build。
> SDK 的 Temporal 集成测试会真实拉起运行时，建议避免与 dev server 并行。

---

## 📖 文档导航

- [快速上手 (`docs/quickstart.md`)](./docs/quickstart.md)：本地启动、双前端、外部 Temporal 与环境变量。
- [系统架构 (`docs/architecture.md`)](./docs/architecture.md)：确定性执行、状态机模型与 CQRS 分层。
- [SDK 接入指南 (`docs/sdk-guide.md`)](./docs/sdk-guide.md)：引用 SDK、编写 Host Adapters 与自定义节点。
- [SDK 路线图 (`docs/sdk-roadmap.md`)](./docs/sdk-roadmap.md)：范围决策、非目标、能力现状与版本/回放策略。

## 📄 许可

MIT