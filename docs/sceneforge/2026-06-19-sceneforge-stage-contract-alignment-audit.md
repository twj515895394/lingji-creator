# SceneForge 阶段产物契约对齐审计

> 日期：2026-06-19
> 范围：`lingji-creator` 当前 SceneForge Studio 各阶段产物，与旧 `scene_forge` 对应 skill 的产物数量、正式体裁、内容标准、自动 review 强度做逐阶段对齐审计。

## 1. 目标

本审计不讨论“阶段能不能跑通”，只回答 4 个问题：

1. 当前阶段产物数量是否与旧 skill 的核心交付对齐。
2. 当前阶段正文体裁是否与旧 skill 的正式交付体裁对齐。
3. 当前阶段内容要求是否具备下游直接继承所需的结构化信息。
4. 当前 `Validate` / 自动 review 是否能把这些标准真正拦住。

## 2. 推荐实施策略

### 方案 A：只增强 review 文案，不改 validator

- 优点：改动最小，短期不会大面积打断现有手测。
- 缺点：模型仍可生成“看起来像完成、实际不可下游消费”的草案，用户只能肉眼兜底。

### 方案 B：保持当前 artifact key 数量，补齐每个阶段的正式体裁和强 validator

- 优点：最大限度保留当前 Studio 架构与上下游依赖 key，不做 silent redesign。
- 缺点：需要把旧 skill 中大量“多文件交付”的语义压回现有 artifact，并为 validator 增加阶段专属 marker 校验。

### 方案 C：完全回到旧项目的多文件交付模型

- 优点：最接近旧 `scene_forge`。
- 缺点：会重写当前 Studio 的 artifact contract、UI 草案审阅、提交链和 export 逻辑，风险显著更高。

### 推荐

采用 **方案 B**。

理由：

- 用户已确认要保留当前项目里英文 key 作为上下游依赖主键。
- 当前 Studio 已围绕少量 artifact key 建好 `run -> draft review -> submit -> validate -> continue` 主链。
- 先把旧 skill 的正式体裁、marker、自动 review 校验补到现有 contract，能以更小风险恢复产物质量。

## 3. 对齐原则

### 3.1 不轻易增加新的 artifact key

优先把旧 skill 的“多文件语义”压回现有 artifact：

- 结构性 marker
- 正式体裁模板
- review checklist
- validator 语义拦截

只有当语义无法被安全压回现有 artifact 时，才考虑新增 artifact key。

### 3.2 先补 core，再补 support

优先顺序：

1. `storyboard`
2. `video_prompts`
3. `reference / story / assets / script / performance / audio`
4. `source_intake / topic_gate` 是否纳入统一 pack-validator 体系，单独决策

### 3.3 自动 review 必须可执行

每个阶段最终都要落到两类校验：

- **存在性校验**：artifact 是否存在、是否为空
- **语义校验**：是否具备旧 skill 规定的正式体裁、关键 marker、下游继承信息

## 4. 逐阶段审计矩阵

### 4.1 Core 阶段

| 阶段 | 当前 `lingji-creator` | 旧 `scene_forge` skill 标准 | 现状判断 | 推荐对齐方式 |
|---|---|---|---|---|
| `design` | 5 个 artifact：`design_prompts`、`character_prompts`、`scene_prompts`、`prop_prompts`、`master_reference_prompt` | 设计总览 + 角色说明书板 + 全场景资产总参考图；复杂项目还应有空间站位图；必须包含 `space_continuity_seed / prop_state_machines / blocking_map` | 已部分补齐，但仍缺“空间站位图”显式出口 | 继续维持 5 key，必要时将“空间站位图”作为 `scene_prompts` 的强 section；若仍不足，再评估新增 key |
| `storyboard` | 4 个 artifact：`storyboard_prompt_pack`、`control_board_prompts`、`style_board_prompts`、`master_board_prompt` | 主 pack + `beat_skeleton` + `video_generation_units` + `shot_continuity_plan` + `storyboard_quality_check` + `design_reconciliation_review` + control/styled prompt 文件；prompt 必须是正式整板三段结构 | 明显未对齐 | 保持 4 key，但把主 pack 内强制补齐上述 section，并把 quality/design review 语义压入对应 artifact 或新增 review metadata；validator 补 marker 校验 |
| `video_prompts` | 2 个 artifact：`video_prompt_pack`、`video_prompt_pack_cn` | 中文 pack 为默认主交付；按需英文 pack；正文必须包含 `video_prompt_pack_plan`、`pack_audio_execution_plan`、四层强结构、`segment_sound_execution`、`可直接复制使用块` | 明显未对齐 | 保持现有 2 key，先把中文包定义为默认主交付，英文包改为按需；补齐正式四层体裁与声音执行 marker 校验 |

### 4.2 Support 阶段

| 阶段 | 当前 `lingji-creator` | 旧 `scene_forge` skill 标准 | 现状判断 | 推荐对齐方式 |
|---|---|---|---|---|
| `reference` | `reference_notes` | 需要 `reference_boundary / allowed_inheritance / forbidden_inheritance / creative_direction_context` | 未对齐 | 补正式 section marker + validator |
| `story` | `story_direction` | 需要 `story_beats`（4–8）与 `emotional_arc`，并给下游角色/场景/道具功能 | 部分对齐 | 补 `story_beats / emotional_arc / hero_moment / ending_payoff` marker 校验 |
| `assets` | `asset_plan` | 需要 `asset_lock / locked_assets / downstream_constraints` | 部分对齐 | 在现有 artifact 中补资产锁定正式 section，并增强 validator |
| `script` | `script_draft` | 旧 skill 不只是“有剧本”，还要求与 `story_beats` 一致、分段策略明确、可供 performance/storyboard 继承 | 部分对齐 | 保持单 artifact，但补 `story_beats / segment_strategy / performance_handoff` marker |
| `performance` | `performance_direction` | 旧 skill 需要完整 performance sheet，含 Hero/Bridge/Blocking/道具状态承接 | 明显偏轻 | 增加 performance sheet marker 校验 |
| `audio` | `audio_design` | 旧 skill 需要 audio plan，含 BGM、Ambience、Foley-SFX、Silence、Bridge/Blocking/道具状态声音连续性 | 部分对齐 | 增强 `audio_execution_plan` 与声音层、连续性 marker 校验 |

### 4.3 Intake / Gate 阶段

| 阶段 | 当前 `lingji-creator` | 旧 `scene_forge` skill 标准 | 现状判断 | 推荐对齐方式 |
|---|---|---|---|---|
| `source_intake` | 表单 + `source_material` | 旧项目是长结构 intake 分析与资产化协议 | 不在同一 contract 层级 | 暂不纳入第一轮统一 pack-validator 升级 |
| `topic_gate` | HITL + LLM analysis 进行中 | 旧项目要求真实评分、go/observe/drop、风格候选、阻塞规则 | 正在演进 | 暂不并入本轮统一 contract 升级，待 topic gate 主线稳定后单独收口 |

## 5. 自动 review 现状

### 当前已具备

- `design`：开始具备正式 marker 校验
- `assets / script / performance / audio`：具备轻量语义校验
- `video_prompts`：只校验 `segment` 与 `audio`

### 当前明显不足

- `storyboard`：几乎只有“存在且非空”，没有导演级体裁校验
- `reference / story`：缺少旧 skill 对正式结构的强拦截
- `performance / audio`：仅关键词级，不足以拦下“内容存在但不可下游消费”的草案

## 6. 推荐的自动 review 目标态

每个阶段都收敛到统一模式：

1. **Artifact Presence**
   - 是否存在
   - 是否非空
   - 是否满足当前阶段 output contract

2. **Formal Structure**
   - 是否包含旧 skill 对应正式体裁 marker
   - 是否避免旧 skill 明确禁止的退化形态

3. **Downstream Readiness**
   - 是否包含下游需要继承的 continuity / blocking / audio / beat / asset lock 等信息

4. **Project Constraints**
   - 是否与上游已确认角色数量、场景关系、风格边界冲突

## 7. 实施顺序

### Phase 1: `storyboard` 对齐

目标：

- 把旧 `scene-storyboard-director` 的主交付结构压回当前 4 个 artifact
- 为 control/styled prompt 增加正式三段结构校验
- 为 `storyboard_prompt_pack` 增加 `beat_skeleton / VGU / shot_continuity / pack_plan / quality_check / design_reconciliation_review` marker 校验

### Phase 2: `video_prompts` 对齐

目标：

- 把旧 `scene-video-prompt-builder` 的四层强结构与 `pack_audio_execution_plan` / `segment_sound_execution` / `可直接复制使用块` 补回
- 让 validator 能明确拦截“只有 segment + audio 的空壳 pack”

### Phase 3: support 阶段统一收口

目标：

- `reference / story / assets / script / performance / audio`
- 每个阶段至少补齐旧 skill 的正式 marker 与最低下游继承信息

### Phase 4: 自动 review 统一框架

目标：

- 复盘哪些阶段仍重复写相似 marker 校验
- 提取共享 helper，避免 validator 逻辑发散

## 8. 不在本轮内做的事

- 不把当前 Studio 完全重构回旧项目多文件输出模式
- 不立刻给 `source_intake` / `topic_gate` 强行套同一套 artifact contract
- 不在没有必要的情况下新增大量 artifact key

## 9. 验证要求

每个阶段至少补两类测试：

1. 合格样例应通过
2. 退化样例应失败

建议测试文件顺序：

- `tests/sceneforge-validator.test.ts`
- 如阶段逻辑复杂，再拆独立测试：
  - `tests/sceneforge-storyboard-validator.test.ts`
  - `tests/sceneforge-video-prompts-validator.test.ts`

## 10. 执行建议

先从 `storyboard` 开始，不是因为它最简单，而是因为它和 `design`、`video_prompts` 连接最紧，补完后能显著减少整条主链的“产物 key 对了、内容却不可继承”的问题。
