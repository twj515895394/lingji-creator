# SceneForge Style Selector 与 selectedAssetIds Implementation Plan

> **For agentic workers:** 本包只定义后续实施计划，不在当前任务中修改代码。未经用户同意不提交 Git。

**Goal:** 补齐 Studio 中的 style / asset 选择、保存、回显与上下文消费路径。

**Architecture:** 以项目级状态为主轴，复用 asset registry 与 context builder，不引入新的资产源或运行参数格式。

**Tech Stack:** Electron、React、TypeScript、Scene Asset Registry、Stage Context。

---

## Task 1：项目级状态模型

- [ ] 明确 style profile 与 `selectedAssetIds` 的持久化字段。
- [ ] 约束旧项目默认值与迁移行为。

## Task 2：Studio 选择器与回显

- [ ] 设计列表、选择、清空和重新打开后的回显行为。
- [ ] 约束只显示 registry 允许项，排除 `source-materials`。

## Task 3：service / context 透传

- [ ] 定义从项目状态到 `getStageContext` 的透传 seam。
- [ ] 规定哪些阶段消费这些选择，哪些阶段忽略。

## Task 4：验收与回归

- [ ] 至少覆盖一个自动化状态测试、一个 context 测试、一个 UI 测试和一个真机观察项。
