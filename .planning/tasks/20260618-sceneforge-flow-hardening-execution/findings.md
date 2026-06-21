# Findings

## 2026-06-18

- `StageRunPanel` 与 `SceneForgeService.runStage` 的 required context 双保险已存在，不需要重造第三套判定。
- `semantic-support-stages.ts` 已实现，但四个阶段 validator 入口原先未接线。
- `scene-stage-runner-factory.ts` 原本仍走 `scene-acp-stage-runner` 的 briefing-only 路径，且 ACP 配置路径读取的是 `app.getPath('userData')/agent-config.json`，与 ACP 其他模块使用的 `~/.lingji/agent-config.json` 不一致。
- `tests/sceneforge-support-submit.test.ts` 中的极简样例与新语义校验冲突，需要改为真实结构样例。
- 当前 `Continue & Run` 测试只覆盖能力判断，不覆盖下一阶段 context 预判；但 service 层已经会在真实 run 前阻塞。
