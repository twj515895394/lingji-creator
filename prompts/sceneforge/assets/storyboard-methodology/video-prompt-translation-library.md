# Video Prompt Translation Library

asset_type: executable_reference
runtime_readable: true

```yaml
storyboard_reference_usage_statement:
  use_reference_for:
    - shot_order
    - character_action
    - blocking
    - camera_movement
    - composition
    - narrative_rhythm
  do_not_preserve:
    - storyboard_grid
    - panel_border
    - shot_number
    - arrows
    - labels
    - pencil_sketch_style
  final_video_must_use:
    - specified_final_style
    - character_assets
    - scene_assets
    - lighting
    - color
    - material_texture
```

说明：

- 故事板参考只服务叙事与镜头控制，不服务最终画面样式复制。
- 视频提示词必须明确“不要保留分镜边框、编号、草图痕迹”。
