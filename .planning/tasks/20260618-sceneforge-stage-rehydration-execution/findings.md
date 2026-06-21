# Findings

## 2026-06-18

- `SceneForgeStudio` 当前初始阶段选择主要依赖 `entryPath`，未充分利用已持久化的 `state.currentStage` 与阶段状态，因此重开项目时容易回到入口阶段而不是当前工作阶段。
- `Scene State` 已有 `currentStage` 字段，但 Renderer 侧没有显式持久化“用户当前正在处理的阶段”。
- 当前默认产物选择主要发生在手动切阶段时；项目刷新、Continue 导航或重新打开项目后，当前阶段的默认产物未必会自动回显。
