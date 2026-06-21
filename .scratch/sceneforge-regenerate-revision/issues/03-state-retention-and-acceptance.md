Status: completed-local

## 父问题

`.scratch/sceneforge-regenerate-revision/PRD.md`

## 要构建什么

定义历史状态保留、审批链可追溯性以及自动化 / 人工验收口径。

## 验收标准

- [ ] 已提交产物保留规则清晰
- [ ] 修订后仍走统一校验审批
- [ ] 验收项可直接执行

## 类型

AFK

## 评论

- 2026-06-18：修订请求仍由 `scene-state-machine.ts` 把阶段标记为 `revision_requested` 并记录 `revisionNote`，不直接改写已提交产物内容。
- 2026-06-18：Studio 已把 `revisionNote` 透传到 `StageRunPanel`，当前阶段若已请求修订会展示现有说明。
- 2026-06-18：定向验证通过：`npx tsc --noEmit` 与 `tests/sceneforge-ui.test.tsx tests/sceneforge-ipc-contract.test.ts tests/sceneforge-stage-runner.test.ts tests/sceneforge-continue-run.test.ts tests/sceneforge-stage-pack-context.test.ts`。
