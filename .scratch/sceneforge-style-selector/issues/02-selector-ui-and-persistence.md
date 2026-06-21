Status: completed-local

## 父问题

`.scratch/sceneforge-style-selector/PRD.md`

## 要构建什么

在 Studio 中补齐 style / asset 选择器、保存、清空和回显行为。

## 验收标准

- [ ] 可见可用的 style 列表
- [ ] 可附加 selected asset ids
- [ ] 保存后重新打开仍可回显
- [ ] `source-materials` 不出现在 UI 中

## 类型

AFK

## 评论

- 2026-06-18：已新增 `src/sceneforge/components/studio/SceneStyleSelectorPanel.tsx`，在 Studio 工作区中提供 style profile 单选和 methodology 资产多选。
- 2026-06-18：UI 通过 `sceneforge:list-assets` 仅读 registry 资产源，因此不会把 `source-materials` 暴露到选择器。
- 2026-06-18：保存走 `sceneforge:update-style-selection` 专用 IPC，结果直接回写 `SceneForgeStudio` 的 `projectState`。
- 2026-06-18：自动化验证覆盖 IPC 合约与 Studio 渲染：`tests/sceneforge-ipc-contract.test.ts`、`tests/sceneforge-ui.test.tsx`。
