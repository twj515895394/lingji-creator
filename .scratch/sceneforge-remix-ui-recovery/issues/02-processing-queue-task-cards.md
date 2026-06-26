Status: ready-for-agent

# 处理中队列与待确认任务卡落地

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

把未入库素材从“看起来像正式资产的卡片”改造成明确的处理任务卡，让用户能在处理中队列理解：

- 这份素材还没有入库
- 当前完成了多少步骤
- 阻塞在哪里
- 继续处理还是删除草稿

端到端行为：

- 处理中素材展示为任务卡或任务列表，而不是正式资产卡。
- 待确认素材显示完成进度、阻塞原因和主动作。
- 从任务卡进入处理页后，返回仍能在处理中队列找到该条任务。

## 实施约束

- 实现必须遵循 `docs/sceneforge2.0/technical-solutions/01-remix-asset-lifecycle-and-project-asset-library.md`。
- 任务卡必须消费真实处理进度 / 阻塞字段，不能用纯文案模拟。
- 不允许继续复用正式资产卡样式假装“差不多”。

## 验收标准

- [ ] `draft` / `processing` / `ready_for_review` 素材以任务卡或任务列表展示
- [ ] 任务卡显示生命周期状态、步骤进度、阻塞原因和主动作
- [ ] 任务卡可直接继续处理或删除草稿
- [ ] 待确认素材不会再出现在正式资产网格中
- [ ] 从任务卡进入处理页再返回后，仍能看到同一任务

## Review Checklist

- [ ] 任务卡和正式资产卡组件已拆分，不是同一组件里分支爆炸
- [ ] 阻塞原因来自后端或统一 view model，不在组件内临时拼字符串
- [ ] 删除草稿操作保留明确的危险操作语义
- [ ] 任务卡的主动作语义稳定为“继续处理”，不和“创建二创”混淆

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 更新资产库测试，覆盖处理中 / 待确认任务卡渲染
- [ ] 补删除草稿 / 继续处理交互测试
- [ ] 手动验证：处理中素材返回后仍落在处理中队列，且卡片不是正式资产样式

## 涉及范围

- `src/sceneforge/remix/components/*Asset*`
- `src/sceneforge/remix/pages/RemixAssetLibrary.tsx`
- 资产进度查询相关接口与测试

## 被阻塞于

- `.scratch/sceneforge-remix-ui-recovery/issues/01-project-asset-library-status-filters.md`
