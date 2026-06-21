# Progress

## 2026-06-20

- 实现 `Issue 01`：为 `design` 阶段新增项目级 rhythm contract 要求。
- 修改：
  - `electron/sceneforge/validators/validators.design.ts`
  - `prompts/sceneforge/stages/design/system.md`
  - `prompts/sceneforge/stages/design/user.md`
  - `prompts/sceneforge/stages/design/review-checklist.md`
  - `tests/sceneforge-validator.test.ts`
  - `tests/sceneforge-stage-context.test.ts`
  - `tests/sceneforge-phase2-integration.test.ts`
  - `tests/sceneforge-core-llm-happy-path.test.ts`
- 新增 design validator 错误类型：
  - `SCENE_DESIGN_RHYTHM_CONTRACT_MISSING_SEGMENT_DURATION`
  - `SCENE_DESIGN_RHYTHM_CONTRACT_MISSING_DENSITY_TABLE`
  - `SCENE_DESIGN_RHYTHM_CONTRACT_MISSING_BOUNDARY_RULE`
- 回归中发现旧 core/storyboard/video fixture 未跟上当前 contract，已一并补齐。

## 2026-06-20 Issue 02

- 实现 `Issue 02`：为 `script` 阶段新增段级 pacing handoff contract。
- 修改：
  - `electron/sceneforge/validators/semantic-support-stages.ts`
  - `prompts/sceneforge/stages/script/system.md`
  - `prompts/sceneforge/stages/script/user.md`
  - `prompts/sceneforge/stages/script/review-checklist.md`
  - `src/sceneforge/lib/scene-prep-support-stages.ts`
  - `tests/sceneforge-semantic-validators.test.ts`
  - `tests/sceneforge-support-submit.test.ts`
  - `tests/sceneforge-support-llm-happy-path.test.ts`
  - `tests/sceneforge-validator.test.ts`
- 新增 script 语义失败类型：
  - `SCRIPT_SEGMENT_STRATEGY_TOO_THIN`
  - `SCRIPT_SEGMENT_BOUNDARY_CROSSED`
  - `SCRIPT_PACING_HANDOFF_TOO_THIN`
  - `SCRIPT_BOUNDARY_LOCK_TOO_THIN`
- 定向回归通过：
  - `npx vitest run tests/sceneforge-semantic-validators.test.ts tests/sceneforge-support-submit.test.ts tests/sceneforge-support-llm-happy-path.test.ts tests/sceneforge-validator.test.ts`

## 2026-06-20 Issue 03

- 实现 `Issue 03`：为 `storyboard` 增加 segment boundary / shot density / pacing mismatch 硬校验。
- 修改：
  - `electron/sceneforge/validators/validators.storyboard.ts`
  - `prompts/sceneforge/stages/storyboard/system.md`
  - `prompts/sceneforge/stages/storyboard/user.md`
  - `prompts/sceneforge/stages/storyboard/review-checklist.md`
  - `tests/sceneforge-validator.test.ts`
  - `tests/sceneforge-stage-context.test.ts`
  - `tests/sceneforge-phase2-integration.test.ts`
  - `tests/sceneforge-core-llm-happy-path.test.ts`
- 新增 storyboard 错误类型：
  - `SCENE_STORYBOARD_PACK_MISSING_RHYTHM_CONTRACT`
  - `SCENE_STORYBOARD_PACK_SHOT_COUNT_MISMATCH`
  - `SCENE_STORYBOARD_PACK_SEGMENT_BOUNDARY_CROSSED`
  - `SCENE_STORYBOARD_PACK_INVALID_SHOT_DENSITY`
  - `SCENE_STORYBOARD_PACK_PACING_MISMATCH`
- 定向回归通过：
  - `npx vitest run tests/sceneforge-validator.test.ts tests/sceneforge-stage-context.test.ts tests/sceneforge-phase2-integration.test.ts tests/sceneforge-core-llm-happy-path.test.ts`

## 2026-06-20 Phase 4 收口

- 补跑类型回归：
  - `npx tsc --noEmit`
- 记录真实失败样例：
  - `script` 阶段 `story_beats` 已存在但被误判缺失
  - 根因是 `semantic-support-stages.ts` 旧解析规则过窄，未覆盖真实草案中的 `- **beat_01: 标题**` 结构
  - 已扩展 section / beat 提取逻辑并补齐回归
- 当前状态：
  - 代码、prompt、validator、测试与执行文档已收口
  - 尚未执行新的人工真机主链验收；下一步由人工按 checklist 验证 `design -> script -> performance -> storyboard`
