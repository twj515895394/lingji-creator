# SceneForge Publish Stage 工作区 Implementation Plan

> **For agentic workers:** 这是后续立项文档，不在本轮实现。未经用户同意不提交 Git。

**Goal:** 明确 publish 阶段的工作区、产物契约和与 export 的边界，为后续实现消除歧义。

**Architecture:** 先定义阶段语义与工作区结构，再决定是否需要独立 Pack 和 Runner。

**Tech Stack:** Markdown、Stage Pack 规范、SceneForge Studio 阶段模型。

---

## Task 1：定义 publish 边界

- [ ] 明确 publish 输入、输出、与 export 的职责边界。
- [ ] 固定不接第三方平台 API。

## Task 2：定义工作区与产物契约

- [ ] 设计工作区展示哪些发布准备信息。
- [ ] 约束首版产物是否结构化、是否需要 Pack。

## Task 3：验收与后续演进

- [ ] 给出自动化与人工验收口径。
- [ ] 列出未来可选演进，但不混入首版范围。
