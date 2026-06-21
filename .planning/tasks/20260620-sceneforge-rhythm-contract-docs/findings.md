# Findings

## Requirements

- 用户确认采用“两层节奏 contract”：
  - `design` 定义节奏边界
  - `script` 承接段级 pacing
  - `storyboard` 负责镜头拆分与硬校验
- 用户希望补齐详细设计、实施计划、PRD 和 issue 拆分。

## Research Findings

- `topic_gate` 当前真实段长选项为 `5 / 6 / 8 / 10 / 15` 秒。
- storyboard methodology 里已有 `shot-density-reference`，但当前参考值偏保守，且没有覆盖用户希望的 `10s=6-12`、`15s=8-16` 主口径。
- 当前 `storyboard` validator 已校验总镜头数与 pack 结构，但尚未把“镜头不能跨 segment 边界”与“密度服从段长+pacing”提升为正式规则。
- 现有最佳接缝仍然是 `Stage Context + Stage Pack + Validator`。

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| 用 `.scratch/sceneforge-rhythm-contract/` 承载文档包 | 与仓库既有 SceneForge package 组织方式一致 |
| 不新增 artifact key | 避免牵连 UI / persistence / export |
| 保留 `12s` 作为 methodology 内部兼容值 | 当前用户可见 gate 没有 12 秒选项 |

## Proposed Density Table

| Duration | Hard Range | Lyrical | Balanced | Kinetic |
|----------|------------|---------|----------|---------|
| 5s | 3-8 | 3-4 | 4-6 | 6-8 |
| 6s | 4-9 | 4-5 | 5-7 | 7-9 |
| 8s | 5-10 | 5-6 | 6-8 | 8-10 |
| 10s | 6-12 | 6-7 | 7-9 | 9-12 |
| 15s | 8-16 | 8-10 | 10-12 | 12-16 |
