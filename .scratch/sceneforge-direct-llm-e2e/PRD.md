Status: ready-for-agent

# PRD：SceneForge Direct LLM 真机 E2E 清单

## 问题陈述

Direct LLM 主链已经在工程与维护者口径上跑通，但当前真机验证信息分散在 handoff、分包 issue 和零散口头结论里。维护者想按阶段逐个验证时，缺少一份能直接照着走的 E2E 清单，也缺少统一的失败记录格式，导致每次复测都要重新判断依赖、动作和期望结果。

## 解决方案

建立一个独立的 Direct LLM E2E 文档包，提供：

1. 从 `reference` 到 `video_prompts` 的固定验收顺序。
2. 每一阶段的前置依赖、操作步骤、期望结果和失败记录模板。
3. 与现有 Core / Support / Flow Hardening / Gate HITL 文档的索引关联。
4. 一套“什么时候新建 issue、issue 里应该抄什么”的标准。

## 用户故事

1. 作为维护者，我想按固定顺序验证各阶段 Direct LLM，以便减少漏测。
2. 作为维护者，我想在开始前先检查 AI 设置和项目状态，以便避免把配置错误当成功能缺陷。
3. 作为维护者，我想知道每个阶段依赖哪些已审批产物，以便遇到阻塞时先回到正确上游。
4. 作为维护者，我想在每个阶段都明确执行 Run、审阅、提交、Validate、Continue 的动作，以便保证验收口径一致。
5. 作为维护者，我想记录每阶段实际生成了哪些 artifactKey，以便后续 issue 有可复现材料。
6. 作为维护者，我想在失败时抄下 Alert、Validator 和 Provider 原文，以便代理不需要二次猜测。
7. 作为维护者，我想区分“产品失败”“配置失败”“环境失败”，以便合理分流问题。
8. 作为维护者，我想把 `source_intake` 和 `topic_gate` 作为准备步骤，而不是误纳入 Direct LLM 链，以便清楚边界。
9. 作为后续代理，我想从清单直接找到对应的现有 issue 和设计包，以便继续修复。
10. 作为后续代理，我想要求“单阶段单 issue”，以便避免把多阶段问题混成一团。

## 实现决策

- 本包只产出文档，不新增运行时代码。
- 清单以用户可观察行为为核心，不绑定实现细节。
- 阶段顺序与当前 Stage Context 依赖链一致。
- 失败记录模板固定包含：阶段、Runner、上游状态、Alert 原文、Validator 原文、是否可重试。
- 清单会直接链接现有验收 issue 与阶段包，而不复制其正文。

## 测试决策

- 文档自检以覆盖率为准：每个 Direct LLM 阶段都必须有独立验收段落。
- 验证清单是否明确区分前置条件、动作、期望、失败记录。
- 验证清单是否能指回现有 Core / Support / Flow Hardening 文档。

## 超出范围

- 自动化测试实现。
- 真机执行本身。
- 新增或修复任何运行时代码。
- source_intake / topic_gate 的 HITL 验收细节扩写。

## 进一步说明

- 本 PRD 对应的主要交付是 `.scratch/sceneforge-direct-llm-e2e/CHECKLIST.md`。
- 后续若发现多轮 ACP 或 publish 的真机验收需求，应另立文档包。
