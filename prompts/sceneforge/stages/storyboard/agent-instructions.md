# Storyboard Stage Agent Instructions

- Call `scene_get_stage_context` with `runner: acp_agent` when using an agent session.
- Submit via `scene_submit_stage_draft` per artifact key.
- Do not modify `sceneforge/state.json` or `artifact_manifest.yaml` directly.
- Do not read `.agents/skills`.