# ADR-0002 附录：制作链支撑 MVP（script / performance / audio）

> 状态：已接受（accepted）  
> 日期：2026-06-18  
> 主 ADR：[0002-sceneforge-support-chain-mvp-and-core-submit.md](./0002-sceneforge-support-chain-mvp-and-core-submit.md)

## 决策

将 **script、performance、audio** 纳入与 reference/story/assets **相同的 MVP 闭环**：

- `SUPPORT_DRAFT_STAGES` + `SUPPORT_DRAFT_CONFIG`
- `validateSingleArtifactSupportStage`（`validators.support-prep.ts`）
- MCP `SUBMIT_VALIDATE_APPROVE_STAGES` 枚举
- Studio `ScenePrepSupportWorkspace` + Validate/Continue

**不**引入 stage pack 或 direct_llm。

## artifactKey（`scene-stage-definitions.ts`）

- `script_draft`
- `performance_direction`
- `audio_design`

## 后果

- storyboard 依赖 performance、video_prompts 依赖 audio 可在占位下继续验收。
- 与 D4「全支撑 P2」仍区分：本附录仅为 **占位闭环**，非完整 Studio 编辑器。

## 参考

- `docs/sceneforge/2026-06-18-sceneforge-next-batch-design.md`
- `.scratch/sceneforge-next-batch/issues/09-production-support-mvp.md`