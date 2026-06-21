# SceneForge Draft Refinement Implementation Plan

> **For agentic workers:** 先定义输入契约与阶段策略，再决定 UI 形态。未经用户同意不提交 Git。

**Goal:** 为所有支持草案生成的阶段建立“带一次性补充意见的整阶段草案优化”能力。

**Architecture:** 在现有 `runStage` / draft review / submit 流程上扩展 refinement 输入与阶段固定落盘策略，不新增第二条写盘通道。

**Tech Stack:** Electron、React、TypeScript、SceneForge Service、Stage Runner、Stage Definitions。

---

## Task 1：Refinement 输入契约

- [ ] 定义“当前草案 + 一次性补充意见 + 当前阶段上下文”的 runner 输入结构。
- [ ] 约束补充意见只作用于一次运行，不写入项目状态。
- [ ] 明确 refinement 与普通 run / regenerate 的参数边界。

## Task 2：阶段级提交策略

- [ ] 在阶段定义或等价真相源中定义“必须人工提交 / 可自动落盘”的固定策略。
- [ ] 明确 core/support 各阶段的默认策略与原因。
- [ ] 约束策略不允许被项目级或运行时覆盖。

## Task 3：Studio 交互

- [ ] 设计“补充优化”入口、输入框、确认动作与结果展示。
- [ ] 说明它与 Run / 重新生成草案 / 请求修订的按钮关系。
- [ ] 说明自动落盘阶段与手动提交阶段在 UI 上的差异。

## Task 4：验收与回归

- [ ] 至少覆盖一个 runner 契约测试。
- [ ] 至少覆盖一个阶段策略测试。
- [ ] 至少覆盖一个 UI 渲染测试和一个真机验收清单项。
