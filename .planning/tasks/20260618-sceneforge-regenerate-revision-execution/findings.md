# Findings

## 2026-06-18

- `SceneForgeService.requestRevision()` 与 `sceneforge:request-revision` IPC 已存在，`scene-state-machine.ts` 也支持把阶段标记为 `revision_requested`。
- 当前 Studio 缺少显式的修订请求入口；用户只能通过外部调用 seam，产品路径不完整。
- “Regenerate” 不需要新增 service 能力，本质上就是再次调用当前阶段 `runStage` 并在本地替换待提交草案。
- 最小实现闭环应放在 `StageRunPanel`，避免在多个工作区重复解释“运行 / 重新生成 / 修订请求”的区别。
- 以 `StageRunPanel` 为唯一入口时，既能复用当前 runner 选择和 required-input 阻塞逻辑，也能避免在工作区层再复制一套状态判定。
- `requestRevision` 首版只需要记录 note 并把阶段置为 `revision_requested`，后续仍走“重新生成草案 -> 提交 -> 校验 -> 审批”的统一出口。
