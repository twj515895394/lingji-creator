Status: ready-for-human

# Topic Gate 失效联动、回归验证与文案校准

Type: HITL

## 被阻塞于的上游文档

以 [docs/superpowers/specs/2026-07-02-sceneforge-topic-intent-check-design.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/docs/superpowers/specs/2026-07-02-sceneforge-topic-intent-check-design.md) 和 [docs/superpowers/plans/2026-07-02-sceneforge-topic-intent-check.md](/Users/tangwujun/Documents/trae_projects/lingji-creator/docs/superpowers/plans/2026-07-02-sceneforge-topic-intent-check.md) 为准。

## 要构建什么

完成 `topic_gate` 新链路的人工收口：确保“修改创作意图后必须重新检查”的失效联动真实成立，同时把建议提示、禁用原因和通过提示校准到可交付的产品语气。

端到端行为：
- 用户修改已通过检查的创作意图后，旧检查结果立即失效，工作区清晰提示需要重新检查。
- 页面在“未检查 / 检查中 / 未通过 / 已通过 / 已过期”几个状态之间切换时，文案和交互都不产生歧义。
- 旧项目没有 `intent_check` artifact 时，工作区不会崩，且能给出合理的引导。
- 回归验证覆盖保存简报、检查意图、补充内容、重新检查、解锁分析、修改后失效等关键主路径。

## 验收标准

- [ ] 修改创作意图后，旧 `intent_check` 不再被当作有效结果消费，工作区会明确提示“请重新检查”
- [ ] 建议提示、禁用原因和通过提示经过人工校准，不出现“正确但没帮助”的空话
- [ ] 关键主路径和旧项目兼容路径完成一次人工回归，并把结果记录回 issue

## 被阻塞于

- `.scratch/sceneforge-topic-intent-check/issues/01-topic-brief-and-intent-check-contract.md`
- `.scratch/sceneforge-topic-intent-check/issues/02-topic-intent-checker-backend.md`
- `.scratch/sceneforge-topic-intent-check/issues/03-topic-gate-check-ui-and-analysis-gate.md`
