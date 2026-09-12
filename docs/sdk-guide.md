# SDK 开发使用与扩展指南

`wflow-core` 是一个框架无关、业务中立的通用流程引擎 SDK。任何 Node.js / TypeScript 后端项目均可引入该 SDK 快速获得企业级工作流编排能力。

---

## 1. 安装与包引入

```bash
pnpm add wflow-core @temporalio/client @temporalio/worker
```

SDK 对外暴露的核心模块：

- **客户端与控制**：`createWorkflowClient`、`WorkflowEngineClient`
- **Worker 与执行**：`createWorkflowWorker`、`runWorkflowWorker`、`createActivities`、`NativeConnection`、`resolveWorkflowsPath`
- **定义与校验**：`parseDefinition`、`validateFields`、`WorkflowValidationError`、`commandSchema`
- **条件与脚本**：`evaluate`、`executeScript`、`compileScript`、`translateSpel`
- **设计器模型导入**：`importWflowDefinition`、`importWflowProcessEvents`
- **扩展点**：`defineAction`、`defineNode`、`Adapters`（含可选的 `telemetry` 观测钩子）
- **测试工具**（`wflow-core/testing`）：`createMemoryAdapters`、`createTestEngine`
- **敏感数据加密**（`wflow-core/codec`）：`createAesGcmPayloadCodec`

---

## 2. 核心对接：实现宿主适配器 (Host Adapters)

SDK 采用依赖倒置设计，引擎不直接接触业务数据库，所有外部依赖通过 `Adapters` 注入：

```typescript
import { defineAction, defineNode, type Adapters } from "wflow-core";
import { z } from "zod";

export const myAdapters: Adapters = {
  // 1. 流程定义获取（宿主必须长期保留不可变的已发布版本）
  definitions: {
    async get(tenantId, ref) {
      const row = await db.workflowDefinitions.findUnique({
        where: { id_version: { id: ref.id, version: ref.version } },
      });
      return row.definition;
    },
  },

  // 2. 权限校验（start / read / command / list / signal 五类操作）
  //    list 用于 visibility 列表与计数，没有 instanceId，宿主必须自行实现（通常仅管理员）；
  //    signal 用于外部事件投递，参考实现同样仅允许管理员，且在实例记录存在前就会校验。
  async authorize({ operation, actorId, instanceId, command }) {
    if (operation === "start") return canStart(actorId, instanceId);
    if (operation === "list") return isAdmin(actorId);
    if (operation === "signal") return isAdmin(actorId);
    return canAct(actorId, command);
  },

  // 3. 人员解析：可返回 id 数组，或 { users|userIds, reason }（reason 对应 Java NodeReason）
  async resolveAssignees({ assignment, context }) {
    if (assignment.type === "users") return assignment.userIds;
    if (assignment.type === "initiator") return [context.initiatorId];
    if (assignment.type === "resolver") {
      const leader = await userService.findLeader(context.initiatorId);
      return { users: [leader.id], reason: "TRANSFER_LEADER" };
    }
    return [];
  },

  // 4. 业务动作（Action 节点）。defineAction 会在边界做 input/output 校验
  actions: new Map([
    [
      "finance.payment",
      defineAction({
        input: z.object({ amount: z.number(), account: z.string() }),
        output: z.object({ success: z.boolean() }),
        async execute(context, input) {
          await paymentService.transfer(input.amount, input.account);
          return { success: true };
        },
      }),
    ],
  ]),

  // 5. 宿主自定义节点（type: "custom"）。defineNode 在活动边界做可选 input/output 校验；
  //    返回 { output } 写入 resultKey，返回 { jumpTo } 跳转到顶层节点，未注册的 kind 以 UNKNOWN_NODE_KIND 失败。
  nodeHandlers: new Map([
    [
      "finance.riskCheck",
      defineNode({
        input: z.object({ threshold: z.number() }),
        output: z.object({ passed: z.boolean() }),
        async execute(context, config, data) {
          return { output: { passed: await riskService.check(context.businessKey, config.threshold, data) } };
        },
      }),
    ],
  ]),

  // 6. 事件投影（基于 event.eventId 幂等写入，再发送待办/站内信）
  async publishEvent(event) {
    await db.workflowEvents.create({ data: event });
    await noticeService.sendTaskNotice(event);
  },

  // 7. 可选：HTTP 监听器 / 跨实例 SIGNAL 投递（定义用到时才必需）
  async integrate(request) {
    if (request.type === "HTTP") return callHttp(request.config, request.data);
    return signalBus.deliver(request.config, request.data);
  },

  // 8. 可选：ProcSetting.formSync 业务数据同步（定义用到时才必需）
  async syncBusinessData({ event, rule, data }) {
    if (rule.type === "API") await post(`${rule.apiUrl}/${event}`, data);
  },

  // 9. 可选：轻量可观测钩子。每次引擎活动（authorize/resolveAssignees/executeAction/executeNode/
  //    integrate/syncBusinessData/loadDefinition/publishEvent）前后收到事件；运行在活动/Worker
  //    运行时（非 workflow 沙箱），hook 抛错会被吞掉，绝不影响流程。
  telemetry: {
    onActivity: ({ activity, phase, durationMs, error }) => metrics.observe(activity, phase, durationMs, error),
  },
};
```

`TelemetryEvent` 结构为 `{ activity, phase: "start" | "end" | "error", context?, error?, durationMs? }`：`context` 仅在活动请求携带实例上下文时提供，`durationMs` 出现在 `end`/`error` 阶段。hook 只用于轻量埋点；更深的指标与链路追踪请使用 Temporal Runtime metrics（`Runtime.install` + Prometheus/OTel exporter）与 client/worker interceptors，而不是扩展该钩子。

---

## 3. Worker 与客户端初始化

### 3.1 启动 Worker

```typescript
import { NativeConnection, createWorkflowWorker } from "wflow-core";
import { myAdapters } from "./my-adapters";

const connection = await NativeConnection.connect({ address: "127.0.0.1:7233" });

const worker = await createWorkflowWorker({
  connection,
  namespace: "default",
  taskQueue: "wflow-workflows",
  adapters: myAdapters,
});

await worker.run();
```

### 3.2 启动与操作流程实例

```typescript
import { Connection, Client } from "@temporalio/client";
import { createWorkflowClient } from "wflow-core";
import { myAdapters } from "./my-adapters";

const connection = await Connection.connect({ address: "127.0.0.1:7233" });
const temporal = new Client({ connection, namespace: "default" });

const engine = createWorkflowClient({
  client: temporal,
  taskQueue: "wflow-workflows",
  adapters: myAdapters,
});

// 发起流程
const { workflowId, result } = await engine.start({
  tenantId: "tenant-001",
  instanceId: "leave-req-9527",
  businessKey: "LEAVE-9527",
  initiatorId: "user-alice",
  definition: myDefinition,
  data: { days: 3, reason: "个人年假" },
});

// 审批通过（command 是判别联合，type 决定附加字段）
await engine.command({
  type: "approve",
  requestId: "req-approve-001",
  tenantId: "tenant-001",
  instanceId: "leave-req-9527",
  actorId: "user-bob",
  taskId: "task-001",
  comment: { text: "同意休假" },            // 任意 JSON 对象，server 层读取 .text
  signature: "data:image/png;base64,...",   // 可选，needSign 时必填
});

// 审批驳回（驳回后去向由节点 rejectRule 决定：NEXT / END / SKIP+target）
await engine.command({
  type: "reject",
  requestId: "req-reject-001",
  tenantId: "tenant-001",
  instanceId: "leave-req-9527",
  actorId: "user-bob",
  taskId: "task-001",
  comment: { text: "假期过长，请缩短后重提" },
});

// 读取快照（会走 authorize 的 read 校验）
const snapshot = await engine.snapshot({ tenantId: "tenant-001", actorId: "user-bob", instanceId: "leave-req-9527" });
```

> 其它命令：`complete`、`claim`、`transfer`、`addAssignee`（`position: before|after`）、
> `reassign`、`override`、`returnTo`、`withdraw`、`suspend`/`resume`、`migrate`、`cancel`、`event`。
> 同 `requestId` 重复提交幂等；相同 `requestId` 携带不同 payload 会被拒绝。

### 3.3 Payload 加密（可选，`wflow-core/codec`）

对表单/业务 JSON 等敏感数据做端到端加密时，使用 AES-256-GCM PayloadCodec。它位于独立子路径，是 SDK 中唯一引用 `node:crypto` 的模块，workflow bundle 不包含它：

```typescript
import { Client, Connection } from "@temporalio/client";
import { NativeConnection } from "@temporalio/worker";
import { createAesGcmPayloadCodec } from "wflow-core/codec";
import { createWorkflowClient, createWorkflowWorker } from "wflow-core";

// 32 字节密钥：环境变量/KMS 提供的 base64；{ keys, activeKeyId } 支持轮换。
const codec = createAesGcmPayloadCodec({ key: process.env.WORKFLOW_PII_KEY! });
const dataConverter = { payloadCodecs: [codec] };

const client = new Client({ connection: await Connection.connect({ address: "127.0.0.1:7233" }), namespace: "default", dataConverter });
const engine = createWorkflowClient({ client, taskQueue: "wflow-workflows", adapters: myAdapters });

const workerConnection = await NativeConnection.connect({ address: "127.0.0.1:7233" });
await createWorkflowWorker({ connection: workerConnection, namespace: "default", taskQueue: "wflow-workflows", adapters: myAdapters, dataConverter }).then((worker) => worker.run());
```

- 所有产生/消费 payload 的 Client 与 Worker 必须配置**同一个** dataConverter，否则互相无法解码；
- 除已加密（`binary/encrypted`）与无 data 的 payload 外全部加密；metadata 增加 `encryption-key-id`、`encoding: "binary/encrypted"` 与 `plain-encoding`（原始 encoding，解码时恢复，缺省按 `binary/plain`）；
- `data = nonce(12) || ciphertext || authTag(16)`，每个 payload 使用新的随机 nonce；`{ key }` 以 `default` 注册单密钥，`{ keys, activeKeyId }` 用 active key 加密、任意已注册 key 解密（轮换时保留旧 key 即可）；
- 篡改（认证标签不匹配）、缺失/未知 key id、截断密文或非 32 字节密钥都会抛出明确的 `ValueError`，绝不静默返回明文；
- search attributes 不是 payload，永远不经过 codec（在 visibility 存储中明文，禁止放 PII）；TypeScript 的 `memo` 会走 data converter，因此也会被该 codec 加密，需要明文 memo 的宿主请勿放入敏感值。在 Temporal Web UI/CLI 查看加密历史需要部署复用同一 codec 的 Codec Server。

未配置 codec 时行为完全不变。

---

## 4. 流程定义格式与 Schema

SDK 定义是格式严谨的 JSON 结构，通过 `parseDefinition` 校验：

```typescript
import { parseDefinition } from "wflow-core";

const definition = parseDefinition({
  schemaVersion: 1,
  id: "proc-leave",
  version: 1,
  name: "员工请假申请",
  inputFields: [{ key: "days", type: "number", required: true }],
  nodes: [
    {
      id: "node-1",
      name: "主管审批",
      type: "approval",
      mode: "any",                                  // any 或签 / all 会签 / sequential / percentage / candidate
      needSign: true,
      assignees: { type: "resolver", name: "getLeader" }, // 或 { type: "users", userIds } / { type: "initiator" }
      timeout: { afterMs: 86_400_000, outcome: "approve" }, // outcome: approve / reject / notify
      rejectRule: { type: "SKIP", target: "node-1" },       // NEXT（默认）/ END / SKIP
    },
    {
      id: "node-router",
      name: "动态路由判断",
      type: "router",
      when: { op: "gt", left: { path: ["days"] }, right: { value: 3 } },
      targetNodeId: "node-director",
    },
    {
      id: "node-director",
      name: "总监审批",
      type: "approval",
      mode: "any",
      assignees: { type: "users", userIds: ["user-director"] },
    },
  ],
});
```

其它可用节点：`task`、`cc`、`action`、`delay`、`delayUntil`、`wait`、`child`、`trigger`、
`terminate`、`custom`、`exclusive`/`inclusive`（分支数组）、`parallel`、`loop`、`forEach`、`eventGateway`。

### 4.1 集合循环 `forEach`（明细逐条审批）

`items` 解析结果必须是 JSON 数组：缺失、`null` 或非数组时流程以 `FOREACH_REQUIRES_ARRAY` 失败；
`items.length > maxIterations` 时以 `FOREACH_LIMIT_REACHED` 失败（不会静默截断）。
默认顺序执行：每轮把当前元素写入 `itemKey`（可选 `indexKey` 写入下标），执行 `nodes`，
随后求值 `completionCondition`，为真则提前结束；`itemKey`/`indexKey` 在顺序模式下保留最后一轮的值。
`parallel: true` 时按 `concurrency`（默认 4，范围 1-32）分批并发，每轮使用局部变量副本，
只把非 `itemKey`/`indexKey` 的键合并回主变量；同一键整体上按元素顺序由后写入者覆盖（含后续批次）；
`completionCondition` 仅支持顺序模式。

```typescript
const each = {
  id: "lines",
  type: "forEach",
  items: { path: ["expenseLines"] },          // 或 { value: [...] }
  itemKey: "line",
  indexKey: "lineNo",
  maxIterations: 200,
  completionCondition: { op: "exists", value: { path: ["lineDone"] } },
  nodes: [{ id: "line-review", type: "task", mode: "all", assignees: { type: "users", userIds: ["finance"] } }],
};
```

### 4.2 事件网关 `eventGateway`（事件/定时竞速）

每个分支必须且只能声明 `event` 或 `timeoutMs` 之一（`timeoutMs` 上限一年），分支最多 32 个。
引擎为每个 event 分支注册等待并发出 `workflow.waitCreated`；最先收到的事件分支获胜，
若没有事件则在最早到期的定时分支获胜（并列取较小分支下标），其余等待全部取消
（之后对该 waitId 发送 `event` 命令返回 `WAIT_NOT_ACTIVE`）。获胜的 event 分支可用 `resultKey`
保存事件载荷；定时分支不写入任何结果键。进入网关前已缓存的外部信号也会按到达顺序参与竞速
（见 7.4 节）。

```typescript
const race = {
  id: "signed",
  type: "eventGateway",
  branches: [
    { event: "contract.signed", resultKey: "signature", nodes: [/* ... */] },
    { timeoutMs: 86_400_000, nodes: [/* ... */] },
  ],
};
```

### 4.3 宿主自定义节点 `custom`

`custom` 节点让宿主在不 fork SDK 的前提下扩展节点类型：`kind`（1–128 字符）在 `Adapters.nodeHandlers` 上选择处理器，`config` 为随定义固化的有界 JSON，`resultKey` 与其他叶子节点一样参与写入冲突校验。

```typescript
const definition = parseDefinition({
  schemaVersion: 1, id: "leave", version: 1, name: "员工请假申请",
  nodes: [
    { id: "verify", type: "custom", kind: "finance.riskCheck", config: { threshold: 0.8 }, resultKey: "risk" },
  ],
});
```

处理器始终在活动（`executeNode`）中执行，绝不在 workflow 沙箱内运行：workflow 只派发已记录到 history 的 `context`/`config`/`data` 并消费记录的结果，因此宿主的 I/O、随机数、当前时间不会破坏回放的确定性。`defineNode` 与 `defineAction` 对应，在活动边界按可选 `input`/`output` schema 校验 `config` 与 `outcome.output`；`context` 为 `{ tenantId, instanceId, businessKey, initiatorId, definition, executionId, nodeId }`，输入输出同样受现有 JSON 上限约束。

执行语义：

- 返回 `output` 时写入节点 `resultKey`；未声明 `resultKey` 时输出被丢弃（与其它无结果键节点一致）；处理器没有返回 `output` 时在 `resultKey` 下写入 `null`；
- 返回 `jumpTo` 时必须指向当前定义的**顶层**节点：工作流内校验后发出 `workflow.nodeCompleted`（`action: "custom_jump"`、`target`），随后像 `router` 一样取消 scope 并按节点 id 重定位（绝不按下标）；目标不存在时实例以 `INVALID_JUMP_TARGET` 失败；`jumpTo` 存在时忽略 `output`；
- `kind` 未注册（或宿主未提供 `nodeHandlers`）时活动以不可重试的 `UNKNOWN_NODE_KIND` 失败；处理器抛出 `AdapterError` 时保留安全错误码与重试意图，不泄露宿主消息；
- 进入/离开事件监听器与步骤计数与其他叶子节点一致，可在网关、循环、`forEach` 内部使用。

测试工具包可直接传入 `nodeHandlers`：`createMemoryAdapters({ nodeHandlers: new Map([...]) })`。

---

## 5. 条件表达式与 AST

条件是一个可嵌套的判别联合，操作数要么是常量 `{ value: Json }`，要么是数据路径 `{ path: ["form","days"] }`：

- **组合**：`and` / `or`（`conditions: []`）、`not`
- **存在性**：`exists` / `empty`
- **比较**：`eq`、`ne`、`gt`、`gte`、`lt`、`lte`、`in`、`contains`
- **区间**：`between`；**时间**：`before`、`after`、`timeBetween`
- **发起人维度**：`{ op: "initiator", dimension: "user" | "dept" | "role", compare: "in" | "has", values: [] }`
- **脚本**：`{ op: "eval", lang: "el" | "js", script: "..." }`（与 Java EL/JS 对等，沙箱强度见差距矩阵）

```typescript
const condition = {
  op: "and",
  conditions: [
    { op: "gt", left: { path: ["days"] }, right: { value: 3 } },
    { op: "initiator", dimension: "dept", compare: "in", values: ["dept-001"] },
  ],
};
```

引擎内部为确定性求值；`eval` 分支经 `translateSpel` 常用面或编译后的 JS 执行。

---

## 6. 测试工具包 `wflow-core/testing`

SDK 提供独立的 `./testing` 子路径，内置 Temporal 时间跳跃测试环境与内存适配器，无需启动 Temporal Server 即可测试流程定义与宿主适配器。主入口不引用 `@temporalio/testing`；该包是可选 peerDependency，仅在使用测试子路径时需要安装（版本需与 `@temporalio/worker` 一致）：

```bash
pnpm add -D @temporalio/testing
```

```typescript
import { createMemoryAdapters, createTestEngine } from "wflow-core/testing";
import { myDefinition } from "./my-definition";

const memory = createMemoryAdapters({
  definitions: myDefinition,           // 也可传 Definition[] / DefinitionStore / { get() }
  users: { getLeader: ["u-manager"] }, // resolver 名称（或 nodeId）-> 用户 id
});

const test = await createTestEngine({ adapters: memory.adapters });
try {
  await test.run(async () => {
    const started = await test.engine.start({
      tenantId: "tenant-001",
      instanceId: "leave-1",
      businessKey: "leave-1",
      initiatorId: "u-alice",
      definition: myDefinition,
      data: {},
    });
    // 用 test.engine.snapshot / command 驱动流程；memory.events 收集按 eventId 去重后的事件
    await started.result();
  });
} finally {
  await test.close();
}
```

- `createMemoryAdapters(overrides?)`：内存 DefinitionStore、默认放行的 `authorize`、基于 users map 的 `resolveAssignees`、actions Map、`nodeHandlers` Map（`custom` 节点处理器）、按 `eventId` 去重的事件数组，以及可选的 `integrate` / `syncBusinessData` / `onEvent`。
- `createTestEngine(options?)`：返回 `{ environment, engine, worker, taskQueue, run, close }`；默认使用 `TestWorkflowEnvironment.createTimeSkipping()` 与 `maxCachedWorkflows: 0`，可传入已有 environment、自定义 taskQueue 与 `workerOptions`；`startWorker: false` 时只创建环境与客户端。
- `resolveWorkflowsPath()`：返回随包发布的默认 workflow bundle 入口（`dist/workflows.js`）绝对路径；`createWorkflowWorker` 未显式传 `workflowsPath` 时使用它。

子路径导出为 `.`、`./client`、`./worker`、`./workflows`、`./protocol`、`./testing`、`./codec`、`./package.json`，每个子路径均提供 CJS/ESM 双构建与各自类型声明；宿主 Temporal 版本需与 SDK 依赖的 `1.23.x` 保持一致。

---

## 7. 客户端进阶能力

### 7.1 `start` 透传宿主选项

`engine.start(input, options?)` 将可选 Temporal 启动选项透传给 `client.workflow.start`；未提供的字段保持原默认值（冲突策略 `FAIL`、复用策略 `REJECT_DUPLICATE`、以及创建客户端时的 taskQueue）：

```typescript
const started = await engine.start(input, {
  taskQueue: "wflow-workflows-high",
  memo: { source: "leave-portal" },
  searchAttributes: { Tenant: ["acme"] },
  workflowExecutionTimeout: "30 days",
  workflowRunTimeout: "1 day",
  workflowTaskTimeout: "10 seconds",
  workflowIdConflictPolicy: WorkflowIdConflictPolicy.USE_EXISTING,
  workflowIdReusePolicy: WorkflowIdReusePolicy.ALLOW_DUPLICATE,
});
```

### 7.2 列表、计数与描述

`list` / `count` 基于 Temporal visibility（`client.workflow.list` / `client.workflow.count`），`describe` 基于 `handle.describe()`，均返回稳定、可 JSON 序列化的结构。三者都会先做权限校验：`list` 与 `count` 使用 `authorize({ operation: "list" })`（**宿主必须实现该操作**，参考实现仅允许管理员），`describe` 使用原有 `read` 校验。visibility 查询串原样透传，请在查询中限定租户（例如租户搜索属性）或在 `authorize` 中强制租户隔离。

```typescript
const query = 'ExecutionStatus = "Running"';
const { count } = await engine.count({ tenantId: "tenant-001", actorId: "user-alice", query });
for await (const wf of await engine.list({ tenantId: "tenant-001", actorId: "user-alice", query, pageSize: 100 })) {
  console.log(wf.workflowId, wf.status, wf.startTime, wf.searchAttributes);
}
const info = await engine.describe({ tenantId: "tenant-001", actorId: "user-alice", instanceId: "leave-1" });
console.log(info.isRunning, info.pendingActivityCount, info.historyLength);
```

### 7.3 等待事件 `waitEvent`

`waitEvent` 用于驱动 `wait` 节点：内部先查询快照找到 `event` 匹配的活跃等待，再复用 `event` 命令（requestId 幂等）。未匹配时抛出 `WAIT_NOT_ACTIVE`（`WorkflowValidationError`），调用方可稍后重试：

```typescript
await engine.waitEvent({
  tenantId: "tenant-001", actorId: "user-alice", instanceId: "leave-1",
  event: "contract.signed", data: { by: "user-bob" },
});
```

### 7.4 外部信号 `signal` 与 `startOrSignal`

`engine.signal` 通过 Temporal 信号 `workflowEventV1` 投递外部事件；载荷为 `{ event, data? }`，其中 `event` 为 1–128 字符，`data` 为受 512KB 上限约束的 JSON。发送前先执行 `authorize({ operation: "signal" })`。有 `wait` 节点或 `eventGateway` 事件分支在等待同名事件时直接命中；否则工作流按到达顺序缓存：

```typescript
await engine.signal({
  tenantId: "tenant-001", actorId: "user-alice", instanceId: "leave-1",
  event: "contract.signed", data: { by: "user-bob" },
});
```

`engine.startOrSignal(input, { event, data }, options?)` 先做 `start` 与 `signal` 两次授权，再调用 Temporal `signalWithStart`：实例不存在时启动，存在时仅投递信号（默认 `workflowIdConflictPolicy: USE_EXISTING`）。其返回的 `existing` 恒为 `false`，因为 Temporal 不返回本次是启动还是投递；需要区分时请使用 `startOrGet`。参考实现 server 将 `signal` 限制为管理员，并且不要求实例记录已存在（否则 signalWithStart 首次启动无法通过授权）。

```typescript
const started = await engine.startOrSignal(
  { tenantId: "tenant-001", instanceId: "leave-1", businessKey: "LEAVE-1", initiatorId: "user-alice", definition, data: {} },
  { event: "contract.signed", data: { by: "user-bob" } },
);
const result = await started.result();
```

缓存与消费规则（确定性、有界）：

- 没有匹配的活跃等待时进入 FIFO 缓冲，最多 100 条，超出时丢弃最旧的一条（不会导致流程失败）；
- `wait` 节点在注册等待前消费第一个同名缓存事件（不匹配的事件继续保留在缓冲中）；`eventGateway` 按到达顺序消费缓存事件，每条解析到最早未接收的匹配分支，因此到达顺序决定竞速胜者，而不是分支顺序；
- 等待出现之前投递的信号只被消费一次；`continueAsNew` 的安全边界会把缓存事件带入新 run 继续消费；流程进入终态后信号被丢弃；格式非法的载荷被忽略，不会使 workflow task 失败；
- 信号回执由节点流程发出（signal handler 不做任何活动调用、不抛异常）：`workflow.waitCreated` 之后是 `workflow.eventReceived`，details 为 `{ waitId, event, source: "signal" }`。信号不携带身份，需要 `actorId`/`requestId` 审计时继续使用 `waitEvent` / `event` 命令（operation 为 `command`）。

### 7.5 命令超时与 not-found

`engine.command(command, { updateTimeout })` 会把超时透传到 Temporal update 选项。`isWorkflowNotFound(error)` 用于判断 Temporal `WorkflowNotFoundError`（跨包副本时按错误名兜底）。

### 7.6 活动与事件投递重试

`definition.settings.activity` / `definition.settings.eventDelivery` 在流程定义（随 workflow input 固化、确定性）中配置活动重试；默认值与历史行为一致（30s start-to-close、5 次尝试、初始 1s）。Action 节点的 `retry` 配置优先于 `activity`。`eventDelivery.maximumAttempts` 缺省时保持“无限重试、投递成功前阻塞”的旧行为；设置后在重试耗尽时流程以 `EVENT_DELIVERY_FAILED` 失败，而不是永久等待。

### 7.7 `AdapterError`

宿主适配器可抛出 `AdapterError` 携带安全错误码与重试意图；活动边界会映射为 `ApplicationFailure`，仅保留错误码，不泄露宿主消息或堆栈：

```typescript
import { AdapterError } from "wflow-core";
try { await store.append(event); }
catch (cause) { throw new AdapterError("PROJECTION_UNAVAILABLE", { retryable: true, cause }); }
```

### 7.8 长历史 `continueAsNew` 与幂等启动 `startOrGet`

`definition.settings.continueAsNewAfterEvents`（整数，取值 100–50,000）用于长流程的历史治理：当当前 run 的 `workflowInfo().historyLength` 达到阈值，且处于**顶层安全边界**时，引擎调用 Temporal `continueAsNew`，把固定定义、已变更的业务 `data` 与有界 `resume` 状态交给下一个 run。安全边界要求：没有活跃人工任务/等待、未挂起/取消、没有待处理的退回/撤回跳转、所有 update/signal handler 已结束、事件投递已全部完成。嵌套容器（网关/循环/forEach/子流程）总是先跑完当前容器，不会被中途打断。新 run 不会重复发布 `workflow.started`，也不会重跑 start 授权、`create` 侧 `formSync` 与 startup 监听器。

```typescript
const definition = parseDefinition({
  schemaVersion: 1, id: "leave", version: 1, name: "Leave",
  settings: { continueAsNewAfterEvents: 5_000 },
  nodes: [/* ... */],
});
```

`resume` 携带的状态均为有界且由持久化输入驱动：`offset`（下一个顶层节点下标）、`sequence`（跨 run 事件序号严格递增，宿主投影不乱序）、`steps` / `commandBytes`（累计步数使 `maxSteps` 成为**整条 run 链的总预算**、`executionId` 不重号；`commandBytes` 使 1MB 指纹字节上限跨 run 累计，`maxCommands` 仍为单 run 计数上限）、`agreedUsers`（ONCE 去重继续生效）、`completedHumans`（`returnTo`/`withdraw` 目标仍可寻址）、`completedTasks`（最多保留最近 10 个，且始终保留最新已处理节点，保证 `withdraw` 可恢复其他审批人决定）、`receipts`（最多最近 200 条 `requestId -> {fingerprint, receipt}`：同一 `requestId` 在 continue 之后重试会返回原回执，不会重复执行）、`pendingEvents`（尚未匹配等待的缓存信号，最多 100 条、最早到达者优先，continue 后仍可被后续等待消费）。若组装后的输入超过 512KB 输入上限，流程以 `RESUME_STATE_TOO_LARGE` 失败而不是静默截断。未设置该阈值时行为与之前完全一致。

`engine.startOrGet(input, options?)` 提供幂等启动：先执行正常 `start`；捕获到 `WorkflowExecutionAlreadyStartedError` 后执行 `read` 授权、读取快照，仅当 `tenantId`、`businessKey`、`initiatorId` 与定义引用 `{id, version}` 全部匹配请求时返回 `{ workflowId, result(), existing: true }`；任一不一致抛出 `WorkflowValidationError("INSTANCE_ALREADY_EXISTS")`，授权被拒仍抛 `FORBIDDEN`。实现刻意不使用 `WorkflowIdConflictPolicy.USE_EXISTING`，避免静默接受不匹配的输入。`engine.start` 行为不变，仅新增 `existing: false` 字段。

```typescript
const started = await engine.startOrGet({
  tenantId: "tenant-001", instanceId: "leave-42", businessKey: "LEAVE-42",
  initiatorId: "user-alice", definition: myDefinition, data: {},
});
if (started.existing) console.log("复用已有实例");
const result = await started.result();
```

### 7.9 运行中实例的定义迁移（pause → migrate → resume）

流程定义按实例固定（pinned），新版本发布后老单子仍按启动时的版本执行。若要把**运行中**实例切换到新版本，使用运维 runbook「先暂停 → 再迁移 → 后恢复」：

```typescript
await engine.command({ type: "suspend", requestId: "ops-suspend", tenantId: "tenant-001", instanceId: "leave-42", actorId: "user-admin" });
await engine.migrate({
  tenantId: "tenant-001", actorId: "user-admin", instanceId: "leave-42",
  requestId: "ops-migrate-v2", toVersion: 2, comment: { ticket: "OPS-17" },
});
await engine.command({ type: "resume", requestId: "ops-resume", tenantId: "tenant-001", instanceId: "leave-42", actorId: "user-admin" });
```

`engine.migrate` 与其它命令一致：先做 `operation: "command"` 授权（宿主应限制为运维/管理员，参考实现仅管理员可用），同一 `requestId` 幂等，返回 `{ requestId, eventId }`。目标版本必须已发布：引擎通过 `activities.loadDefinition` 加载 `{ id: 当前定义 id, version: toVersion }`，宿主定义存储需长期保留不可变的已发布版本。

前置条件（不满足时 update 抛出对应的 `WorkflowValidationError`，不会修改任何状态）：

| 错误码 | 含义 |
| --- | --- |
| `MIGRATION_REQUIRES_SUSPENDED` | 实例必须已暂停（先 `suspend`） |
| `MIGRATION_REQUIRES_IDLE` | 没有活跃人工任务、没有活跃事件等待；suspend 不会清除活跃任务，因此该检查单独存在 |
| `MIGRATION_REQUIRES_TOP_LEVEL` | 必须停在顶层节点边界，不能在网关/循环/forEach/子流程内部迁移 |
| `MIGRATION_INVALID_TARGET` | 目标定义 id 必须等于当前 id，且 `toVersion` 必须不同于当前版本 |
| `MIGRATION_TARGET_MISSING` | 目标定义的顶层 `nodes` 中已找不到当前记录的下一个节点 id，实例以该错误失败 |

机制与保证：

- update handler 完成校验后通过活动加载目标定义（结果写入 history，回放确定），发出 `workflow.migrateRequested`（details 为 `{ actorId, requestId, fromVersion, toVersion }`）并取消当前 run scope；主循环随后替换定义，并**先**发出 `workflow.migrated`（details 为 `{ fromVersion, toVersion, fromNodeId, toNodeId }`）再继续执行，保证审计投影不丢失；
- 迁移按**记录的下一个顶层节点 id** 重定位：目标定义顶层 `nodes` 中必须存在同名节点，执行从该节点继续。重定位基于 node id 而非下标，删除/改名该节点会以 `MIGRATION_TARGET_MISSING` 失败，而不是静默跳到别的位置；
- 携带状态按目标图裁剪：`completedHumans`/`completedTasks`（以及待用的撤回恢复快照）中 `nodeId` 已不存在的条目被丢弃，`agreedUsers` 保留（`deduplication: ONCE` 继续生效）；`returnTarget`/`returnOrigin`/`skipTo` 与待处理的 `resubmit` 一律重置（旧回退路径可能已不存在）；
- 迁移完成后 `snapshot().definition` 返回新的 `{ id, version }`；
- 之后若触发 `continueAsNew`，迁移后的定义随 `input.definition`、重定位后的下标随 `resume.offset` 进入下一个 run，新 run 继续执行新图；
- 当前 run 继续沿用启动时的 `settings`/`limits`（确定性）；迁移后的 `continueAsNew` 会在下一个 run 采用目标版本的 settings。

`workflow.migrateRequested` / `workflow.migrated` 是宿主的迁移审计记录。切勿原地修改已发布定义——发布新版本并显式迁移。

---

## 8. 错误码目录

`ERROR_CODES` 是冻结的只读映射，`ErrorCode` 为其联合类型。完整值如下：

| 分类 | 错误码 |
| --- | --- |
| 权限与寻址 | `FORBIDDEN`、`WORKFLOW_NOT_FOUND` |
| 输入与定义校验 | `INPUT_TOO_COMPLEX`、`CYCLIC_INPUT`、`NON_JSON_INPUT`、`INPUT_TOO_LARGE`、`DUPLICATE_NODE_ID`、`TOO_MANY_NODES`、`CONCURRENT_VARIABLE_WRITE`、`RESUBMIT_REQUIRES_TASK`、`DUPLICATE_FIELD`、`FIELD_NOT_WRITABLE`、`REQUIRED_FIELD`、`INVALID_FIELD_TYPE`、`INVALID_FIELD_LENGTH`、`INVALID_FIELD_RANGE`、`INVALID_FIELD_PATTERN`、`DEFINITION_VERSION_MISMATCH` |
| 脚本与表达式 | `SCRIPT_REJECTED`、`SCRIPT_EXECUTION_FAILED`、`SCRIPT_BUDGET_EXCEEDED`、`ORDER_REQUIRES_NUMBERS`、`MISSING_VARIABLE` |
| 引擎与命令 | `STEP_LIMIT_REACHED`、`TENANT_MISMATCH`、`REQUEST_ID_CONFLICT`、`COMMAND_LIMIT_REACHED`、`INSTANCE_CLOSED`、`INSTANCE_RETURNING`、`INSTANCE_MISMATCH`、`INSTANCE_SUSPENDED`、`INVALID_RETURN_TARGET`、`RETURN_FORBIDDEN`、`WITHDRAW_FORBIDDEN`、`INVALID_COMMAND`、`INVALID_JUMP_TARGET` |
| 生命周期与历史 | `INSTANCE_ALREADY_EXISTS`、`RESUME_STATE_TOO_LARGE` |
| 定义迁移 | `MIGRATION_REQUIRES_SUSPENDED`、`MIGRATION_REQUIRES_IDLE`、`MIGRATION_REQUIRES_TOP_LEVEL`、`MIGRATION_INVALID_TARGET`、`MIGRATION_TARGET_MISSING` |
| 人工任务 | `TASK_NOT_ACTIVE`、`TASK_CLOSED`、`RETURN_REQUIRES_WORKFLOW`、`INVALID_ASSIGNEE`、`NOT_TASK_ASSIGNEE`、`CANNOT_CLAIM`、`TRANSFER_DISABLED`、`ADD_ASSIGNEE_DISABLED`、`BEFORE_ADD_FORBIDDEN`、`TOO_MANY_ASSIGNEES`、`INVALID_TASK_ACTION`、`SIGNATURE_REQUIRED`、`NO_ASSIGNEES` |
| 等待、网关与子流程 | `WAIT_NOT_ACTIVE`、`WAIT_TIMEOUT`、`LOOP_LIMIT_REACHED`、`FOREACH_REQUIRES_ARRAY`、`FOREACH_LIMIT_REACHED`、`RECURSIVE_CHILD_DEFINITION`、`CHILD_NOT_COMPLETED` |
| wflow 导入 | `INVALID_WFLOW_OBJECT`、`INVALID_WFLOW_STRING`、`INVALID_WFLOW_DURATION`、`INVALID_WFLOW_DATE_TIME`、`INVALID_WFLOW_RANGE`、`INVALID_WFLOW_BRANCHES`、`EMPTY_WFLOW_CONDITION`、`DANGLING_WFLOW_LINK`、`CYCLIC_WFLOW_LINK`、`UNSUPPORTED_WFLOW_EVENT_TYPE`（以及动态前缀 `UNSUPPORTED_WFLOW_<FEATURE>`） |
| 适配器与投递 | `INVALID_ADAPTER_PAYLOAD`、`ADAPTER_FAILED`、`UNKNOWN_ACTION`、`UNKNOWN_NODE_KIND`、`INTEGRATION_NOT_SUPPORTED`、`INVALID_WORKFLOW_INPUT`、`IDENTITY_MISMATCH`、`EXECUTION_FAILED`、`EVENT_DELIVERY_FAILED` |

---

## 9. 路线图与范围决策

SDK 的能力总结、明确的非目标（BPMN 2.0 XML、补偿/事务子流程、嵌入式子流程作用域、边界事件、消息关联等）与版本/回放指引见 [`sdk-roadmap.md`](./sdk-roadmap.md)。
