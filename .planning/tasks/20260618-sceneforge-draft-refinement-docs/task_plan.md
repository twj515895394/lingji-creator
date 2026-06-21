# SceneForge Draft Refinement 文档包计划

**Goal:** 为“基于当前草案 + 一次性用户补充意见，整阶段重新生成新草案”的能力补齐完整文档包，并与现有后续包建立清晰边界。

### Phase 1: 能力边界定义
**Status:** complete

- 明确该能力是“整阶段补充优化”，不是分字段或分段编辑。
- 明确补充意见是一次性临时指令，不写入项目长期状态。
- 明确是否人工提交由阶段定义固定配置，而非项目级或运行时切换。

### Phase 2: 文档包创建
**Status:** complete

- 新建 `PRD`、详细设计、`IMPLEMENTATION-PLAN`。
- 新建 issues，覆盖 runner 输入、Studio 交互和阶段策略配置。

### Phase 3: 关联收口
**Status:** complete

- 更新 follow-on index。
- 在 `regenerate-revision` 包中补充边界说明，避免与“补充优化”混淆。

### Phase 4: 执行记录完成
**Status:** complete

- 更新 `findings.md`、`progress.md`。
- 切换 `.planning/current` 指向本包执行记录。
