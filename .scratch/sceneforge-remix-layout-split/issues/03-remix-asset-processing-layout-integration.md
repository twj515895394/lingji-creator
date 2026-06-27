Status: ready-for-agent

# 工作台主页面结构重组与置顶信息栏集成

Type: AFK

## 父问题

`.scratch/sceneforge-remix-layout-split/PRD.md`

## 要构建什么

在工作台主页面中应用全新的 4:6 上下拆发布局。上半部分融合精简播放器、当前阶段的标题及说明文案，以及当前选中的片段文字与台词信息。下半部分放置独立滚动的面板容器。

端到端行为：
- 主 `return` 重构为双层包裹结构，分别对接上半部（`.upperStickySection`）与下半部（`.lowerScrollableSection`）。
- 提取 6 个阶段的说明性文本，在置顶右侧进行集中展示，并把 `currentTaskMessage` 渲染为 `stageTaskMessage` 统一提示。
- 将原来在 `SourceVideoPreview` 中渲染的“当前片段信息卡片”提取出来，在置顶右侧作为独立小区域展示（包含台词、起止时间等）。
- 下半部分容器用来渲染 `stepPanels` 阶段组件，隐藏外部滚动流。

## 实施约束

- 必须且仅在 [RemixAssetProcessing.tsx](file:///Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixAssetProcessing.tsx) 的主体 `return` 及文案抽取中实现。
- 绝不改动或重命名任何已有的 `useState` 状态或后台任务（如 ASR、Understanding）的 IPC 触发和轮询机制。

## 验收标准

- [ ] 视频播放器左置顶，步骤标题/描述与当前选中片段台词右置顶，排列对称工整
- [ ] 滚动下部区域时，上部的播放器和文本卡片固定不动，不会滚出视口
- [ ] 选中不同片段时，上部右侧的片段台词和起止时间实时联动更新

## 被阻塞于

- `.scratch/sceneforge-remix-layout-split/issues/01-css-layout-split.md`
- `.scratch/sceneforge-remix-layout-split/issues/02-source-video-preview-compact-variant.md`
