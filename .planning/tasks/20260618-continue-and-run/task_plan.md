# Task Plan: SceneForge Continue & Run

## Goal

完成 Issues 01–03：能力判定、阶段继续编排、跨阶段草案交接与双动作 UI；Issue 04 由维护者人工验收。

## Current Phase

Phase 4

## Phases

### Phase 1: Capability
- [x] 表驱动 RED
- [x] 纯能力函数 GREEN
- **Status:** complete

### Phase 2: Continuation Orchestration
- [x] approve/navigate/run 行为测试
- [x] 提取 hook 与纯编排函数
- [x] 普通 Continue 行为保持
- **Status:** complete

### Phase 3: Draft Handoff and UI
- [x] Studio 暂存下一阶段结果
- [x] StageRunPanel 接收初始结果
- [x] FlowActions 双动作与文案
- [x] UI tests
- **Status:** complete

### Phase 4: Regression and Review
- [x] TypeScript
- [x] 目标测试
- [x] SceneForge 全量回归
- [x] Code Review
- [x] 更新 Issues 01–03
- **Status:** complete

## Decisions Made

| Decision | Rationale |
| --- | --- |
| capability 接收 supportedRunners，不自行猜 Provider | 保持纯函数与能力来源解耦 |
| 编排核心使用可测试纯 async 函数，hook 只管理 UI 状态 | 不引入 React 测试依赖，副作用顺序仍可完整验证 |
| 默认 Continue & Run 使用 direct_llm | 与已确认 PRD/设计一致 |
| 不提交上一批或本批代码 | 用户本轮只要求继续实施 |

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
