# Continuity Control Library

asset_type: executable_reference
runtime_readable: true

```yaml
continuity_anchor_fields:
  previous_left:
  current_picks_up:
  current_leaves:
  next_should_pick_up:

space_continuity_map_fields:
  space_type:
  main_axis:
  initial_character_positions:
  character_movement_range:
  key_prop_positions:
  camera_activity_area:
  forbidden_axis_crossing:
  foreground_midground_background:
  available_camera_positions:
  unavailable_camera_positions:
  previous_unit_spatial_handoff:
  next_unit_spatial_handoff:

action_chain_fields:
  preparation:
  trigger:
  process:
  landing:
  reaction:
  next_action_entry:

emotion_chain_fields:
  emotion_start:
  emotion_trigger:
  emotion_shift:
  emotion_peak:
  emotion_landing:
  next_emotion_entry:
```

说明：

- v8 连续性控制至少覆盖节奏、动作、情绪、空间四线。
- `space_continuity_map` 是故事板和视频提示词之间的稳定锚点。
