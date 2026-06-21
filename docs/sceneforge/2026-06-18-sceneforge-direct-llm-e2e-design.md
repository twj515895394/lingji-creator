# SceneForge Direct LLM E2E 清单 — 详细设计

> 日期：2026-06-18  
> 状态：已定稿  
> PRD：`.scratch/sceneforge-direct-llm-e2e/PRD.md`  
> 前置：Core LLM Happy Path、Support Pack Wave、Flow Hardening

## 1. 目标

为维护者提供一份按阶段执行的真机验收清单，覆盖从 `reference` 到 `video_prompts` 的 Direct LLM 运行、草案审阅、提交、校验、审批与 Continue 行为，并把失败信息沉淀成后续 issue 的最小复现材料。

## 2. 设计原则

- 只记录用户可观察行为，不把内部实现细节写成验收项。
- 清单与阶段依赖顺序对齐，维护者按顺序走，不靠记忆拼接。
- 每一阶段同时记录“前置条件、运行动作、通过标准、失败时要抄的内容”。
- 清单是文档资产，不替代自动化测试。

## 3. 清单结构

### 3.1 全局检查

- AI 设置
- 项目类型
- 上游审批状态
- 风格资产选择状态
- 当前 Runner 可用性

### 3.2 阶段检查

每个阶段固定四段：

1. 前置依赖
2. 执行动作
3. 期望结果
4. 失败记录模板

### 3.3 回归记录

- 成功阶段列表
- 失败阶段列表
- Alert / Validator / Provider 错误原文
- 是否需要新 issue

## 4. 阶段范围

验收顺序固定为：

`reference → story → assets → design → script → performance → storyboard → audio → video_prompts`

`source_intake`、`topic_gate` 属于 HITL 前置，不进入 Direct LLM 主链验收，但要列为准备步骤。

## 5. 与 issue 的关系

- 清单本身是独立文档包。
- 真机执行中发现的问题，按“单阶段单 issue”回写，不在清单内混入实现方案。
- 清单要直接引用现有 Core / Support / Flow Hardening 验收 issue，避免产生第二套验收真相。

## 6. 风险

- 若清单过于依赖当前文案，UI 微调后容易过时，因此应以行为和结果为中心。
- 若把多阶段失败合并成一个问题，后续代理难以定位，因此清单中必须要求按阶段拆分记录。
