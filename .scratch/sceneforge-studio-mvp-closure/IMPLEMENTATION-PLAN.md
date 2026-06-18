# SceneForge MVP 流水线闭环 — 实施计划

> 日期：2026-06-18  
> 依赖：`PRD.md`、`docs/adr/0002-*.md`、`docs/sceneforge/2026-06-18-sceneforge-mvp-pipeline-closure-design.md`  
> Issues：本目录 `issues/01`–`05`  
> 验证：`npx vitest run tests/sceneforge-*.test.ts tests/electron-api.test.ts`；`npx tsc --noEmit`；改 main 后重启 Electron

## 阶段总览

| 阶段 | Issue | 目标 |
| --- | --- | --- |
| A | 01 | 文档落盘与交叉引用（ADR/设计/本计划） |
| B | 02 | 后端：支撑三阶段 submit + validators + IPC/MCP 枚举 |
| C | 03 | Studio：reference/story/assets 工作区 + Validate/Continue |
| D | 04 | Core：StageRunPanel 提交草案 + design MVP 占位（可选） |
| E | 05 | 测试、Phase2 overview 指针、handoff 验收清单 |

## 依赖关系

```text
01 → 02 → 03
01 → 04（04 可与 03 并行，均依赖 02 的 submit 契约）
02, 03, 04 → 05
```

## 阶段 B 要点（issue 02）

**Files（预期）**

- Modify: `electron/sceneforge/service.ts`（`SUPPORT_DRAFT_*`、types）
- Create: `electron/sceneforge/validators/validators.reference.ts` 等
- Modify: `electron/sceneforge/validators/scene-validator.ts`
- Modify: `electron/sceneforge/mcp/register-scene-tools.ts`
- Modify: `electron/preload.ts`, `src/lib/electron-api.ts`, sceneforge IPC 注册处
- Test: `tests/sceneforge-support-submit.test.ts`（扩展）或新建 `tests/sceneforge-prep-support-validators.test.ts`

**artifactKey 锁定**

- reference → `reference_notes`
- story → `story_direction`
- assets → `asset_plan`

## 阶段 C 要点（issue 03）

**Files（预期）**

- Create: `src/sceneforge/components/workspace/ScenePrepSupportWorkspace.tsx`
- Modify: `src/sceneforge/pages/SceneForgeStudio.tsx`
- Modify: `src/sceneforge/lib/scene-stage-capabilities.ts`
- Test: `tests/sceneforge-workspace-routing.test.ts`（扩展）

## 阶段 D 要点（issue 04）

**Files（预期）**

- Modify: `src/sceneforge/components/stage-run/StageRunPanel.tsx`
- Optional: `src/sceneforge/components/workspace/SceneCoreMvpPlaceholder.tsx`
- Test: 组件或 IPC mock 测 submit 被调用

## 风险

| 风险 | 缓解 |
| --- | --- |
| 本地 UI 使用 `reference_analysis` 等别名 | 对齐 `reference_notes`，迁移 UI 与测试 |
| IPC 三件套遗漏 | 按 CLAUDE.md 清单 + `electron-api.test.ts` |
| optional 策略下 Continue 与 gate 不一致 | 复用 `canContinueStage` + 单测 |

## 完成后

- 更新 `docs/sceneforge/2026-06-17-sceneforge-phase2-overview.md` §6 一句
- `.handoff/` 记录 MVP 闭环路径与 Issue 20 续验项