# Video Prompts Agent Instructions

- Call `scene_get_stage_context` with `runner: acp_agent` for full policy-allowed inputs.
- Submit each artifact via `scene_submit_stage_draft`.
- Do not bulk-read design/storyboard files outside context policy.