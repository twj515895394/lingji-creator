Status: ready-for-agent

# 处理任务记录与 Job Persistence 基座

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

为 Remix 资产处理工作台补齐统一的任务记录基座，让切片、关键帧、原片理解等步骤都能共享同一套 job 状态与持久化契约。

端到端行为：

- 处理步骤启动后会生成或更新任务记录。
- 页面可查询当前活动任务与最近一次任务结果。
- 刷新或重新进入处理页后，仍能恢复上次任务状态与结果摘要。

## 实施约束

- 实现必须遵循 `docs/sceneforge2.0/technical-solutions/02-remix-processing-workbench-exit-guard-and-feedback.md`。
- 这是 05 / 06 / 07 的共同前置，不要把 job 持久化散落到每张票里各自实现。
- 基座要先稳定统一契约，再让具体 UI 票消费。

## 验收标准

- [ ] 存在统一的 processing job 状态结构，可表达 queued / running / succeeded / failed / cancelled
- [ ] 页面可通过统一接口读取当前任务与最近任务记录
- [ ] 任务记录在刷新或重进页面后仍可恢复
- [ ] 切片、关键帧、原片理解至少三类步骤共用该记录机制

## Review Checklist

- [ ] job 记录结构与 02 方案定义一致，不为单一步骤特化
- [ ] renderer 不直接猜测任务状态，统一通过接口或状态查询获取
- [ ] 持久化逻辑集中，不在多个页面组件里重复写

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 补任务记录相关服务 / IPC / 前端状态恢复测试
- [ ] 手动验证：运行步骤后刷新页面，仍能看到最近任务结果

## 涉及范围

- processing job 持久化与查询接口
- `src/sceneforge/remix/pages/RemixAssetProcessing.tsx`
- 相关测试

## 被阻塞于

- 无 - 可以立即开始
