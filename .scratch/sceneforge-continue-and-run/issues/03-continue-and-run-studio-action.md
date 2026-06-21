Status: completed

## 父问题

`.scratch/sceneforge-continue-and-run/PRD.md`

## 要构建什么

在 Studio 中增加显式 Continue & Run 动作，并把下一阶段 Runner 结果交给对应 StageRunPanel 的待提交草案区，不改变普通 Continue。

## 验收标准

- [x] 普通 Continue 始终保留
- [x] 自动动作只在 capability 可用时显示
- [x] 文案明确下一阶段、Runner 和“仍需手动提交”
- [x] 自动运行结果出现在下一阶段草案审阅区
- [x] 运行失败时停在下一阶段并可重试

## 完成证据

- `SceneStageFlowActions` 增加显式 Continue & Run，普通 Continue 保持原语义。
- `StageRunPanel.initialRunResult` 仅消费匹配阶段结果并复用草案审核区。
- 目标测试 3 files / 30 tests passed；SceneForge 全量 41 files / 167 tests passed。

## 被阻塞于

- `02-stage-continuation-orchestration.md`

## 类型

AFK
