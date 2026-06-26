Status: ready-for-agent

# 处理页 Hero 压缩与三栏防溢出

Type: AFK

## 父问题

`.scratch/sceneforge-remix-ui-recovery/PRD.md`

## 要构建什么

重做处理页顶部 Hero 与三栏骨架，让长文件名、路径、元数据不再撑爆界面，并让中间主工作区重新成为视觉主角。

端到端行为：

- 顶部改为轻量 meta 行，而不是四张窄信息卡。
- 三栏宽度、`min-width: 0`、overflow 策略统一生效。
- 中间预览与结果区获得更高的空间优先级。

## 实施约束

- 实现必须遵循 `docs/sceneforge2.0/technical-solutions/03-remix-ui-workbench-layout-and-visual-system.md`。
- 必须优先修结构与 overflow，不要先做装饰性美化。
- 改动要兼顾桌面常见宽度，避免只在单一截图尺寸下成立。

## 验收标准

- [ ] 长文件名和长路径不会再导致 Hero 重叠、挤压或不可读
- [ ] 顶部改成轻量 meta 展示，不再保留四张窄 meta card
- [ ] 三栏布局稳定，中间主工作区权重明显提升
- [ ] 任何主面板不出现横向滚动

## Review Checklist

- [ ] `min-width: 0`、`overflow-x: hidden` 等基础规则落在共享容器，而不是零散补丁
- [ ] Hero 内容优先级符合 03 方案，不再次塞回完整路径
- [ ] 结构层改动没有破坏现有处理中交互

## 测试与验证

- [ ] `npx tsc --noEmit`
- [ ] 更新处理页 / layout 相关测试
- [ ] 手动验收：长文件名、长路径、长标题场景下仍可读

## 涉及范围

- `src/sceneforge/remix/pages/RemixAssetProcessing.tsx`
- `src/sceneforge/remix/pages/RemixWorkspaceShell.module.css`
- `src/sceneforge/remix/components/RemixWorkspacePanels.module.css`

## 被阻塞于

- 无 - 可以立即开始
