# Audio Review Checklist

- Audio design maps to storyboard segments or major beat transitions where possible.
- 正式包含 `voice_direction`、`music_design`、`foley_design`、`ambience_design`、`segment_audio_plan`、`video_prompt_handoff`、`risk_notes`、`next_action`。
- `voice_direction` 里明确写出 `voice_identity_lock`、`breath_pause_pattern`、`speaker_voice_notes`、`segment_voice_continuity`；若上游存在台词或旁白，还需包含 `dialogue_or_narration_plan`。
- BGM, Foley-SFX, Ambience, and Silence are all covered when the upstream context supports them.
- Sound design supports action, emotion, and transition rather than acting as generic filler.
- 人声说明足够具体，能帮助分段视频生成时保持同一角色/旁白的人声气质、语速和停顿习惯，而不是每段重新发明一套说话方式。
- Continuity hooks are documented clearly enough for `video_prompts` downstream inheritance.
- No realistic gore-heavy or body-horror sound logic appears unless the project context explicitly requires it.
