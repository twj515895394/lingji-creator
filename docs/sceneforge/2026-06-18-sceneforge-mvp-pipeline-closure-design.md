# SceneForge MVP 流水线闭环 — 详细设计

> 日期：2026-06-18  
> 状态：已定稿（供实现与 issues 引用）  
> ADR：`docs/adr/0002-sceneforge-support-chain-mvp-and-core-submit.md`  
> UI 真理来源：根目录 `DESIGN.md`、`.scratch/sceneforge-studio-p0/DESIGN.md`

## 1. 问题陈述

创作者在 **选题闸门** Validate/Continue 后进入 **参考分析**，工坊无提交与校验，引擎报 validator 未实现；**故事方向 / 资产规划** 同理。进入 **设定图提示词** 后虽有运行面板，但无 LLM 时无法生成产物，且运行成功也不写盘，无法完成 Validate/Continue 人工验收（Issue 20）。

## 2. 目标与非目标

### 2.1 目标

1. **reference → story → assets**：工坊内 Markdown 提交 → 自动校验 → Validate/Continue → 侧栏依赖可解除（`approved` / `completed` / `skipped`）。
2. **design（及复用模式 storyboard / video_prompts）**：运行返回草案后可 **一键提交**；可选 MVP 占位便于无 Provider 测试。
3. 契约与 **ADR-0001** 一致：禁止 Renderer 直写项目文件。

### 2.2 非目标

- 支撑阶段 LLM pack、卡片式 HITL 深化、Continue 后自动 `sceneRunStage(reference)`。
- script / performance / publish 等其余支撑阶段（仍占位 + MCP 指引）。
- ZIP 导出、一键全链、真 ACP 多轮。

## 3. 数据与契约

### 3.1 支撑阶段产物（引擎登记）

| stage | artifactKey | manifest id 模式 | title（中文） |
| --- | --- | --- | --- |
| reference | `reference_notes` | `reference.reference_notes` | 参考分析笔记 |
| story | `story_direction` | `story.story_direction` | 故事方向 |
| assets | `asset_plan` | `assets.asset_plan` | 资产规划 |

写入规则对齐 `submitSupportStageDraft`（intake/gate）：`kind: final`，非 `coreAsset`，`readableByDownstream` 按 validator/后续 context 需要设为 true（MVP 建议 true）。

### 3.2 服务层扩展

- `SUPPORT_DRAFT_STAGES` 扩展为：`source_intake | topic_gate | reference | story | assets`。
- `SceneSubmitStageDraftInput.stage` 类型同步扩展。
- `assertDraftArtifactKey` 仅允许上表 + intake/gate 已有 key。

### 3.3 校验器

新增：

- `validators.reference.ts` → `validateReferenceStage`
- `validators.story.ts` → `validateStoryStage`
- `validators.assets.ts` → `validateAssetsStage`

模式同 `validators.source-intake.ts`：manifest 查 id、读内容 trim 非空。  
在 `scene-validator.ts` 注册；**禁止**对三阶段再抛 `UNSUPPORTED_STAGE_VALIDATOR`。

### 3.4 MCP / IPC 枚举

扩展 Zod/TS 枚举至至少：

- `scene_submit_stage_draft.stage`
- `scene_validate_stage.stage`
- `scene_approve_stage.stage`

`scene_run_stage.stage` **本包可不扩展**（支撑阶段运行仍走占位说明）；若扩展仅 `manual_submit` 返回空草案。

`scene_set_approval_policy` 对支撑阶段 optional 已存在则保持；若无则本 MVP 可不暴露 UI 改策略（沿用 default）。

## 4. Studio UI

### 4.1 工作区组件

新增 **`ScenePrepSupportWorkspace`**（或复用泛化 `SceneSupportMarkdownWorkspace`）：

- props：`projectDir`, `stage`, `artifactKey`, `artifactLabel`, `initialContent?`, `onSubmitted`, `onError`
- 单 textarea + **提交草案**（调用 `sceneSubmitStageDraft`）
- 占位模板（Markdown 小节标题即可）

路由（`SceneForgeStudio.tsx`）：

- `selectedStage ∈ { reference, story, assets }` → 渲染该工作区 + **`SceneStageFlowActions`**
- 移除三阶段仅 `SceneSupportPlaceholderWorkspace` 的路径（或占位作为无 projectDir 降级）

### 4.2 能力矩阵

`scene-stage-capabilities.ts`：

- `STUDIO_READY_STAGES` 增加 `reference`, `story`, `assets`
- `getWorkspaceTemplateForStage`：三阶段返回 `support`（与 intake/gate 区分：无 gate 专用表单，用通用 Markdown 提交）

### 4.3 Core：运行后提交

扩展 `StageRunPanel`：

- state：`lastRunArtifacts: Record<string, string> | null`
- `sceneRunStage` 成功后保存 artifacts（过滤 `__` 前缀 meta key）
- 按钮 **「提交草案到产物库」**：`sceneSubmitStageDraft({ projectDir, stage, artifacts: [...] })`
- 成功后 `onRunComplete` / 回调触发 `refreshProjectState`

可选 **design** 专用：`SceneCoreMvpPlaceholderButton` — 确认对话框后提交 5 个 design key 占位内容（仅 `import.meta.env.DEV` 或显式 `data-testid` 供测试）。

### 4.4 诚实反馈

- 支撑阶段 **不**展示「运行本阶段 Direct LLM」为主 CTA（除非后续 pack）；主 CTA 为提交 + Validate/Continue。
- 提交失败展示 `Alert`，含 validator / `UNSUPPORTED_*` 原文。

## 5. 状态机与导航

- `submitStageDraft` 成功后行为与 intake/gate 一致：draft submitted → validate → `validated` / `waiting_approval`（视 policy）。
- `SceneStageFlowActions` 对三支撑阶段复用与 `SUPPORT_SUBMIT_STAGES` 相同逻辑（或扩展 `SUPPORT_SUBMIT_STAGES` / 新集合 `PREP_SUPPORT_STAGES`）。
- `stagesCompletedForNav` 已认 `approved|completed|skipped`；用户 Continue 后应能解除 design 侧栏「请先完成参考分析」类提示（当 reference 已 approved）。

## 6. 测试策略

| 层级 | 内容 |
| --- | --- |
| 单元 | 三 validator 缺/空产物失败；合法占位通过 |
| 契约 | MCP/IPC stage 枚举包含 reference/story/assets |
| 集成 | submit reference_notes → validate passed；`tests/sceneforge-support-submit.test.ts` 扩展或新建 |
| UI | 可选 smoke：`data-testid` 提交 + flow actions（reference） |

验证命令：

```bash
npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts
npx tsc --noEmit
```

改 main 后重启 Electron dev。

## 7. 实施顺序（见 IMPLEMENTATION-PLAN）

1. 文档 + ADR（本文件）  
2. 后端支撑 submit/validate/approve + validators  
3. Studio 三阶段工作区 + FlowActions  
4. StageRunPanel 提交草案 + design 占位（可选）  
5. 回归 + handoff 指针  

## 8. 人工验收清单（Issue 20 续）

- [ ] gate Continue → reference → 提交 `reference_notes` → Validate 通过 → Continue → story  
- [ ] story / assets 同样走通  
- [ ] design：占位或提交 5 产物 → Validate → Continue  
- [ ] 无 LLM 时可完成上述路径（支撑链 + design 占位）