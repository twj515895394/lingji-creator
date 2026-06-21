# MIGRATION.md

- Source skill: `scene-performance-director` (`scene_forge/.agents/skills/scene-performance-director`).
- Output: `performance_direction` (support_direction_asset).

## Runtime vs legacy skill

- **Upstream**: `script` now writes `script.handoff.json` on approve with a performance-oriented `script_draft` slice (`story_beats`, `segment_strategy`, `script_body`, `performance_handoff`, …). Performance `context-policy.yaml` requires `script_draft` + `design.character_prompts` + `design.design_prompts` (handoff_first).
- **Prompts**: `system.md` / `user.md` enforce beat-id inheritance and topic lock (no off-topic rewrite).
- **Validators**: `performance-direction-section-headings.ts` + semantic checks count `beat_01` style ids.