# SceneForge Studio 核心流程 PRD

> 日期：2026-06-16  
> 状态：设计草案  
> 适用仓库：`lingji-creator`  
> 参考：`docs/sceneforge/SceneForge_Studio_LingjiCut_Fork_Product_Architecture_v2.md`

## 1. 问题陈述

SceneForge 已经能通过多阶段 SOP 生成角色设定图 Prompt、故事板 Prompt、视频分段 Prompt 等 AI 视频创作核心产物，但当前体验仍偏“Agent 按文档执行 + 人工翻目录检查”。用户很难稳定回答：

- 当前项目处于哪个阶段。
- 哪些产物是最终可用于生成图片或视频的核心产物。
- 下游阶段到底继承了哪些上游决策。
- Validator 是否真的阻止了缺失、不一致或未注册产物进入下一阶段。
- 最终 Prompt Pack 是否完整、可导出、可交付。

Lingji Cut 已具备 Electron 桌面应用、本地项目、`project.json`、AI Provider、MCP、Pipeline、任务进度和专业工具 UI。新目标是在 Lingji Cut 中新增一个独立的 SceneForge Studio 项目模式，用产品化工作台承接 SceneForge 的核心创作流程。

## 2. 目标

第一版只实现核心流程，不追求搬完 `scene_forge` 的全部阶段和 Web Console 能力。

核心目标：

1. 新增 `SceneForge Prompt Pack Project` 项目类型。
2. 新增 `SceneForge Studio` 工作台。
3. 跑通“阶段上下文 -> 产物写入 -> Artifact 注册 -> Validator -> 审批 -> 导出”的闭环。
4. 一级展示三类核心产物：Design Prompts、Storyboard Prompts、Video Prompt Packs。
5. 支撑产物可查、可预览、可被下游引用，但第一版不做复杂编辑器。
6. Agent 只能通过 MCP/应用工具提交草案和修订，不能直接写主状态文件。

## 3. 非目标

第一版明确不做：

- 不把 `scene_forge` v9-dev Web Console 原样搬进 Electron。
- 不以 PTY/终端输出解析作为主交互路径。
- 不让 `PROJECT_BOARD.md` 继续作为主状态源。
- 不生成真实图片、视频、音频；SceneForge Studio 只生产 Prompt Pack 和支撑文档。
- 不改造 Lingji Cut 原有视频编辑、TTS、时间线、Remotion 导出主链路。
- 不一次性实现全部 SOP 阶段的复杂结构化编辑。
- 不引入新的视觉设计体系。

## 4. 用户故事

1. 作为 AI 视频创作者，我想创建一个 SceneForge Prompt Pack 项目，以便把创意或参考片段转成 AI 视频生成用的完整提示词包。
2. 作为创作者，我想在左侧看到所有阶段和状态，以便知道当前流程推进到哪里。
3. 作为创作者，我想快速打开 Design Prompts，以便复制角色、场景、道具和总参考图提示词。
4. 作为创作者，我想快速打开 Storyboard Prompts，以便生成故事板图和关键帧参考图。
5. 作为创作者，我想快速打开 Video Prompt Packs，以便投喂 Kling、Veo、Seedance、即梦、Runway 等视频模型。
6. 作为创作者，我想查看 Performance Direction 和 Audio Design，以便理解视频提示词中的动作、情绪、声音设计来自哪里。
7. 作为创作者，我想在核心阶段完成后人工审批，以便避免不满意的设定继续污染下游。
8. 作为创作者，我想看到 Validator 错误，以便知道缺少了哪些核心段落、文件或引用。
9. 作为创作者，我想请求 Agent 修订当前阶段，而不是重跑所有阶段，以便保留已认可的上游决策。
10. 作为创作者，我想导出最终 Prompt Pack 文件夹或 ZIP，以便交付给外部图片/视频生成平台使用。
11. 作为高级用户，我想保留 Markdown 产物和 manifest，以便项目脱离应用后仍可被人理解。
12. 作为 Agent 使用者，我想让 Agent 读取受控 Stage Context，以便它不会误读 draft、preview 或历史输出。

## 5. MVP 流程

```text
New SceneForge Project
-> Initialize project.json + sceneforge state
-> Open SceneForge Studio
-> Run / submit Design stage
-> App writes artifacts and updates manifest
-> Validate Design
-> User approves Design
-> Run / submit Storyboard stage
-> Validate and approve Storyboard
-> Run / submit Video Prompts stage
-> Validate and approve Video Prompts
-> Export Prompt Pack
```

## 6. 核心模块

### 6.1 SceneForge Project

负责项目类型、目录初始化、`project.json.sceneforge` 段落和 `sceneforge/` 子目录。

### 6.2 Scene Pipeline

负责阶段定义、依赖、状态推进、审批策略和当前阶段上下文。

### 6.3 Artifact Store

负责产物写入、索引、版本、展示分类和下游可读边界。

### 6.4 Validator

负责文件/manifest、结构、语义三层校验。Validator 不负责改写创作内容，只负责阻止不完整产物进入审批或下游。

### 6.5 SceneForge Studio UI

负责 Pipeline Flow、Current Stage Workspace、Artifact Inspector、All Artifacts、Approval Gate 和 Export Panel。

### 6.6 Scene MCP Tools

负责给 Agent 暴露结构化能力：读取阶段上下文、提交草案、请求修订、读取产物、运行校验、导出。

## 7. 验收标准

- 能创建 `type=sceneforge` 的项目，并打开 SceneForge Studio。
- 能初始化 SceneForge 项目目录和最小状态文件。
- 能展示阶段流和三类核心产物入口。
- 能注册并预览 Design / Storyboard / Video Prompt 产物。
- 核心阶段通过 Validator 前不能标记为 approved。
- 核心阶段 approved 前不能被下游当作默认输入。
- Agent 侧不能直接修改 `project.json`、`sceneforge/state.json`、`sceneforge/artifact_manifest.yaml`。
- 能导出包含三类核心产物的 Prompt Pack。

## 8. 风险

- 如果过早复制 v9-dev Web Console，会形成第二套 UI 和状态模型。
- 如果过早按全部 SOP 阶段展开，MVP 会变厚，核心闭环会被稀释。
- 如果 Agent 仍能直接写状态文件，Validator 和审批会失去产品意义。
- 如果 Artifact Manifest 设计过细，第一版实现成本会上升；应先覆盖核心产物与支撑产物的必要字段。

