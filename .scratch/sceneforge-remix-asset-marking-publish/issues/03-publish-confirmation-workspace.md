Status: done

# 保存入库确认页与显式入库动作

Type: AFK

## 父问题

`.scratch/sceneforge-remix-asset-marking-publish/PRD.md`

## 要构建什么

将第 06 步实现为明确的资产入库确认页，集中展示前置门禁、资产标记摘要和显式的 `保存入库` 操作按钮。

端到端行为：
- 当用户进入第 06 步时，页面展示完整 checklist，明确哪些前置步骤已满足、哪些仍阻塞。
- 页面展示第 05 步产出的资产标签与备注摘要，帮助用户在最终入库前核对。
- 当前置条件满足时，`保存入库` 按钮可点击；未满足时按钮不可执行，且页面给出阻塞原因。

## 验收标准

- [x] 第 06 步界面包含 checklist、资产标记摘要和显式入库动作区三部分
- [x] 前置条件未满足时，用户能直接看到阻塞项，且无法误触发入库
- [x] 第 06 步不再展示任何片段级详情卡片或“当前播放片段”区域

## 被阻塞于

- `.scratch/sceneforge-remix-asset-marking-publish/issues/01-stage-vocabulary-and-gates.md`
- `.scratch/sceneforge-remix-asset-marking-publish/issues/02-asset-marking-workspace-simplification.md`
