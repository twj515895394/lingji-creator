# SceneForge Style Selector 执行计划

**Goal:** 补齐 SceneForge Studio 的项目级风格选择闭环，包括持久化、回显、上下文消费与最小 UI 入口。

### Phase 1: 项目状态与服务闭环
**Status:** complete

- 为 `project.json.sceneforge` 增加项目级 style / asset 选择字段。
- 让 `SceneForgeService.getProjectState()` 返回当前选择。
- 让 `getStageContext()` / `runStage()` 默认消费项目已保存的选择。

### Phase 2: IPC 与 Renderer 入口
**Status:** complete

- 增加 SceneForge 专用的资产列表与样式选择更新 IPC。
- 在 Studio 工作区挂入最小 Style Selector 面板。
- 保持 registry 为唯一数据源，排除 `source-materials`。

### Phase 3: 自动化回归
**Status:** complete

- 覆盖项目文件默认值与持久化测试。
- 覆盖 stage context 默认消费项目选择的测试。
- 覆盖 IPC 合约与 Studio 渲染测试。

### Phase 4: 文档与 issue 收口
**Status:** complete

- 更新执行进度文档。
- 将 style-selector 包内 issues 标记为 `completed-local` 并补评论。
