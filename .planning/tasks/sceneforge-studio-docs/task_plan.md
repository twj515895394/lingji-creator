# SceneForge Studio Docs Task Plan

## Goal

落地 SceneForge Studio 核心流程集成的第一批设计文档，明确 PRD、领域契约、Electron/MCP 集成、UI 工作台和 v9-dev 取舍边界；本轮不改代码、不提交、不创建 issue。

## Scope

- 新增 `docs/sceneforge/2026-06-16-sceneforge-studio-prd.md`
- 新增 `docs/sceneforge/2026-06-16-sceneforge-domain-contracts.md`
- 新增 `docs/sceneforge/2026-06-16-sceneforge-electron-mcp-architecture.md`
- 新增 `docs/sceneforge/2026-06-16-sceneforge-studio-ui-design.md`
- 新增 `docs/sceneforge/2026-06-16-sceneforge-migration-from-v9-dev.md`
- 新增 `docs/superpowers/plans/2026-06-16-sceneforge-studio-core-flow.md`

## Phases

### Phase 1: Context Review

**Status:** complete

- 已阅读 Lingji Cut 项目指南、SceneForge v2 架构文档、issue tracker 规则、to-prd/to-issues 规则。
- 已阅读 `scene_forge` 当前 `codex/v9-dev` 分支的 README、v9 架构/计划、engine 状态机/manifest/validator/CLI、web-console 阶段状态与 artifact discovery。

### Phase 2: Write Design Docs

**Status:** complete

- 新增 5 份设计文档。
- 保持 v2 方向：Lingji Cut 原生 Studio，不搬 v9-dev Web Console。

### Phase 3: Self Review

**Status:** complete

- 检查文档之间是否互相矛盾。
- 检查是否误把 v9-dev 旧实现当成目标架构。
- 检查是否留下未完成占位。

### Phase 4: Handoff Summary

**Status:** complete

- 给用户说明改动范围、影响面、验证结果、剩余风险。

### Phase 5: Implementation Plan

**Status:** complete

- 已补充审批策略可配置设计。
- 已生成核心流程实施计划。
- 已完成计划占位词与架构边界自审。

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
