Status: ready-for-agent

## 父问题

`.scratch/sceneforge-continue-and-run/PRD.md`

## 要构建什么

在 Studio 中增加显式 Continue & Run 动作，并把下一阶段 Runner 结果交给对应 StageRunPanel 的待提交草案区，不改变普通 Continue。

## 验收标准

- [ ] 普通 Continue 始终保留
- [ ] 自动动作只在 capability 可用时显示
- [ ] 文案明确下一阶段、Runner 和“仍需手动提交”
- [ ] 自动运行结果出现在下一阶段草案审阅区
- [ ] 运行失败时停在下一阶段并可重试

## 被阻塞于

- `02-stage-continuation-orchestration.md`

## 类型

AFK

