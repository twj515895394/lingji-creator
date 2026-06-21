Status: ready

## 父问题

`.scratch/sceneforge-topic-gate-llm-analysis/PRD.md`

## 要构建什么

收口 `topic_gate` 在新主链和旧项目兼容路径下的 Validate / Continue 规则，并完成真机验收。

## 验收标准

- [ ] 新项目主路径能覆盖 `topic_brief -> topic_analysis -> gate_confirmations -> Validate -> Continue`
- [ ] 旧项目无 `topic_analysis` 时仍可按 legacy 路径读取与通过
- [ ] `decision=drop` 继续阻止 Continue
- [ ] 人工验收记录完整，覆盖切走恢复与文案检查

## 被阻塞于

- `03-topic-gate-analysis-workspace-ui.md`

## 类型

AFK
