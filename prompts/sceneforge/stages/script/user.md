# Script User Prompt

仅使用以下 Stage Context：

{{stageContext}}

返回 JSON 对象，其中 `script_draft` 是完整 Markdown。必须服从故事节拍与设计主参考的气质边界。

当依赖资料之间对同一事实存在冲突时，严格按 Stage Context 中给出的 `referencePriority` 执行：

- 越后面阶段的已确认内容，优先级越高
- 后阶段内容视为对前阶段内容的修订
- 不得自行折中或回退到更早阶段的旧版本表述

输出时请确保：

- `story_beats` 中至少有 3 个 `beat_id`
- `segment_strategy` 明确写出 `segment_duration_seconds` 与各段 `segment_time_range`
- `video_generation_unit_plan` 至少有 2 个 VGU，并说明 beat 对应或时长/叙事目标，同时写出 `pacing_profile` 与 `shot_density_hint`
- `script_body` 中至少有 2 个以上可拍段落，且包含旁白/对白与动作/停顿/视线锚点
- `performance_handoff` 明确列出下游必须继承的动作、停顿、reaction timing
- `storyboard_handoff` 明确列出镜头关注点、站位/道具连续性或转场承接，并显式给出 `boundary_lock`
- 段级 handoff 不得出现跨 segment 区间；例如 `segment_duration_seconds: 10` 时，不得写出 `9s-13s`

建议结构：

- `script_summary`
- `segment_strategy`
- `story_beats`
- `beat_table`
- `video_generation_unit_plan`
- `script_body`
- `performance_handoff`
- `storyboard_handoff`
- `risk_notes`
- `next_action`
