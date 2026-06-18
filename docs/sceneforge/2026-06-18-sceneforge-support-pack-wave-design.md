# SceneForge Support Pack Wave — 详细设计

> 日期：2026-06-18  
> 状态：已定稿  
> PRD：`.scratch/sceneforge-support-pack-wave/PRD.md`  
> 前置：Stage Pack 迁移设计、Runner 设计、ADR-0002

## 1. 目标架构

```text
Support Workspace
├── Direct LLM Runner
│   ├── Context Policy
│   ├── Stage Pack
│   └── Pending Draft Review
└── Manual Markdown Editor
    └── sceneSubmitStageDraft

两条路径最终统一：
submit → validate → approve/complete → handoff
```

## 2. 阶段范围与契约

| stage | requiredArtifact | Pack 现状 | 本 Wave |
| --- | --- | --- | --- |
| reference | `reference_notes` | 无 | 新建 |
| story | `story_direction` | 无 | 新建 |
| assets | `asset_plan` | 无 | 新建 |
| script | `script_draft` | 无 | 新建 |
| performance | `performance_direction` | 已有 | 接入 Direct LLM |
| audio | `audio_design` | 已有 | 接入 Direct LLM |

## 3. Direct LLM 能力模型

将 Runner 中的 Core 硬编码数组替换为显式能力表：

```ts
interface SceneStageRunCapability {
  stage: SceneStageId;
  runnerTypes: SceneStageRunnerType[];
  submitMode: 'core' | 'support';
}
```

能力表由代码登记并测试，首版不从文件系统动态推断，避免错误 Pack 意外暴露到 UI。

允许 Direct LLM：

```text
design, storyboard, video_prompts,
reference, story, assets, script, performance, audio
```

## 4. Pack 标准

每个新增 Pack 必须包含：

```text
system.md
user.md
agent-instructions.md
output-contract.yaml
review-checklist.md
context-policy.yaml
handoff-template.yaml
MIGRATION.md
```

### 4.1 Reference

输入：

- topic_gate 的 `topic_brief`
- topic_gate 的 `gate_confirmations`
- source_intake 的 `source_material`，有则使用

输出：`reference_notes`

### 4.2 Story

输入：

- reference handoff / `reference_notes`
- topic brief
- adaptation selection
- adaptation methodology assets

输出：`story_direction`

### 4.3 Assets

输入：

- story handoff / `story_direction`
- reference 摘要
- selected style profile

输出：`asset_plan`

### 4.4 Script

输入：

- story direction
- design handoff
- topic duration/segment settings

输出：`script_draft`

### 4.5 Performance

复用现有 Pack，补齐或验证 context policy：

- script
- design
- story/reference 摘要
- selected style profile

输出：`performance_direction`

### 4.6 Audio

复用现有 Pack，补齐或验证 context policy：

- storyboard
- performance
- design 表现力摘要

输出：`audio_design`

## 5. Studio

`ScenePrepSupportWorkspace` 增加可选执行区，但仍保持职责分离：

- 手工编辑区负责 Markdown 编辑和提交。
- `StageRunPanel` 负责 Runner 与生成草案。
- 两者通过共同的 `onSubmitted` 刷新状态。
- 生成草案提交支持 `SupportDraftStage`，不再用 Core stage Set 做断言。

支撑阶段只有一个 artifact，草案审阅仍复用 Core LLM Happy Path 的 `SceneRunDraftReview`。

## 6. Context 与 Handoff

- 新 Pack 必须有 context policy，不回退到九文件全文。
- approve 或 auto_if_valid 后继续由 `SceneHandoffWriter` 生成 handoff。
- optional 阶段未经审批但 validated 时，下游读取规则沿用当前 policy；本包不改审批策略。

## 7. 错误处理

| 场景 | 行为 |
| --- | --- |
| Pack 缺文件 | `INVALID_STAGE_PACK`，手工编辑仍可用 |
| 缺必需上游 | Runner 禁用或 Context 构建报明确缺项 |
| Provider 失败 | 保留手工编辑内容，不生成草案 |
| JSON 缺 artifact | 不允许提交 |
| Validator 失败 | 保留生成草案和手工修改入口 |

## 8. 迁移纪律

- `MIGRATION.md` 记录来源 skill、迁移日期、保留/删减内容。
- 不把旧 skill 全文无差别复制进 system prompt。
- references 只迁移当前阶段真正使用的材料。
- Prompt 中禁止引用本机绝对路径。

## 9. 测试

每个阶段独立满足：

1. Pack 可加载。
2. output contract 与阶段定义一致。
3. Context 只包含允许输入。
4. mock LLM 返回 requiredArtifact。
5. run 不写盘。
6. submit 后 validator passed。
7. 手工提交路径仍可用。

## 10. 风险

- 六阶段一次实施过大：issues 按阶段垂直切片，逐个合并。
- Prompt 迁移质量难自动判断：结构自动化 + 内容人工 review。
- Support 与 Core 草案 UI 分叉：强制复用同一审阅组件。

