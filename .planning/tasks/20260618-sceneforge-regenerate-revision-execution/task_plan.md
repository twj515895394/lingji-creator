# SceneForge Regenerate / Request Revision 执行计划

**Goal:** 为 SceneForge Studio 补齐草案态重新生成与已提交态请求修订的显式入口，并保持现有状态机与写盘出口不变。

### Phase 1: seam 复核与动作边界
**Status:** complete

- 复核 `runStage`、`sceneRequestRevision`、状态机 `revision_requested` 的现状。
- 明确 regenerate 与 request revision 的 UI 触发条件。

### Phase 2: Studio 动作补齐
**Status:** complete

- 在 `StageRunPanel` 增加显式“重新生成草案”动作。
- 为已提交 / 已审批阶段增加“请求修订”入口和说明文案。

### Phase 3: 自动化回归
**Status:** complete

- 覆盖 StageRunPanel 可见性与文案测试。
- 覆盖 SceneForge Studio 渲染契约测试。
- 通过 `npx tsc --noEmit`。

### Phase 4: 文档与 issue 收口
**Status:** complete

- 更新执行进度文档。
- 将 regenerate-revision 包内 issues 标记为 `completed-local` 并补评论。
