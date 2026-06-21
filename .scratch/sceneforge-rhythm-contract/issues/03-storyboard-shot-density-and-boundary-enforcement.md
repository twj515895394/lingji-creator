Status: completed-local

# Issue 03：Storyboard 镜头密度与段界硬执行

## 目标

让 `storyboard` 真正成为节奏 contract 的执行层，对镜头数、段界和 pacing 匹配做正式硬校验。

## 范围

- `storyboard` prompt / review checklist / output contract
- `validators.storyboard.ts`
- storyboard / validator / happy-path tests

## 硬规则

- shot 必须完整落在单一 segment 内
- 5s：`3-8`
- 6s：`4-9`
- 8s：`5-10`
- 10s：`6-12`
- 15s：`8-16`

## 推荐带

- `lyrical`：靠低密度区间
- `balanced`：靠中密度区间
- `kinetic`：靠高密度区间

## 失败类型

- `segment boundary crossed`
- `shot density too low`
- `shot density too high`
- `pacing mismatch`

## 验收

- `9s-13s` 这类跨段 shot 明确失败
- 10 秒段少于 6 或多于 12 失败
- 15 秒段少于 8 或多于 16 失败
- 现有 pack / copy-block / total_shots 规则不回退

## 评论

- 2026-06-20：`storyboard_prompt_pack_plan` 已新增 `segment_duration_seconds` 与逐段 plan 行校验，覆盖 `time_range`、`pacing_profile`、`shot_count`、`boundary_lock`。
- 2026-06-20：新增 storyboard 错误码 `SCENE_STORYBOARD_PACK_MISSING_RHYTHM_CONTRACT`、`SCENE_STORYBOARD_PACK_SHOT_COUNT_MISMATCH`、`SCENE_STORYBOARD_PACK_SEGMENT_BOUNDARY_CROSSED`、`SCENE_STORYBOARD_PACK_INVALID_SHOT_DENSITY`、`SCENE_STORYBOARD_PACK_PACING_MISMATCH`。
- 2026-06-20：定向回归已覆盖 `tests/sceneforge-validator.test.ts`、`tests/sceneforge-stage-context.test.ts`、`tests/sceneforge-phase2-integration.test.ts`、`tests/sceneforge-core-llm-happy-path.test.ts`。
