Status: completed-local

## 父问题

`.scratch/sceneforge-regenerate-revision/PRD.md`

## 要构建什么

在 Studio 中定义 regenerate / request revision 的按钮、文案和确认提示。

## 验收标准

- [ ] 草案态与已提交态按钮不混淆
- [ ] 明确覆盖与保留规则
- [ ] 动作文案可区分重跑与修订

## 类型

AFK

## 评论

- 2026-06-18：`StageRunPanel` 已新增显式“重新生成草案”文案，当存在待提交草案时不再只显示泛化的“运行本阶段”。
- 2026-06-18：同一面板已新增“请求修订”按钮，仅在已提交 / 已校验 / 已审批等阶段状态下显示，避免与草案动作混淆。
- 2026-06-18：文案已明确“重新生成不会直接覆盖已提交产物”，“请求修订不会绕过现有提交、校验和审批链”。
- 2026-06-18：自动化覆盖见 `tests/sceneforge-ui.test.tsx`。
