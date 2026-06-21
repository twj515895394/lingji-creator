# SceneForge Direct LLM E2E 清单 Implementation Plan

> **For agentic workers:** 本包是文档交付，不修改运行时代码。未经用户同意不提交 Git。

**Goal:** 产出一份可直接执行的 Direct LLM 真机验收清单，并把它与现有阶段包、issue 和 handoff 关联起来。

**Architecture:** 使用单一 `CHECKLIST.md` 作为操作主文档，issues 负责描述结构、覆盖和回归记录规范。

**Tech Stack:** Markdown、现有 `.scratch` issue tracker、SceneForge 文档索引。

---

## 文件结构

- Create: `.scratch/sceneforge-direct-llm-e2e/CHECKLIST.md`
- Create: `.scratch/sceneforge-direct-llm-e2e/issues/01-checklist-structure.md`
- Create: `.scratch/sceneforge-direct-llm-e2e/issues/02-stage-by-stage-coverage.md`
- Create: `.scratch/sceneforge-direct-llm-e2e/issues/03-regression-log-and-handoff-rules.md`

## Task 1：建立清单骨架

- [ ] 定义全局准备、阶段验收、失败记录、回归结论四个大段。
- [ ] 固定每阶段的四段结构：前置依赖、动作、期望结果、失败记录。

## Task 2：补齐九个 Direct LLM 阶段

- [ ] 为 `reference` 到 `video_prompts` 逐个写明依赖与通过标准。
- [ ] 对 Core / Support 阶段分别关联现有包与验收 issue。
- [ ] 标明 `source_intake`、`topic_gate` 仅作准备步骤。

## Task 3：失败记录与 issue 规则

- [ ] 给出单阶段单 issue 的判断标准。
- [ ] 固定要求抄录 Alert、Validator、Provider 文案。
- [ ] 说明如何在 handoff 中沉淀真机结果。
