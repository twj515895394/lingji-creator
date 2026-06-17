# SceneForge Studio Phase 2 实施计划

> 日期：2026-06-17  
> 状态：已定稿（approved）；issue 见 `.scratch/sceneforge-studio/issues/13+`  
> 设计输入：见 `docs/sceneforge/2026-06-17-sceneforge-phase2-overview.md`

**Goal：** 落地精确 Stage Context + Handoff、P0 Stage Pack 迁移、三种 Runner 执行面，使 core 三阶段可按 SOP 生成（MVP），且不侵入 Cut 主链路。

**Architecture：** 新增 `SceneContextBuilder` / `SceneHandoffWriter` / `scene-context-policy.ts`；policy 与 pack 在 `prompts/sceneforge/`；Runner 在 `electron/sceneforge/runners/`；IPC/MCP 扩展保持三件套同步。

**Tech Stack：** 现有 Electron 41、Vitest、YAML、Lingji LLM 配置、ACP、`task-progress`。

---

## Wave A — Context & Handoff（阻塞生成）

> 设计：[D1 Stage Context](./2026-06-17-sceneforge-stage-context-and-handoff-design.md)

### A1. Policy loader 与 schema

**Files:**

- Create: `electron/sceneforge/pipeline/scene-context-policy.ts`
- Create: `prompts/sceneforge/pipeline/default-context-policy.yaml`
- Create: `prompts/sceneforge/stages/video_prompts/context-policy.yaml`（MVP 已确认表）
- Create: `prompts/sceneforge/stages/storyboard/context-policy.yaml`
- Create: `prompts/sceneforge/stages/design/context-policy.yaml`
- Test: `tests/sceneforge-context-policy.test.ts`

**Steps:**

- [ ] 定义 YAML 解析与校验（version、inputs、delivery、forbidden）
- [ ] 单测：加载 video_prompts policy，断言含 audio/performance/master，禁止 9-key 全文规则

**Verify:** `npx vitest run tests/sceneforge-context-policy.test.ts`

### A2. SceneContextBuilder

**Files:**

- Create: `electron/sceneforge/pipeline/scene-context-builder.ts`
- Modify: `electron/sceneforge/service.ts`（`getStageContext` 委托 builder，删除硬编码 9 文件逻辑）
- Modify: `tests/sceneforge-stage-context.test.ts`

**Steps:**

- [ ] 实现 handoff_first / full / summary / pointer
- [ ] 接入 `resolveSceneAssetsForStage`（可选 selectedAssetIds）
- [ ] runnerOverrides 软预算 + warnings
- [ ] 测试：video 场景 **非** 9 全文；storyboard 含 performance；forbidden 生效

**Verify:** `npx vitest run tests/sceneforge-stage-context.test.ts tests/sceneforge-service.test.ts`

### A3. Handoff 写入

**Files:**

- Create: `electron/sceneforge/pipeline/scene-handoff-writer.ts`
- Create: `prompts/sceneforge/stages/*/handoff-template.yaml`（P0 阶段）
- Modify: `electron/sceneforge/pipeline/scene-state-machine.ts` 或 `service.approveStage` 钩子
- Test: `tests/sceneforge-handoff.test.ts`

**Steps:**

- [ ] approve 后写 `sceneforge/handoffs/<stage>.handoff.json`
- [ ] builder 优先读 handoff
- [ ] 测试：approve design 后 storyboard context 的 design 项 `source: handoff`（或 fallback）

**Verify:** `npx vitest run tests/sceneforge-handoff.test.ts`

### A4. MCP / API 扩展 runner 参数

**Files:**

- Modify: `electron/sceneforge/ipc.ts`, `electron/preload.ts`, `src/lib/electron-api.ts`
- Modify: `electron/sceneforge/mcp/register-scene-tools.ts`
- Modify: `tests/sceneforge-ipc-contract.test.ts`

**Steps:**

- [ ] `scene_get_stage_context(projectDir, stage, { runner?, selectedAssetIds? })`

**Verify:** 契约测试 + `npx tsc --noEmit`

---

## Wave B — Stage Pack 迁移（P0）

> 设计：[D2 Migration](./2026-06-17-sceneforge-stage-pack-migration-design.md)

### B1. performance + audio pack（支撑 video）

**Files:**

- Create: `prompts/sceneforge/stages/performance/*`
- Create: `prompts/sceneforge/stages/audio/*`
- 从 `scene_forge/.agents/skills/scene-performance-director` 等迁移 references

**Verify:** `loadSceneStagePack('performance'|'audio')` 不抛错

### B2. storyboard + video_prompts pack

**Files:**

- Create: `prompts/sceneforge/stages/storyboard/*`
- Create: `prompts/sceneforge/stages/video_prompts/*`
- 补全 `context-policy.yaml` / `handoff-template.yaml`

**Verify:** `tests/sceneforge-stage-pack.test.ts` 扩展 stage 列表

### B3. design pack 补全 + 可选 script

**Files:**

- Modify: `prompts/sceneforge/stages/design/*`
- Optional: `prompts/sceneforge/stages/script/*`

**Verify:** pack + policy 快照测试（关键 artifactKey 与旧 skill 一致）

---

## Wave C — Runners & 执行面

> 设计：[D3 Runners](./2026-06-17-sceneforge-runners-design.md)

### C1. PromptRenderer + direct_llm runner

**Files:**

- Create: `electron/sceneforge/pipeline/scene-prompt-renderer.ts`
- Create: `electron/sceneforge/runners/scene-direct-llm-runner.ts`
- Modify: `electron/sceneforge/pipeline/scene-stage-runner.ts`
- Test: `tests/sceneforge-direct-llm-runner.test.ts`

**Steps:**

- [ ] Mock LLM 返回固定内容 → runner 输出 artifacts  map
- [ ] 断言未调用 writeSceneArtifact（仅 draft）

**Verify:** `npx vitest run tests/sceneforge-direct-llm-runner.test.ts`

### C2. acp_agent runner（MVP）

**Files:**

- Create: `electron/sceneforge/runners/scene-acp-stage-runner.ts`
- Test: `tests/sceneforge-acp-runner.test.ts`（可 mock ACP）

**Verify:** 结构化 not implemented → 实现后通过

### C3. sceneRunStage IPC/MCP

**Files:**

- Modify: `ipc.ts`, `preload.ts`, `electron-api.ts`, `register-scene-tools.ts`
- Test: 契约 + `tests/sceneforge-stage-runner.test.ts` 扩展

**Verify:** `npx vitest run tests/sceneforge-ipc-contract.test.ts tests/sceneforge-stage-runner.test.ts`

---

## Wave D — Studio 执行 UX + 回归（HITL）

### D1. Studio 执行方式 UI + task-progress

**Files:**

- Modify: `src/sceneforge/pages/SceneForgeStudio.tsx`（拆子组件若 >800 行）
- Create: `src/sceneforge/components/stage/StageRunPanel.tsx`（建议）

**Verify:** `tests/sceneforge-ui.test.tsx` + **人工** Electron 点跑 design/video

### D2. 全量回归与文档

**Files:**

- Modify: `docs/sceneforge/2026-06-17-sceneforge-phase2-overview.md` → `Status: approved`
- Optional: `.handoff/handoff-*.md`

**Verify:**

```bash
npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts
npx tsc --noEmit
```

---

## 依赖关系

```text
Wave A (A1→A2→A3→A4) — 必须最先完成
Wave B 与 A2 部分并行（pack 无 builder 也可先迁文件）
Wave C 依赖 A4 + B（至少 video/storyboard pack）
Wave D 依赖 C3
```

## 与 Issues 01–12 关系

- **不修改** 01–12 已交付行为，除非 A2 **故意**替换 9 全文（为修复，需更新 stage-context 测试预期）。
- 新 work 全部在 **13+** 票中跟踪（评审本计划后生成）。

## 提交建议（实施时）

按 Wave 小步提交，例如：

- `feat(sceneforge): add context policy and builder`
- `feat(sceneforge): handoff on approve`
- `feat(sceneforge): migrate P0 stage packs`
- `feat(sceneforge): direct_llm runner and runStage IPC`