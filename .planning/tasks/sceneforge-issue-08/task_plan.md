# SceneForge Issue 08 Task Plan

## Goal

实现第一版 Prompt Pack 文件夹导出，并补核心流程端到端回归：create project -> submit core artifacts -> validate -> approve -> export。

## Current Phase

Phase 5

## Phases

### Phase 1: Requirements & Discovery

- [x] 读取 Issue 08、核心计划导出段落、现有 Service 简易导出。
- [x] 明确本票只做文件夹导出，不做 ZIP 和支撑产物附录。
- **Status:** complete

### Phase 2: RED Tests

- [x] 写 export 单测：导出文件、manifest、稳定顺序、未 approved 不导出、lastExportPath。
- [x] 写核心流程端到端回归。
- **Status:** complete

### Phase 3: Minimal Implementation

- [x] 新增 `scene-prompt-pack-exporter.ts`。
- [x] 将 `SceneForgeService.exportPromptPack()` 切到 exporter。
- [x] 更新 `project.json.sceneforge.lastExportPath`。
- **Status:** complete

### Phase 4: Verification & Review

- [x] 运行 Issue 08 目标测试。
- [x] 运行 SceneForge / project / pipeline / electron-api 回归。
- [x] 运行 TypeScript 检查。
- [x] 做模块级自审。
- **Status:** complete

### Phase 5: Delivery

- [x] 汇总改动、影响面、验证结果、剩余风险。
- **Status:** complete

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| 导出只读 state + manifest + artifact content | 避免目录扫描猜测最终稿 |
| 文件顺序固定为 Design -> Storyboard -> Video Prompts | 便于 diff 与回归测试 |
| MVP 导出只包含核心产物 | Issue 明确支撑产物附录后续扩展 |
| `lastExportPath` 写入 `project.json.sceneforge` | 满足 Review Checklist，并为 UI 展示最后导出位置打基础 |
| 未 approved 阶段跳过导出 | 满足“未 approved 不进入最终导出”，端到端回归覆盖 |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
