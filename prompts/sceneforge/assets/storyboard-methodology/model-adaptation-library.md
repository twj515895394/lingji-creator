# Model Adaptation Library

asset_type: executable_reference
runtime_readable: true

```yaml
model_adaptation_library:
  jimeng_kling_like:
    focus:
      - strict_storyboard_order
      - no_skipping_shots
      - avoid_storyboard_artifacts
  seedance_like:
    structure:
      - FORMAT
      - SUBJECTS
      - SETTING
      - ACTION_SEQUENCE
      - CAMERA
      - SOUND
      - CONTINUITY
  sora_veo_like:
    focus:
      - natural_cinematic_paragraph
      - physical_causality
      - stable_spatial_geography
      - smooth_emotional_progression
```

说明：

- 这里的模型分类是抽象适配模式，不绑定具体平台 API。
- 适配层应在 `scene-video-prompt-builder` 输出中按需生成，不回写为黑板顶层策略字段。
