# SceneForge Issue 09 Task Plan

## Goal

实现 Stage Runner 与 Stage Skill Pack 基座：程序加载阶段规则、prompt、output contract 和 review checklist；第一版只实现 `manual_submit` runner，`direct_llm` / `acp_agent` 返回结构化 not implemented。

## Current Phase

Phase 5

## Phases

### Phase 1: Requirements & Discovery

- [x] 读取 Issue 09、核心计划 Task 11、现有 Service / Stage Context。
- [x] 明确本票不接真实 LLM / ACP，只搭运行时接口和 Design 最小 pack。
- **Status:** complete

### Phase 2: RED Tests

- [x] 写 Stage Pack loader 测试。
- [x] 写 Stage Runner 抽象测试。
- [x] 写 Stage Context 包含 pack 摘要和 output contract 测试。
- **Status:** complete

### Phase 3: Minimal Implementation

- [x] 实现 `scene-stage-pack.ts`。
- [x] 实现 `scene-stage-runner.ts`。
- [x] 新增 Design Stage Pack 文件。
- [x] Service 增加 `runStage()`，Stage Context 注入 pack summary。
- **Status:** complete

### Phase 4: Verification & Review

- [x] 运行 Issue 09 目标测试。
- [x] 运行 SceneForge 相关回归。
- [x] 运行 TypeScript 检查。
- [x] 做模块级 review。
- **Status:** complete

### Phase 5: Handoff

- [x] 生成最新 `.handoff/handoff-YYYYMMDD-HHMMSS.md`。
- [x] 向用户提供完整链接路径。
- **Status:** complete

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Stage Pack 存在 `prompts/sceneforge/stages/<stage>/` | 避免运行时依赖 `.agents/skills` |
| manual runner 只返回 draft，不写状态 | 保证最终提交仍走 `submitStageDraft -> Artifact Store -> Manifest -> Validator -> Approval` |
| direct_llm / acp_agent 只返回结构化 not implemented | 保留接口，不虚构真实执行链路 |
| Stage Context 注入 pack summary，不注入完整 prompt | 先满足摘要和 output contract，避免上下文膨胀 |
| `runStage(manual_submit)` 不提交产物 | 防止 runner 绕过 `submitStageDraft` 主链路 |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
