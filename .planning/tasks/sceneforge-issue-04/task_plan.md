# SceneForge Issue 04 Task Plan

## Goal

打通 Design 阶段提交、校验与审批闭环：提交 Design 草案后写入核心产物、注册 manifest、运行 Validator，并按审批策略进入 `waiting_approval` 或自动推进；Design 未 `approved` 前不进入下游默认 Stage Context。

## Current Phase

Phase 5

## Phases

### Phase 1: Requirements & Discovery

- [x] 读取 Issue 04、核心实施计划 Task 4、领域契约和现有 Issue 02/03 代码。
- [x] 明确本票范围：状态机、Validator、SceneForgeService 最小门面、Design 下游上下文门禁。
- **Status:** complete

### Phase 2: RED Tests

- [x] 写 Design 提交/校验/审批闭环测试。
- [x] 写 Validator 缺少核心产物稳定错误码测试。
- [x] 写未 approved 不进入下游 Stage Context 测试。
- **Status:** complete

### Phase 3: Minimal Implementation

- [x] 实现 `scene-state-machine.ts`。
- [x] 实现 `scene-validator.ts` 与 `validators.design.ts`。
- [x] 实现 `service.ts` 中 Design 提交、校验、审批、Stage Context 最小门面。
- **Status:** complete

### Phase 4: Verification & Review

- [x] 运行 Issue 04 目标测试。
- [x] 运行 Issue 01-04 聚合回归。
- [x] 运行 TypeScript 检查。
- [x] 做模块级自审。
- **Status:** complete

### Phase 5: Delivery

- [x] 汇总改动、影响面、验证结果、剩余风险。
- **Status:** complete

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `SceneForgeService` 只做最小领域门面 | 满足 Issue 04 “审批动作通过服务执行”，但不提前接 IPC/MCP |
| Validator 只读 manifest 与 artifact 内容 | Validator 只校验边界，不改写创作内容 |
| Design 核心产物通过 `writeSceneArtifact` 写入 | 避免绕过受控路径与 manifest 注册 |
| Stage Context 第一版只暴露 approved Design 产物 | 满足下游默认上下文门禁，Issue 05 再扩展 Storyboard/Video |
| Service 运行时拒绝未知 Design artifact key | 后续 IPC/MCP 传 JSON 时仍能守住 5 个核心产物边界 |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
