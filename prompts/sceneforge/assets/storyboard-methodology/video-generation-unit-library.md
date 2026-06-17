# Video Generation Unit Library

asset_type: executable_reference
runtime_readable: true

```yaml
video_generation_unit_policy:
  default_duration_seconds: 10
  allowed_duration_seconds: [5, 8, 10, 12, 15]
  max_duration_seconds: 15
  split_priority:
    - action_completeness
    - emotion_completeness
    - space_continuity
    - generation_duration_limit
    - management_convenience
  required_fields:
    - unit_goal
    - rhythm_type
    - rhythm_intensity
    - opening_anchor_frame
    - closing_anchor_frame
    - space_continuity_map
    - action_chain
    - emotion_chain
```

说明：

- `video_generation_unit` 是技术分段与叙事单元的统一承载体。
- 一个 unit 可以覆盖一个或多个 shot，但必须有清晰的起点、推进、落点和下一个 unit 的交接。
- 若单个 unit 已经出现空间跳转、情绪断裂或动作链断裂，应拆分。
