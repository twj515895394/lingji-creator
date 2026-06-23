# Remix Issue #3：Mock 数据层 — 按契约构造 Remix 全套测试数据

## 父问题

SceneForge Remix Mode 开发实施计划 Phase 1

## 要构建什么

创建一套严格按 Issue #0 契约构造的 Mock 数据，供前端 UI 开发期间使用。Mock 数据层提供与真实 IPC API 相同签名的函数，可通过开关切换 mock/real。

端到端行为：
- 新增 `src/sceneforge/remix/mock/mock-data.ts` — 全部 Mock 实例数据
- 新增 `src/sceneforge/remix/mock/mock-api.ts` — 模拟全部 Remix API 的 mock 函数
- 新增 `src/sceneforge/remix/services/remix-api-client.ts` — 统一 API 客户端，支持 mock/real 切换
- Mock 数据至少包含：
  - 3 个 SourceAsset（1 个 processing、1 个 published_to_library、1 个 failed）
  - 1 个 RemixVariant
  - 若干 SourceSegment
  - 若干 SourceKeyframe
  - 若干 EditedKeyframe
  - 1 份 SeedancePrompt Preview

## 验收标准

- [x] Mock 数据实例严格符合 Issue #0 定义的 TypeScript 接口
- [x] Mock API 函数签名与 IPC API 一一对应
- [x] API 客户端可通过环境变量或配置切换 mock/real
- [x] 包含至少 3 个 SourceAsset 覆盖不同状态
- [x] Mock 数据足以驱动 Asset Library、Asset Processing、Creation Workspace 三个页面的 UI 展示

## Code Review 检查项

- [x] Mock 数据类型由 `src/sceneforge/remix/types/index.ts` 驱动，不手写重复类型
- [x] Mock 数据集中放在 `mock/` 目录，不混入业务代码
- [x] API 客户端接口清晰，易于后续替换为真实 IPC 调用
- [x] mock/real 切换逻辑集中在 `services/remix-api-client.ts`

## Test 验证步骤

- [x] `npx tsc --noEmit` 通过
- [x] 新增 `tests/sceneforge-remix-mock-data.test.ts`：验证所有 mock 数据实例的类型正确性和状态覆盖完整性
- [x] `npm run test` 全量通过

## 被阻塞于

- Remix Issue #0（需要类型定义）

## 相关设计文档

- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-development-plan.md` — Mock 数据要求 (§7.6)
