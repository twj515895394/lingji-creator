Status: ready-for-agent

# CSS 布局重构与 4:6 分割容器编写

Type: AFK

## 父问题

`.scratch/sceneforge-remix-layout-split/PRD.md`

## 要构建什么

在素材处理的样式模块中添加实现 4:6 上下视口拆分布局所需的 Flex 与 Grid 布局样式类，确保中间主工作栏溢出被清除，并支持下半部分独立垂直滚动。

端到端行为：
- 中间主工作区高度被约束，外部滚动条隐形，隐藏在单个容器中。
- 上半部分支持 55:45 的 Grid 双栏拆分，在 1280px 到 4K 的屏幕分辨率下，高度自适应在 260px - 380px 之间。
- 下半部分拥有独立滚动条（使用纤细隐藏的 Webkit 滚动条样式类），支持 Timeline 和切片列表的纵向无限滚动。

## 实施约束

- 必须在 [RemixWorkspacePanels.module.css](file:///Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/components/RemixWorkspacePanels.module.css) 中实现。
- 严禁引入任何全局 CSS 类破坏页面其它模块的渲染样式。
- 滚动条应采用半透明暗色风格，保证在深色 cockpit-like 界面下的低调与高对比度合规（WCAG AA）。

## 验收标准

- [ ] 新增 `.workbenchLayout` 等样式类且不产生编译警告
- [ ] 上下视口高度占比呈现 4:6 的垂直分割
- [ ] 下半部分内容溢出时拥有独立半透明滚动条，不引起整页重绘或抖动

## 被阻塞于

- 无 - 可以立即开始
