# SceneForge Issue 09 Findings

## Requirements

- 定义 `manual_submit / direct_llm / acp_agent` 三种 runner type。
- 第一版实现 `manual_submit` runner。
- `direct_llm`、`acp_agent` 保留接口与结构化 not implemented 返回。
- Stage Skill Pack loader 能读取 `prompts/sceneforge/stages/<stage>/` 下的 `system.md`、`user.md`、`agent-instructions.md`、`output-contract.yaml`、`review-checklist.md`。
- Design 阶段落地最小 Stage Skill Pack。
- Stage Context 包含程序加载后的 stage pack 摘要和当前阶段 output contract。
- 最终提交路径必须走 Service 的 `submitStageDraft`。

## Research Findings

- 现有 `SceneForgeService.getStageContext()` 已返回 `outputContract.requiredArtifacts`。
- 现有 `SceneForgeService.submitStageDraft()` 是唯一通用阶段提交入口，可复用。
- 仓库已有 `yaml` 依赖，可读取 `output-contract.yaml`。
- 本票不应访问 `.agents/skills/<stage>/SKILL.md`。

## Resources

- `.scratch/sceneforge-studio/issues/09-stage-runner-and-skill-pack-foundation.md`
- `docs/superpowers/plans/2026-06-16-sceneforge-studio-core-flow.md`
- `electron/sceneforge/service.ts`

