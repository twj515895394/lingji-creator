# Progress

## 2026-06-18

- 已开始 LLM Prompt Audit 实现。
- 已建立执行追踪文件，并把当前缺口落盘：标准文件已迁入 stage pack，但运行时 prompt 仍未完整注入。
- 已完成 Direct LLM prompt 标准注入：`agent-instructions.md` 进入 system prompt，`review-checklist.md` 进入 user prompt。
- 已完成 80k token 硬闸门：发送给 LLM 前先做本地 token 计数，超限直接报错，不会继续发请求。
- 已补齐主链 issue 与计划同步：新增 `.scratch/sceneforge-llm-mainline-closure/issues/04-prompt-standards-and-token-gate.md`。
- 已通过 `npx tsc --noEmit`。
- 已通过定向回归：`npx vitest run tests/sceneforge-direct-llm-runner.test.ts tests/sceneforge-stage-pack.test.ts tests/sceneforge-stage-runner.test.ts tests/sceneforge-ipc-contract.test.ts tests/sceneforge-ui.test.tsx`。
