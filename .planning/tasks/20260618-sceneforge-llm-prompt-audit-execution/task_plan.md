# SceneForge LLM Prompt Audit 执行计划

**Goal:** 补齐 Direct LLM 各阶段运行时 prompt 的标准注入链路，并在真正发送给 LLM 前增加 80k token 硬闸门。

### Phase 1: 审计与执行准备
**Status:** complete

- 建立独立执行记录。
- 记录当前运行时 prompt 的真实装配缺口。

### Phase 2: Prompt 标准注入
**Status:** complete

- 把 `agent-instructions.md` 明确注入 Direct LLM 运行时 prompt。
- 把 `review-checklist.md` 明确注入 Direct LLM 运行时 prompt。

### Phase 3: Token 闸门
**Status:** complete

- 在发起 `generateText` 之前计算本次输入 prompt token 数。
- 超过 80k 时直接报错，不把请求推给 LLM。

### Phase 4: 自动化回归
**Status:** complete

- 补充 prompt 注入与 token 超限测试。
- 运行定向 `vitest` 与 `tsc`。

### Phase 5: 文档与状态同步
**Status:** complete

- 更新本执行计划状态。
- 同步主链计划与 issue 状态。
