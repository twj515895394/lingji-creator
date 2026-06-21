# SceneForge Issue 05 Findings

## Requirements

- Storyboard Stage Context 只包含 approved Design 产物和允许的支撑产物。
- Video Prompts Stage Context 只包含 approved Design、approved Storyboard 和允许的支撑产物。
- Storyboard Validator 要求 `storyboard_prompt_pack`、`control_board_prompts`、`style_board_prompts`、`master_board_prompt`。
- Video Prompts Validator 要求 `video_prompt_pack`、`video_prompt_pack_cn`，并检查 segment/audio execution 基本结构。
- 未 approved 的上游核心产物不会进入下游上下文。
- 覆盖上下文隔离和两个核心阶段 validator 测试。

## Research Findings

- Issue 04 的 `SceneForgeService.getStageContext()` 当前只处理 Storyboard 读取 approved Design。
- `scene-stage-definitions.ts` 已定义 Storyboard 和 Video Prompts 的 requiredArtifacts 与 dependencies。
- `writeSceneArtifact()` 当前根据 stage 自动写 `usedBy`，核心阶段已有 Design -> Storyboard/Video/Export、Storyboard -> Video/Export。
- Stage Context 契约要求 `requiredInputs`、`optionalInputs`、`outputContract` 和 forbidden actions。

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Storyboard / Video Prompts 复用 Service 的阶段提交编排 | 保证提交路径都走 Artifact Store、Validator、审批策略 |
| Validator 错误码分别使用 `SCENE_STORYBOARD_MISSING_*` 和 `SCENE_VIDEO_PROMPTS_*` | UI/MCP 可稳定展示 |
| `optionalInputs` 只放授权支撑产物 | 避免支撑 draft 或未授权产物被下游误读 |
| `performance` 默认授权给 Storyboard / Video Prompts，`audio` 默认授权给 Video Prompts | 与核心依赖方向一致，仍需 manifest `usedBy` 显式记录 |

## Resources

- `.scratch/sceneforge-studio/issues/05-storyboard-video-prompts-and-stage-context.md`
- `docs/sceneforge/2026-06-16-sceneforge-domain-contracts.md`
- `electron/sceneforge/service.ts`
- `electron/sceneforge/validators/scene-validator.ts`
- `electron/sceneforge/artifacts/scene-artifact-store.ts`
