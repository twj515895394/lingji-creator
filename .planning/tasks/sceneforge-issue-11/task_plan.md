# SceneForge Issue 11 Task Plan

## Goal

核心三阶段 final core artifact 的 Display Model + Copy Blocks；`readSceneArtifact` 附带 `displayModel`（非核心为 null）。

## Current Phase

Phase 2

## Phases

### Phase 1: Requirements

- [x] Issue 11、Task 13、domain contracts §9。
- **Status:** complete

### Phase 2: RED Tests

- [ ] `tests/sceneforge-artifact-display-model.test.ts`（正常/缺章节/空块/可选 EN 缺失）。
- **Status:** in_progress

### Phase 3: Implementation

- [ ] `src/types/sceneforge.ts` 类型 + manifest 字段
- [ ] `scene-artifact-display-model.ts`
- [ ] `scene-artifact-store.ts` 集成
- **Status:** pending

### Phase 4: Verify

- [ ] display-model + artifact-store tests + regression
- **Status:** pending