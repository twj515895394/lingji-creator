# Progress

## 2026-06-18

- 已开始 Stage Rehydration 实现。
- 已确认当前恢复缺口集中在三个点：当前阶段未持久化、Studio 初始阶段推导过于依赖 `entryPath`、默认产物回显不稳定。
- 已补充 `currentStage` 持久化通道：切阶段与 Continue 导航现在都会写回当前工作阶段。
- 已补充按真实项目状态推导 Studio 初始阶段的逻辑，不再只依赖 `entryPath`。
- 已补充当前阶段默认产物自动回显逻辑：项目刷新、继续导航、重新打开项目后，都会优先回显当前阶段的默认产物。
- 已新增恢复与产物选择定向测试。
- 已通过 `npx tsc --noEmit`。
- 已通过定向回归：`npx vitest run tests/sceneforge-entry-path.test.ts tests/sceneforge-artifact-selection.test.ts tests/sceneforge-state-machine.test.ts tests/sceneforge-stage-continuation.test.ts tests/sceneforge-ui.test.tsx`。
