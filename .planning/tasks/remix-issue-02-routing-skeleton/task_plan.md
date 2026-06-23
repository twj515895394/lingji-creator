# Remix Issue #2：前端路由与页面骨架 — 三个 Remix 主界面空壳

## 父问题

SceneForge Remix Mode 开发实施计划 Phase 1

## 要构建什么

创建 Remix Mode 的三个主页面骨架和路由注册。页面内只有布局框架（左侧流程导航 + 主内容区 + Inspector 侧栏），不含真实数据或复杂交互。

端到端行为：
- 新增 `src/sceneforge/remix/pages/RemixAssetLibrary.tsx` — 资产库首页
- 新增 `src/sceneforge/remix/pages/RemixAssetProcessing.tsx` — 资产处理工作台
- 新增 `src/sceneforge/remix/pages/RemixCreationWorkspace.tsx` — 二创创作工作台
- 在现有路由系统中注册四条路由：`/remix/assets`、`/remix/assets/:sourceAssetId/process`、`/remix/assets/:sourceAssetId`、`/remix/projects/:variantId`
- 新增 `src/sceneforge/remix/components/RemixStageNav.tsx` — 左侧流程导航组件（Asset Processing 和 Creation Workspace 各自的 Stage 列表是分离的）
- SceneForge 入口页面新增 "Remix Mode" 入口

> 实现此 Issue 时应使用 `design-taste-frontend` skill 指导 UI 设计品味

## 验收标准

- [x] 从 SceneForge 入口页面可导航至 Remix Asset Library
- [x] Asset Library 布局包含卡片网格区域占位
- [x] Asset Processing 布局包含左侧 6 步流程导航 + 主内容区
- [x] Creation Workspace 布局包含左侧 8 步流程导航 + 主内容区 + Inspector 侧栏
- [x] Asset Processing 不显示二创阶段步骤
- [x] Creation Workspace 不显示导入/切片/原片理解等资产处理步骤
- [x] 路由间导航正常，浏览器后退/前进正常

## Code Review 检查项

- [x] 页面文件位于 `src/sceneforge/remix/` 目录下，不散落到 Lingji-Cut 页面目录
- [x] 复用现有页面切换模式，Remix 业务逻辑保留在 Remix 目录
- [x] 路由注册不影响现有路由
- [x] CSS 使用独立模块或 scoped 方式，不污染全局样式
- [x] 组件有 unique ID 用于测试定位

## Test 验证步骤

- [x] `npx tsc --noEmit` 通过
- [x] 新增 `tests/sceneforge-remix-routing.test.tsx`：验证四条路由可访问、组件正确渲染
- [x] 新增 `tests/sceneforge-remix-stage-nav.test.tsx`：验证两个工作台的 Stage 列表分离
- [x] 现有 `tests/sceneforge-ui.test.tsx` 无回归
- [x] `npm run test` 全量通过
- [ ] 手动验证：启动 dev 服务器，从 SceneForge 入口导航到 Remix 三个页面

## 被阻塞于

- Remix Issue #0（需要路由定义和类型）

## 推荐辅助 Skill

- `design-taste-frontend`：页面布局和导航的设计品味

## 相关设计文档

- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-development-plan.md` — 路由契约 (§6.2.1)、前端隔离 (§13.1)
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-ui-frontend-design-v1.1.md`
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-product-ui-split-revision.md`
