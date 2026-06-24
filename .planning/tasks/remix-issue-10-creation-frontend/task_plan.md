# Remix Issue #10：二创创作前端接入 — Creation Workspace 切换真实数据

## 父问题

SceneForge Remix Mode 开发实施计划 Phase 3

## 要构建什么

将 Creation Workspace 从 Mock 数据切换到真实后端 API，形成二创创作端到端闭环。

端到端行为：
- 更新 `src/sceneforge/remix/services/remix-api-client.ts`：将二创创作相关的 API 调用从 Mock 切换为真实 IPC
- 更新 `src/sceneforge/remix/pages/RemixCreationWorkspace.tsx`：
  - 01 选择资产：展示真实 Source Asset 数据，支持点击加载
  - 02 创建 Variant：调用 `createVariantFromSourceAsset`，提交配置并缓存 variantId
  - 03 改编策略：调用 `runRemixStrategy`，展示生成的全局与分段改编策略
  - 04 Remix Design：调用 `runRemixDesign`，展示全局设定与分段 override 详情
  - 05 关键帧改图提示词：调用 `runKeyframeEditPrompts`，渲染带复制按钮的提示词列表
- 为各异步执行步骤添加 Loading 状态、局部骨架屏和全局 Toast 错误提示
- 接入剪贴板（Clipboard API）实现提示词的一键复制

## 验收标准

- [ ] 可从 Asset Library 选择已入库的真实资产并创建 Variant
- [ ] 可配置 referenceStrength 与 retentionMatrix，提交至后端并保存成功
- [ ] 可在改编策略步骤启动后端推理，并在 UI 中查看完整的全局与逐片段策略
- [ ] 可运行 Design 并正确获取、展示全局设定与 segment override 结构
- [ ] 可运行 Keyframe Prompts 并展示每个关键帧的改图提示词，支持一键复制
- [ ] 所有异步操作包含明确的 Loading 态与 Error 异常展示

## Code Review 检查项

- [ ] Mock/Real 切换通过统一的 API Client 或配置开关进行控制，不在组件内留下 mock 硬编码
- [ ] 二创流程的所有 API 操作均只读取或操作 Variant 域，绝不修改 Source Asset 的原始信息
- [ ] 复制功能统一采用 `navigator.clipboard.writeText()` 并有成功或失败的反馈提示
- [ ] 页面和组件的状态保存遵循 Snapshot 结构，确保刷新或切换步骤后数据不丢失

## Test 验证步骤

- [ ] `npx tsc --noEmit` 通过
- [ ] 更新 `tests/sceneforge-remix-creation-workspace.test.tsx`：增加真实 API 调用的 mock 触发和状态处理测试
- [ ] `npm run test` 全量通过
- [ ] 手动验证：启动前端 dev 与 Electron 主进程，从原片选择开始，一步步完成到关键帧提示词生成，确保流程流畅无报错，侧栏 Inspector 正确响应

## 被阻塞于

- Remix Issue #6（需要 Creation Workspace UI 结构）
- Remix Issue #9（需要后端二创服务）

## 推荐辅助 Skill

- — （主要为数据绑定与前端流程硬化）

## 相关设计文档

- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-development-plan.md` — Phase 3 (§10)
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-frontend-ui-design.md` — §6, §10
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-product-design.md` — Creation Workspace
