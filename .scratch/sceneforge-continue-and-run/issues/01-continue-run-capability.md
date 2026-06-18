Status: ready-for-agent

## 父问题

`.scratch/sceneforge-continue-and-run/PRD.md`

## 要构建什么

建立可独立测试的 Continue & Run 能力判定，依据当前可推进状态、下一阶段和 Runner 支持情况决定是否展示自动动作。

## 验收标准

- [ ] 返回明确 nextStage、supportedRunners 和不可用原因
- [ ] 无下一阶段时不可用
- [ ] 下一阶段不支持所选 Runner 时不可用
- [ ] 不调用 IPC，不读取组件状态
- [ ] 表驱动测试覆盖全部阶段边界

## 被阻塞于

无 - 可以立即开始

## 类型

AFK

