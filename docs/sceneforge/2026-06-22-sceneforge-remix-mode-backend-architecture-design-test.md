# SceneForge Remix Mode 后端设计草案索引

> 说明：本文件是后端设计文档拆分前的草案索引。正式内容请以以下文档为准：

- `2026-06-22-sceneforge-remix-mode-backend-overview.md`
- `2026-06-22-sceneforge-remix-mode-backend-stage-flow-design.md`
- `2026-06-22-sceneforge-remix-mode-backend-module-design.md`

Remix Mode 后端核心方向：新增 `remix_reference` pipeline，并新增 `remix_*` 专属阶段链路；复用现有 video-import、PipelineService、Artifact Store、Stage State 和 Validator 能力。
