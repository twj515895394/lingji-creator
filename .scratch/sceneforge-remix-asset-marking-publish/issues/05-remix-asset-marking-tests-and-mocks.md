Status: ready-for-agent

# 测试、Mock 与文档收口

Type: AFK

## 父问题

`.scratch/sceneforge-remix-asset-marking-publish/PRD.md`

## 要构建什么

为“资产标记 / 保存入库”重构补齐自动测试、mock 数据和文档说明，确保这套资产级语义在真实 service、mock API 和页面回归中都能稳定成立。

端到端行为：
- 自动测试能覆盖第 05 / 06 步的资产级门禁、保存、入库和回显行为。
- mock 数据与 mock API 同步体现新的阶段语义和入库结果，便于本地演示和回归。
- PRD、设计文档与 issue tracker 之间的名词和范围保持一致，后续实施计划可以直接引用。

## 验收标准

- [ ] 自动测试覆盖第 05 / 06 步的关键资产级行为，尤其是门禁、保存、入库与状态回显
- [ ] mock 数据与 mock API 不再输出片段级人工标注心智，能演示新的阶段形态
- [ ] 文档、PRD 与 issue tracker 中的阶段命名和职责边界保持一致

## 被阻塞于

- `.scratch/sceneforge-remix-asset-marking-publish/issues/02-asset-marking-workspace-simplification.md`
- `.scratch/sceneforge-remix-asset-marking-publish/issues/03-publish-confirmation-workspace.md`
- `.scratch/sceneforge-remix-asset-marking-publish/issues/04-publish-persistence-and-library-surface.md`
