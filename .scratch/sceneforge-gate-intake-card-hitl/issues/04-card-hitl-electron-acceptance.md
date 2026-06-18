Status: ready-for-human

## 父问题

`.scratch/sceneforge-gate-intake-card-hitl/PRD.md`

## 要构建什么

在 Electron 中验证两种 entryPath、旧项目回显、重新确认和下游阻塞行为，形成卡片式 HITL 的人工验收记录。

## 验收标准

- [ ] source_intake 项目可选择并确认改编方向
- [ ] topic_gate 项目可查看评分并确认决策/风格
- [ ] 未确认风格时 reference 及后续保持阻塞
- [ ] decision=drop 时不能继续推进
- [ ] 旧 Markdown 项目能回显或使用高级编辑降级
- [ ] SceneForge 全量测试与 TypeScript 通过

## 被阻塞于

- `02-intake-direction-cards.md`
- `03-topic-gate-score-decision-style-cards.md`

## 类型

HITL

