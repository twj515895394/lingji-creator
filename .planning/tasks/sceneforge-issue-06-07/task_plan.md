# SceneForge Issue 06-07 Task Plan

## Goal

连续完成 Issue 06 Electron IPC / MCP 工具闭环与 Issue 07 Studio UI / Artifact Inspector / Approval Policy 控件，并在完成后串联 review Issue 04-07。

## Current Phase

Phase 6

## Phases

### Phase 1: Requirements & Discovery

- [x] 读取 Issue 06 / 07 验收标准。
- [x] 确认执行顺序：Issue 06 API 合同先行，Issue 07 UI 基于同一套 API。
- [x] 明确 Issue 07 不实现 Display Model / Copy Blocks / 复制交互。
- **Status:** complete

### Phase 2: RED Tests

- [x] 写 IPC 契约测试。
- [x] 写 MCP 注册测试。
- [x] 更新 Pipeline task kind 测试。
- [x] 扩展 Studio UI smoke test。
- **Status:** complete

### Phase 3: Issue 06 Implementation

- [x] 扩展 `SceneForgeService` 通用方法。
- [x] 注册 Electron IPC，更新 preload 和 `electron-api.ts`。
- [x] 注册 SceneForge MCP 工具。
- [x] 扩展 Pipeline task kind。
- **Status:** complete

### Phase 4: Issue 07 Implementation

- [x] 将 Studio UI 改成三栏基础工作台。
- [x] 增加 Artifact Inspector tabs 与 Copy 扩展位。
- [x] 增加 Approval Policy 控件、风险确认、审批按钮禁用态。
- **Status:** complete

### Phase 5: Verification & Review

- [x] 运行 Issue 06/07 目标测试。
- [x] 运行 Issue 01-07 聚合回归。
- [x] 运行 TypeScript 检查。
- [x] 串联 review Issue 04-07。
- **Status:** complete

### Phase 6: Delivery

- [x] 汇总改动、影响面、验证结果、review 发现和剩余风险。
- **Status:** complete

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Issue 06 和 07 同批但分阶段执行 | UI 依赖 API 合同，避免假 UI |
| MCP submit 只接受 stage/artifactKey/content | 避免 Agent 写任意 path 或绕过 Artifact Store |
| Studio UI 做基础工作台，不做 Copy Blocks | Issue 11/12 已专门承接复制体验 |
| UI 文案中文优先、英文辅助 | 符合项目语言基调和用户要求 |
| Issue 04-07 review 重点看单一业务路径 | 防止 UI/MCP/IPC 分叉推进状态 |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
