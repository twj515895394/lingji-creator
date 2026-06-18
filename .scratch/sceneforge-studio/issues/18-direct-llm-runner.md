Status: ready-for-agent

# direct_llm Runner 与 Prompt 渲染

Type: AFK

## 父问题

- 设计：`docs/sceneforge/2026-06-17-sceneforge-runners-design.md` §2
- 计划：Wave C1

## 要构建什么

实现 **`scene-prompt-renderer.ts`**（Stage Pack system/user + Stage Context 变量）与 **`scene-direct-llm-runner.ts`**（调用 Lingji LLM 配置，主进程侧桥接或等价 IPC）。`createSceneStageRunner('direct_llm')` 返回 draft **`Record<artifactKey, string>`**，**不**写盘、**不**绕过 `submitStageDraft`。

MVP 生成策略在实施时二选一并在 PR 说明：单轮多 key JSON 约定，或按 output-contract 分轮。

## 验收标准

- [ ] direct_llm runner 实现；`manual_submit` 行为不变。
- [ ] Mock LLM 测试：runner 产出 artifacts map；项目 manifest 在仅 run 未 submit 时不变。
- [ ] Context 使用 builder 输出，遵守 maxTotalChars warnings。
- [ ] `tests/sceneforge-direct-llm-runner.test.ts` 通过。

## Review Checklist

- [ ] 不读 `.agents/skills`。
- [ ] 新 runner 文件 SRP，≤800 行。

## 被阻塞于

- Issue 14：SceneContextBuilder 与受控 Stage Context
- Issue 17：P0 Stage Pack 迁移（至少 design 或目标 stage pack 存在）