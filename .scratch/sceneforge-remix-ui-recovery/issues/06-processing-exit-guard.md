Status: ready-for-agent

# 未保存标注与处理中任务退出保护

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

为处理页的返回 / 退出动作建立显式守卫。用户在以下场景离开时，系统必须给出清晰选择：

- 有未保存标注
- 当前步骤仍在运行
- 处理尚未完成入库
- 当前步骤失败

端到端行为：

- 返回不是单一动作，而是一个有语义的决策面板。
- 用户可以保存并返回、不保存返回、继续处理、删除草稿，或查看失败。
- 未入库素材返回后进入处理中 / 待确认队列，而不是正式资产库。

## 实施约束

- 实现必须遵循 `docs/sceneforge2.0/technical-solutions/02-remix-processing-workbench-exit-guard-and-feedback.md`。
- 守卫逻辑必须建立在 issue 05 的统一状态模型上。
- 面板动作必须反映真实状态，不得提供不可执行的假按钮。

## 验收标准

- [ ] 有未保存标注时，返回会弹出“保存并返回 / 不保存返回 / 取消”
- [ ] 任务运行中时，返回会明确告知当前任务状态，并提供对应选择
- [ ] 未入库素材离开后回到处理中或待确认队列
- [ ] 失败状态可直接查看失败原因或回到异常队列
- [ ] 不再出现处理一半直接“无语义跳回资产库”

## Review Checklist

- [ ] 守卫触发条件覆盖未保存、运行中、未入库、失败四类场景
- [ ] destructive 动作和普通返回语义明确区分
- [ ] 返回目标与 issue 01 / issue 05 的状态分区一致
- [ ] UI 文案不再混用“返回资产库”和“保存入库”

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 更新处理页交互测试，覆盖未保存返回、运行中返回、失败返回
- [ ] 手动验证：每种状态下的返回面板动作都真实可用

## 涉及范围

- `src/sceneforge/remix/pages/RemixAssetProcessing.tsx`
- 可能涉及统一 dialog / guard 组件
- 处理页相关测试

## 被阻塞于

- `.scratch/sceneforge-remix-ui-recovery/issues/05-processing-workspace-state-model.md`
