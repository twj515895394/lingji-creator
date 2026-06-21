Status: completed-local

## 父问题

`.scratch/sceneforge-studio-ux-clarity/PRD.md`

## 要构建什么

补齐 Continue / Continue & Run 的差异文案与提示。

## 验收标准

- [ ] 两个动作语义可区分
- [ ] 自动触发边界清晰

## 类型

AFK

## 评论

- 2026-06-18：`SceneStageFlowActions.tsx` 已保留 `Continue` 与 `Continue & Run` 两个独立动作，没有用自动运行替换 Continue。
- 2026-06-18：文案已明确说明 `Continue & Run` 会在审批后触发下一阶段 Direct LLM，且“生成结果仍需手动提交”。
- 2026-06-18：相关渲染契约已有 `tests/sceneforge-ui.test.tsx` 覆盖。
