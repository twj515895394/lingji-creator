# SceneForge ACP Studio Alignment Implementation Plan

> **For agentic workers:** 先打通分发，再补 UI 文案。未经用户同意不提交 Git。

**Goal:** 让 ACP 在 SceneForge 中成为“已定义、可验证、可解释”的最小路径，而不是半隐藏实验能力。

**Architecture:** 以 runner factory 为入口，以能力表为真相源，以 Studio 文案为用户可见层。

**Tech Stack:** Electron、TypeScript、React、ACP Runner、Vitest。

---

## Task 1：factory / service 对齐

- [ ] 连接 ACP runner 到统一分发路径。
- [ ] 覆盖支持 / 不支持 / 未配置三类分支。

## Task 2：Studio 文案与可见性

- [ ] 定义什么时候显示 ACP、什么时候禁用。
- [ ] 明确单轮实验性语义。

## Task 3：验收与回归

- [ ] 补 mock happy path。
- [ ] 给出人工观察项与记录模板。
