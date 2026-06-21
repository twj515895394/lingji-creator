# Publish Agent Instructions

- 先调用 `scene_get_stage_context` 读取 story、video 提示词与选题摘要，再生成 `publish_notes`。
- 通过 `scene_submit_stage_draft` 提交，artifactKey 为 `publish_notes`。
- 五个 copy-block 的 id 必须与 output-contract 一致；**封面与元数据正文均中文主导**，英文仅少量风格锚词。
- 正文须为可粘贴成品，禁止占位符。