# ADR-0002：支撑链 MVP 闭环与 Core 运行后提交

> 状态：已接受（accepted）  
> 日期：2026-06-18  
> 决策者：维护者（ryan.tang）  
> 关联：ADR-0001、`.scratch/sceneforge-studio-p0/PRD.md`、`docs/sceneforge/2026-06-17-sceneforge-runners-design.md`、handoff `20260617-221346.md`

## 背景

P0 工坊已交付 13 阶段侧栏、entryPath、intake/gate Studio submit 与 Validate/Continue，以及 core 三阶段的 `StageRunPanel`。用户在 gate 之后进入 **reference / story / assets** 时无可用提交与校验，侧栏长期显示「请先完成参考分析」；**design** 在 LLM/ACP 未配置时无法写入 5 个核心产物，且 **direct_llm 运行结果不写盘**（符合 Runner 设计但未在 UI 闭合）。

Phase 2 差距表（D4）将「全支撑阶段 UI 与 pack」标为 P2 且明确不在 Phase 2。本产品决策在 **不迁移旧 skill 全量 pack、不做完整 reference 表单编辑器** 的前提下，补齐 **Electron 内可点的最小流水线**，与 handoff P1「支撑链 Studio 表单 + Validator」的 **MVP 子集** 对齐。

## 决策

### 1. 范围：支撑链三阶段（reference → story → assets）

对 `reference`、`story`、`assets` 实施 **与 intake/gate 同级的最小闭环**：

| 阶段 | 引擎 `requiredArtifacts`（真相源：`scene-stage-definitions.ts`） | 默认审批 |
| --- | --- | --- |
| reference | `reference_notes` | optional |
| story | `story_direction` | optional |
| assets | `asset_plan` | optional |

**必须**：

- 扩展 `submitStageDraft` / `SUPPORT_DRAFT_CONFIG`（或等价支撑表）、`validateSceneStage`、IPC/MCP 的 stage 枚举（submit / validate / approve；`scene_run_stage` 本 MVP **不**要求对三阶段开放 direct_llm）。
- 产物经 **Artifact Store** 写入，`kind: final`，`role` 为支撑向（非 core_generation_asset），与 domain contracts 一致。
- Studio：**Markdown 草案提交** + **`SceneStageFlowActions`（Validate → Continue）**；替换或补充当前仅 Agent 占位的 reference 体验。
- Validator：**结构级**（产物存在且非空）；**不**要求语义/LLM 质量。

**明确不做（本 ADR）**：

- reference/story/assets 的 stage pack、direct_llm、acp 真多轮。
- 将 `reference_notes` 以外的 key（如用户本地试验的 `reference_analysis`）作为规范 key；若 UI 已用别名，**迁移对齐** `reference_notes`。

### 2. 范围：Core 运行结果写盘（design 为首）

遵循 [Runner 设计](../sceneforge/2026-06-17-sceneforge-runners-design.md) 统一出口：

```text
runStage (draft) → submitStageDraft → Artifact Store → Validator → Approval
```

**必须**：

- 在 `StageRunPanel`（或紧邻组件）当 `sceneRunStage` 返回非空 `artifacts` 时，提供 **「提交草案」**（一次 `sceneSubmitStageDraft` 多 key）。
- 可选 **「MVP 占位」**：对 design 一键写入 5 个 key 的最短非空 Markdown，便于无 LLM 时测 Validate/Continue（须标注为测试向、不默认自动点击）。

**不**改变：direct_llm runner 仍不直接 `writeSceneArtifact`。

### 3. 就绪标签（`scene-stage-capabilities`）

`reference`、`story`、`assets` 的 `getStageReadiness` 由 `agent` 调整为 **`studio`**（与 intake/gate 一致），工作区模板为 **`support`**（专用提交表单，非长期占位）。

### 4. IPC 三件套

任何 stage 枚举扩展须同步：`electron/main.ts`（或 `sceneforge/ipc`）、`electron/preload.ts`、`src/lib/electron-api.ts`、MCP `register-scene-tools.ts`、契约测试。

### 5. 与 Phase 2 / P0 文档关系

- 本 ADR **不撤销** D4「全支撑 UI / 全 pack」的 P2 定位；仅声明 **MVP 闭环** 为 P0 缺口补洞 + handoff P1 子集。
- 实施后更新：`docs/sceneforge/2026-06-17-sceneforge-phase2-overview.md` 一句指针；`.handoff/` 记录验收路径（gate → reference → … → design Validate）。

## 后果

- **正面**：用户可在工坊内不依赖 MCP/LLM 推进至 design 并测 core 状态机；reference 提交不再触发 `UNSUPPORTED_STAGE_VALIDATOR`。
- **负面**：支撑阶段内容为占位 Markdown 时，下游 context 质量弱——可接受，与 MVP 目标一致。
- **风险**：artifactKey 与本地未提交 UI 不一致 → 以 `scene-stage-definitions` 为准并单测锁定。

## 参考

- 设计详述：`docs/sceneforge/2026-06-18-sceneforge-mvp-pipeline-closure-design.md`
- 实施计划：`.scratch/sceneforge-studio-mvp-closure/IMPLEMENTATION-PLAN.md`