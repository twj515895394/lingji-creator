# Publish User Prompt

仅使用以下 Stage Context：

{{stageContext}}

返回 JSON 对象，其中 `publish_notes` 是完整 Markdown。

## 语言

- 五个 copy-block 的正文必须**中文主导**（与 system 一致）。
- `cover-landscape-4x3` / `cover-portrait-3x4`：用中文描述画面，勿输出整段英文文生图提示词。

必须包含以下五个 copy-block（id 精确匹配）：

- `cover-landscape-4x3`
- `cover-portrait-3x4`
- `publish-title`
- `publish-description`
- `publish-tags`

每个 copy-block 的 `body` 必须是用户可直接复制粘贴的成品文本，不要放占位符如「待填写」。