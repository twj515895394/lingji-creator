# SceneForge Regenerate / Request Revision Implementation Plan

> **For agentic workers:** 先定义动作边界和状态机，再落 UI。未经用户同意不提交 Git。

**Goal:** 为草案态重新生成和已提交态修订请求建立受控入口。

**Architecture:** 复用现有 run / submit / validate / approve 流程，不新增旁路写盘。

**Tech Stack:** Electron、React、TypeScript、SceneForge Service、Artifact Store。

---

## Task 1：service seam 定义

- [ ] 定义 regenerate 与 revision 的职责边界。
- [ ] 约束两者如何进入现有 draft / submit 路径。

## Task 2：Studio 动作与文案

- [ ] 设计草案态与已提交态按钮可见性。
- [ ] 说明覆盖、保留和确认提示。

## Task 3：状态保留与回归

- [ ] 明确已提交产物、审批状态和历史可追溯性的保留规则。
- [ ] 给出自动化与人工验收清单。
