# Stage Pack 与旧 Skill 迁移设计

> 日期：2026-06-17  
> 状态：已定稿（approved）  
> 来源：`/Users/tangwujun/Documents/trae_projects/scene_forge/.agents/skills`

## 1. 原则

- 运行时 **只读** `prompts/sceneforge/stages/<stageId>/`，**不读** `.agents/skills`。
- 旧 skill 的 **输入边界** → 该 stage 的 **`context-policy.yaml`**（消费者视角）。
- 旧 skill 的 **执行链 / 交付** → `system.md`、`user.md`、`output-contract.yaml`、`review-checklist.md`、`artifact-templates/`。
- 旧 skill 的 **references/** → 迁入 pack 内 `references/` 或拆入上述文件。

## 2. Skill → Stage 映射表

| 旧 skill 目录 | Pipeline stageId | Pack 目录 | Phase 2 优先级 |
| --- | --- | --- | --- |
| scene-forge | — | （总控逻辑 → Service/状态机，无 pack） | — |
| scene-video-intake | source_intake | `stages/source_intake/` | P2 后 |
| scene-topic-gate | topic_gate | `stages/topic_gate/` | P2 后 |
| scene-reference-decider | reference | `stages/reference/` | P2 后 |
| scene-story-development | story | `stages/story/` | P2 后 |
| scene-asset-checker | assets | `stages/assets/` | P2 后 |
| scene-design-builder | design | `stages/design/` | **P0 已有最小包，需补全** |
| scene-script-adapter | script | `stages/script/` | P1 |
| scene-performance-director | performance | `stages/performance/` | **P0（video 依赖）** |
| scene-storyboard-director | storyboard | `stages/storyboard/` | **P0** |
| scene-audio-director | audio | `stages/audio/` | **P0（video 依赖）** |
| scene-video-prompt-builder | video_prompts | `stages/video_prompts/` | **P0** |
| scene-publish-review | publish | `stages/publish/` | P2 后 |

## 3. 各阶段「输入边界」迁移索引（摘自 SKILL.md）

用于编写对应 **`context-policy.yaml`**（详见 [Stage Context 设计](./2026-06-17-sceneforge-stage-context-and-handoff-design.md)）。

### video_prompts（scene-video-prompt-builder）

- storyboard 主 pack + details（Beat/VGU/Continuity/QC）+ storyboard_prompts
- audio pack（BGM/Foley/Ambience/Silence/跨段钩子）
- performance pack
- design **摘要** + 风格 visual/camera/lighting/negative
- 前置：storyboard **与** audio 均完成

### storyboard（scene-storyboard-director）

- script + beat_table
- performance_sheet
- design.md 级设定 + 风格 camera/rhythm/lighting
- source_intake 摘要（黑板索引）

### audio（scene-audio-director）

- 完整分镜 + segments/continuity/blocking
- performance 表
- design 表现力相关
- 按需 animation-stylization 库章节

### performance（scene-performance-director）

- reference 边界；story；design（含 blocking/prop）；**script 改编结果**（beats、segment_strategy…）

### design（scene-design-builder）

- reference、story、assets；风格 profile/visual/lighting

（其余阶段见旧仓库 SKILL.md「输入边界」/「上游输入」节，实施 Wave B 时按表迁移。）

## 4. Pack 目录标准布局

```text
prompts/sceneforge/stages/<stageId>/
  system.md
  user.md
  agent-instructions.md
  output-contract.yaml
  review-checklist.md
  context-policy.yaml          # 本 stage 作为消费者
  handoff-template.yaml        # 本 stage approve 产出
  artifact-templates/          # 可选
  references/                  # 从旧 skill 迁入的 workflow、template 等
  MIGRATION.md                 # 来源 skill 版本、摘取说明（可选）
```

## 5. loader 扩展（`scene-stage-pack.ts`）

Phase 2 最小扩展：

- 加载 `context-policy.yaml`、`handoff-template.yaml`（可选文件，缺失则用默认）。
- **不**在 loader 内读 references 全文进 Context；references 仅供 direct_llm 渲染时按需拼接（由 **PromptRenderer** 负责，独立模块）。

## 6. 迁移步骤（每个 stage）

1. 复制旧 `references/*.md` 到 pack `references/` 或合并进 `system.md`。
2. 从 SKILL.md 提取「执行链」「强制交付」→ `output-contract.yaml` + `review-checklist.md`。
3. 从「输入边界」→ `context-policy.yaml`（消费者 stage）或写入 **生产方** 的 `handoff-template.yaml`。
4. 跑 validator 测试 + context 测试。
5. 在 `MIGRATION.md` 记录与旧 skill 差异。

## 7. Phase 2 最小迁移集（Wave B）

必须落地 pack + policy + handoff-template：

- `design`（补全）
- `performance`
- `audio`
- `storyboard`
- `video_prompts`

`script` 建议同步（storyboard 依赖），可标 P1。

## 8. 验收

- `loadSceneStagePack('video_prompts')` 不抛错。
- 每个 P0 stage 存在 `context-policy.yaml`。
- Vitest：policy 与旧 skill 输入边界 **关键 artifactKey** 一致（快照或表驱动）。