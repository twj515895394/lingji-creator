Status: completed

## 父问题

`.scratch/sceneforge-continue-and-run/PRD.md`

## 要构建什么

提取阶段继续编排，使普通 Continue 和 Continue & Run 共用审批与导航逻辑，并保证审批失败时绝不运行下一阶段、运行失败时不回滚已完成审批。

## 验收标准

- [x] 普通 Continue 行为与现状一致
- [x] 自动模式只在审批和导航成功后运行一次下一阶段
- [x] 审批失败时 Runner 调用次数为 0
- [x] Runner 失败时返回下一阶段和可展示错误
- [x] required、optional、auto_if_valid 策略均有测试

## 完成证据

- 新增 `useSceneStageContinuation` 与可独立测试的 `continueSceneStage`。
- 审批/导航异常会释放 busy；Runner 失败不回滚并返回 nextStage/runError。
- `tests/sceneforge-stage-continuation.test.ts`：6 tests passed。

## 被阻塞于

- `01-continue-run-capability.md`

## 类型

AFK
