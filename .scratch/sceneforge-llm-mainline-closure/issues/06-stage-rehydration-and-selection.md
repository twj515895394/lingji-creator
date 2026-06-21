Status: completed-local

## 父问题

`.scratch/sceneforge-llm-mainline-closure/PRD.md`

## 要构建什么

补齐 SceneForge Studio 的状态恢复 / 回显 / 阶段切换一致性：让当前阶段可持久化、重开项目能恢复到真实工作阶段、当前阶段的默认产物能自动回显。

## 验收标准

- [x] 切阶段与 Continue 导航后会持久化当前阶段
- [x] 重开项目时不再只看 `entryPath`，而是优先恢复真实工作阶段
- [x] 当前阶段有可展示产物时会自动回显默认产物
- [x] 定向测试覆盖恢复逻辑与默认产物选择逻辑

## 类型

Implementation

## 进展备注

- 2026-06-18：已新增 `currentStage` 持久化链路，并接入 Studio 切阶段与 Continue 导航。
- 2026-06-18：Studio 初始阶段恢复已改为优先依据 `state.currentStage + stageStatuses` 推导。
- 2026-06-18：当前阶段默认产物选择已改为自动回显。
- 2026-06-18：定向验证已通过 `tsc` 与 5 个测试文件、29 个测试用例。
