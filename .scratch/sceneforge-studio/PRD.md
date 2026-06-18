Status: ready-for-agent

# SceneForge Studio Core Flow PRD

## 问题陈述

AI 视频创作者已经可以借助 SceneForge SOP 生成设定图提示词、故事板提示词和视频分段提示词，但当前流程缺少稳定的产品化总控。阶段状态、核心产物、支撑产物、校验结果和人工审批分散在文件和 Agent 对话中，用户需要反复翻目录判断哪些产物可用、哪些还只是草稿、哪些阶段已经真正通过。

Lingji Cut 已经有本地项目、Electron 桌面 UI、`project.json`、Pipeline、MCP、任务进度和 AI Provider 配置。SceneForge Studio 要把 SceneForge 的核心创作链路接进这个底座，形成一个本地优先的 Prompt Pack 编译工作台。

## 解决方案

新增 `SceneForge Prompt Pack Project` 项目类型和 `SceneForge Studio` 工作台。应用负责项目状态、阶段推进、产物写入、Artifact Manifest、Validator、审批策略和导出；Agent 只通过 MCP 工具读取受控 Stage Context、提交阶段草案和请求修订。

第一版只实现核心流程：项目创建、审批策略配置、核心产物注册/查看、Validator、审批、导出 Prompt Pack。三类核心产物必须一级展示：Design Prompts、Storyboard Prompts、Video Prompt Packs。

流程执行必须由程序推进。每个阶段需要读取的规则、模板、输出契约、审查清单和允许读取的上游产物，都由应用根据 Stage Skill Pack 和 Stage Context 组装后提供给 LLM 或 ACP Agent。模型不自行扫描技能目录，不自行选择规则文件，不自行推进阶段状态。

## 用户故事

1. 作为 AI 视频创作者，我想创建 SceneForge Prompt Pack 项目，以便把创意或参考片段转成 AI 视频生成用的完整提示词包。
2. 作为创作者，我想打开 SceneForge Studio，以便在一个工作台中看到阶段、产物、审批和导出状态。
3. 作为创作者，我想看到 Design / Storyboard / Video Prompts 三个核心阶段，以便优先关注真正能用于图片和视频生成的产物。
4. 作为创作者，我想查看 Performance / Audio / Script 等支撑产物，以便理解视频提示词中的动作、情绪和声音设计来自哪里。
5. 作为创作者，我想配置每个阶段是否需要人工审批，以便根据项目风险在自动推进和人工把关之间切换。
6. 作为创作者，我想让核心阶段默认需要审批，以便避免错误设定继续污染下游。
7. 作为创作者，我想在 Validator 失败时看到明确错误和修复建议，以便知道缺少哪些文件、章节或引用。
8. 作为创作者，我想在 Validator 通过后仍保留人工审批动作，以便确认创作方向，而不是只确认结构完整。
9. 作为创作者，我想请求 Agent 修订当前阶段，而不是重跑所有阶段，以便保留已认可的上游决策。
10. 作为创作者，我想在右侧 Inspector 预览、查看结构、查看 trace 和 raw content，以便快速检查产物质量。
11. 作为 Agent 使用者，我想读取 Stage Context，以便 Agent 只能看到允许读取的上游 final/approved 产物。
12. 作为 Agent 使用者，我想通过工具提交草案，以便应用统一写入文件、注册 manifest、更新状态并运行校验。
13. 作为高级用户，我想保留 Markdown 产物和 manifest，以便项目脱离应用后仍可被人理解。
14. 作为高级用户，我想导出 Prompt Pack 文件夹，以便交付给外部图片/视频生成平台使用。
15. 作为维护者，我想让 SceneForge 实现保持低侵入，以便不破坏 Lingji Cut 原有视频项目、脚本工作台、时间线和导出链路。
16. 作为维护者，我想把每个阶段的规则维护为 Stage Skill Pack，以便程序能稳定地把正确规则提供给 LLM/Agent，而不是依赖 Agent 自觉读取 `.agents/skills`。
17. 作为创作者，我想在不同阶段选择 manual、direct LLM 或 ACP Agent 执行方式，以便根据任务复杂度选择更可控或更智能的生成路径。
18. 作为创作者，我想点击三个核心阶段的最终产物并查看专用内容视图，以便快速判断这些内容能不能直接用于外部图片/视频工具。
19. 作为创作者，我想一键复制完整产物或某个可用片段，以便不需要手动从 Markdown 中选择文本。

## 实现决策

- 新增共享类型模块，定义 SceneForge stage、approval policy、project meta、artifact 和 validation result。共享类型放在 renderer/main 都可引用的位置，避免 shared 层反向依赖 Electron 目录。
- `project.json` 保持应用主工程文件，新增可选 `type=sceneforge` 与 `sceneforge` metadata。普通 Lingji Video Project 不受影响。
- 每个 SceneForge 项目在项目目录下拥有 `sceneforge/` 子目录，包含 `state.json`、`approval_policy.yaml`、`artifact_manifest.yaml`、阶段目录、runtime 和 exports。
- 阶段审批策略可配置。默认策略来自 pipeline definition，项目级覆盖写入 `sceneforge/approval_policy.yaml`，运行时以“项目覆盖 > 默认策略”解析。
- `validated` 不等于 `approved`。Validator 只证明结构完整，用户审批才证明创作方向可以进入下游。
- Artifact Store 是文件写入和 manifest 注册的唯一入口。Agent 和 UI 不接收任意写入路径。
- 下游阶段只读取 Stage Context 显式列出的 approved/final 产物，不扫描项目目录。
- 第一版 Validator 聚焦三个核心阶段：Design、Storyboard、Video Prompts。
- Electron IPC 与 MCP 工具调用同一个 SceneForgeService，避免 UI 与 Agent 走两套业务逻辑。
- 新增 Stage Runner 抽象，支持 `manual_submit`、`direct_llm`、`acp_agent` 三种执行器。无论使用哪种执行器，最终都必须走 `submitStageDraft -> Artifact Store -> Manifest -> Validator -> Approval`。
- 新增 Stage Skill Pack 维护方式。旧 SceneForge Agent skill 只作为迁移素材来源；运行时读取产品内 stage pack，由程序把阶段规则、prompt 模板、输出契约和 review checklist 注入给 LLM/Agent。
- 新增 Scene Asset Library，用于迁移并索引可复用创作资产，例如改编方法、动画风格化、镜头语言、分镜方法和 style profiles。`source-materials` 不进入本期迁移范围，也不作为全局默认上下文。
- 核心三阶段最终产物必须提供可解析的 Display Model 和 Copy Blocks。Markdown 仍是落盘格式，但 UI 不应只展示一整段不可操作的长文。
- UI 采用 Lingji Cut 原生专业工具风格，三栏布局：Pipeline Flow、Current Stage Workspace、Artifact Inspector。
- UI 必须支持点击核心产物打开专用查看页，并提供 Copy Full、Copy Section、Copy Prompt 等复制动作；复制成功要有明确反馈。
- 不迁移 v9-dev Web Console，不以 PTY/终端输出解析作为主路径，不让 `PROJECT_BOARD.md` 继续作为状态源。
- 第一版导出 Markdown Prompt Pack 文件夹，ZIP 后续增强。

## 测试决策

- 测试只覆盖外部行为，不测试内部实现细节。
- Project 初始化测试验证 `project.json`、`sceneforge/state.json`、`approval_policy.yaml`、`artifact_manifest.yaml` 和核心目录存在。
- Approval policy 测试验证默认策略和项目覆盖策略。
- Artifact Store 测试验证写入路径、manifest 注册、读取内容。
- State Machine 测试验证 required 阶段 `validated -> waiting_approval -> approved`。
- Validator 测试验证核心产物缺失时失败，并返回稳定错误码。
- IPC 契约测试验证 main/preload/electron-api 三件套同步。
- MCP 注册测试验证 SceneForge 工具已注册，且 submit 工具不接受任意 path。
- Runner 测试验证 manual/direct_llm/acp_agent 都不能绕过 submitStageDraft。
- Stage Skill Pack 测试验证阶段规则由程序加载并进入 Stage Context，而不是让 Agent 扫描 `.agents/skills`。
- Scene Asset Library 测试验证 style profiles 和创作资产由 registry 控制加载，且 `source-materials` 不会被默认迁移或注入。
- Artifact Display Model 测试验证核心产物可被解析成标题、章节、可复制块和 raw content。
- UI smoke test 验证 Studio 三栏、核心阶段和 Approval Policy 控件渲染。
- UI smoke test 验证核心产物可点击打开，复制按钮调用 clipboard 并显示成功反馈。
- Export 测试验证导出目录包含核心 Prompt Pack 和 manifest。
- 端到端回归测试验证 create -> submit -> validate -> approve -> export 核心闭环。

## 超出范围

- 不生成真实图片、视频、音频。
- 不迁移旧 v9-dev Web Console 会话。
- 不实现 PTY 主路径。
- 不自动迁移旧 SceneForge 项目。
- 不做复杂故事板网格、声音时间线或表格化逐字段编辑器。
- 不改造 Lingji Cut 原有视频编辑、TTS、时间线、Remotion 导出主链路。

## 进一步说明

实施计划见 `docs/superpowers/plans/2026-06-16-sceneforge-studio-core-flow.md`。拆票按垂直切片推进，每张票必须包含 Review Checklist，用于实现后自查和验收。
