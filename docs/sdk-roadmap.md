# SDK 路线图与范围决策

> 对象：`wflow-core`（独立仓库 <https://github.com/Ethan0x0000/wflow-core>，本仓库经 git 依赖引用）。本文回答「SDK 现在能做什么、刻意不做什么、接下来做什么、版本与回放怎么管」。
> 使用方式见 [`sdk-guide.md`](./sdk-guide.md)。

---

## 1. 当前能力

### 1.1 定义 DSL

- JSON 定义（`schemaVersion: 1`）由 `parseDefinition` 严格校验：重复 id、递归/超限结构、危险对象键、并发分支变量写入冲突、字段写入校验等。
- 人工节点：`approval` / `task`（all / any / sequential / percentage / candidate、转交、前后加签、超时、去重、签名、字段权限、赋值 resolver）。
- 自动化与结构节点：`action`、`cc`、`delay`、`delayUntil`、`wait`、`trigger`（EL / JS / HTTP / SIGNAL）、`router`、`decision`、`terminate`、`child`（同步/异步、变量与业务键继承、显式映射、状态同步）。
- 容器：`exclusive` / `inclusive` / `parallel` / `loop` / `forEach`（明细逐条审批：顺序或并发分块、`completionCondition`、超上限显式失败）/ `eventGateway`（事件与定时竞速，失败等待取消）。
- 条件 AST：and / or / not、exists / empty、eq / ne / gt / gte / lt / lte / in / contains、between / before / after / timeBetween、initiator 维度、`eval`（EL 翻译器 / JS 沙箱）。
- 宿主自定义节点：`custom` + `defineNode` / `Adapters.nodeHandlers`，处理器始终在 `executeNode` 活动内运行，支持 `resultKey` 与 `jumpTo`。

### 1.2 生命周期与历史治理

- 长历史 `continueAsNewAfterEvents`：只在**顶层安全边界**触发；resume 有界携带 `offset` / `sequence` / `steps` / `commandBytes` / `agreedUsers` / `completedHumans` / `completedTasks` / `receipts` / `pendingEvents`，嵌套容器不被打断。
- 幂等启动 `startOrGet`（身份或定义不匹配抛 `INSTANCE_ALREADY_EXISTS`）与 `startOrSignal`（起步即投递信号）。
- 外部信号：`signal` / `waitEvent`，FIFO 缓冲（100 条上限）、`eventGateway` 按到达顺序竞速、跨 `continueAsNew` 保留、终态后丢弃。
- 运行中定义迁移：pause → `migrate` → resume，按顶层 node id 重定位，目标版本必须已发布，审计事件 `workflow.migrateRequested` / `workflow.migrated`。
- 命令幂等：`requestId` 指纹 + 回执，同 ID 不同 payload 拒绝，回执跨 continue 保留（200 条上限）。

### 1.3 可观测、安全、测试与打包

- 可观测：`Adapters.telemetry.onActivity` 覆盖 8 个引擎活动的 start / end / error（含 `durationMs`、可选的 `context`）；hook 抛错被吞掉，绝不影响流程。
- 安全：`wflow-core/codec` 提供 `createAesGcmPayloadCodec`（AES-256-GCM、key rotation、独立子路径，workflow bundle 不引入 `node:crypto`）；`ERROR_CODES` 错误码目录 + `AdapterError` 安全边界。
- 测试：`wflow-core/testing` 提供内存适配器、按 `eventId` 去重的事件日志与时间跳跃 TestEngine，无需外部 Temporal Server。
- 打包：tsup 双构建（CJS + ESM，各自类型声明）；子路径导出 `.` / `./client` / `./worker` / `./workflows` / `./protocol` / `./testing` / `./codec`；`test:pack` 对入口、workflow bundle 纯净性与跨包加密往返做 smoke 校验。

---

## 2. 明确的非目标（Non-goals）

| # | 非目标 | 决策与理由 |
|---|---|---|
| 1 | **BPMN 2.0 XML 导入/导出** | JSON DSL 是唯一 canonical 格式，没有 BPMN 消费方，`GET /model/xml` 维持 501。若将来确实需要，导入器至少要满足三件事：定义支持子集与拒绝清单（XSD / DI / Flowable 语义映射）、边界事件与补偿等语义的显式降级、以及 round-trip 回归测试；直接生成 XML 没有收益。 |
| 2 | **补偿 / 事务子流程** | Temporal 的补偿由宿主以 saga 方式实现（显式补偿活动 + 幂等键 + 重试约定）。引入 BPMN 事务边界意味着引擎要维护补偿栈、隔离/回滚语义与重试策略，超出通用引擎边界，且与 Temporal 的重试模型重叠。 |
| 3 | **嵌入式子流程作用域 + scoped terminate** | 当前只有顶层 `terminate` 与独立 `child` 子流程。嵌入式作用域终止需要作用域栈、变量可见性、历史兼容与回放语义，并会破坏「容器总是先跑完」的 continue-as-new / migration 安全边界；建议用网关分支或 `child` 表达。 |
| 4 | **边界事件（超出人工超时 / wait / 网关定时的部分）** | 现有三类定时语义已覆盖已决策场景：节点 `timeout`（approve / reject / notify）、`wait.timeoutMs`（fail / continue）、`eventGateway.timeoutMs`。错误边界、消息边界、升级边界等需要新的事件分发与作用域模型，暂不引入。 |
| 5 | **wait / event / signal 之外的消息关联** | 不做 correlation id 路由、主题订阅或消息代理集成。显式等待与竞速由 `wait` / `eventGateway` + `signal` / `waitEvent` 表达；广播、跨实例投递保留为宿主 `Adapters.integrate` 的职责。 |

---

## 3. 后续路线（按价值排序）

1. **指标与 OTel 深集成**：在 `telemetry` hook 之外，提供 Temporal Runtime metrics（Prometheus / OpenTelemetry exporter）与 client / worker interceptors 的接线示例；活动级 tracing 通过 Temporal header 传播上下文，而不是把 hook 扩成通用埋点总线。
2. **多租户 namespace / task queue 路由**：SDK 目前假定调用方已选定 namespace 与 taskQueue。为「一租户一 namespace / 队列」提供 client / worker 工厂帮助函数与配置约定，减少宿主样板代码。
3. **数据保留与归档**：Temporal retention 由宿主配置；SDK 侧补充投影归档 / 清理钩子与导出指引，而不是在引擎内实现业务留存策略。
4. **工作日历 / 节假日**：`delayUntil`、审批超时与各类时限目前按自然时长计算。计划通过宿主注入日历（工作日、节假日、班次）计算截止时间、提醒与超时。
5. **更丰富的表单字段类型**：`Field` 现覆盖 string / number / boolean / array / object（长度、范围、正则）。计划扩展 enum、date / datetime、duration、引用型等校验，保持与宿主表单子系统一致。
6. **加权 / 法定人数审批**：现有 all / any / sequential / percentage / candidate。加权票与 quorum 需要扩展 Task 的计数模型，并定义与加签、转交、超时、撤回的一致语义。

---

## 4. 版本、回放与迁移

### 4.1 Worker 部署版本

- 使用 Temporal 的 Worker 部署版本能力（deployment-based versioning / Worker Versioning）：新版本先以独立 task queue 或低流量验证，再逐步切 `current`；回滚时把流量切回旧部署，而不是回滚事件历史。
- 业务定义与引擎代码分开治理：定义的 `{ id, version }` 固定在 workflow input 中（pinned），`engine.migrate` 才有意识地把运行中实例迁移到新版本。

### 4.2 回放回归

- `pnpm --filter wflow-core test:integration` 在 TestWorkflowEnvironment 上真实执行 / 重放场景，覆盖 continueAsNew、信号缓冲、eventGateway 竞速、forEach、custom、迁移等。
- 修改 `workflow.ts`、`nodes/*`、`resume.ts` 等解释器代码后必须跑集成套件；生产变更前还应使用 Temporal 的重放能力对真实历史做离线重放，确认没有 non-determinism。
- 新增定义能力时，同时补充「旧 run 重放仍然成立」的用例，而不是只测新功能。

### 4.3 解释器变更的 `patched` 策略

- 无法通过发布新定义版本解决的解释器行为变化，使用 `patched('code-change-id')` 同时保留新旧路径；确认所有旧 run 结束后再 `deprecatePatch`。
- 定义变更永远发布新版本，用 `engine.migrate` 显式迁移运行中实例；切勿原地修改已发布定义。

### 4.4 迁移 runbook

pause → migrate → resume 的前置条件、按 node id 重定位的规则、携带状态裁剪与审计事件，见 [`sdk-guide.md`](./sdk-guide.md) 第 7.9 节。
