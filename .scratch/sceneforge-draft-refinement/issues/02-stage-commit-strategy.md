Status: completed-local

## 父问题

`.scratch/sceneforge-draft-refinement/PRD.md`

## 要构建什么

为所有支持草案生成的阶段定义固定的落盘策略，明确哪些阶段必须人工提交，哪些阶段可自动落盘。

## 验收标准

- [ ] 策略真相源明确
- [ ] 阶段默认策略有理由
- [ ] 不允许项目级或运行时覆盖

## 类型

AFK

## 评论

- 2026-06-18：共享能力表 `scene-stage-run-capabilities.ts` 已新增 `draftCommitStrategy` 字段，作为阶段固定提交策略真相源。
- 2026-06-18：为避免静默改变当前产品语义，首版所有阶段仍保持 `manual_submit_required`，但策略能力与代码入口已建好。
- 2026-06-18：自动化覆盖见 `tests/sceneforge-stage-capabilities.test.ts`。
