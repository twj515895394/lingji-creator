Status: ready-for-agent

# 正式资产卡与处理任务卡视觉分流

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

把“正式资产卡”和“处理任务卡”在结构、层级和 CTA 上彻底分流，建立一眼可辨的资产身份。

端到端行为：

- 已入库资产用正式资产卡展示缩略图、标签、时长与创建二创入口。
- 未入库素材用处理任务卡展示进度、阻塞与继续处理入口。
- 选中态、右栏信息和 CTA 语义也随卡片类型变化。

## 实施约束

- 实现必须遵循 `docs/sceneforge2.0/technical-solutions/01-remix-asset-lifecycle-and-project-asset-library.md` 与 `03-remix-ui-workbench-layout-and-visual-system.md`。
- 不能只靠一个状态 badge 来区分两类卡片。
- 这是产品模型表达问题，不是单纯视觉换肤。

## 验收标准

- [ ] 已入库资产卡与处理任务卡在结构和 CTA 上明显不同
- [ ] 正式资产卡主动作是创建二创或查看详情
- [ ] 处理任务卡主动作是继续处理
- [ ] 用户第一眼可分辨“正式资产”与“处理中任务”

## Review Checklist

- [ ] 卡片组件已拆分，避免一个万能组件继续膨胀
- [ ] CTA 优先级与 issue 02 / issue 03 的业务门禁一致
- [ ] 视觉分流没有引入新的状态歧义

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 更新资产库测试，覆盖两类卡片的渲染与 CTA
- [ ] 手动验收：同页同时存在两类条目时，身份一眼可辨

## 涉及范围

- `src/sceneforge/remix/components/AssetCard.tsx` 或其拆分后的组件
- `src/sceneforge/remix/components/AssetGrid.tsx`
- `src/sceneforge/remix/pages/RemixAssetLibrary.tsx`

## 被阻塞于

- `.scratch/sceneforge-remix-ui-recovery/issues/02-processing-queue-task-cards.md`
- `.scratch/sceneforge-remix-ui-recovery/issues/08-processing-workbench-hero-and-layout-hardening.md`
