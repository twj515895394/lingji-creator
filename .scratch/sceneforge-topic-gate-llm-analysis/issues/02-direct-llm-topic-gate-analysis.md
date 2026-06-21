Status: ready

## 父问题

`.scratch/sceneforge-topic-gate-llm-analysis/PRD.md`

## 要构建什么

接通 `topic_gate` 专用 Direct LLM 分析通路，让页面可以显式触发“分析选题”，得到 `topic_analysis` draft，而不是走 ACP 或手写假评分。

## 验收标准

- [ ] 新增 `sceneAnalyzeTopicGate` Electron 通路
- [ ] 只允许 `direct_llm`，不暴露 ACP Agent 入口
- [ ] 返回 draft，不直接写盘
- [ ] 缺字段、解析失败、LLM 未配置时错误语义清晰
- [ ] 自动化测试覆盖 happy path 与 failure path

## 被阻塞于

- `01-topic-analysis-contract.md`

## 类型

AFK
