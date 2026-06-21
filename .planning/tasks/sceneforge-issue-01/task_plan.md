# SceneForge Issue 01 Task Plan

## Goal

实现 SceneForge 项目创建与 Studio 空入口：创建 `type=sceneforge` 项目目录，初始化最小运行文件，并能打开原生 Studio 空页面。

## Current Phase

Phase 5

## Phases

### Phase 1: Requirements & Discovery

- [x] 读取 handoff、PRD、实施计划和 Issue 01。
- [x] 读取 `karpathy-guidelines`、`brainstorming`、`writing-plans`、`planning-with-files`、`tdd`。
- [x] 探索项目持久化、导航、Setup、App、Toolbar、preload/electron-api 和现有测试风格。
- **Status:** complete

### Phase 2: RED Tests

- [x] 写 SceneForge 类型、项目初始化、项目导航和 Studio UI smoke 的失败测试。
- [x] 运行目标测试并确认失败原因符合预期。
- **Status:** complete

### Phase 3: Minimal Implementation

- [x] 实现共享类型与 ProjectData 扩展。
- [x] 实现 SceneForge 项目初始化 IPC/bridge。
- [x] 实现 Setup 入口、项目打开路由和 Studio 空页面。
- **Status:** complete

### Phase 4: Verification & Review

- [x] 运行 Issue 01 目标测试。
- [x] 运行旧项目持久化/导航回归测试。
- [x] 按 Issue 01 Review Checklist 自审。
- **Status:** complete

### Phase 5: Delivery

- [x] 汇总改动范围、影响面、验证结果和剩余风险。
- **Status:** complete

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Issue 01 只做项目类型、目录骨架、入口和 Studio 空页面 | 保持垂直切片最小，不提前实现审批、Artifact、Validator 或 MCP |
| 新增专门的 SceneForge 初始化入口，不修改 `loadProjectFile` 默认行为 | 避免空目录被误创建为 SceneForge，保持普通视频项目兼容 |
| Studio UI smoke 沿用 SSR 静态渲染测试 | 项目现有 UI 测试惯例是不引入新测试栈 |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| `git switch -c codex/sceneforge-studio-core` 首次失败，无法创建 `.git` ref | 1 | 使用已确认的 escalated git 分支创建权限后成功创建分支 |
