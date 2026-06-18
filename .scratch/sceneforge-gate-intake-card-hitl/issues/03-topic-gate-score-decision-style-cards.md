Status: ready-for-agent

## 父问题

`.scratch/sceneforge-gate-intake-card-hitl/PRD.md`

## 要构建什么

在 topic_gate 中端到端展示只读评分、制作决策和风格卡片，并继续通过 `gate_confirmations` 完成确认与下游解锁。

## 验收标准

- [ ] 评分按原始 label/value 只读展示
- [ ] go/observe/drop 三种决策明确展示后果
- [ ] 风格卡展示 label、family 和选中态
- [ ] 确认一次写回 decision 与 style
- [ ] 已确认摘要可重新进入编辑态
- [ ] 缺评分不阻塞，缺风格确认继续阻塞下游

## 被阻塞于

- `01-hitl-view-models.md`

## 类型

AFK

