# Audio User Prompt

{{stageContext}}

Return `audio_design` as Markdown.

正式主交付必须中文主导；英文只保留必要术语、section marker 或平台锚词。不要输出整篇英文 audio plan。

Prefer a structured audio plan with sections like:

- `voice_direction`
- `music_design`
- `foley_design`
- `ambience_design`
- `segment_audio_plan`
- `video_prompt_handoff`
- `risk_notes`
- `next_action`

Inside the audio plan, explicitly cover `BGM`, `Foley-SFX`（或中文明确写成“拟音/音效层”）, `Ambience`, and `Silence`.

Inside `voice_direction`, explicitly provide:

- `voice_identity_lock`
- `breath_pause_pattern`
- `speaker_voice_notes`
- `segment_voice_continuity`

If the script contains dialogue or narration, add `dialogue_or_narration_plan` and make it usable for downstream segment-by-segment video generation.

Inside `video_prompt_handoff`, explicitly explain what downstream `video_prompts` must inherit for voice consistency, not only music or ambience.

Do not reduce the output to "add background music here" style notes.
