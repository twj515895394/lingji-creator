# Progress

## 2026-06-18

- 已复核 regenerate-revision 的 PRD、设计、实施计划与 issue。
- 已确认代码 seam：`runStage` 可直接承担 regenerate，`sceneRequestRevision` 已可写入 `revision_requested`。
- 已新建本执行包的 `task_plan.md`、`findings.md`、`progress.md`，并切换 `.planning/current`。
- 已在 `StageRunPanel` 增加显式“重新生成草案”文案与“请求修订”按钮，并把阶段状态与修订说明接入 Studio。
- 已通过 `npx tsc --noEmit`。
- 已通过定向回归：`npx vitest run tests/sceneforge-ui.test.tsx tests/sceneforge-ipc-contract.test.ts tests/sceneforge-stage-runner.test.ts tests/sceneforge-continue-run.test.ts tests/sceneforge-stage-pack-context.test.ts`。
