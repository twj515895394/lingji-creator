# SceneForge Studio 工程约束

> 日期：2026-06-17  
> 状态：已定稿（approved）  
> 受众：Coding Agent、维护者

## 1. 模块定位

SceneForge Studio 是 **Lingji Cut（灵机剪影）内的 Prompt Pack 创作模块**，与原有「口播 → TTS → 时间线 → MP4」主链路**并列**，不替代、不耦合进时间线数据模型。

## 2. 目录与命名空间

| 区域 | 路径 | 说明 |
| --- | --- | --- |
| 主进程 | `electron/sceneforge/` | 服务、IPC、MCP、artifact、validator、export |
| 渲染进程 | `src/sceneforge/` | Studio UI、组件、hooks |
| 阶段规则与策略 | `prompts/sceneforge/` | Stage Pack、context-policy、assets registry |
| 类型 | `src/types/sceneforge.ts` | renderer/main 共享领域类型 |
| 测试 | `tests/sceneforge-*.test.ts(x)` | 行为测试，不绑 UI 实现细节 |

**禁止**把 SceneForge 业务逻辑散落到 `src/store/timeline.ts`、`src/remotion/`、`src/pages/ScriptWorkbench.tsx` 等 Cut 核心路径，除非是必要的薄路由或注册（须可一眼看出边界）。

## 3. 低侵入扩展点（优先使用）

- **项目类型**：`project.json` 的 `type: sceneforge` + `sceneforge` metadata（已有）。
- **页面路由**：`AppPage` 的 `sceneforge-setup` / `sceneforge-studio`（已有）。
- **IPC**：`electron/sceneforge/ipc.ts` 集中注册 `sceneforge:*`（已有模式）。
- **MCP**：`electron/sceneforge/mcp/register-scene-tools.ts`（已有）。
- **任务种类**：`electron/pipeline/types.ts` 扩展 `scene_*` task kind（按需）。
- **进度**：复用 `src/store/task-progress.ts`（见 `PROGRESS-SPEC.md`）。

新增能力时先问：**能否只在 `electron/sceneforge` + `src/sceneforge` 完成？**

## 4. 允许触碰的 Cut 共享文件（需克制）

| 文件 | 允许改动性质 |
| --- | --- |
| `src/lib/project-persistence.ts` | 扩展可选字段、迁移兼容 |
| `electron/project-file.ts` | 保存 `sceneforge` section |
| `electron/main.ts` / `preload.ts` | 注册 SceneForge IPC/MCP |
| `src/lib/electron-api.ts` | 类型与 API 契约 |
| `src/App.tsx` / 欢迎或 Setup 入口 | 路由与入口按钮 |

上述改动应 **小 diff、可回滚**，并在 PR/说明中写明对原视频工程无影响。

## 5. 单一职责与文件规模

- 新文件命名：`scene-<职责>.ts`，放在对应子目录（`pipeline/`、`artifacts/`、`export/` 等）。
- **`SceneForgeService`**：门面编排；复杂逻辑下沉到 `SceneContextBuilder`、`SceneHandoffWriter`、`SceneStageRunner` 等。
- **单文件建议 ≤800 行**（软上限）。超过时拆分并增加针对子模块的 Vitest。
- 不把 Display Model 解析、context 构建、handoff 生成、LLM prompt 渲染堆进同一个 1000+ 行文件。

## 6. 测试与验证

- 上下文与 handoff：**必须**有用例覆盖「video 阶段不默认 9 文件全文」「handoff 优先」等行为。
- IPC 改动：main / preload / `electron-api` 三件套 + 契约测试。
- 不为了 SceneForge 去放宽 Cut 的 Electron 安全边界（preload 暴露范围最小化）。

## 7. 相关文档

- 产品架构：`docs/sceneforge/SceneForge_Studio_LingjiCut_Fork_Product_Architecture_v2.md`
- Phase 2 总览：`docs/sceneforge/2026-06-17-sceneforge-phase2-overview.md`
- 仓库规则摘要：`CLAUDE.md` § SceneForge Studio 扩展约束