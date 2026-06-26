Status: ready-for-agent

# 项目资产库分区查询与状态过滤闭环

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

把当前混杂的 Remix Asset Library 重构为清晰的项目资产治理入口，至少稳定区分：

- 已入库资产
- 处理中 / 待确认
- 异常 / 失败

端到端行为：

- 资产库主界面可按生命周期状态切换分区。
- 页面查询会按状态过滤 Source Asset，而不是把未入库素材混入正式资产网格。
- recent project 或深链回到资产库时，能恢复到正确的资产库分区。

## 实施约束

- 实现必须以 `docs/sceneforge2.0/technical-solutions/01-remix-asset-lifecycle-and-project-asset-library.md` 为准。
- 状态词必须使用方案中的生命周期词汇，不得新增含义重叠的新状态。
- 这是一个完整切片，前后端过滤、路由状态与基础测试要一起落地。

## 验收标准

- [ ] 资产库至少存在“已入库资产 / 处理中 / 异常”三个稳定分区
- [ ] `published_to_library` 资产不会和 `draft` / `processing` / `ready_for_review` 混排
- [ ] 资产库查询支持按状态过滤，并被页面真实消费
- [ ] 从资产库刷新或再次打开时，能恢复到上次分区
- [ ] 分区切换不破坏当前已完成的 #7–#14 黄金路径能力

## Review Checklist

- [ ] 状态过滤由统一查询参数驱动，不在 renderer 里散落硬编码筛选
- [ ] 生命周期状态与步骤状态没有再次混用
- [ ] 资产库分区命名与 01 方案保持一致
- [ ] 路由 / recent-project 恢复逻辑和分区状态一致，不出现“URL 是 processing，界面却是 published”

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 更新资产库相关测试，覆盖三个分区的状态过滤
- [ ] 更新路由 / recent project 测试，覆盖分区恢复
- [ ] 手动验证：导入未入库素材、已入库素材、失败素材后，分别出现在正确分区

## 涉及范围

- `src/sceneforge/remix/pages/RemixAssetLibrary.tsx`
- `src/sceneforge/remix/services/remix-api-client.ts`
- `electron/sceneforge/remix/remix-service.ts`
- recent project / 路由恢复相关代码与测试

## 被阻塞于

- 无 - 可以立即开始
