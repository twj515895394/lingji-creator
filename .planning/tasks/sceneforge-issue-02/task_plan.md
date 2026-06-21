# SceneForge Issue 02 Task Plan

## Goal

实现 SceneForge 阶段审批策略可配置闭环：默认策略来自阶段定义，项目覆盖写入 `sceneforge/approval_policy.yaml`，运行时统一解析并校验更新。

## Current Phase

Phase 5

## Phases

### Phase 1: Requirements & Discovery

- [x] 读取 Issue 02、实施计划 Task 2、Issue 01 初始化代码和 SceneForge 类型。
- [x] 明确本票不接 UI/MCP/Validator 状态推进。
- **Status:** complete

### Phase 2: RED Tests

- [x] 写审批策略默认值、项目覆盖、非法 stage/policy、YAML 解析失败测试。
- [x] 运行测试并确认失败原因符合预期。
- **Status:** complete

### Phase 3: Minimal Implementation

- [x] 实现阶段定义。
- [x] 实现审批策略读写、解析和单阶段更新。
- [x] 让项目初始化复用默认策略 writer。
- **Status:** complete

### Phase 4: Verification & Review

- [x] 运行 Issue 02 目标测试和相关回归。
- [x] 运行 TypeScript 检查。
- [x] 按 Issue 02 Review Checklist 自审。
- **Status:** complete

### Phase 5: Delivery

- [x] 汇总改动范围、影响面、验证结果和剩余风险。
- **Status:** complete

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| 默认策略集中在 `scene-stage-definitions.ts` | 避免写死在 UI、状态机或初始化分支里 |
| `approval_policy.yaml` 使用 `overrides` 记录项目覆盖 | 清晰表达“项目覆盖 > pipeline 默认值” |
| YAML 解析失败抛结构化错误 | 避免静默降级导致错误策略自动推进 |
| 本票不暴露 UI/MCP 设置接口 | Issue 06/07 会接服务面和 UI，本票先锁领域能力 |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
