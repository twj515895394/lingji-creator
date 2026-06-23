# Remix Issue #4：Asset Library UI — 资产卡片网格、筛选与入口

## 父问题

SceneForge Remix Mode 开发实施计划 Phase 1

## 要构建什么

为 Remix Asset Library 页面填充完整 UI：资产卡片网格展示、状态筛选、标签筛选、导入新原片入口、继续处理入口、创建二创 Variant 入口、资产详情侧栏。全部使用 Mock 数据驱动。

端到端行为：
- 新增 `src/sceneforge/remix/components/AssetCard.tsx` — 单个资产卡片（缩略图、标题、状态标签、时长、标签）
- 新增 `src/sceneforge/remix/components/AssetGrid.tsx` — 卡片网格布局
- 新增 `src/sceneforge/remix/components/AssetFilterBar.tsx` — 状态筛选 + 标签筛选
- 新增 `src/sceneforge/remix/components/AssetDetailSidebar.tsx` — 选中资产的详情侧栏
- 在 `RemixAssetLibrary.tsx` 中组装上述组件
- 导航操作：点击卡片 → 资产详情侧栏；"继续处理" → 跳转 Asset Processing；"创建二创" → 创建 Variant 并跳转 Creation Workspace；"导入原片" → 触发导入流程

> 实现此 Issue 时应使用 `design-taste-frontend` skill 指导 UI 设计品味

## 验收标准

- [x] Asset Library 展示 3+ 张资产卡片，状态标签颜色区分
- [x] 可按状态筛选资产列表
- [x] 点击卡片弹出详情侧栏
- [x] "导入原片" 入口可见
- [x] `published_to_library` 状态资产显示 "创建二创" 按钮
- [x] `processing` 状态资产显示 "继续处理" 按钮
- [x] 未入库资产（非 `published_to_library`）不显示 "创建二创" 按钮

## Code Review 检查项

- [x] 组件在 `src/sceneforge/remix/components/` 下，不散落
- [x] 使用 `design-taste-frontend` 风格指导，UI 不简陋
- [x] 状态判断封装在 Remix 组件内，测试围绕固定状态契约校验
- [x] 卡片和网格具有 unique test ID

## Test 验证步骤

- [x] `npx tsc --noEmit` 通过
- [x] 新增 `tests/sceneforge-remix-asset-library.test.tsx`：验证卡片渲染、筛选逻辑、按钮可见性
- [x] `npm run test` 全量通过
- [ ] 手动验证：启动 dev，在 Asset Library 页面操作筛选、点击卡片、查看侧栏

## 被阻塞于

- Remix Issue #2（需要页面骨架和路由）
- Remix Issue #3（需要 Mock 数据）

## 推荐辅助 Skill

- `design-taste-frontend`：卡片、网格、筛选的视觉设计

## 相关设计文档

- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-development-plan.md` — Asset Library UI (§7.3)
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-ui-frontend-design-v1.1.md`
