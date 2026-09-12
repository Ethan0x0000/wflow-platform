# 本地快速上手与运行指南

本文档介绍如何在本地拉起开发环境，体验完整的 TypeScript + Temporal 工作流引擎设计、流转与审批全流程。

---

## 1. 基础环境准备

- **操作系统**: macOS / Linux / Windows WSL2
- **Node.js**: `22.x` 或更高版本（推荐使用 `nvm use 22`）
- **pnpm**: `10.x` (`corepack enable && corepack use pnpm@10.34.5` 或 `npm i -g pnpm`)
- **Docker / OrbStack**（可选，仅在使用外部 Temporal 集群时需要）

---

## 2. 纯 TypeScript + Temporal 环境启动（推荐）

TS 重构版本做到了**开箱即用**：`apps/server` 内置了 `@temporalio/testing` 的本地持久化 Temporal 运行实例，无需提前在本地配置复杂的 Temporal 集群或 Docker 容器。

### 步骤一：安装依赖与构建
在 `wflow-platform` 根目录执行：

```bash
pnpm install
pnpm build          # server + Vue 前端
# 或：pnpm build:react   # server + React 前端
```

### 步骤二：启动 TS 服务端 (端口 2048)
```bash
pnpm dev:server
```
控制台将输出：
```text
Temporal CLI 1.8.3 (Server 1.31.2, UI 2.50.1)
Temporal Server: localhost:xxxxx
Workflow bundle created { taskQueue: 'wflow-workflows' }
Worker state changed { state: 'RUNNING' }
```
此时后端已在 `http://127.0.0.1:2048` 监听 HTTP 请求，Temporal Worker 开始监听任务队列。

### 步骤三：启动前端（二选一）
**Vue 3 原版（端口 3000）**：
```bash
pnpm dev:web
```
访问浏览器：**`http://localhost:3000`**

**React 重写版（端口 3001，当前主线）**：
```bash
pnpm dev:react
```
访问浏览器：**`http://localhost:3001`**

两个前端都会将 `/api` 请求代理到 2048 端口。

### 步骤四：功能体验
- **右上角身份切换**：点击右上角用户头像，可以在 旅人（管理员）、各部门主管、普通员工之间无缝切换。
- **流程设计器**：进入“管理后台” -> “流程设计”，可进行审批节点、分支条件、Router 路由跳转、抄送、表单权限的可视化拖拽配置与发布。
- **工作台发起与审批**：
  - “发起流程”：填写表单并提交。
  - “待办任务”：查看指派给当前人员的任务，支持手写签名、同意、加签、驳回（指定节点或流程结束）。
  - “流程图预览”：实时查看当前审批节点所处状态和历史操作流转记录。
- **打印**：实例详情支持默认打印与自定义模板打印/设计器。

---

## 3. 连接独立部署的外部 Temporal 集群（生产/集成模式）

如果本地或机房已有运行中的 Temporal 集群（例如 `127.0.0.1:7233`），可通过环境变量直接接入：

```bash
export TEMPORAL_ADDRESS="127.0.0.1:7233"
export TEMPORAL_NAMESPACE="default"
export TEMPORAL_TASK_QUEUE="wflow-workflows"

pnpm dev:server
```
此时 `apps/server` 将直连外部集群，不再启动本地嵌入式 Temporal 服务。

---

## 4. 测试用例运行说明

当前基线：Server 45、React 前端 48、Vue 前端 3。SDK 单元 159、SDK Temporal 集成 64 在独立仓库 [`wflow-core`](https://github.com/Ethan0x0000/wflow-core) 内运行。

```bash
# 1. Server 宿主接口与数据恢复测试
pnpm --filter server test

# 2. 前端测试（Vue / React 二选一）
pnpm --filter web test
pnpm --filter web-react test

# 快捷组合
pnpm test        # server + Vue + React
pnpm test:react  # server + React
```

类型检查与代码检查：
```bash
pnpm type-check        # server + React 前端
pnpm type-check:react  # 仅 React 前端
pnpm lint              # ESLint（CI 同款）
```
