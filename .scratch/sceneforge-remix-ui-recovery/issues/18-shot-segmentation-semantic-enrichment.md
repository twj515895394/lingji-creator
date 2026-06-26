Status: ready-for-agent

# 切片语义增强与段落命名闭环

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

在镜头边界检测稳定后，为 segment 补齐语义层，让系统不仅知道“在哪里切”，还知道“这一段是什么”。

端到端行为：

- 系统可为镜头段生成标题、视觉摘要、基础语义描述。
- 低置信度边界可得到辅助解释或合并建议。
- 原片理解与后续二创链路可以消费这些 segment 语义信息。

## 实施约束

- 实现必须严格遵循 `docs/sceneforge2.0/technical-solutions/04-remix-intelligent-shot-segmentation-technical-plan.md`。
- 语义增强必须建立在 issue 12 / 13 的边界闭环之后，不能回退成“让 LLM 决定切点”。
- 这是语义增强票，不把它扩成新的原片理解大重构。

## 验收标准

- [ ] segment 可获得标题或基础视觉摘要
- [ ] 低置信度边界可获得辅助解释或合并建议
- [ ] 这些语义字段可被原片理解或后续二创链路消费
- [ ] 语义增强不会替代真实边界检测结果

## Review Checklist

- [ ] LLM / VLM 只消费 segment，不反向决定切点
- [ ] segment 语义结构有稳定存储或契约，而不是 UI 临时生成
- [ ] 命名、摘要、合并建议职责清晰，不混成一坨原片理解输出

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 补 segment 语义输出相关测试
- [ ] 手动验证：切片结果可看到更可读的段名或摘要

## 涉及范围

- segmentation 语义增强逻辑
- segment 展示与下游消费代码
- 相关测试

## 被阻塞于

- `.scratch/sceneforge-remix-ui-recovery/issues/12-shot-segmentation-fast-mode-and-confidence.md`
- `.scratch/sceneforge-remix-ui-recovery/issues/13-shot-segmentation-manual-calibration.md`
