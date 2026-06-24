# Remix Issue #8：资产入库前端接入 — Mock 切换为真实数据

## 父问题

SceneForge Remix Mode 开发实施计划 Phase 2

## 要构建什么

将 Asset Library 和 Asset Processing Workspace 从 Mock 数据切换到真实后端 API，形成第一个端到端闭环。

端到端行为：
- 更新 `remix-api-client.ts`：资产库相关 API 调用真实 IPC
- 更新 `RemixAssetLibrary.tsx`：从真实 API 获取 Source Asset 列表
- 更新 `RemixAssetProcessing.tsx`：每步操作调用真实后端 service
  - 导入 → `createSourceAssetFromImport`
  - 切片 → `runSourceSegmentation`
  - 关键帧 → `runSourceKeyframes`
  - 原片理解 → `runSourceUnderstanding`
  - 入库 → `publishSourceAssetToLibrary`
- 添加操作进度状态（loading/success/error）
- 添加错误提示和重试

## 验收标准

- [ ] 可以导入一个本地视频并创建 Source Asset
- [ ] 可以运行切片并看到 Segment 列表更新
- [ ] 可以运行关键帧提取并看到 Keyframe Gallery 更新
- [ ] 可以运行原片理解并看到 Overview/Analysis 内容
- [ ] 可以保存入库，Asset Library 中出现 `published_to_library` 状态资产
- [ ] 操作过程中有 loading 状态提示
- [ ] 失败时有错误提示和重试入口

## Code Review 检查项

- [ ] Mock/Real 切换干净，无遗留 mock 硬编码
- [ ] 错误处理覆盖网络错误、后端错误、用户取消
- [ ] Loading 状态 UI 不阻塞其他操作
- [ ] 不在 Renderer 中直接读写文件系统

## Test 验证步骤

- [ ] `npx tsc --noEmit` 通过
- [ ] 更新 `tests/sceneforge-remix-asset-library.test.tsx`：增加真实 API 调用场景
- [ ] 更新 `tests/sceneforge-remix-asset-processing.test.tsx`：增加 loading/error 状态测试
- [ ] `npm run test` 全量通过
- [ ] 手动端到端验证：导入视频 → 切片 → 关键帧 → 理解 → 入库 → 在 Library 中看到

## 被阻塞于

- Remix Issue #4（需要 Asset Library UI）
- Remix Issue #5（需要 Asset Processing UI）
- Remix Issue #7（需要后端服务）

## 相关设计文档

- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-development-plan.md` — Phase 2 验收 (§8.5)
