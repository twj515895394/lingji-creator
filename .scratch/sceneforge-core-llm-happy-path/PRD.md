Status: ready-for-agent

# PRD：SceneForge Core LLM Happy Path

## 问题陈述

创作者目前可以用 MVP 占位内容走通 design、storyboard、video_prompts，但这只能验证状态机，不能证明视频内容创作工坊能够基于项目上下文生成可用的真实核心产物。Direct LLM Runner 与三个 Core Stage Pack 已存在，Studio 也能运行和提交草案，但缺少完整、可重复验证的真实生成路径、草案审阅体验和针对 Provider/解析失败的恢复指引。

## 解决方案

将现有 Direct LLM、Stage Context、Stage Pack、StageRunPanel 和 Artifact Store 连接成三个可独立验收的真实生成切片：

1. design 基于 reference、story、assets 和风格资产生成五个设计产物。
2. storyboard 基于 design、script、performance 和方法库生成四个分镜产物。
3. video_prompts 基于 design、storyboard、audio 和 performance 生成中英文视频提示词包。
4. 每次生成结果先作为待提交草案显示，用户确认后才写入 Artifact Store。
5. 提交后继续使用既有 Validator、Approval、Continue 和 Handoff，不新增旁路。

## 用户故事

1. 作为创作者，我想在设定图提示词阶段使用应用已配置的 LLM 生成完整五项草案，以便从真实上游资料开始创作。
2. 作为创作者，我想在提交前知道生成了哪些 requiredArtifacts，以免把缺失草案写入项目。
3. 作为创作者，我想在提交前查看每项草案的正文，以便判断是否值得保存。
4. 作为创作者，我想明确点击提交后才把草案写入项目，以便避免一次失败生成污染产物库。
5. 作为创作者，我想在校验失败时保留生成草案，以便修改或重新生成，而不是全部丢失。
6. 作为创作者，我想在分镜阶段使用已审批的 design、script 和 performance 上下文生成四项分镜产物，以便保持视觉和表演连续性。
7. 作为创作者，我想在视频提示词阶段使用分镜、声音和表演上下文生成中英文提示词包，以便直接交给视频模型。
8. 作为创作者，我想看到当前 Runner、运行阶段和生成状态，以便知道系统正在做什么。
9. 作为创作者，我想在没有配置 LLM 时得到“设置 → AI”的明确引导，以便自行恢复。
10. 作为创作者，我想在 Provider 失败、JSON 无法解析或缺少产物 key 时看到不同错误说明，以便决定重试还是修改配置。
11. 作为测试者，我想使用 mock Provider 稳定复现三阶段生成、提交和校验，以便自动化验证不依赖外部 API。
12. 作为维护者，我想让 output contract 成为 requiredArtifacts 的唯一来源，以便 Stage Pack、Runner、UI 和 Validator 不发生命名漂移。
13. 作为维护者，我想保持 Runner 只返回草案，以便所有写盘仍统一经过 Artifact Store。
14. 作为维护者，我想保留 MVP 占位入口，以便无 LLM 环境仍可验证状态机。

## 实现决策

- 继续使用现有 `direct_llm` Runner，不新增第四种 Runner。
- Core 首版仍采用“单次 LLM 请求返回 JSON，多 key 一次生成”。
- requiredArtifacts 来自 Stage Pack 的 output contract，并必须与阶段定义一致。
- Runner 返回完整草案与结构化错误，不直接写项目文件。
- Studio 增加待提交草案审阅区，至少展示 key、内容预览、缺失状态和提交操作。
- 只有 requiredArtifacts 全部存在且非空时才允许批量提交；额外元数据 key 不提交。
- 提交后由现有 Validator 判断内容是否满足阶段规则。
- 校验失败时保留待提交草案和错误信息，用户可重新提交或重新运行。
- 三阶段逐个打通和验收，不实现自动串行运行。
- 保留 manual_submit、ACP Agent 和 MVP 占位，不改变默认 Runner。

## 测试决策

- Runner 测试只验证外部行为：给定设置、上下文和 mock LLM 返回，得到正确 artifacts 或明确错误码。
- Stage Pack 契约测试验证 output contract 与阶段 requiredArtifacts 一致。
- Service 集成测试验证 runStage 不写盘，submitStageDraft 后才出现产物并触发校验。
- Studio 测试验证草案审阅、缺 key 禁止提交、提交成功和错误恢复。
- 三阶段各有一个端到端 mock happy path。
- 真 Provider 只作为 Electron 人工验收，不进入稳定自动化测试。

## 超出范围

- Continue 后自动运行下一阶段。
- 支撑阶段 Direct LLM。
- 真 ACP 多轮会话。
- 流式 token 展示和逐 key 并行生成。
- 自动修改或自动修复不合格草案。
- 一键无人值守跑完整流水线。

## 进一步说明

- 本 PRD 遵循 ADR-0002 的统一出口：`runStage → draft → submitStageDraft → validate → approve`。
- 详细设计：`docs/sceneforge/2026-06-18-sceneforge-core-llm-happy-path-design.md`。
- 实施计划：本目录 `IMPLEMENTATION-PLAN.md`。

