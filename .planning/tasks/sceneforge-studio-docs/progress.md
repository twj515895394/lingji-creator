# SceneForge Studio Docs Progress

## 2026-06-16

- 用户确认可以按“先落地前 5 份设计文档，不进入编码”的路径推进。
- 建立 `.planning/tasks/sceneforge-studio-docs/` 追踪文件。
- 新增 5 份 SceneForge Studio 设计文档：PRD、领域契约、Electron/MCP 集成、UI 设计、v9-dev 迁移取舍。
- 完成占位词扫描与一致性自审；设计文档本体未发现未完成占位。
- 根据用户补充要求，把阶段人工审核改为项目级/阶段级可配置审批策略，补充到领域契约和 UI 设计。
- 新增实施计划 `docs/superpowers/plans/2026-06-16-sceneforge-studio-core-flow.md`，按 10 个任务覆盖项目初始化、审批策略、Artifact、Validator、IPC、MCP、UI、导出和端到端回归。
- 自审时发现 shared 层不应依赖 Electron 类型，已把计划修正为 `src/types/sceneforge.ts` 共享类型 + `electron/sceneforge/types.ts` re-export。
- 使用本地 issue tracker 落地 `.scratch/sceneforge-studio/PRD.md`。
- 使用垂直切片拆出 8 张 issue，并按用户要求在每张 issue 中加入 `Review Checklist`。
- 完成 issue 结构检查：每张 issue 都有 Status、Type、验收标准、Review Checklist、被阻塞于。
- 根据用户确认，补充“程序推进流程 + Stage Runner + Stage Skill Pack”设计：规则由程序加载后提供给 direct LLM 或 ACP Agent，模型不自行扫描 `.agents/skills`。
- 更新 PRD、Electron/MCP 架构文档、实施计划，并新增 `.scratch/sceneforge-studio/issues/09-stage-runner-and-skill-pack-foundation.md`。
- 根据用户要求补充 Scene Asset Library 迁移边界：迁移 adaptation、animation-stylization、cinematic-language、storyboard-methodology、style_profiles；明确不迁移 `source-materials`。
- 更新 PRD、实施计划，并新增 `.scratch/sceneforge-studio/issues/10-scene-asset-library-and-style-profiles.md`。
- 根据用户补充的 UI 细节要求，新增核心产物 Display Model / Copy Blocks 设计，避免 UI 只展示不可操作的长 Markdown。
- 新增 `.scratch/sceneforge-studio/issues/11-core-artifact-display-model-and-copy-blocks.md` 与 `.scratch/sceneforge-studio/issues/12-core-artifact-click-view-and-copy-ux.md`，覆盖核心三阶段最终产物点击查看、分块复制、复制成功反馈和 raw 兜底。
