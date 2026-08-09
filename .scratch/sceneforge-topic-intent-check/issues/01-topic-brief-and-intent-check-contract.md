Status: ready-for-agent

# SceneForge Topic Gate 多行创作意图输入与检查契约

Type: AFK

## 要构建什么

本切片以 [docs/superpowers/specs/2026-07-02-sceneforge-topic-intent-check-design.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/docs/superpowers/specs/2026-07-02-sceneforge-topic-intent-check-design.md) 和 [docs/superpowers/plans/2026-07-02-sceneforge-topic-intent-check.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/docs/superpowers/plans/2026-07-02-sceneforge-topic-intent-check.md) 为准。

交付一个最薄但完整的纵向切片，让 `topic_gate` 可以稳定承载“多行创作意图 + intent_check 契约”这条主路径，而不改变后续阶段的既有语义。

端到端行为：
- 用户在 `topic_gate` 的“创作意图”区域可以输入多行内容，而不是被单行输入限制。
- 保存后的 `topic_brief` 能完整保留、回填多行创作意图，不丢行、不压扁。
- 系统具备独立的 `intent_check` artifact 契约，包括状态、摘要、缺失项、建议提示和 `intentHash`。
- Renderer、IPC 和 Markdown 解析层对 `intent_check` 使用同一套命名和结构，为后续 checker 和 UI 联动提供稳定事实源。

## 验收标准

- [ ] `topic_brief` 的创作意图支持多行输入、保存和回填，现有总时长 / 每段时长逻辑不回退
- [ ] 新增 `intent_check` 契约，至少覆盖 `status`、`summary`、`missingDimensions`、`suggestions` 和 `intentHash`
- [ ] 相关解析与类型导出可被后续 checker、Studio 工作区和测试稳定消费

## 被阻塞于

- 无 - 可以立即开始
