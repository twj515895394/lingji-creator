Status: ready-for-agent

# PRD：SceneForge Continue & Run

## 问题陈述

当前 Continue 会完成必要审批并切换到下一阶段，但不会运行下一阶段。这个语义安全且明确，却让真实 LLM 流水线需要用户在每个阶段重复“Continue → 选择 Direct LLM → 运行”。如果直接把 Continue 改成自动运行，又会带来不可预期的 API 消耗、错误恢复和审批语义变化。

## 解决方案

保留现有 Continue，不改变默认行为；在满足条件时增加一个显式的“Continue & Run”动作：

1. 先执行与 Continue 完全相同的校验、审批和阶段切换。
2. 切换成功后，使用用户明确选择的 Runner 运行下一阶段。
3. 自动运行只生成草案，不自动提交、校验或审批。
4. 下一阶段不可运行、LLM 未配置或运行失败时，已完成的审批不回滚，用户可在下一阶段手动重试。

## 用户故事

1. 作为创作者，我想继续保留普通 Continue，以便只切换阶段而不产生模型调用。
2. 作为创作者，我想显式选择“继续并运行下一阶段”，以便减少重复操作。
3. 作为创作者，我想在点击前看到将运行的下一阶段和 Runner，以便知道会发生什么。
4. 作为创作者，我想只在下一阶段支持运行时看到该动作，以免点击无效按钮。
5. 作为创作者，我想在 LLM 未配置时继续使用普通 Continue，以便不被自动化能力阻塞。
6. 作为创作者，我想在自动运行失败后停留在下一阶段，以便查看错误并重试。
7. 作为创作者，我想让自动运行结果仍需手动提交，以便保留 HITL 审阅。
8. 作为创作者，我想避免一次 Continue 自动跑完整条流水线，以便控制成本和质量。
9. 作为维护者，我想复用单阶段 `sceneRunStage`，而不是新增第二套 Runner 编排。
10. 作为维护者，我想让审批成功与运行失败分开记录，以便状态机保持真实。
11. 作为测试者，我想验证审批失败时绝不调用下一阶段 Runner。
12. 作为测试者，我想验证审批成功后恰好运行一次正确的下一阶段。

## 实现决策

- 新能力命名为 Continue & Run，不重定义 Continue。
- 首版不在 project.json 持久化自动运行开关。
- 用户每次显式点击 Continue & Run，避免隐藏 API 消耗。
- 自动运行只对 `getNextPipelineStage` 返回且支持所选 Runner 的阶段显示。
- 首版默认建议 `direct_llm`，但不强制；Runner 选择沿用阶段执行面。
- 调用顺序固定为 approve/continue → refresh/switch → run next。
- 运行失败不回滚前一阶段审批。
- 运行结果进入下一阶段的待提交草案区。
- export、publish 或无下一阶段时不显示 Continue & Run。
- 不实现递归自动推进。

## 测试决策

- 把“审批并决定下一动作”提取为可测试编排函数或 hook。
- 测试审批失败、无下一阶段、不支持 Runner、运行成功、运行失败五类外部行为。
- UI 测试验证普通 Continue 始终保留，自动动作仅在满足条件时出现。
- Electron 人工验收至少覆盖一个 Core → Support 和一个 Support → Core 边界。

## 超出范围

- 全局或项目级自动运行开关。
- 一键全链和后台无人值守执行。
- 自动提交、自动校验、自动审批生成草案。
- Provider 成本预算和并发队列。
- ACP Agent 自动接续。

## 进一步说明

- 架构决策见 `docs/adr/0003-sceneforge-continue-and-run.md`。
- 详细设计见 `docs/sceneforge/2026-06-18-sceneforge-continue-and-run-design.md`。
- 实施计划见本目录 `IMPLEMENTATION-PLAN.md`。

