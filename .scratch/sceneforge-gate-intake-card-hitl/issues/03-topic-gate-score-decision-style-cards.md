Status: completed

## 父问题

`.scratch/sceneforge-gate-intake-card-hitl/PRD.md`

## 要构建什么

在 topic_gate 中端到端展示只读评分、制作决策和风格卡片，并继续通过 `gate_confirmations` 完成确认与下游解锁。

## 验收标准

- [x] 评分按原始 label/value 只读展示
- [x] go/observe/drop 三种决策明确展示后果
- [x] 风格卡展示 label、family 和选中态
- [x] 确认一次写回 decision 与 style
- [x] 已确认摘要可重新进入编辑态
- [x] 缺评分不阻塞，缺风格确认继续阻塞下游

## 完成证据

- 新增 `SceneGateScoreCards`，决策卡展示后果，确认摘要包含决策、风格和时长。
- 修复 `decision=drop` 确认后仍需阻塞 reference+ 的导航边界。
- HITL 目标组 25 tests passed；SceneForge 全量 140 tests passed。

## 被阻塞于

- `01-hitl-view-models.md`

## 类型

AFK
