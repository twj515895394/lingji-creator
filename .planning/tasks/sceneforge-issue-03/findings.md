# SceneForge Issue 03 Findings

## Requirements

- 能写入 Design / Storyboard / Video Prompts 阶段产物到 `sceneforge/stages/<stage>/outputs/`。
- 每次写入产物后自动注册或更新 manifest。
- manifest 记录 artifact id、stage、kind、role、title、path、coreAsset、readableByDownstream、usedBy、viewModes、createdAt。
- `listSceneArtifacts` 能按项目读取 manifest 中的产物。
- `readSceneArtifact` 能根据 artifact id 读取内容。
- 拒绝项目目录外路径和任意 path 写入。

## Research Findings

- Issue 01 初始化已创建 `sceneforge/artifact_manifest.yaml`，内容为 `version: 1` + 空 artifacts。
- Issue 02 已建立 `isSceneStageId()`，Artifact Store 可复用它校验 stage。
- 项目已有 `yaml` 依赖，manifest 应用结构化 YAML parser/writer。
- 本票不应接入 Validator、Stage Context 或 UI；后续 issue 会以 manifest 为事实源继续扩展。

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| artifact id 采用 `${stage}.${artifactKey}` | 稳定、可预测，便于重复写更新同一 manifest 项 |
| artifact 文件名采用 `${artifactKey}.md` | 第一版产物都是 Markdown，且 key 经安全校验 |
| `usedBy` 根据核心阶段默认推导 | 先满足下游可读边界，后续 Stage Context 可再精化 |
| 写入前校验 kind / role | 为后续 IPC 或服务层接入预留运行时防线，避免坏元数据污染 manifest |

## Resources

- `.scratch/sceneforge-studio/issues/03-artifact-store-and-manifest.md`
- `docs/superpowers/plans/2026-06-16-sceneforge-studio-core-flow.md`
- `electron/sceneforge/project/scene-project-file.ts`
- `electron/sceneforge/pipeline/scene-stage-definitions.ts`
- `src/types/sceneforge.ts`
