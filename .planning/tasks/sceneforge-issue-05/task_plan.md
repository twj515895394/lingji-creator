# SceneForge Issue 05 Task Plan

## Goal

补齐 Storyboard / Video Prompts 两个核心阶段，并实现受控 Stage Context：下游只能读取 approved/final 的上游核心产物和 manifest 显式授权的支撑产物。

## Current Phase

Phase 5

## Phases

### Phase 1: Requirements & Discovery

- [x] 读取 Issue 05、领域契约 Stage Context、现有 Service/Validator/Artifact Store。
- [x] 明确本票不接 IPC/MCP/UI，只扩主进程领域闭环。
- **Status:** complete

### Phase 2: RED Tests

- [x] 写 Storyboard Validator 缺失和通过测试。
- [x] 写 Video Prompts Validator 缺失、segment/audio 结构失败和通过测试。
- [x] 写 Stage Context 上下文隔离测试：未 approved、draft/preview、不授权支撑产物均不进入。
- **Status:** complete

### Phase 3: Minimal Implementation

- [x] 实现 Storyboard / Video Prompts Validator。
- [x] 扩展 `SceneForgeService` 支持 Storyboard / Video Prompts 提交。
- [x] 扩展 Stage Context 只读取 approved/final 核心产物和显式授权支撑产物。
- **Status:** complete

### Phase 4: Verification & Review

- [x] 运行 Issue 05 目标测试。
- [x] 运行 Issue 01-05 聚合回归。
- [x] 运行 TypeScript 检查。
- [x] 做模块级自审。
- **Status:** complete

### Phase 5: Delivery

- [x] 汇总改动、影响面、验证结果、剩余风险。
- **Status:** complete

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Stage Context 只读 manifest，不扫描目录 | 防止 draft/final 混读，符合 Issue 05 Review Checklist |
| 核心上游必须 state 为 `approved` 且 artifact 为 `final/core_generation_asset/readableByDownstream` | `validated` 不等于可下游使用 |
| 支撑产物必须 `support_direction_asset`、`readableByDownstream` 且 `usedBy` 包含目标阶段 | “允许的支撑产物”必须通过 manifest 显式授权 |
| Video Prompts 结构检查只做 MVP 基本结构 | 本票只要求 segment/audio execution 基本结构，不做语义一致性 |
| `performance` / `audio` 等支撑阶段补默认 `usedBy` | 让支撑产物可通过 manifest 被下游上下文显式授权 |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
