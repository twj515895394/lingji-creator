Status: ready

## 父问题

`.scratch/sceneforge-topic-gate-llm-analysis/PRD.md`

## 要构建什么

为 `topic_gate` 增加独立的 `topic_analysis` 建议产物契约，使评分、建议决策和风格候选成为真实可解析的机器分析结果，而不是从 `topic_brief` 宽松扒文本。

## 验收标准

- [ ] 定义 `topic_analysis` 的最小 Markdown/结构化字段
- [ ] parser 能稳定解析 summary、score、decisionSuggestion、styleCandidates
- [ ] 缺失关键字段时返回结构化错误，而不是伪造空结果
- [ ] 旧项目无 `topic_analysis` 时返回诚实空态，不崩溃
- [ ] 单元测试覆盖正常、缺失、旧项目三类输入

## 被阻塞于

无

## 类型

AFK
