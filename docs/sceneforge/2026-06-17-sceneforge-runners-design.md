# Runner 与执行面设计

> 日期：2026-06-17  
> 状态：已定稿（approved）  
> 前置：[Stage Context 设计](./2026-06-17-sceneforge-stage-context-and-handoff-design.md)

## 1. 三种 Runner（回顾）

| Runner | 谁执行 | 输入从哪来 | 输出 |
| --- | --- | --- | --- |
| `manual_submit` | 用户 / 测试 | UI 粘贴或 `manualArtifacts` | draft 记录，**不**自动 submit |
| `direct_llm` | 主进程 Lingji LLM Provider | `SceneContextBuilder` + **PromptRenderer**(system/user) | draft 内容 → 须 **submitStageDraft** |
| `acp_agent` | ACP 会话中的 Agent | Context + **agent-instructions** + Scene MCP | Agent 调 MCP 提交；runner 可只负责 **启会话/监控** |

统一出口（不可绕过）：

```text
draft → submitStageDraft → Artifact Store → Validator → Approval → HandoffWriter
```

## 2. direct_llm

### 2.1 模块

- `electron/sceneforge/pipeline/scene-prompt-renderer.ts`：变量替换（stage、context、outputContract、asset snippets）。
- `electron/sceneforge/runners/scene-direct-llm-runner.ts`：调现有 LLM 桥（复用 `src/lib/llm` 能力，主进程侧须有等价封装或 IPC 到已有 AI 配置）。

### 2.2 行为

1. `buildContext(stage, { runner: 'direct_llm' })`
2. 加载 pack `system.md` / `user.md`
3. 调用 Provider 生成；解析为 `Record<artifactKey, string>`（MVP：单轮生成多文件或按 output-contract 分轮——实施计划选 **单轮 + JSON/分段约定** 或 **每 key 一轮**，在 Wave C 定一种）
4. 返回 `SceneStageRunnerResult`，**不**写盘

### 2.3 约束

- 不使用 `.agents/skills`。
- Context 遵守 policy **maxTotalChars**；超限 warning，不静默截断无记录。

## 3. acp_agent

### 3.1 行为（MVP）

1. `buildContext(stage, { runner: 'acp_agent' })` — 含 handoff + policy 允许的 **full**
2. 组装 **会话初始消息**：`agent-instructions.md` + 结构化 Context JSON（或摘要文本）
3. 启动/复用 ACP 连接（`electron/acp/`），工具白名单：**Scene MCP only**（已有 + 可选 `scene_read_artifact`）
4. Agent 循环直至调用 `scene_submit_stage_draft` / 完成标记；runner 返回状态，**不**替代 MCP 写状态

### 3.2 与「full content」决策对齐

- Context JSON 中 `requiredInputs[].content` 对 policy `delivery: full` **带全文**。
- handoff 仍排在前；Agent 不必再 Read 项目文件。

### 3.3 失败

- 超时、拒权、未提交：结构化错误码；UI task-progress `failTask`。

## 4. manual_submit

- 保持现 `scene-stage-runner.ts` 行为。
- Studio「手动粘贴提交」可走 **直接 submitStageDraft**，不必调 runStage。

## 5. 执行面：IPC / preload / electron-api

新增（名称可微调，三件套同步）：

| API | 说明 |
| --- | --- |
| `sceneRunStage` | `{ projectDir, stage, runnerType, options? }` → runner result |
| `sceneGetStageContext` | 扩展 `runner?`、`selectedAssetIds?`（后者已有部分） |

**不在** Cut 通用 IPC 里混 SceneForge 业务；集中在 `electron/sceneforge/ipc.ts`。

## 6. MCP

| 工具 | 说明 |
| --- | --- |
| `scene_get_stage_context` | 增参 `runner` |
| `scene_run_stage` | 可选：仅 `manual_submit` 返回 draft；`acp_agent` 返回 sessionId/状态（MVP 可仅 document，实现分步） |
| 现有 `scene_submit_stage_draft` | 不变 |

## 7. UI 与任务进度

- Studio 当前阶段：**执行方式**下拉 + **运行**按钮（core 三阶段）。
- 耗时 ≥2s：`startTask` / `updateTask` / `completeTask`（`PROGRESS-SPEC.md`）。
- Task kind：扩展 `scene_stage` / `scene_run`（见 `electron/pipeline/types.ts`）。

HITL：Wave D 人工验收布局与文案。

## 8. 模块与行数

| 文件 | 职责 |
| --- | --- |
| `scene-stage-runner.ts` | 工厂 + manual + 委托 |
| `scene-direct-llm-runner.ts` | LLM |
| `scene-acp-stage-runner.ts` | ACP |
| `scene-prompt-renderer.ts` | 模板 |

`SceneForgeService.runStage` 保持薄编排。

## 9. 测试

- `sceneforge-stage-runner.test.ts`：direct/acp 不能跳过 submit（mock Provider/ACP）。
- IPC 契约测试：新 API 字符串存在。
- 集成（可选）：mock LLM 返回固定 markdown → submit → validate。

## 10. Phase 2 不包含

- 全自动 `auto_if_valid` 链式跑全 pipeline（仅单阶段 run）。
- 支撑阶段 Studio 按钮（Wave D 后或 P2 后）。