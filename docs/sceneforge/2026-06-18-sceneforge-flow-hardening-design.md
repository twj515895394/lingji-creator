# SceneForge Flow Hardening — 详细设计

> 日期：2026-06-18  
> 状态：已定稿  
> PRD：`.scratch/sceneforge-flow-hardening/PRD.md`  
> 前置：Flow Hardening 问题分析、Support Pack Wave、Runner 与执行面设计

## 1. 目标

把“已经能跑”的 SceneForge 支撑阶段收紧为“缺依赖不能跑、语义不合格不能过、ACP 与 Direct LLM 共用统一出口”的稳定路径，减少维护者在真机验收时遇到的假阳性和无效运行。

## 2. 范围

本包只覆盖三类硬化：

1. required context 阻塞与错误提示。
2. script / performance / audio / assets 的语义校验补强。
3. `acp_agent` 最小单轮路径与 Studio 文案对齐。

不覆盖 publish、多轮 ACP、全链自动运行。

## 3. 约束与边界

- 继续遵守 `runStage → draft → submitStageDraft → validate → approve` 统一出口。
- required context 的真相源仍是阶段定义与 context builder，不在 UI 侧重复维护第二份依赖表。
- 语义 validator 只负责判定“是否可继续进入下游”，不自动改写正文。
- ACP 首版仍是单轮、草案式返回；不引入聊天式回合控制。

## 4. required context 阻塞

### 4.1 阻塞位置

- `StageRunPanel`：在用户点击 Run 之前就展示缺失项和阻塞原因。
- `SceneForgeService.runStage`：即使 UI 漏判，也在服务层二次拦截。
- Continue & Run：审批成功后若下一阶段 required context 不满足，不自动调用 Runner。

### 4.2 用户反馈

- 明确列出缺失 artifactKey 与所属上游阶段。
- 当缺失来自未审批产物时，提示维护者先完成 submit / validate / approve，而不是笼统显示“上下文不足”。
- 若阶段根本不支持某 Runner，则显示“不支持该执行方式”，而不是混淆成依赖缺失。

## 5. 语义校验补强

### 5.1 script

- 至少具备分段或结构化场景表达，不能只是单句占位。
- 缺少基本段落结构时，Validator 返回中文失败原因。

### 5.2 performance

- 必须能追溯到 script 或 design 的角色/动作语义。
- 完全脱节或只有空泛措辞时失败或给出强警告，默认首版按失败处理。

### 5.3 audio

- 至少覆盖声音来源、氛围或节奏中的两个维度。
- 不能只有“后续补充”式空壳内容。

### 5.4 assets

- 产物应能分辨角色、场景、道具或视觉资产需求。
- 若完全缺少可执行资产规划，阻止下游设计阶段继续消费。

## 6. ACP 最小单轮路径

### 6.1 能力目标

- `acp_agent` 在 support / core 阶段的可用性与能力表一致。
- factory 接入 `scene-acp-agent-runner` 后，Studio 和测试使用同一条 Runner 分发逻辑。
- Runner 只返回草案或提交结果状态，不直接写项目状态。

### 6.2 Studio 文案

- 未配置 ACP 时，明确提示当前仅可使用 Direct LLM / 手动提交。
- 已配置但阶段仍为简报占位时，明确标明“实验性”或“最小实现”。
- MCP / App 内 ACP 的差异使用统一术语，不让用户误解为已支持多轮 Agent。

## 7. 验收门

| 方向 | 自动化 | 人工 |
| --- | --- | --- |
| required context 阻塞 | 缺依赖时 run 被拒绝 | 真机观察禁用态与提示文案 |
| 语义校验 | 正常 / 边界 / 失败用例 | 提交后看到中文错误摘要 |
| ACP 单轮 | mock happy path | 至少验证一次可见性与错误提示 |

## 8. 风险

- 语义校验过严会影响已有人工占位流，因此首版仅强化最关键的空壳与脱节场景。
- Continue & Run 的阻塞补强若写成第三套判定逻辑，会与 `StageRunPanel` 漂移，因此必须复用已有 seam。
- ACP 文案如果不明确，用户会把单轮草案生成误解成完整 Agent 工作流。
