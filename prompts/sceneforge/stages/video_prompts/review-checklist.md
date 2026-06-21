# Video Prompts Review Checklist

- 正式主交付默认为 `video_prompt_pack_cn`；英文版只在用户明确要求或目标平台明确需要时生成。
- `video_prompt_review` 与 `video_prompt_trace` 必须和 `video_prompt_pack_cn` 同轮交付，不能缺省。
- `video_prompt_pack_cn` 必须中文主导，英文只保留必要专业术语；不能退化成全篇英文。
- Packs align with storyboard packs, segments, VGU inheritance, and audio continuity hooks.
- The pack preserves a clear four-layer structure: pack plan, global rules, segment technical control, and segment director prompt / sound execution.
- CN pack is copy-ready and not merely a translated summary.
- The formal pack includes `video_prompt_pack_plan`, `global_execution_preamble`, `故事板关键帧参考规则`, `项目级全局锁定规则`, `Segment X 技术控制说明`, `segment_sound_execution`, and `Segment X 导演长版提示词`.
- `video_prompt_pack_plan` 明确写出本包覆盖的 storyboard pack 与 segment 范围，不得省略分包逻辑。
- 若 storyboard 已规划多个 Pack，`video_prompt_pack_cn` 必须按相同顺序输出多个正式 Pack 块，不能折叠成一个总包。
- `故事板关键帧参考规则` 必须显式说明“控制故事板 Pack XX”为动作与连续性主参考，“风格故事板 Pack XX”为渲染与氛围辅助参考。
- Segment technical control is written as natural-language control guidance rather than YAML or parameter-only tables.
- Sound execution explicitly covers BGM, Foley-SFX, Ambience, and Silence when the upstream context supports them; when voice continuity is locked upstream, `Voice` is also present.
- Director prompt sections preserve timeline / shot order / continuity inheritance, and each timecoded shot expands the required visual/performance dimensions in natural language rather than fixed keyword templates.
- The main pack does not keep legacy mixed sections such as `prompt_trace`, `pack_audio_execution_plan`, `project_level_global_rules`, `video_prompt_review`, `video_prompt_trace`, or `可直接复制使用块`.
- No undeclared upstream artifacts referenced as required inputs.
- `video_prompt_review` 必须单独包含 `review_status`、`review_round`、`issues_found`、`auto_fixes_applied`、`final_delivery_ready`。
- `video_prompt_trace` 必须单独包含 `actual_inputs_used`、`pack_mapping`、`segment_trace`、`optional_input_effectiveness`、`continuity_sources`、`open_risks`。
