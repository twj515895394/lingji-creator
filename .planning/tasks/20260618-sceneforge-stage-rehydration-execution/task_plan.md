# SceneForge Stage Rehydration 执行计划

**Goal:** 补齐 SceneForge Studio 的状态恢复 / 回显 / 阶段切换残余缺口，优先修复当前阶段持久化、重开项目恢复和默认产物回显不同步的问题。

### Phase 1: 缺口确认
**Status:** complete

- 建立独立执行记录。
- 明确现有恢复链路为什么只能依赖 `entryPath`，而不能依赖真实项目进度。

### Phase 2: 当前阶段持久化
**Status:** complete

- 补充 `currentStage` 持久化接口。
- 在切阶段与 Continue 导航时更新当前阶段。

### Phase 3: 恢复与回显
**Status:** complete

- 改为按真实项目状态推导 Studio 初始阶段。
- 补齐当前阶段默认产物选择的自动回显。

### Phase 4: 测试与状态同步
**Status:** complete

- 补充定向测试。
- 运行验证并同步 issue / 计划状态。
