Status: ready-for-agent

# 各功能子面板头部去重与回归集成测试验证

Type: AFK

## 父问题

`.scratch/sceneforge-remix-layout-split/PRD.md`

## 要构建什么

对下半部分渲染的各步骤子面板进行“头部去重”，防止头部标题和说明与上部右侧重复渲染，并运行项目集成测试和 TS 类型检查，验证最终成效。

端到端行为：
- 子面板代码块（`stepPanels['source-import' | 'segmentation' | 'keyframes' | 'understanding' | 'annotate' | 'publish-source']`）中的 `<div className={panelStyles.panelHeaderRow}>` 及内部标题/描述全部剔除。
- 确保面板内部的实质功能控件直接顶头渲染，节省垂直首屏高度。
- 运行测试套件，检查 UI 重组是否对主渲染生命周期产生影响。

## 实施约束

- 必须且仅修改 [RemixAssetProcessing.tsx](file:///Users/tangwujun/Documents/trae_projects/lingji-creator/src/sceneforge/remix/pages/RemixAssetProcessing.tsx) 的子面板字典渲染块。
- 不得误删面板内部实质性的状态或操作控件（例如“运行切片”按钮、“一键提取关键帧”等核心功能组件）。

## 验收标准

- [ ] 下半部分各个阶段的子面板顶头不重复渲染标题，排版紧凑
- [ ] 运行 `npx tsc --noEmit` 没有任何编译期类型错误
- [ ] 运行 `recent-projects.test.ts`、`sceneforge-remix-understanding.test.ts` 及 `sceneforge-remix-whisper-provider.test.ts` 测试全部绿灯通过

## 被阻塞于

- `.scratch/sceneforge-remix-layout-split/issues/03-remix-asset-processing-layout-integration.md`
