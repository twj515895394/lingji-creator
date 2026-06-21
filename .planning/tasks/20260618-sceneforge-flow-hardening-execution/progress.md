# Progress

## 2026-06-18

- 阅读 Flow Hardening 全套文档与目标文件。
- 接入 script / performance / assets / audio 语义 validator。
- 将 ACP factory 切换为 `scene-acp-agent-runner + HeadlessAcpProvider`。
- 更新 ACP 相关文案和错误消息。
- 通过：
  - `npx vitest run tests/sceneforge-semantic-validators.test.ts tests/sceneforge-support-submit.test.ts tests/sceneforge-stage-runner.test.ts tests/sceneforge-acp-agent-happy-path.test.ts`
  - `npx vitest run tests/sceneforge-required-context.test.ts tests/sceneforge-ui.test.tsx tests/sceneforge-continue-run.test.ts`
  - `npx tsc --noEmit`
