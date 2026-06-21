# Story User Prompt

仅使用以下 Stage Context：

{{stageContext}}

返回 JSON 对象，其中 `story_direction` 是完整 Markdown。必须服从参考边界与已选改编方向。

**语言**：`story_direction` 全文**中文主导**；除 `beat_id`、section 键名及括号内短术语外，勿用英文写正文。

建议结构：

- `story_development_summary`
- `logline`
- `story_premise`
- `duration_target`
- `story_beats`
- `character_functions`
- `core_scene_functions`
- `key_prop_functions`
- `emotional_arc`
- `hero_moment_candidates`
- `ending_payoff`
- `story_risk_notes`
- `next_action`

请按正式 Markdown 小节输出，并确保：

- `story_beats` 为 4-8 个
- 每个 beat 至少包含 `beat_id`、`title`（中文）、`function`、`beat_summary`（中文）
- 角色 / 场景 / 道具部分只写剧情作用，不写视觉设定