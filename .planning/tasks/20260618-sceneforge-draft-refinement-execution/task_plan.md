# SceneForge Draft Refinement 执行计划

**Goal:** 为所有支持 Direct LLM 草案生成的阶段补齐“基于当前草案 + 一次性补充意见”的整阶段优化能力，并保持任务状态持续可追踪。

### Phase 1: 执行准备
**Status:** complete

- 建立独立执行记录。
- 锁定最小闭环：补充意见输入 -> runner 契约 -> 新草案 -> 阶段固定提交策略。

### Phase 2: Runner 与策略
**Status:** complete

- 扩展 `runStage` 输入，支持传递当前草案与一次性补充意见。
- 定义阶段固定提交策略字段，并先保持默认人工提交语义不变。

### Phase 3: Studio 交互
**Status:** complete

- 在 `StageRunPanel` 增加“补充优化”入口与输入区。
- 让补充优化生成结果回到现有草案审阅 / 提交流程。

### Phase 4: 自动化回归
**Status:** complete

- 补充 runner、策略和 UI 测试。
- 运行定向 `vitest` 与 `tsc`。

### Phase 5: 文档与状态同步
**Status:** complete

- 更新本执行计划状态。
- 同步 `.scratch/sceneforge-draft-refinement/issues/*` 的完成情况与评论。
