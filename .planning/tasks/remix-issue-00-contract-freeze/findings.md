# Remix Issue #0 Findings

## 2026-06-23

- 当前 handoff 与 `task_plan.md` 中的部分 Remix stage 命名仍是旧稿；本轮实现以 2026-06-22 的产品设计、后端 stage flow、backend boundary v1.1 为真相源。
- 新版长链路 stage 固定为：
  - `remix_source_import`
  - `remix_segmentation`
  - `remix_keyframes`
  - `remix_understanding`
  - `remix_strategy`
  - `remix_design`
  - `remix_keyframe_edit_prompts`
  - `edited_keyframes_review`
  - `remix_video_prompts`
  - `remix_publish`
- `remix_variant_create` 在 backend boundary v1.1 中被明确为“创作入口动作”，不一定进入长任务 stage 列表。
- 现有 SceneForge 的共享类型模式是：
  - 共享类型真相源放在 `src/types/*`
  - electron 侧通过 `electron/sceneforge/types.ts` 做 re-export
  - stage 定义单独位于 `electron/sceneforge/pipeline/scene-stage-definitions.ts`
- Remix 契约层最稳妥的接缝是：
  - 共享领域类型放在 `src/sceneforge/remix/types/index.ts`
  - electron 侧建立 `electron/sceneforge/remix/remix-types.ts` re-export
  - Remix stage / artifact path 继续留在 electron 侧，避免前端过早耦合文件系统语义
- Snapshot 边界已在文档中固定为三份，而不是单个巨型对象：
  - `RemixAssetLibrarySnapshot`
  - `RemixAssetProcessingSnapshot`
  - `RemixCreationWorkspaceSnapshot`
