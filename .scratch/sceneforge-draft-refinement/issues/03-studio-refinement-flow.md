Status: completed-local

## 父问题

`.scratch/sceneforge-draft-refinement/PRD.md`

## 要构建什么

在 Studio 中定义“补充优化”动作、一次性补充意见输入区，以及不同落盘策略下的交互路径。

## 验收标准

- [ ] 补充优化与 Run / Regenerate / Request Revision 不混淆
- [ ] 输入区是一次性临时指令
- [ ] 不同阶段策略下的 UI 差异明确

## 类型

AFK

## 评论

- 2026-06-18：`StageRunPanel` 已在当前草案态提供一次性补充意见输入区与“补充优化”按钮，并与重跑、提交草案、请求修订保持独立语义。
- 2026-06-18：补充优化只在 Direct LLM 草案态显示，生成后继续回到现有草案审阅与提交链路。
- 2026-06-18：自动化覆盖见 `tests/sceneforge-ui.test.tsx`。
