Status: ready-for-agent

# 处理步骤反馈、失败展示与重跑闭环

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

把处理页各步骤的执行反馈从“按钮文案变化”升级成可感知任务反馈，让用户知道系统正在干什么、是否成功、为什么失败、如何重跑。

端到端行为：

- 运行切片、提取关键帧、生成理解时有明确执行中态。
- 最近一次结果、失败原因、重跑入口可见。
- 刷新或重进页面后，仍能看到最近任务结果。

## 实施约束

- 实现必须遵循 `docs/sceneforge2.0/technical-solutions/02-remix-processing-workbench-exit-guard-and-feedback.md`。
- 任务反馈必须以真实 job / run 结果为依据，不能只做纯前端 loading 态。
- 每个步骤保留一个主 CTA，其余为次级动作。

## 验收标准

- [ ] 运行中任务能显示步骤名称、阶段性状态或进度
- [ ] 成功后能显示最近结果摘要
- [ ] 失败时能显示失败原因和重跑入口
- [ ] 重进页面后仍能恢复最近任务结果
- [ ] 每个步骤只有一个明确主 CTA

## Review Checklist

- [ ] 任务反馈与统一 job 记录或等价持久化机制对齐
- [ ] 失败文案不是原始技术噪音直出
- [ ] 重跑不会破坏当前资产状态机
- [ ] 主动作 / 次动作层级清晰，不重新堆满按钮

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 更新处理页测试，覆盖成功 / 失败 / 重跑状态
- [ ] 如存在 job 查询接口，补对应服务测试
- [ ] 手动验证：切片、关键帧、理解三类步骤均能看到真实反馈

## 涉及范围

- `src/sceneforge/remix/pages/RemixAssetProcessing.tsx`
- 处理任务记录与查询接口
- 处理页相关测试

## 被阻塞于

- `.scratch/sceneforge-remix-ui-recovery/issues/05-processing-workspace-state-model.md`
