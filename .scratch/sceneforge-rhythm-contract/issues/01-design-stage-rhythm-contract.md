Status: completed-local

# Issue 01：Design 阶段项目级节奏 contract

## 目标

让 `design` 阶段正式承接 `topic_gate.segment_duration_sec`，产出项目级 rhythm contract，而不是只在上游 brief 里存在一个未被消费的数字。

## 范围

- `design` prompt / review checklist / 手工模板
- `design` validator
- 对应 stage-pack / context 测试

## 必须产出

- `segment_duration_seconds`
- `pacing_profiles`
- `cut_density_expectation`
- `boundary_rules`

## 硬规则

- 必须覆盖 gate 当前用户可见的 `5 / 6 / 8 / 10 / 15` 秒选项
- 必须明确 `shots_must_not_cross_segment_boundary`
- 不新增新 artifact key

## 验收

- `design` 缺少正式 rhythm contract 时校验失败
- `design` 能把 `segment_duration_sec` 转译为后续 `script / storyboard` 可消费字段
- 相关 tests 通过

## 评论

- 2026-06-20：`design_prompts` 已新增 rhythm contract 必需 marker，并在 validator 中显式校验 `segment_duration_seconds`、`cut_density_expectation` 覆盖表与 `shots_must_not_cross_segment_boundary`。
- 2026-06-20：定向回归已覆盖 `tests/sceneforge-validator.test.ts`、`tests/sceneforge-stage-context.test.ts`、`tests/sceneforge-phase2-integration.test.ts`、`tests/sceneforge-core-llm-happy-path.test.ts`。
