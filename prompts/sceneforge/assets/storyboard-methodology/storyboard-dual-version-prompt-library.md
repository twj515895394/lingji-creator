# Storyboard Dual Version Prompt Library

asset_type: executable_reference
runtime_readable: true

```yaml
dual_version_storyboard_policy:
  source_data: same_structured_beat_and_shot_data
  control_version:
    purpose:
      - camera_order
      - action_continuity
      - blocking
      - camera_movement
      - rhythm
      - continuity
    must_include_final_style_note: true
  styled_version:
    purpose:
      - final_visual_style
      - lighting
      - color
      - material
      - character_consistency
      - scene_consistency
    must_preserve_control_info:
      - shot_number
      - key_action
      - camera_movement
      - composition_intent
      - continuity_note
```

说明：

- 控制版与风格版必须同源，不允许各自生成不同 shot 结构。
- 控制版负责稳定，风格版负责成片外观。
