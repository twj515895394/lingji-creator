Status: ready-for-agent

# Topic Gate 检查结果展示与分析选题硬性解锁

Type: AFK

## 被阻塞于的上游文档

以 [docs/superpowers/specs/2026-07-02-sceneforge-topic-intent-check-design.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/docs/superpowers/specs/2026-07-02-sceneforge-topic-intent-check-design.md) 和 [docs/superpowers/plans/2026-07-02-sceneforge-topic-intent-check.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/docs/superpowers/plans/2026-07-02-sceneforge-topic-intent-check.md) 为准。

## 要构建什么

交付 `topic_gate` 工作区里的前端联动，让用户能看见“为什么现在还不能分析”，以及“补什么才能继续”，并在检查未通过时硬性锁住 `分析选题`。

端到端行为：
- `topic_gate` 工作区出现专用的“检查意图”结果区，而不是把该职责混进“分析选题”面板。
- 检查未通过时，页面会展示结论摘要、缺失项、缺失原因和建议提示，语气偏创作教练而不是技术报错。
- `分析选题` 只有在 `intent_check` 通过且未过期时才解锁；未通过时必须有明确禁用原因。
- 用户能清楚区分两个动作：`检查意图` 负责判断是否足够明确，`分析选题` 负责给出评分、决策建议与风格候选。

## 验收标准

- [ ] `创作意图` 使用 3 行高输入控件，工作区出现独立的检查状态区
- [ ] 检查未通过时，页面可见缺失项和建议提示，且 `分析选题` 明确禁用
- [ ] 检查通过时，页面明确提示已解锁 `分析选题`，并且原有分析能力仍可正常触发

## 被阻塞于

- `.scratch/sceneforge-topic-intent-check/issues/01-topic-brief-and-intent-check-contract.md`
- `.scratch/sceneforge-topic-intent-check/issues/02-topic-intent-checker-backend.md`
