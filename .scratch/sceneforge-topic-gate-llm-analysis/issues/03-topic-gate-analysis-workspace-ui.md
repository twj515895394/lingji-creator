Status: ready

## 父问题

`.scratch/sceneforge-topic-gate-llm-analysis/PRD.md`

## 要构建什么

把 `topic_gate` 工作区整理成“简报输入 → 分析入口/结果 → 最终确认”的单工作区体验，去掉无意义重复文案和 ACP/Agent 话术，并接入切换阶段后的状态恢复。

## 验收标准

- [ ] 未分析时只显示一个主动作“分析选题”
- [ ] 无分析结果时不显示“选题评分”空 section
- [ ] 分析成功后显示评分卡、建议决策卡、风格候选卡
- [ ] 切走再回来仍能恢复运行态或已生成结果
- [ ] 页面不出现 Agent / ACP / MCP 推进描述
- [ ] UI 测试覆盖上述行为

## 被阻塞于

- `02-direct-llm-topic-gate-analysis.md`

## 类型

AFK
