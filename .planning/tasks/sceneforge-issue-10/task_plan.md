# SceneForge Issue 10 Task Plan

## Goal

迁移 Scene Asset Library 与 Style Profiles 基座：registry + loader，Stage Context 按 selected asset ids 注入 snippets；不迁移 `source-materials`。

## Current Phase

Phase 2

## Phases

### Phase 1: Requirements & Discovery

- [x] 读取 Issue 10、核心计划 Task 12、Issue 09 Stage Context。
- [x] 确认迁移源 `/Users/tangwujun/Documents/trae_projects/scene_forge`。
- **Status:** complete

### Phase 2: RED Tests

- [ ] 新增 `tests/sceneforge-asset-library.test.ts`。
- [ ] 扩展 Stage Context 测试（assetLibrary snippets）。
- **Status:** in_progress

### Phase 3: Minimal Implementation

- [ ] 复制资产到 `prompts/sceneforge/assets/`（排除 source-materials）。
- [ ] 新增 `registry.yaml`。
- [ ] 实现 `electron/sceneforge/assets/scene-asset-library.ts`。
- [ ] `getStageContext` 注入 `assetLibrary`。
- **Status:** pending

### Phase 4: Verification & Review

- [ ] 运行 Issue 10 与 SceneForge 回归。
- [ ] 模块级 review（registry-only、无全盘注入）。
- **Status:** pending

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| registry 为唯一索引 | 不扫描任意目录作为上下文 |
| 第一版 registry 覆盖测试所需 + 代表性 style/methodology | 满足验收，避免一次复制过多无关文件 |
| selectedAssetIds 由 getStageContext 可选参数传入 | UI 选择器后续增强 |