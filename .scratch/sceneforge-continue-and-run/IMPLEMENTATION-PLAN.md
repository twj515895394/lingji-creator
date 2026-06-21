# SceneForge Continue & Run Implementation Plan

> **For agentic workers:** 先实现纯能力判定，再实现编排 hook，最后接 UI。不得改变普通 Continue。

**Goal:** 增加显式单步 Continue & Run，审批并切换后运行一次下一阶段，结果仍需人工提交。

**Architecture:** 纯函数决定能力，hook 编排审批/导航/运行，Studio 暂存跨阶段草案结果，StageRunPanel 负责展示。

**Tech Stack:** React、TypeScript、Electron API、Vitest。

---

## 文件结构

- Create: `src/sceneforge/lib/scene-continue-run.ts`
- Create: `tests/sceneforge-continue-run.test.ts`
- Create: `src/sceneforge/hooks/useSceneStageContinuation.ts`
- Create: `tests/sceneforge-stage-continuation.test.tsx`
- Modify: `src/sceneforge/pages/SceneForgeStudio.tsx`
- Modify: `src/sceneforge/components/workspace/SceneStageFlowActions.tsx`
- Modify: `src/sceneforge/components/stage-run/StageRunPanel.tsx`
- Modify: `tests/sceneforge-ui.test.tsx`

## Task 1：能力判定

- [x] 写表驱动失败测试：有下一阶段且支持 Direct LLM、无下一阶段、下一阶段仅手工提交、当前不能 Continue。
- [x] 实现 `getContinueRunCapability`，不读取全局状态，不调用 IPC。
- [x] 运行：

```bash
npx vitest run tests/sceneforge-continue-run.test.ts
```

## Task 2：审批与运行编排 hook

- [x] 写 mock 测试：
  - approve 失败时 run 调用 0 次。
  - approve 成功时 run 下一阶段 1 次。
  - 普通模式 run 调用 0 次。
  - run 失败时返回 nextStage + runError。
- [x] 将当前页面中的 Continue 副作用移入 hook。
- [x] 保持现有 optional/required/auto_if_valid 策略行为。

## Task 3：跨阶段草案交接

- [x] Studio 保存 `PendingStageRunResult`。
- [x] `StageRunPanel` 增加 `initialRunResult`，与手动 run 结果走同一草案审阅路径。
- [x] 结果只注入匹配 stage 的面板。
- [x] 消费或丢弃后清理 Studio 暂存状态。

## Task 4：双动作 UI

- [x] `SceneStageFlowActions` 保留 Continue。
- [x] 增加可选 `onContinueAndRun`、`canContinueAndRun`、`nextStageTitle`。
- [x] 自动动作明确显示将运行下一阶段且仍需提交。
- [x] running_next 时两个动作均禁用。

## Task 5：验证

```bash
npx tsc --noEmit
npx vitest run tests/sceneforge-continue-run.test.ts tests/sceneforge-stage-continuation.test.tsx tests/sceneforge-ui.test.tsx
npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts
```

人工：

- 普通 Continue 不触发模型调用。
- design → script：若 script 暂不支持 Direct LLM，只显示普通 Continue。
- performance → storyboard：显示 Continue & Run，并产生待提交 storyboard 草案。
- Provider 失败后停留在 storyboard，可手动重试。

## 提交建议

1. `feat(sceneforge): model continue run capability`
2. `refactor(sceneforge): isolate stage continuation flow`
3. `feat(sceneforge): add explicit continue and run`
4. `test(sceneforge): cover continue and run recovery`
