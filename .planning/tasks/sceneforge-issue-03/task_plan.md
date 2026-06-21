# SceneForge Issue 03 Task Plan

## Goal

实现 SceneForge Artifact Store 与 Manifest 注册闭环：阶段产物只能通过服务写入受控路径，并自动注册到 `sceneforge/artifact_manifest.yaml`。

## Current Phase

Phase 5

## Phases

### Phase 1: Requirements & Discovery

- [x] 读取 Issue 03、实施计划 Task 3、当前项目初始化和 SceneForge 类型。
- [x] 明确本票不接 UI、Validator、Stage Context、Display Model、IPC/MCP。
- **Status:** complete

### Phase 2: RED Tests

- [x] 写 Artifact Store 写入、读取、manifest 字段、重复更新、非法 stage/artifactKey 测试。
- [x] 运行测试并确认失败原因符合预期。
- **Status:** complete

### Phase 3: Minimal Implementation

- [x] 实现 Artifact Store 类型与错误。
- [x] 实现 manifest 读写、受控产物写入、列表和读取。
- [x] 保证 path 为项目相对路径，拒绝路径逃逸。
- **Status:** complete

### Phase 4: Verification & Review

- [x] 运行 Issue 03 目标测试和 Issue 01-02 回归。
- [x] 运行 TypeScript 检查。
- [x] 串联审查 Issue 01-03。
- **Status:** complete

### Phase 5: Delivery

- [x] 汇总 Issue 03 改动与 Issue 01-03 串联 review 结论。
- **Status:** complete

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `writeSceneArtifact` 不接受任意 path | 防止 UI/Agent 绕过 Artifact Store 写入项目外或非受控目录 |
| manifest path 使用项目相对 POSIX 路径 | 跨机器可移植，避免绝对路径泄漏 |
| 重复 artifact id 更新同一条 manifest 记录 | 防止 manifest 追加重复项影响 Validator/Export |
| manifest 解析失败抛结构化错误 | 避免静默覆盖损坏的 manifest |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
