# SceneForge Issue 08 Findings

## Requirements

- 导出目录位于 `sceneforge/exports/prompt_pack/`。
- 导出包含 `final_prompt_pack.md`、`design_prompts.md`、`storyboard_prompts.md`、`video_prompts.md`、`manifest.json`。
- 未 approved 的核心产物不会进入最终导出。
- Service 暴露 `exportPromptPack`，IPC 和 MCP 均可调用。
- 覆盖 export 单测和核心流程端到端回归。

## Research Findings

- Issue 06 已暴露 `exportPromptPack` 到 IPC/MCP，但 Service 当前只写简易 `manifest.json`。
- Issue 05 的 Stage Context 已建立 approved/final 门禁，导出可复用同样原则。
- `project.json` 由 `loadProjectFile()` 读取，当前没有直接保存 sceneforge section 的专用 helper。

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| exporter 独立于 Service | 保持 Service 门面薄，导出逻辑可单测 |
| manifest 写导出文件清单和 artifact ids | 让导出结果可被 UI/MCP/测试稳定消费 |
| 未审批阶段跳过而不是失败 | Issue 要求未 approved 不进入最终导出，核心流程可部分导出；若三阶段都缺失再失败可后续增强 |

## Resources

- `.scratch/sceneforge-studio/issues/08-prompt-pack-export-and-core-flow-regression.md`
- `electron/sceneforge/service.ts`
- `electron/sceneforge/artifacts/scene-artifact-store.ts`
- `electron/sceneforge/pipeline/scene-state-machine.ts`
