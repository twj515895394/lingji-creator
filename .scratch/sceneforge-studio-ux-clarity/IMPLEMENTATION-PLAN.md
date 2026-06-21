# SceneForge Studio UX Clarity Implementation Plan

> **For agentic workers:** 本包是 UX 澄清，不扩展功能范围。未经用户同意不提交 Git。

**Goal:** 降低维护者把占位、自动运行和 Runner 能力误读为功能问题的概率。

**Architecture:** 优先修改文案、按钮层级和说明，不引入新状态机。

**Tech Stack:** React、TypeScript、现有 SceneForge Studio UI。

---

## Task 1：MVP 占位说明

- [ ] 明确“仅测试流程”语义。
- [ ] 设计入口层级或折叠策略。

## Task 2：Continue 系列文案

- [ ] 区分 Continue 与 Continue & Run。
- [ ] 明确审批成功后是否自动触发下一阶段。

## Task 3：Runner 能力文案审计

- [ ] 核对各阶段下拉展示与能力表一致。
- [ ] 定义不支持时的文案与禁用态。
