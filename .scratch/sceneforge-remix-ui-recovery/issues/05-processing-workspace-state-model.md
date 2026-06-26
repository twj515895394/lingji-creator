Status: ready-for-agent

# 处理工作台统一状态模型与返回目标

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

为 Remix 资产处理页建立统一状态模型，至少清晰表达：

- 资产生命周期状态
- 当前处理步骤
- 是否存在活动任务
- 是否有未保存改动
- 当前返回动作的目标队列

端到端行为：

- 顶部状态条能稳定表达“未入库 / 当前步骤 / 已完成进度 / 阻塞原因”。
- 页面知道返回后应去处理中、待确认、已入库还是异常队列。
- 后续退出保护和任务反馈都建立在同一状态模型上。

## 实施约束

- 实现必须遵循 `docs/sceneforge2.0/technical-solutions/02-remix-processing-workbench-exit-guard-and-feedback.md`。
- 状态模型必须优先服务页面行为，不能只停留在类型定义层。
- 资产状态与步骤状态必须分层展示，不能继续混用。

## 验收标准

- [ ] 处理页存在统一 workspace state，可表达资产状态、当前步骤、活动任务、未保存改动和返回目标
- [ ] 顶部状态条只展示清晰的生命周期状态与当前步骤信息
- [ ] 页面能够根据当前状态判断返回落点
- [ ] 刷新或再次打开后，能恢复到上次处理步骤与状态摘要

## Review Checklist

- [ ] `activeAction` 之类的旧状态没有和新模型双轨并存
- [ ] 状态模型命名与 02 方案一致
- [ ] 阻塞原因来自状态模型而不是散落条件分支
- [ ] 返回目标映射逻辑是集中定义的

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 更新处理页测试，覆盖不同资产状态的状态条和返回目标
- [ ] 如有状态恢复测试，补刷新 / 再打开场景
- [ ] 手动验证：不同状态素材打开处理页时，顶部状态和返回目标一致

## 涉及范围

- `src/sceneforge/remix/pages/RemixAssetProcessing.tsx`
- 处理页状态 / route / persistence 相关代码
- 处理页相关测试

## 被阻塞于

- `.scratch/sceneforge-remix-ui-recovery/issues/01-project-asset-library-status-filters.md`
