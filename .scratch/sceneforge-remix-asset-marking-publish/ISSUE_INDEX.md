Status: done

# SceneForge Remix 资产标记与保存入库 — Issue 总索引

> 上级入口：[`PRD.md`](PRD.md) · [`EXECUTION_ORDER.md`](EXECUTION_ORDER.md)

## 1. 垂直切片一览

| ID | 文件 | 标题 | 类型 | 阻塞于 | 覆盖重点 |
|----|------|------|------|--------|----------|
| 01 | [`issues/01-stage-vocabulary-and-gates.md`](issues/01-stage-vocabulary-and-gates.md) | 阶段语义纠偏与资产级门禁基线 | AFK | 无 | 命名、完成判定、门禁语义 |
| 02 | [`issues/02-asset-marking-workspace-simplification.md`](issues/02-asset-marking-workspace-simplification.md) | 资产标记工作台瘦身为资产级编辑 | AFK | 01 | 第 05 步 UI、保存、提示 |
| 03 | [`issues/03-publish-confirmation-workspace.md`](issues/03-publish-confirmation-workspace.md) | 保存入库确认页与显式入库动作 | AFK | 01, 02 | 第 06 步 checklist、摘要、按钮 |
| 04 | [`issues/04-publish-persistence-and-library-surface.md`](issues/04-publish-persistence-and-library-surface.md) | 入库持久化回写与资产库展示对齐 | AFK | 01, 03 | manifest 回写、状态暴露、摘要映射 |
| 05 | [`issues/05-remix-asset-marking-tests-and-mocks.md`](issues/05-remix-asset-marking-tests-and-mocks.md) | 测试、Mock 与文档收口 | AFK | 02, 03, 04 | 自动测试、mock、文档同步 |

## 2. 推荐执行顺序

`01` → `02` → `03` → `04` → `05`

## 3. 说明

- 本组 issue 均为可独立领取的 AFK 垂直切片。
- 每张 issue 都要求覆盖端到端行为，不接受单纯“只改 UI”或“只改 service”的水平切片。
- 如果实现过程中发现第 05 步“备注是否必填”需要二次决策，应在 `01` 中先统一门禁语义，再继续后续切片。
