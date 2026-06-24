# Remix Issue #5：Asset Processing UI — 资产处理工作台完整 UI

## 父问题

SceneForge Remix Mode 开发实施计划 Phase 1

## 要构建什么

为 Source Asset Processing Workspace 填充完整 UI，包含 6 步流程的每步内容展示。全部使用 Mock 数据驱动。

端到端行为：
- 完善 `RemixAssetProcessing.tsx` 中左侧 6 步导航的每步内容
  - 01 导入原片：视频文件选择 / 导入进度
  - 02 真实镜头切片：切片轨道可视化 + Segment Table
  - 03 关键帧提取：Keyframe Gallery（first/last/middle）
  - 04 原片理解：Source Overview + Segment Analysis Markdown 预览
  - 05 人工标注：标签编辑、备注
  - 06 保存入库：确认并发布到 Asset Library
- 新增对应子组件：`SegmentTimeline.tsx`、`SegmentTable.tsx`、`KeyframeGallery.tsx`、`SourceOverviewPanel.tsx`、`AnnotationEditor.tsx`、`PublishToLibraryButton.tsx`
- 主内容区包含 Source Asset 视频预览占位

> 实现此 Issue 时应使用 `design-taste-frontend` skill 指导 UI 设计品味

## 验收标准

- [ ] 左侧 6 步流程可切换，每步有对应内容区
- [ ] 切片步骤展示 Segment 列表（表格形式，含时间范围、时长、状态）
- [ ] 关键帧步骤展示 Keyframe 缩略图网格
- [ ] 原片理解步骤展示 Markdown 格式的分析结果
- [ ] "保存入库" 按钮在所有前置步骤完成后才可用
- [ ] 不显示任何二创阶段（Variant、Strategy、Design 等）

## Code Review 检查项

- [ ] 子组件在 `src/sceneforge/remix/components/` 下
- [ ] 使用 `design-taste-frontend` 风格指导
- [ ] 流程步骤可用性判断基于 Stage 状态枚举
- [ ] 无二创相关 UI 元素泄露到此页面

## Test 验证步骤

- [ ] `npx tsc --noEmit` 通过
- [ ] 新增 `tests/sceneforge-remix-asset-processing.test.tsx`：验证 6 步导航切换、内容区渲染、按钮可用性
- [ ] `npm run test` 全量通过
- [ ] 手动验证：启动 dev，在 Asset Processing 页面操作各步骤

## 被阻塞于

- Remix Issue #2（需要页面骨架和路由）
- Remix Issue #3（需要 Mock 数据）

## 推荐辅助 Skill

- `design-taste-frontend`：流程式工作台的视觉设计

## 相关设计文档

- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-development-plan.md` — Asset Processing UI (§7.4)
- `docs/sceneforge2.0/2026-06-22-sceneforge-remix-mode-ui-frontend-design-v1.1.md`
