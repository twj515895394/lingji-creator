# Findings

## 2026-06-18

- 现有 `selectedAssetIds` 只作为 `getStageContext` / `runStage` 的临时参数存在，尚未沉淀到 `project.json.sceneforge`。
- `electron/sceneforge/assets/scene-asset-library.ts` 已具备 registry、style profile 与 methodology 读取能力，可直接作为 UI 与服务端唯一资产源。
- `resolveSceneAssetsForStage()` 已按 `usedBy` 做阶段过滤，因此项目级选择持久化后，只需在服务层默认透传即可自动复用到不同阶段。
- 当前 Studio 没有 SceneForge 专用的 style/assets 选择器，也没有对应 IPC。
- 最小稳定方案是把 `selectedStyleProfileId` 与 `selectedAssetIds` 持久化到 `project.json.sceneforge`，再由服务层合成为实际注入的 `selectedAssetIds`，避免在 renderer 复制一套上下文拼装逻辑。
- 自动化回归显示，这条链路不需要改 asset registry 本体；只要新增窄 IPC 和项目元数据即可打通。
