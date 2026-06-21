# Progress

## 2026-06-18

- 已开始 Draft Refinement 实现。
- 已建立执行追踪文件，并约定每完成一段实现就同步任务状态。
- 已完成 runner 输入契约与阶段固定提交策略接线：`runStage` 现可接收 `currentDraftArtifacts` 与一次性 `refinementPrompt`，共享能力表也新增了 `draftCommitStrategy` 字段。
- 已完成 `StageRunPanel` 补充优化入口接线：当前草案态会出现一次性补充意见输入区与“补充优化”按钮，并复用现有草案审阅链路。
- 已通过 `npx tsc --noEmit`。
- 已通过定向回归：`npx vitest run tests/sceneforge-direct-llm-runner.test.ts tests/sceneforge-stage-capabilities.test.ts tests/sceneforge-ui.test.tsx tests/sceneforge-stage-runner.test.ts tests/sceneforge-continue-run.test.ts tests/sceneforge-ipc-contract.test.ts`。
