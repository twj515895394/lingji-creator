# Remix Issue #1：IPC 契约 — Remix API Preload / Main 通道注册

## 父问题

SceneForge Remix Mode 开发实施计划 Phase 0

## 要构建什么

在 Electron 主进程和 Preload 层注册 Remix Mode 的全部 IPC 通道。此 Issue 只搭建通道骨架（handler stub），不实现业务逻辑。

端到端行为：
- 在 `electron/preload.ts` 中注册 `sceneForgeRemix` namespace 的全部 IPC API
- 在 `electron/main.ts` 或独立的 `electron/sceneforge/remix/remix-ipc-handlers.ts` 中注册对应 handler stub
- 前端 `src/lib/electron-api.ts` 中新增 Remix API 类型声明
- API 列表：
  - 资产库：`listSourceAssets`、`getSourceAsset`、`createSourceAssetFromImport`、`runSourceSegmentation`、`runSourceKeyframes`、`runSourceUnderstanding`、`publishSourceAssetToLibrary`
  - 二创创作：`createVariantFromSourceAsset`、`getCreationWorkspace`、`updateVariantConfig`、`runRemixStrategy`、`runRemixDesign`、`runKeyframeEditPrompts`、`registerEditedKeyframe`、`updateEditedKeyframeStatus`、`runSeedancePrompts`、`exportPromptBundle`

## 验收标准

- [x] Preload 层有完整的 `sceneForgeRemix` API 暴露
- [x] Main 进程有对应 handler 注册（返回类型安全 stub 数据）
- [x] `electron-api.ts` 中有完整的类型声明
- [x] 现有 IPC 通道无结构冲突；`tests/sceneforge-ipc-contract.test.ts` 通过

## Code Review 检查项

- [x] IPC 通道使用独立 `sceneForgeRemix` 前缀，不混入现有通道
- [x] Handler stub 返回类型安全的 mock 数据，不是 `undefined` 或 `null`
- [x] 前端 API 声明与后端 handler 签名类型一致
- [x] 未修改现有 `electron/preload.ts` 的非 Remix 部分
- [x] 本轮 stub 不主动抛错；保留现有 IPC invoke / reject 语义，后续业务实现再接统一错误对象

## Test 验证步骤

- [x] `npx tsc --noEmit` 通过
- [x] 新增 `tests/sceneforge-remix-ipc-contract.test.ts`：验证所有 IPC 通道可调用且返回正确 stub 结构
- [x] 现有 `tests/sceneforge-ipc-contract.test.ts` 无回归
- [ ] `npm run test` 全量通过

## 被阻塞于

- Remix Issue #0（需要类型定义）

## 推荐辅助 Skill

- `codebase-design`：IPC 接口设计遵循现有约定

## 相关设计文档

- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-development-plan.md` — API 契约 (§6.2.3)
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-development-plan.md` — IPC 隔离 (§13.3)
