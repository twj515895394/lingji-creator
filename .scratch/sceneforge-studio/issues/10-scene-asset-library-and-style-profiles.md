Status: completed-local

# Scene Asset Library 与 Style Profiles 迁移

Type: AFK

## 父问题

`.scratch/sceneforge-studio/PRD.md`

## 要构建什么

迁移 SceneForge 中可复用的创作资产库，并建立 registry 和 loader。资产库用于给 Stage Skill Pack / Stage Context 提供风格、镜头语言、动画风格化、分镜方法和改编方法。`source-materials` 明确不迁移，不进入全局默认上下文。

## 验收标准

- [x] 迁移 `assets/adaptation/`、`assets/animation-stylization/`、`assets/cinematic-language/`、`assets/storyboard-methodology/`。
- [x] 迁移 `style_profiles/` 到 `prompts/sceneforge/assets/style-profiles/`（第一版 registry 以 `pixar_like` 为验收样例；其余 profile 目录可按同结构扩展 registry）。
- [x] 不迁移 `assets/source-materials/`。
- [x] 新增 `prompts/sceneforge/assets/registry.yaml`，索引 style profiles 和核心方法库。
- [x] 实现 `listSceneAssets`、`loadSceneAsset`、`loadSceneStyleProfile`、`resolveSceneAssetsForStage`。
- [x] Stage Context 能按 selected asset ids 注入 asset snippets。
- [x] 测试覆盖 registry 读取、style profile 加载、stage 过滤和 source-materials 排除。

## Review Checklist

- [x] `source-materials` 没有被复制到 `prompts/sceneforge/assets/`。
- [x] loader 只读取 registry 声明文件，不扫描任意目录作为上下文。
- [x] registry 中每个 asset 有 id、type、title、files、usedBy。
- [x] style profile 的 visual/camera/lighting/performance/rhythm/negative 文件可独立读取。
- [x] Stage Context 注入资产内容时带 asset id 和 title，方便 trace。
- [x] 没有把全部资产无脑塞进每次 LLM prompt；必须按 stage 和 selected ids 过滤。

## 被阻塞于

- Issue 09：需要 Stage Skill Pack 和 Stage Context 基座。

## Verification

- `npx vitest run tests/sceneforge-asset-library.test.ts tests/sceneforge-stage-pack-context.test.ts` — 8 tests passed
- SceneForge 回归 18 files / 57 tests passed；`npx tsc --noEmit` 通过
- 记录：`.planning/tasks/sceneforge-issue-10/`