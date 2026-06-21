# SceneForge Direct LLM 真机 E2E 清单

## 0. 当前主线最小连续验收矩阵

按下面顺序执行，可覆盖当前 LLM Mainline Closure 最关键的连续路径：

| 阶段 | 必做动作 | 当前必须确认的结果 |
|------|----------|--------------------|
| `source_intake` | 提交源材料 → 如有方向卡则确认方向 → `Validate` → `Continue` | 方向未确认时 `Validate` 不可通过；Continue 后进入 `topic_gate` |
| `topic_gate` | 保存选题简报 → 确认风格与决策 → `Validate` → `Continue` | `topic_gate` 现在必须能看到真实 `Validate / Continue` 入口；`decision=drop` 时 Continue 应禁用且提示“不继续推进” |
| `reference` | `Run direct_llm` → 审阅草案 → 提交 → `Validate` → `Continue` | `reference_notes` 生成并可推进到 `story` |
| `story` | 同上 | `story_direction` 生成并可推进到 `assets` |
| `assets` | 同上 | `asset_plan` 生成且不过语义校验失败 |
| `design` | `Run direct_llm` → 审阅五个 key → 提交 → `Validate` → `Continue` | 五个 requiredArtifacts 全生成；提交前产物库不变，提交后落盘 |
| `script` | 同上 | `script_draft` 生成且不过语义校验失败 |
| `performance` | 同上；可额外试一次 `Continue & Run` 到 `storyboard` | `performance_direction` 生成；若试 `Continue & Run`，下一阶段只跑一次且草案不自动提交 |
| `storyboard` | 同上 | 四个 requiredArtifacts 全生成 |
| `audio` | 同上 | `audio_design` 生成且不过空壳校验 |
| `video_prompts` | 同上 | 中英文两个提示词包均生成并通过 `Segment / Audio` 校验 |

建议优先人工验证两条边：

1. `topic_gate -> reference`
2. `performance -> storyboard`（覆盖 `Continue & Run`）

## 0.2 页面恢复专项

- [ ] 在 `reference` 或 `design` 阶段点击 `Run` 生成草案后，不提交，切到别的阶段再切回。
  - 期望：草案仍显示，`runnerType` 与提示保持一致。
- [ ] 在同一次应用会话里触发页面轻量重建后返回当前阶段。
  - 期望：若已有未提交草案，则恢复为可审阅状态；不应永久卡在“运行中”。
- [ ] 提交成功后切到别的阶段再切回当前阶段。
  - 期望：当前阶段推荐产物自动回显，不需要再次 `Run` 才能看到结果。
- [ ] 若恢复前阶段处于 `Continue & Run` 的下一阶段草案态：
  - 期望：草案仍停留在审阅区，且未被自动提交。

## 0. 全局准备

- [ ] 使用 `type=sceneforge` 项目，且 `source_intake`、`topic_gate` 已完成必要 HITL 确认。
- [ ] `设置 → AI` 中默认 Provider、模型 ID、连接测试均成功。
- [ ] 当前项目已保存，且没有待处理的全局错误弹窗。
- [ ] 若涉及 style / asset 选择，先确认项目当前选择状态。
- [ ] 若计划测试 `Continue & Run`，确认当前阶段与下一阶段都支持 `direct_llm`。
- [ ] 打开一个临时记录区，准备逐阶段记录：artifact keys、Validate 结果、Alert 原文、Validator 原文、Provider 原文。

## 0.1 准备步骤（不属于 Direct LLM 主链）

- `source_intake`：确认源材料已提交，若存在改编方向列表，必须先完成方向确认，并实际点一次 `Validate / Continue`。
- `topic_gate`：确认评分、决策和风格确认已完成，并实际点一次 `Validate / Continue`；若 `decision=drop`，本轮 E2E 到此终止，不继续主链。
- 若 `topic_gate` 看不到 `Validate / Continue`，或 `drop` 后 Continue 仍可点，这属于当前主线 P0 回归，不要继续往下测。

## 1. 验收顺序

按以下顺序执行，不跳阶段：

1. `reference`
2. `story`
3. `assets`
4. `design`
5. `script`
6. `performance`
7. `storyboard`
8. `audio`
9. `video_prompts`

对应包：

- Support：`reference / story / assets / script / performance / audio` → `.scratch/sceneforge-support-pack-wave/`
- Core：`design / storyboard / video_prompts` → `.scratch/sceneforge-core-llm-happy-path/`
- 阻塞 / 语义规则：`.scratch/sceneforge-flow-hardening/`

## 2. 每阶段统一动作

每个阶段固定执行：

1. 检查上游 required context 已满足。
2. 观察 Runner 下拉是否只展示允许的执行方式。
3. 点击 Run。
4. 审阅草案区是否生成全部 requiredArtifacts。
5. 提交草案。
6. Validate。
7. Approve / Continue。
8. 记录结果。

补充观察项：

9. 若该阶段支持 `Continue & Run`，确认它是独立按钮，不替代普通 `Continue`。
10. 若 `Continue & Run` 失败，上一阶段审批不应回滚，且下一阶段应停留在草案审阅态而不是自动提交。

若某阶段失败，立即补记：

1. 当前阶段名
2. 当前 Runner
3. 当前 `required context` 提示
4. 失败发生在 Run / Submit / Validate / Continue 的哪一步
5. 原始错误文案

## 3. 阶段检查

### 3.1 reference

- 前置依赖：`topic_gate` 已完成必要确认。
- 执行动作：Run `direct_llm`，确认草案区出现 `reference_notes`，提交后 Validate。
- 期望结果：生成 `reference_notes` 草案，提交后通过校验，可继续到 `story`。
- 关联包：`.scratch/sceneforge-support-pack-wave/issues/03-reference-stage-pack.md`

### 3.2 story

- 前置依赖：`reference_notes` 已审批。
- 执行动作：Run `direct_llm`，确认草案区出现 `story_direction`，提交后 Validate。
- 期望结果：生成 `story_direction` 草案，提交后通过校验，可继续到 `assets`。
- 关联包：`.scratch/sceneforge-support-pack-wave/issues/04-story-stage-pack.md`

### 3.3 assets

- 前置依赖：`story_direction` 已审批。
- 执行动作：Run `direct_llm`，确认草案区出现 `asset_plan`，提交后 Validate。
- 期望结果：生成 `asset_plan` 草案，提交后通过校验；内容可支撑下游 design，且不触发 assets 语义失败。
- 关联包：`.scratch/sceneforge-support-pack-wave/issues/05-assets-stage-pack.md`、`.scratch/sceneforge-flow-hardening/issues/03-audio-assets-semantic-validators.md`

### 3.4 design

- 前置依赖：`reference`、`story`、`assets` 已审批。
- 执行动作：Run `direct_llm`，确认五个 key 全部出现，再提交与 Validate。
- 期望结果：五个 design requiredArtifacts 都出现；提交后通过 Validate，可 Continue。
- 关联包：`.scratch/sceneforge-core-llm-happy-path/issues/04-core-llm-electron-acceptance.md`

### 3.5 script

- 前置依赖：`design` 已审批。
- 执行动作：Run `direct_llm`，确认草案区出现 `script_draft`，提交后 Validate。
- 期望结果：生成结构化 `script_draft`；提交后不被语义校验拦下。
- 关联包：`.scratch/sceneforge-support-pack-wave/issues/06-script-stage-pack.md`、`.scratch/sceneforge-flow-hardening/issues/02-script-performance-semantic-validators.md`

### 3.6 performance

- 前置依赖：`script`、`design` 已审批。
- 执行动作：Run `direct_llm`，确认草案区出现 `performance_direction`，提交后 Validate。
- 期望结果：生成 `performance_direction`，提交后与 script / design 语义一致。
- 关联包：`.scratch/sceneforge-support-pack-wave/issues/01-performance-direct-llm.md`、`.scratch/sceneforge-flow-hardening/issues/02-script-performance-semantic-validators.md`

### 3.7 storyboard

- 前置依赖：`design`、`script`、`performance` 已审批。
- 执行动作：Run `direct_llm`，确认四个 key 全部出现，再提交与 Validate。
- 期望结果：四个 storyboard requiredArtifacts 都出现；提交后通过 Validate。
- 关联包：`.scratch/sceneforge-core-llm-happy-path/issues/04-core-llm-electron-acceptance.md`

### 3.8 audio

- 前置依赖：`storyboard`、`performance` 已审批。
- 执行动作：Run `direct_llm`，确认草案区出现 `audio_design`，提交后 Validate。
- 期望结果：生成 `audio_design`；提交后不因空壳内容失败。
- 关联包：`.scratch/sceneforge-support-pack-wave/issues/02-audio-direct-llm.md`、`.scratch/sceneforge-flow-hardening/issues/03-audio-assets-semantic-validators.md`

### 3.9 video_prompts

- 前置依赖：`design`、`storyboard`、`audio`、`performance` 已审批。
- 执行动作：Run `direct_llm`，确认中英文两个 key 都出现，再提交与 Validate。
- 期望结果：中英文两个视频提示词包都生成；提交后通过既有 `Segment` / `Audio` 校验。
- 关联包：`.scratch/sceneforge-core-llm-happy-path/issues/04-core-llm-electron-acceptance.md`

## 4. 失败记录模板

每个失败阶段至少记录：

- 阶段：
- Runner：
- 缺失或已审批的上游产物：
- Alert 原文：
- Validator 原文：
- Provider 原文（若有）：
- 草案区实际出现的 artifact keys：
- 是否存在语义校验失败 code：
- 是否重试过：
- 是否能用手动提交绕过：
- 是否涉及 `Continue & Run`：
- 失败后上一阶段审批是否被错误回滚：

## 5. 何时新建 issue

- 同一阶段可稳定复现的问题：新建一个该阶段 issue。
- 不同阶段分别失败：拆成多个 issue。
- 纯配置错误：记入清单结果，不新建产品 issue。
- 若只是 AI 设置、模型 ID、Key、Agent 配置错误：记入 handoff 或验收记录，不写产品缺陷。

## 6. 关联文档

- Core：`.scratch/sceneforge-core-llm-happy-path/`
- Support：`.scratch/sceneforge-support-pack-wave/`
- Flow Hardening：`.scratch/sceneforge-flow-hardening/`
- Gate HITL：`.scratch/sceneforge-gate-intake-card-hitl/`
- Handoff 主线：`.handoff/handoff-20260618-212256.md`

## 7. 2026-06-20 Rhythm Contract 人工验证补充

- `design` 阶段现在要求在 `design_prompts` 中明确：
  - `rhythm_contract`
  - `segment_rhythm_profiles`
  - `cut_density_expectation`
  - `boundary_rules`
- `script` 阶段现在重点确认：
  - `segment_strategy` 明确继承 `segment_duration_seconds` 与各段时间区间
  - `video_generation_unit_plan` 包含 `pacing_profile` 与 `shot_density_hint`
  - `storyboard_handoff` 包含 `boundary_lock`
  - 不应出现跨段区间写法，例如 `10s` 分段下出现 `9-13s`
- `storyboard` 阶段现在重点确认：
  - `storyboard_prompt_pack_plan` 包含 `segment_duration_seconds`
  - 每段都有 `time_range / pacing_profile / shot_count / boundary_lock`
  - 镜头数需符合段长与节奏密度预期：
    - `5s`: `3-8`
    - `6s`: `4-9`
    - `8s`: `5-10`
    - `10s`: `6-12`
    - `15s`: `8-16`
- 推荐真机优先验收场景：
  - `8s + lyrical`
  - `10s + balanced`
  - `15s + kinetic`
