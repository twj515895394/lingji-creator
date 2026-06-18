Status: ready-for-agent

# PRD：SceneForge Gate / Intake 卡片式 HITL

## 问题陈述

source_intake 和 topic_gate 已经能通过 Markdown 表单、改编方向单选和风格确认完成最小 HITL，但用户仍需要理解 Markdown 结构、技术字段和阶段规则。候选方向、选题评分、制作决策和风格选择没有形成统一的决策工作区，确认前后状态也不够直观。

## 解决方案

在不改变现有 Artifact Store 和 Markdown 持久化契约的前提下，将两个闸门升级为卡片式决策体验：

1. source_intake 展示改编方向卡片，包含标题、摘要、选中态和确认结果。
2. topic_gate 展示只读评分卡、制作决策卡和导演/画面风格卡。
3. 卡片数据由现有 `source_material`、`topic_brief`、`adaptation_selection`、`gate_confirmations` 解析而来。
4. 用户确认继续通过 `sceneSubmitStageDraft` 写回现有 artifactKey。
5. 无候选或旧项目内容不完整时，提供诚实空态与高级 Markdown 降级入口。

## 用户故事

1. 作为创作者，我想直接看到多个改编方向卡片，以便快速比较，而不必阅读结构化 Markdown。
2. 作为创作者，我想知道每个方向的标题和摘要，以便理解它会如何改变原素材。
3. 作为创作者，我想清楚看到当前选中方向，以免误确认。
4. 作为创作者，我想在确认后看到只读摘要和“重新选择”入口，以便知道项目当前采用什么方向。
5. 作为创作者，我想看到选题的只读评分维度和原始说明，以便辅助决策。
6. 作为创作者，我想看到“继续制作、先观望、放弃选题”三个清晰决策卡，以便理解不同选择的后果。
7. 作为创作者，我想以卡片方式比较风格名称、风格族和可用说明，以便选择画面方向。
8. 作为创作者，我想在确认风格前知道下游仍被阻塞，以便理解为什么不能继续。
9. 作为创作者，我想在修改已确认选择时得到明确提示，以便避免无意改变下游上下文。
10. 作为创作者，我想在候选数据缺失时仍能使用高级 Markdown 编辑，以便不被新 UI 卡死。
11. 作为旧项目用户，我想让已有 Markdown 自动显示为卡片，以便无需迁移项目文件。
12. 作为维护者，我想让卡片只是现有 artifact 的视图和编辑器，以便不产生第二份状态真相。
13. 作为维护者，我想让 parser 与 builder 可独立测试，以便 UI 不依赖脆弱字符串判断。
14. 作为测试者，我想覆盖正常、缺失、旧格式和重新确认场景，以便闸门行为稳定。

## 实现决策

- 不新增数据库、JSON schema 或 project.json 字段。
- `scene-hitl-markdown.ts` 继续承担 Markdown 与结构化 View Model 的转换。
- 改编方向继续写入 `adaptation_selection`。
- 选题决策和风格继续写入 `gate_confirmations`。
- 评分只读，不写回；解析 `topic_brief` 中 `## 评分` 段落的列表项并保留原始标签。
- 评分格式采用宽松解析：`- 标签: 值` 或 `- 标签：值`；无法解析时不伪造分数。
- 卡片确认前不自动 Validate；仍由用户使用现有 Validate/Continue。
- 已确认内容默认显示摘要，用户点击重新选择后才回到编辑态。
- 复用现有 UI token 和组件，不引入新的设计系统。

## 测试决策

- parser/builder 单元测试覆盖中英文冒号、缺失段落、旧格式、重复确认。
- UI 测试只验证用户可见行为：卡片选中、确认、摘要、重新选择、空态。
- IPC mock 测试验证确认仍调用 `sceneSubmitStageDraft` 且 artifactKey 不变。
- Validator 测试验证必需确认未完成时下游继续阻塞。
- Electron 人工验收覆盖两种 entryPath 和旧项目回显。

## 超出范围

- 用 LLM 在 Studio 内重新生成方向或评分。
- 风格资产管理器和 selectedAssetIds 完整选择器。
- 修改 topic_gate 的审批策略。
- Continue 后自动运行下一阶段。
- 全应用视觉重构。

## 进一步说明

- 本 PRD 延续 ADR-0001，不改变 HITL 写回通道。
- 详细设计：`docs/sceneforge/2026-06-18-sceneforge-gate-intake-card-hitl-design.md`。
- 实施计划：本目录 `IMPLEMENTATION-PLAN.md`。

