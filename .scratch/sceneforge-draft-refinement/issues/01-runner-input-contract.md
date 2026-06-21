Status: completed-local

## 父问题

`.scratch/sceneforge-draft-refinement/PRD.md`

## 要构建什么

定义 Draft Refinement 的 runner 输入契约，使其能稳定接收当前草案、当前阶段上下文和一次性补充意见。

## 验收标准

- [ ] refinement 输入结构清晰
- [ ] 补充意见只作用一次
- [ ] 与普通 run / regenerate 输入边界清晰

## 类型

AFK

## 评论

- 2026-06-18：`sceneRunStage` / `SceneForgeService.runStage` / `SceneStageRunnerInput` 已支持 `currentDraftArtifacts` 与一次性 `refinementPrompt`。
- 2026-06-18：`scene-direct-llm-runner` 现在会把“当前草案 + 一次性补充意见”附加进 prompt 渲染结果，用于整阶段优化。
- 2026-06-18：自动化覆盖见 `tests/sceneforge-direct-llm-runner.test.ts`。
