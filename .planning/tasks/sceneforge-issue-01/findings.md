# SceneForge Issue 01 Findings

## Requirements

- 创建 SceneForge 项目后，项目目录包含 `project.json`、`inputs/source.md`、`sceneforge/state.json`、`sceneforge/approval_policy.yaml`、`sceneforge/artifact_manifest.yaml`。
- `project.json` 包含 `type=sceneforge` 与 `sceneforge` metadata。
- 普通 Lingji Video Project 保持兼容。
- `AppPage` 支持 `sceneforge-setup` 与 `sceneforge-studio`。
- 打开 SceneForge 项目后进入 Studio。
- Studio 空页面渲染标题、三栏区域和 Design / Storyboard / Video Prompts 三类核心阶段入口。

## Research Findings

- `ProjectData` 当前位于 `src/lib/project-persistence.ts`，没有项目类型字段，默认项目由 `createDefaultProjectData()` 创建。
- `electron/project-file.ts` 的 `loadProjectFile()` 会在空目录自动写普通 `project.json`，SceneForge 不应复用这个默认创建路径作为唯一入口。
- 当前 `resolveProjectLandingPage()` 固定返回 `script-workbench`，需要识别 `projectData.type === 'sceneforge'`。
- `AppPage` 当前只有 `welcome/setup/editor/script-workbench/settings/auto-run`，新增页面会牵动 `Toolbar` 的 `Record<Exclude<AppPage, 'editor'>>`。
- `Setup` 欢迎页已有快捷入口模式，适合新增 SceneForge 项目入口。
- UI 测试主要使用 Vitest + `renderToStaticMarkup`，不需要引入 jsdom/testing-library。

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| 共享 SceneForge 类型放在 `src/types/sceneforge.ts` | renderer/main 都可引用，避免 shared/renderer 反向依赖 Electron |
| 主进程侧 `electron/sceneforge/types.ts` re-export | 符合实施计划，后续主进程模块有稳定导入点 |
| SceneForge 初始化服务放在 `electron/sceneforge/project/scene-project-file.ts` | 与普通 `electron/project-file.ts` 分离，避免扩大默认项目行为 |
| 第一版 `sceneforge-setup` 可路由到 Setup 兼容占位 | Issue 01 验收重点是 AppPage 支持与 Studio 入口，单独 setup 页面可后续细化 |

## Resources

- `.scratch/sceneforge-studio/issues/01-project-setup-and-studio-entry.md`
- `.scratch/sceneforge-studio/PRD.md`
- `docs/superpowers/plans/2026-06-16-sceneforge-studio-core-flow.md`
- `src/lib/project-persistence.ts`
- `electron/project-file.ts`
- `src/lib/project-navigation.ts`
- `src/App.tsx`
- `src/pages/Setup.tsx`
- `src/components/Toolbar.tsx`
