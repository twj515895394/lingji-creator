# Assets User Prompt

仅使用以下 Stage Context：

{{stageContext}}

返回 JSON 对象，其中 `asset_plan` 是完整 Markdown。必须服从故事节拍中的角色/场景/道具功能与参考边界。

建议结构：

- `story_function_summary`
- `character_assets`
- `scene_assets`
- `prop_assets`
- `design_actions`
- `asset_lock_summary`
- `risk_notes`
- `next_action`

请在角色/场景资产中尽量显式写出 `reuse_direct`、`reuse_tweak`、`new_light`、`new_full`，并在道具中写出 `skip_normal`、`embed_in_character_or_scene` 或 `new_core_prop`。
