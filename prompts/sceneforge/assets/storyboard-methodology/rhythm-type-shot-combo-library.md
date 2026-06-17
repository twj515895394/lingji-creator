# Rhythm Type Shot Combo Library

asset_type: executable_reference
runtime_readable: true

```yaml
rhythm_type_library:
  slow_emotional_scene:
    preferred_shots:
      - relationship_shot
      - emotional_pause_shot
      - reaction_shot
  normal_story_progression:
    preferred_shots:
      - establishing_shot
      - action_process_shot
      - reaction_shot
  fast_action_scene:
    preferred_shots:
      - action_trigger_shot
      - action_process_shot
      - action_landing_shot
      - transition_bridge_shot
  comedy_reversal_scene:
    preferred_shots:
      - setup_shot
      - reaction_shot
      - transition_bridge_shot
      - climax_emphasis_shot
  suspense_tension_scene:
    preferred_shots:
      - establishing_shot
      - emotional_pause_shot
      - prop_insert_shot
      - reaction_shot
  confrontation_scene:
    preferred_shots:
      - relationship_shot
      - reaction_shot
      - climax_emphasis_shot
  montage_transition_scene:
    preferred_shots:
      - prop_insert_shot
      - transition_bridge_shot
      - action_process_shot
```

说明：

- 这里的 `preferred_shots` 是建议组合，不是固定模板。
- `setup_shot` 可在正式运行时映射到 `relationship_shot` 或 `entrance_shot`。
