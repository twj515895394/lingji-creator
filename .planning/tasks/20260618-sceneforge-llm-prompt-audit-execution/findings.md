# Findings

## 2026-06-18

- 当前 `direct_llm` 运行时 prompt 主要由 `system.md`、`user.md` 与 `stageContext` 组成，`agent-instructions.md` 和 `review-checklist.md` 虽已存在于 stage pack，但尚未稳定进入最终发给 LLM 的 prompt。
- 用户反馈“流程能跑通但产物质量不贴预期”，与上述运行时上下文缺口高度一致。
- 仓库已包含 `js-tiktoken`，可以在本地做真实 token 计数，不必退化成字符数估算。
