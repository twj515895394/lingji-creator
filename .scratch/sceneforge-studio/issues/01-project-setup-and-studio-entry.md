Status: completed-local

# SceneForge 项目创建与 Studio 入口

Type: AFK

## 父问题

`.scratch/sceneforge-studio/PRD.md`

## 要构建什么

实现最小 SceneForge 项目创建闭环：应用能创建 `type=sceneforge` 的项目目录，初始化 `project.json` 与 `sceneforge/` 运行文件，并能从应用路由进入空的 SceneForge Studio 页面。这个切片不实现阶段执行，只打通项目类型、目录骨架和 UI 入口。

## 验收标准

- [x] 创建 SceneForge 项目后，项目目录包含 `project.json`、`inputs/source.md`、`sceneforge/state.json`、`sceneforge/approval_policy.yaml`、`sceneforge/artifact_manifest.yaml`。
- [x] `project.json` 包含 `type=sceneforge` 与 `sceneforge` metadata，普通 Lingji Video Project 仍保持兼容。
- [x] AppPage 支持 `sceneforge-setup` 与 `sceneforge-studio`，打开 SceneForge 项目后进入 Studio。
- [x] SceneForge Studio 空页面能渲染标题、三栏区域和三类核心阶段入口。
- [x] 覆盖项目初始化、类型扩展和 UI smoke test。

## Review Checklist

- [x] 未让 shared/renderer 类型反向依赖 Electron 主进程目录。
- [x] `createDefaultProjectData` 对旧项目兼容，不破坏现有 `project-file.test.ts`。
- [x] 新增目录只在用户选择的项目目录内写入。
- [x] 没有改动 Lingji 原有 TTS、时间线、Remotion 导出逻辑。
- [x] main/preload/electron-api/AppPage 变更同步。
- [x] SceneForge UI 使用现有 Lingji 专业工具风格，没有引入独立 Web Console 视觉。

## 被阻塞于

无 - 可以立即开始。

## Implementation Notes

- 已落地 SceneForge 项目类型、项目初始化文件、setup/studio 路由与 Studio 三栏骨架。
- 对应执行记录：`.planning/tasks/sceneforge-issue-01/`。

## Verification

- 覆盖类型、项目文件、路由/API 和 UI smoke 相关测试。
- 已纳入 1-9 串联回归：`npx tsc --noEmit` 通过；SceneForge 相关 17 个测试文件共 51 tests passed。

## Remaining Risk

- 本票只交付 Studio 空壳入口，不包含真实阶段执行；阶段执行由后续 issue 承接。
