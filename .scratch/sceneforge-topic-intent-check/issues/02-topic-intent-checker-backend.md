Status: ready-for-agent

# SceneForge Topic Intent Checker 后端链路

Type: AFK

## 被阻塞于的上游文档

以 [docs/superpowers/specs/2026-07-02-sceneforge-topic-intent-check-design.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/docs/superpowers/specs/2026-07-02-sceneforge-topic-intent-check-design.md) 和 [docs/superpowers/plans/2026-07-02-sceneforge-topic-intent-check.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/docs/superpowers/plans/2026-07-02-sceneforge-topic-intent-check.md) 为准。

## 要构建什么

交付一条独立于 `analyzeTopicGate` 的 `Topic Intent Checker` 后端链路，用来判断当前创作意图是否足够支撑整段视频方向，并返回缺失项与补充建议提示。

端到端行为：
- 当项目已保存 `topic_brief` 后，系统可以通过专用 IPC / service 触发一次“检查意图”。
- checker 使用现有 Direct LLM 能力，但输出不是评分分析，而是 `pass / needs_more`、缺失维度、原因和建议提示。
- 结果会被落成 `topic_gate.intent_check` artifact，便于工作区刷新、状态恢复和后续调试。
- checker 在上下文允许时可读 `source_intake` 相关输入，但不要求其存在。

## 验收标准

- [ ] 存在独立的 `check-topic-intent` 调用路径，不与 `analyze-topic-gate` 混用
- [ ] checker 未通过时会返回命名明确的缺失项以及每项 1-2 条可直接补写的中文提示
- [ ] checker 结果写入 `topic_gate.intent_check`，并能被 service / IPC / preload / renderer 读取

## 被阻塞于

- `.scratch/sceneforge-topic-intent-check/issues/01-topic-brief-and-intent-check-contract.md`
