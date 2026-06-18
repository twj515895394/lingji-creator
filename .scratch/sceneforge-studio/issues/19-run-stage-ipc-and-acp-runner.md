Status: ready-for-agent

# sceneRunStage IPC/MCP 与 acp_agent Runner MVP

Type: AFK

## 父问题

- 设计：`docs/sceneforge/2026-06-17-sceneforge-runners-design.md` §3–§6
- 计划：Wave C2–C3

## 要构建什么

1. **`scene-acp-stage-runner.ts`（MVP）**：`buildContext(..., acp_agent)` + pack `agent-instructions` 组装会话；复用 `electron/acp/`；工具白名单 Scene MCP；超时/失败结构化错误。
2. **`sceneRunStage`**：`electron/sceneforge/ipc.ts` + preload + `electron-api`；MCP 可选 `scene_run_stage`（文档化 acp 与 manual 行为差异）。
3. `SceneForgeService.runStage` 接入 direct_llm / acp（不再仅 not implemented）。

## 验收标准

- [ ] IPC/MCP 三件套同步；契约测试含 `sceneRunStage`。
- [ ] `direct_llm` + `manual_submit` 经 `runStage` 可调用；`acp_agent` MVP 可启会话或返回明确 session 状态（未配置 ACP 时友好错误）。
- [ ] Runner **不能**直接写 state/manifest。
- [ ] `tests/sceneforge-stage-runner.test.ts` 扩展；`npx tsc --noEmit` 通过。

## Review Checklist

- [ ] task kind 可扩展 `scene_run`（`electron/pipeline/types.ts`）若本票接进度。

## 被阻塞于

- Issue 18：direct_llm Runner 与 Prompt 渲染
- Issue 16：Stage Context MCP 与 runner 参数