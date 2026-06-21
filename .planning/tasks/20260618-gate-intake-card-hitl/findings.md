# Findings

## Existing Implementation

- Intake 已有 radio 卡片与 `adaptation_selection` 提交，但无空态、确认后摘要和重新选择。
- Topic Gate 已有 decision chip、style card 和确认摘要，但没有评分解析/展示，决策仍是 chip 而非完整后果卡。
- `scene-hitl-markdown.ts` 已承担方向、风格、确认 artifact 的 parser/builder。
- 默认风格回退已存在；旧 family 缺失可自然兼容。
- Validator 已覆盖 intake 必选方向、gate 风格确认和 drop 阻塞基础逻辑。

## Boundaries

- 不改变 artifactKey：`adaptation_selection`、`gate_confirmations`。
- 不新增数据库、project.json 字段或 IPC。
- 使用现有 UI token，不新增硬编码字阶。
