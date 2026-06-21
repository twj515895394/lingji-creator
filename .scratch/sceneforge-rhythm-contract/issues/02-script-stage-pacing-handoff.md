Status: completed-local

# Issue 02：Script 阶段段级 pacing handoff

## 目标

让 `script` 在保持 narrative artifact 形态不变的前提下，正式交付 storyboard 所需的段级 pacing handoff。

## 范围

- `script` prompt / review checklist / 手工模板
- `semantic-support-stages.ts`
- `validators.script.ts`
- script happy path tests

## 必须产出

- `segment_time_range`
- `pacing_profile`
- `shot_density_hint`
- `boundary_lock`
- 可消费的 `storyboard_handoff`

## 不做

- 不把 `script` 变成 shot list
- 不在 `script` 阶段做最终 shot count 硬校验

## 验收

- `script` 若只写“节奏偏快/偏慢”但无段级 handoff，校验失败
- `script` 若出现跨段时间范围描述，校验失败
- `script` 正常草案能被 `storyboard` 真实消费

## 评论

- 2026-06-20：`segment_strategy` 已要求 `segment_duration_seconds` 与 `segment_time_range`，`video_generation_unit_plan` 已要求 `pacing_profile` 与 `shot_density_hint`，`storyboard_handoff` 已要求 `boundary_lock`。
- 2026-06-20：新增 script 语义错误码 `SCRIPT_SEGMENT_STRATEGY_TOO_THIN`、`SCRIPT_SEGMENT_BOUNDARY_CROSSED`、`SCRIPT_PACING_HANDOFF_TOO_THIN`、`SCRIPT_BOUNDARY_LOCK_TOO_THIN`。
- 2026-06-20：定向回归已覆盖 `tests/sceneforge-semantic-validators.test.ts`、`tests/sceneforge-support-submit.test.ts`、`tests/sceneforge-support-llm-happy-path.test.ts`、`tests/sceneforge-validator.test.ts`。
