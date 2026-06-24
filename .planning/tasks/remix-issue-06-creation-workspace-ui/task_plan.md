# Remix Issue #6：Creation Workspace UI — 二创创作工作台完整 UI

## 父问题

SceneForge Remix Mode 开发实施计划 Phase 1

## 要构建什么

为 Remix Creation Workspace 填充完整 UI，包含 8 步流程的每步内容展示。全部使用 Mock 数据驱动。

端到端行为：
- 完善 `RemixCreationWorkspace.tsx` 中左侧 8 步导航的每步内容
  - 01 选择资产：Source Asset 摘要卡片
  - 02 创建 Variant：Variant 配置面板（referenceStrength + retentionMatrix）
  - 03 改编策略：Remix Strategy 全局 + 逐片段策略预览
  - 04 Remix Design：全局设定 + Segment Override 预览
  - 05 关键帧改图提示词：Keyframe Edit Prompt 列表（可复制）
  - 06 改后关键帧验收：Edited Keyframes Gallery + 状态管理
  - 07 Seedance 2.0 视频提示词：Prompt Preview（结构化 + 可复制 Markdown）
  - 08 发布清单：完成度校验 + 导出按钮
- 新增对应子组件：`VariantConfigPanel.tsx`、`RetentionMatrixEditor.tsx`、`StrategyPreview.tsx`、`DesignPreview.tsx`、`KeyframePromptList.tsx`、`EditedKeyframeGallery.tsx`、`SeedancePromptPreview.tsx`、`PublishChecklist.tsx`
- 右侧 Inspector 侧栏展示选中项的详情

> 实现此 Issue 时应使用 `design-taste-frontend` skill 指导 UI 设计品味

## 验收标准

- [ ] 左侧 8 步流程可切换，每步有对应内容区
- [ ] Variant 配置面板可展示 referenceStrength 选择和 retentionMatrix 九维滑块
- [ ] Keyframe Edit Prompt 列表每项可复制
- [ ] Edited Keyframes Gallery 展示状态标签（pending/generated/approved/rejected）
- [ ] Seedance Prompt Preview 展示结构化字段
- [ ] 发布清单展示每个检查项的完成状态
- [ ] 不显示任何资产处理阶段（导入、切片、关键帧提取等）
- [ ] Inspector 侧栏选中项响应正常

## Code Review 检查项

- [ ] 子组件在 `src/sceneforge/remix/components/` 下
- [ ] 使用 `design-taste-frontend` 风格指导
- [ ] retentionMatrix 九维固定，不开放自定义维度
- [ ] 无资产处理相关 UI 元素泄露到此页面
- [ ] 复制功能使用 Clipboard API 规范方式

## Test 验证步骤

- [ ] `npx tsc --noEmit` 通过
- [ ] 新增 `tests/sceneforge-remix-creation-workspace.test.tsx`：验证 8 步导航切换、内容区渲染、Inspector 响应
- [ ] 新增 `tests/sceneforge-remix-retention-matrix.test.ts`：验证九维矩阵的 UI 逻辑
- [ ] `npm run test` 全量通过
- [ ] 手动验证：启动 dev，在 Creation Workspace 页面操作各步骤

## 被阻塞于

- Remix Issue #2（需要页面骨架和路由）
- Remix Issue #3（需要 Mock 数据）

## 推荐辅助 Skill

- `design-taste-frontend`：创作工作台的复杂 UI 设计

## 相关设计文档

- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-development-plan.md` — Creation Workspace UI (§7.5)
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-ui-frontend-design-v1.1.md`
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-product-design.md` — retentionMatrix 九维定义
