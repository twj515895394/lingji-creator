# ADR-0001：SceneForge 入口路径与 Studio 内 HITL 写回

> 状态：已接受（accepted）  
> 日期：2026-06-17  
> 决策者：维护者（ryan.tang）  
> 关联：`.scratch/sceneforge-studio-p0/PRD.md`、`DESIGN.md`

## 背景

SceneForge 引擎定义 13 个流水线阶段，但 Studio 仅展示 core 三阶段，且缺少与旧 SOP（`scene-video-intake`、`scene-topic-gate`）一致的 **用户输入、AI 方案、用户确认** 交互。创作者需要两种常见起点，并希望在工坊内完成确认写回，而非只能依赖外部 Agent。

## 决策

### 1. 用户可见产品名

统一为 **视频内容创作工坊**。技术模块名保持 SceneForge / `sceneforge`。

### 2. 项目入口路径（entryPath）

在 `project.json.sceneforge` 持久化：

```ts
entryPath: 'source_intake' | 'topic_gate'
```

- **默认值**：`topic_gate`（旧项目无字段时迁移为此值）。
- **创建时**：用户单选「从视频/链接解析开始」→ `source_intake`；「从选题与创作想法开始」→ `topic_gate`。
- **路由语义**：
  - `entryPath: topic_gate` 不禁止用户稍后手动进入 `source_intake`；intake 在侧栏可标为可跳过。
  - `entryPath: source_intake` 将 **推荐起点** 设为 `source_intake`，但 **不省略** `topic_gate` 及之后任意阶段；intake 完成后仍进入完整 topic_gate（含风格确认等）。

### 3. HITL 写回通道：Studio 内 submit

P0 对 **source_intake** 与 **topic_gate** 的用户确认与草案提交，**必须**走现有 **Artifact Store + `submitStageDraft`（及 IPC `sceneforge:submit-stage-draft`）** 路径，**禁止**在 Renderer 直接写项目目录文件。

- 扩展 `SceneSubmitStageDraftInput.stage` 至至少包含 `source_intake`、`topic_gate`（与 `SCENE_STAGE_IDS` 对齐，由 service 层 `STAGE_DRAFT_CONFIG` 或等价表声明允许的 `artifactKey`）。
- **阶段定义已有 requiredArtifacts**（见 `scene-stage-definitions.ts`）：
  - `source_intake` → `source_material`
  - `topic_gate` → `topic_brief`
- P0 可在上述 key 之外增加 **结构化侧车 artifact**（如 `adaptation_selection`、`gate_confirmations`），命名须在 `output-contract` / validator 中登记，避免任意 key；具体 key 列表在 issue 11 实现时与 validator 一并落地。

### 4. HITL 状态机（产品层，非替代引擎状态机）

| 闸门 | 条件 | Studio 行为 | 下游阻塞 |
| --- | --- | --- | --- |
| 改编方向选择 | intake 摘要 `adaptation_selection.status === pending` 且创作方向要求 rewrite | 展示方向列表；用户选择后 submit 写回 | topic_gate 内 rewrite 路径不得评分推进 |
| 风格确认 | topic_gate `confirmations.style_*` 未 confirmed | 展示风格候选；用户确认后 submit 写回 | `reference` 及之后阶段侧栏标阻塞 |

引擎 `SceneStageStatus` 仍由 validate/approve 流程推进；闸门字段存于 artifact 内容或 sceneforge state 段，由 validator 在 P0 可 **最小实现**（先结构校验 + 人工可见阻塞文案）。

### 5. UI 架构

- Studio 使用与 Cut Editor 一致的 **贴边三栏 Shell** 与 `src/ui` 组件；纪律见 `CLAUDE.md` SceneForge 节与根 `DESIGN.md`。
- 侧栏数据 **单一来源**：`SCENE_STAGE_DEFINITIONS` → renderer `scene-pipeline-ui`，禁止 UI 内硬编码 `coreStages` 三件套。

### 6. 诚实反馈

支撑阶段若无 Studio pack/validator，侧栏标 **MCP/Agent** 或 **未实现**；不得提供无后端行为的「提交成功」按钮。

## 后果

### 正面

- 用户可在工坊内测通「intake → gate → core」最小路径。
- entryPath 与 artifact 写回可被 MCP 与 Studio 共用同一契约。
- ADR 固定后 issue 08–11 可并行按契约实现。

### 负面 / 成本

- 需扩展 `submitStageDraft`、MCP `scene_submit_stage_draft` 的 stage 枚举、preload/electron-api 类型与契约测试。
- intake/gate 需新增或扩展 validator；旧 skill 全文迁移仍在 P1+。

## 备选方案（已否决）

| 方案 | 否决原因 |
| --- | --- |
| P0 仅 Agent 写盘，Studio 只读 | 用户已明确要求 Studio 内 submit |
| 创建时隐式根据是否有视频推断 entryPath | 不透明，与「用户可选」冲突 |
| UI 继续只显示 3 core 阶段 | 无法对照完整 SOP 测试 |

## 验证

- `npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts`
- `npx tsc --noEmit`
- 人工：两种 entryPath 创建 → gate 风格未确认时 reference 阻塞 → intake 改编 pending 时 gate 不推进 → Studio submit 后 artifact 出现在 manifest