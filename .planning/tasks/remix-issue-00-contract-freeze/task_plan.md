# Remix Issue #0：契约冻结 — 核心类型、Stage 定义与 Artifact 路径

## 父问题

SceneForge Remix Mode 开发实施计划 Phase 0

## 要构建什么

定义 Remix Mode 全部核心类型、Stage 定义、API 契约、状态枚举和 Artifact 路径规范。这是所有后续 Issue 的基础，不涉及任何业务逻辑实现，只产出类型文件和路径工具。

端到端行为：
- 新增 `electron/sceneforge/remix/remix-types.ts`，定义 `SourceAsset`、`SourceSegment`、`SourceKeyframe`、`RemixVariant`、`RetentionMatrix`、`KeyframeEditPrompt`、`EditedKeyframe`、`SeedancePrompt`、`RemixCreationWorkspaceSnapshot`、`RemixAssetLibrarySnapshot`、`RemixAssetProcessingSnapshot` 等领域对象
- 新增 `electron/sceneforge/remix/remix-stage-definitions.ts`，定义 Remix Mode 专属 Stage 链路（以 2026-06-22 产品 / 后端文档为真相源：`remix_source_import`、`remix_segmentation`、`remix_keyframes`、`remix_understanding`、`remix_strategy`、`remix_design`、`remix_keyframe_edit_prompts`、`edited_keyframes_review`、`remix_video_prompts`、`remix_publish`；`remix_variant_create` 作为创作入口动作，不建成长任务 Stage），遵循现有 `SceneStageDefinition` 接口形状
- 新增 `electron/sceneforge/remix/remix-artifact-paths.ts`，集中管理 Source Asset、Segment、Variant、Keyframe、Prompt、Analysis、Manifest 的路径生成
- 新增 `src/sceneforge/remix/types/index.ts`，前端侧的 Remix 类型镜像（通过 IPC 契约对齐）
- 定义状态枚举：SourceAsset 状态（`draft` / `processing` / `ready_for_review` / `published_to_library` / `failed`）、Stage 状态（`not_started` / `running` / `needs_input` / `ready_for_review` / `approved` / `failed`）、EditedKeyframe 状态（`pending` / `generated` / `needs_revision` / `approved` / `rejected`）
- 定义前端路由契约：`/remix/assets`、`/remix/assets/:sourceAssetId/process`、`/remix/assets/:sourceAssetId`、`/remix/projects/:variantId`
- 定义 IPC namespace：`sceneForgeRemix`

## 验收标准

- [x] `remix-types.ts` / `src/sceneforge/remix/types/index.ts` 覆盖核心领域对象、Snapshot 契约、状态枚举、路由与 namespace 常量
- [x] `remix-stage-definitions.ts` 导出 `REMIX_STAGE_DEFINITIONS`，每个 Stage 包含 `id`、`displayName`、`category`、`dependencies`、`defaultApprovalPolicy`、`requiredArtifacts`
- [x] `remix-artifact-paths.ts` 导出 Source Asset / Segment / Variant / Prompt Bundle 的集中路径生成函数
- [x] 前端类型文件与后端类型文件通过 re-export 对齐
- [x] 所有状态枚举有对应的 union type，非 plain string
- [x] `npx tsc --noEmit` 通过
- [ ] 现有 SceneForge 1.0 测试全部通过，无回归

## Code Review 检查项

- [x] 不污染原始 Lingji-Cut 功能（未修改 `src/types/sceneforge.ts` 或 `electron/sceneforge/types.ts`）
- [x] 类型定义与设计文档中的领域对象名称、字段保持一致，并采用 2026-06-22 文档的新版 stage 词汇
- [x] 无 `any` / 无隐式类型；仅使用 `as const` 固定字面量常量
- [x] Stage definitions 保持与 `SceneStageDefinition` 同形状
- [x] Artifact 路径函数签名统一、可组合
- [x] IPC namespace 使用 `sceneForgeRemix`，不混入原始 `sceneForge` 命名空间
- [x] 前端路由定义不与现有路由冲突（本轮仅冻结常量，未接入现有 router）

## Test 验证步骤

- [x] `npx tsc --noEmit` 全量通过
- [x] 新增 `tests/sceneforge-remix-types.test.ts`：验证所有类型的 shape 正确性
- [x] 新增 `tests/sceneforge-remix-stage-definitions.test.ts`：验证 Stage 依赖链无循环、requiredArtifacts 非空
- [x] 新增 `tests/sceneforge-remix-artifact-paths.test.ts`：验证路径生成函数的输出格式和隔离性
- [ ] `npm run test` 全量通过

## 被阻塞于

无 - 可以立即开始

## 推荐辅助 Skill

- `codebase-design`：定义深模块契约和领域术语表

## 相关设计文档

- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-development-plan.md` — Phase 0 (§6)
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-backend-module-design.md` — 模块总览 (§1)
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-backend-stage-flow-design.md` — Stage 链路
- `electron/sceneforge/pipeline/scene-stage-definitions.ts` — 现有 Stage 定义参考
