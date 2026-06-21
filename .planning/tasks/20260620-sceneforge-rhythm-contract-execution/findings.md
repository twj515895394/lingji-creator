# Findings

## 2026-06-20 Issue 01

- `design` 阶段现有最合适接缝就是 `design_prompts`，无需新增 artifact。
- 现有 `validators.design.ts` 已经有 `design_prompts` marker 校验，扩成 rhythm contract 成本很低。
- 加强 design validator 后，连带暴露出多处旧 storyboard/video fixtures 已落后于当前 contract；这些属于测试样例回补，不是业务逻辑回归。

## Implemented Checks

- `rhythm_contract`
- `segment_rhythm_profiles`
- `cut_density_expectation`
- `boundary_rules`
- `segment_duration_seconds` 必须为 `5 / 6 / 8 / 10 / 15`
- 密度表必须覆盖 `5s / 6s / 8s / 10s / 15s`
- 必须显式声明 `shots_must_not_cross_segment_boundary`

## 2026-06-20 Issue 02

- `script` 阶段最合适的 pacing handoff 落点是：
  - `segment_strategy`
  - `video_generation_unit_plan`
  - `storyboard_handoff`
- 不需要新增 artifact，也不需要把 `script` 变成逐镜头 shot list。
- 新增 validator 后，最小强约束已经明确：
  - `segment_strategy` 必须有 `segment_duration_seconds` 与 `segment_time_range`
  - `video_generation_unit_plan` 必须有 `pacing_profile` 与 `shot_density_hint`
  - `storyboard_handoff` 必须有 `boundary_lock`
- 若 `segment_strategy` 出现 `9s-13s` 这类跨段区间，直接失败

## 2026-06-20 Issue 03

- `storyboard` 层最稳的硬校验落点是 `storyboard_prompt_pack_plan` 的逐段 plan 行，而不是临时去解析 control board 的自然语言整板描述。
- 当前采用的逐段 plan 结构最小集合是：
  - `segment_duration_seconds`
  - `Segment XX | time_range: ... | pacing_profile: ... | shot_count: ... | boundary_lock: true`
- 这样可以在不新增 artifact 的前提下，稳定校验：
  - 总镜头数和逐段汇总是否一致
  - 是否跨段
  - 是否落在段长硬区间
  - 是否与 pacing profile 匹配
