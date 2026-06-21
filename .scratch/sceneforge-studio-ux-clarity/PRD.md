Status: ready-for-agent

# PRD：SceneForge Studio UX Clarity

## 问题陈述

虽然 SceneForge 的 Direct LLM 主链已经跑通，但 Studio 里仍有若干体验债会误导维护者：Core MVP 占位与真实 LLM 并存、Continue 与 Continue & Run 容易被理解成同一件事、Runner 下拉在个别阶段的能力表达也不够直观。没有这些文案和入口澄清，后续真机验收容易把“产品表达不清”误判成“功能失效”。

## 解决方案

建立一个独立的 UX clarity 包，统一补齐：

1. Core MVP 占位入口的说明与弱化策略。
2. Continue / Continue & Run 的差异文案。
3. Runner 能力下拉与阶段支持说明的统一口径。

## 用户故事

1. 作为创作者，我想清楚知道当前点的是“真实生成”还是“占位流程”，以便理解结果含义。
2. 作为创作者，我想区分 Continue 与 Continue & Run，以便知道是否会自动触发下一阶段。
3. 作为创作者，我想在不支持某 Runner 的阶段看到准确说明，以便不误会是系统故障。
4. 作为维护者，我想让能力表、文案和下拉选项一致，以便减少验证噪音。

## 实现决策

- 文案以能力表和状态机为真相源。
- MVP 占位保留，但降为次级入口或明确标示“仅测试流程”。
- Continue 与 Continue & Run 明确区分审批动作与审批后自动触发动作。

## 测试决策

- UI 测试验证关键文案与可见性。
- 真机验收观察用户是否仍会把占位当成真实生成。

## 超出范围

- 视觉重设计。
- 大规模组件拆分。
- 新增复杂引导流程。

## 进一步说明

- 历史来源：`.scratch/sceneforge-next-batch/issues/10-ui-debt-backlog.md`
