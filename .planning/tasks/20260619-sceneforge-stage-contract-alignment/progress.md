# Progress

## 2026-06-19

### Phase 1: 审计与设计落盘
- **Status:** complete
- **Started:** 2026-06-19
- Actions taken:
  - 读取旧 `scene_forge` 中 `scene-design-builder`、`scene-storyboard-director`、`scene-video-prompt-builder` 及 support 相关 skill
  - 读取当前 `lingji-creator` 各阶段 `output-contract.yaml`、`review-checklist.md`、validator
  - 初步确认 `storyboard`、`video_prompts` 与旧 skill 标准差距最大
  - 新增对齐审计文档与实施计划文档
- Files created/modified:
  - `docs/sceneforge/2026-06-19-sceneforge-stage-contract-alignment-audit.md` (created)
  - `docs/superpowers/plans/2026-06-19-sceneforge-stage-contract-alignment.md` (created)
  - `.planning/tasks/20260619-sceneforge-stage-contract-alignment/task_plan.md` (created)
  - `.planning/tasks/20260619-sceneforge-stage-contract-alignment/findings.md` (created)
  - `.planning/tasks/20260619-sceneforge-stage-contract-alignment/progress.md` (created)

### Phase 2: Storyboard 契约对齐
- **Status:** complete
- Actions taken:
  - 读取旧 `scene-storyboard-director` 的 required deliverables、review checklist 与 storyboard prompt template
  - 补强当前 `storyboard` 阶段的 `system.md`、`user.md`、`review-checklist.md`
  - 为 `validators.storyboard.ts` 增加正式导演级 marker 校验
  - 在 `tests/sceneforge-validator.test.ts` 新增 storyboard 合格样例与退化样例
- Files created/modified:
  - `prompts/sceneforge/stages/storyboard/system.md` (modified)
  - `prompts/sceneforge/stages/storyboard/user.md` (modified)
  - `prompts/sceneforge/stages/storyboard/review-checklist.md` (modified)
  - `electron/sceneforge/validators/validators.storyboard.ts` (modified)
  - `tests/sceneforge-validator.test.ts` (modified)

### Phase 3: Video Prompts 契约对齐
- **Status:** complete
- Actions taken:
  - 对照旧 `scene-video-prompt-builder` 的 `video-prompt-template.md`，抽取正式 pack 必需 section、声音四层和 copy-ready block 结构
  - 补强当前 `video_prompts` 阶段的 `system.md`、`user.md`、`review-checklist.md`
  - 为 `validators.video-prompts.ts` 增加正式 pack marker、声音执行层、copy-ready block、时间码流校验
  - 在 `tests/sceneforge-validator.test.ts` 增加 video_prompts 合格样例与退化样例
  - 运行 `npx vitest run tests/sceneforge-validator.test.ts`，确认 7 tests passed
- Files created/modified:
  - `prompts/sceneforge/stages/video_prompts/system.md` (modified)
  - `prompts/sceneforge/stages/video_prompts/user.md` (modified)
  - `prompts/sceneforge/stages/video_prompts/review-checklist.md` (modified)
  - `electron/sceneforge/validators/validators.video-prompts.ts` (modified)
  - `tests/sceneforge-validator.test.ts` (modified)

### Phase 4: Support 阶段第一批收口
- **Status:** complete
- Actions taken:
  - 对照旧 `scene-reference-decider`、`scene-story-development`、`scene-asset-checker` 的 `output-contract.md`
  - 为 `reference / story / assets` 阶段补强正式 section marker、review-checklist 与 validator 校验
  - 修正 `story` 阶段 beat 数量统计，避免 `beat_id` 与 `B01` 被重复计数
  - 在 `tests/sceneforge-validator.test.ts` 新增三阶段合格/退化样例
  - 运行 `npx vitest run tests/sceneforge-validator.test.ts`，确认 10 tests passed
- Files created/modified:
  - `prompts/sceneforge/stages/reference/system.md` (modified)
  - `prompts/sceneforge/stages/reference/user.md` (modified)
  - `prompts/sceneforge/stages/reference/review-checklist.md` (modified)
  - `electron/sceneforge/validators/validators.reference.ts` (modified)
  - `prompts/sceneforge/stages/story/system.md` (modified)
  - `prompts/sceneforge/stages/story/user.md` (modified)
  - `prompts/sceneforge/stages/story/review-checklist.md` (modified)
  - `electron/sceneforge/validators/validators.story.ts` (modified)
  - `prompts/sceneforge/stages/assets/system.md` (modified)
  - `prompts/sceneforge/stages/assets/user.md` (modified)
  - `prompts/sceneforge/stages/assets/review-checklist.md` (modified)
  - `electron/sceneforge/validators/validators.assets.ts` (modified)
  - `tests/sceneforge-validator.test.ts` (modified)

### Phase 5: Support 阶段第二批收口
- **Status:** complete
- Actions taken:
  - 对照旧 `scene-script-adapter`、`scene-performance-director`、`scene-audio-director` 的 `output-contract.md`
  - 为 `script / performance / audio` 阶段补强正式 section marker、review-checklist 与 validator 校验
  - 在 `tests/sceneforge-validator.test.ts` 新增三阶段合格/退化样例
  - 运行 `npx vitest run tests/sceneforge-validator.test.ts`，确认 13 tests passed
- Files created/modified:
  - `prompts/sceneforge/stages/script/system.md` (modified)
  - `prompts/sceneforge/stages/script/user.md` (modified)
  - `prompts/sceneforge/stages/script/review-checklist.md` (modified)
  - `electron/sceneforge/validators/validators.script.ts` (modified)
  - `prompts/sceneforge/stages/performance/system.md` (modified)
  - `prompts/sceneforge/stages/performance/user.md` (modified)
  - `prompts/sceneforge/stages/performance/review-checklist.md` (modified)
  - `electron/sceneforge/validators/validators.performance.ts` (modified)
  - `prompts/sceneforge/stages/audio/system.md` (modified)
  - `prompts/sceneforge/stages/audio/user.md` (modified)
  - `prompts/sceneforge/stages/audio/review-checklist.md` (modified)
  - `electron/sceneforge/validators/validators.audio.ts` (modified)
  - `tests/sceneforge-validator.test.ts` (modified)

### Phase 6: 自动 review 与 UI 收尾
- **Status:** complete
- Actions taken:
  - 复核中文+英文 artifact label 展示仍正常
  - 评估共享 validator helper 抽取价值，结论为当前先保持阶段专属 marker 校验更稳妥
  - 运行 `npx vitest run tests/sceneforge-validator.test.ts tests/sceneforge-ui.test.tsx`，确认 24 tests passed

## Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Storyboard contract | `npx vitest run tests/sceneforge-validator.test.ts` | storyboard 正式体裁校验与退化样例拦截通过 | 7 tests passed | ✓ |
| Video prompts contract | `npx vitest run tests/sceneforge-validator.test.ts` | video_prompts 正式 pack 校验与退化样例拦截通过 | 7 tests passed | ✓ |
| Support batch 1 | `npx vitest run tests/sceneforge-validator.test.ts` | reference / story / assets 正式结构校验通过 | 10 tests passed | ✓ |
| Support batch 2 | `npx vitest run tests/sceneforge-validator.test.ts` | script / performance / audio 正式结构校验通过 | 13 tests passed | ✓ |
| Final regression | `npx vitest run tests/sceneforge-validator.test.ts tests/sceneforge-ui.test.tsx` | validator + UI 一起通过 | 24 tests passed | ✓ |

## Remaining Work
- 当前计划已完成，可继续在真实工坊优先手测 `audio -> video_prompts`，重点观察人声锁定、停顿继承与跨段 voice continuity 是否在 `test002` 上稳定生效
- 2026-06-19 晚间补充 bugfix：`audio` 阶段已新增中文主导硬约束，并放宽 `Foley-SFX` 校验到 `Foley / 拟音 / 音效` 别名，避免真实草案因字面差异误报失败。

### Phase 7: Audio 人声一致性补强
- **Status:** complete
- **Started:** 2026-06-19
- Actions taken:
  - 复读最新 3 份 handoff，确认当前联调重点已切到 `audio -> video_prompts -> export/publish`
  - 对照旧 `scene-audio-director` 与当前 `audio` stage pack / context policy / validator，确认缺口集中在 `script_draft` 输入、人声连续性 marker 和下游 handoff 粒度
  - 确认采用最小改动路线：保持 `audio_design` 单 artifact，不拆新 key
  - 为 `audio` stage pack 增加 `script_draft` required input，并把人声一致性 marker 写入 prompt、review checklist、handoff template 与 validator
  - 为 `video_prompts` 明确补充 voice continuity 继承要求，但保持现有四层声音执行结构不变
  - 更新 support submit / happy-path / stage pack / stage context / validator 测试夹具，使其对齐现有正式 contract
  - 运行 `npx vitest run tests/sceneforge-validator.test.ts tests/sceneforge-stage-context.test.ts tests/sceneforge-stage-pack.test.ts tests/sceneforge-support-submit.test.ts tests/sceneforge-support-llm-happy-path.test.ts`，确认 `59` tests passed
  - 针对真实联调反馈追加 bugfix：`audio` prompt 增加中文主导硬约束，`validators.audio.ts` 增加中文主导校验，并将 `Foley-SFX` 放宽为 `Foley / 拟音 / 音效` 等别名
  - 运行 `npx vitest run tests/sceneforge-validator.test.ts tests/sceneforge-stage-pack.test.ts`，确认 `39` tests passed
- Files created/modified:
  - `.planning/tasks/20260619-sceneforge-stage-contract-alignment/task_plan.md` (modified)
  - `.planning/tasks/20260619-sceneforge-stage-contract-alignment/findings.md` (modified)
  - `.planning/tasks/20260619-sceneforge-stage-contract-alignment/progress.md` (modified)
  - `prompts/sceneforge/stages/audio/system.md` (modified)
  - `prompts/sceneforge/stages/audio/user.md` (modified)
  - `prompts/sceneforge/stages/audio/review-checklist.md` (modified)
  - `prompts/sceneforge/stages/audio/context-policy.yaml` (modified)
  - `prompts/sceneforge/stages/audio/handoff-template.yaml` (modified)
  - `prompts/sceneforge/stages/video_prompts/system.md` (modified)
  - `prompts/sceneforge/stages/video_prompts/user.md` (modified)
  - `electron/sceneforge/validators/validators.audio.ts` (modified)
  - `tests/sceneforge-validator.test.ts` (modified)
  - `tests/sceneforge-stage-context.test.ts` (modified)
  - `tests/sceneforge-stage-pack.test.ts` (modified)
  - `tests/sceneforge-support-submit.test.ts` (modified)
  - `tests/sceneforge-support-llm-happy-path.test.ts` (modified)
