# 基于 lingji-cut Fork 的 SceneForge Studio 独立模块整合扩展设计文档

> 文档版本：v2  
> 适用方向：fork `lingji-cut`，新增独立 `SceneForge Studio` 创作线  
> 核心原则：**SceneForge 创作主线与关键产物不大改；流程控制、状态管理、UI、审批、Agent 接入和产物浏览按 lingji-cut 产品化模式重构。**

---

## 0. 一句话结论

本方案不是把 `scene_forge` 当前 `codex/v9-dev` 分支原样搬进 `lingji-cut`，也不是把 SceneForge 做成 lingji-cut 里的一个简单提示词页面。

更准确的目标是：

> **fork lingji-cut，把它作为本地优先 AI 视频创作工作台底座，在其中新增一个独立的 SceneForge Studio 项目模式与工作台模块。SceneForge 的角色设定图 Prompt、故事板 Prompt、视频分段 Prompt 等核心创作产物必须完整保留；流程控制、状态推进、产物索引、审批交互、Agent 调用、UI 展示则按 lingji-cut 的产品化模式重新设计。**

---

## 1. 设计背景

### 1.1 当前 SceneForge 的核心价值

SceneForge 的核心价值不是“能运行一堆阶段”，而是能够把经典影视、热点片段或用户创意，转译成可用于 AI 视频生成工作流的专业创作包。

尤其是以下三类产物，是 SceneForge 的主价值：

1. **角色 / 场景 / 道具设定图 Prompt**
   - 用于生成角色设定图、场景设定图、核心道具图、全局参考图。
   - 它决定后续视觉统一性、角色辨识度、风格基准和资产连续性。

2. **故事板 Prompt**
   - 用于生成故事板图、关键帧、镜头设计参考图。
   - 它决定分镜结构、镜头语言、动作节奏、构图策略和视觉叙事。

3. **视频分段 Prompt**
   - 用于投喂 Kling、Veo、Seedance、即梦、Runway 等视频生成模型。
   - 它决定最终视频生成时的镜头动作、角色状态、声音执行、视觉连续性和分段衔接。

因此，新系统可以改工程架构，但不能削弱这三类核心产物。

### 1.2 当前 v9-dev 的价值与边界

`codex/v9-dev` 分支已经做了不少工程化探索，例如：

- Artifact Manifest
- Transactional State Machine
- Schema / Semantic Validator
- CLI JSON API
- PTY Bridge
- Web Console UI
- PROJECT_BOARD 与 PROJECT_STATE 双轨设计
- Web Console 的聊天稳定性、产物索引、审批卡片、阶段状态等探索

这些探索非常有价值，因为它们暴露了 SceneForge 从“文档驱动”转向“产品化工作流”时必然遇到的问题。

但 v9-dev 不应成为新系统的束缚。它更适合作为：

- 问题清单
- 经验来源
- 可复用规则
- 阶段划分参考
- Validator 设计参考
- 产物命名参考

而不是作为最终产品架构的唯一蓝本。

### 1.3 为什么选择 lingji-cut 作为底座

lingji-cut 已经具备 SceneForge 目前缺少的产品底层能力：

- Electron 桌面应用
- React + TypeScript UI
- macOS 深色专业创作工具风格
- 本地项目目录
- `project.json` 工程文件
- 写稿 / 编辑器 / 预览 / 设置 / 任务状态
- AI Provider 配置
- Pipeline / Task 系统
- MCP 工具能力
- CLI 与桌面端通信方式
- 本地优先文件管理
- 可扩展的工作台形态

因此，相比从零做 Web Console，fork lingji-cut 能更快进入“产品化创作工具”阶段。

---

## 2. 总设计原则

### 2.1 SceneForge 创作主线保留

保留 SceneForge 的核心流程逻辑：

```text
输入素材 / 创作需求
-> Source Intake / Topic Gate
-> Reference / Story / Asset
-> Design Prompts
-> Script
-> Performance Direction
-> Storyboard Prompts
-> Audio Design
-> Video Prompt Packs
-> Publish / Export
```

可以合并部分低价值中间物，可以调整是否需要人工审批，但主线关系不应被大改。

### 2.2 三大核心产物不降级

以下产物必须作为 SceneForge Studio 的一级核心产物展示：

```text
Design Prompts
Storyboard Prompts
Video Prompt Packs
```

它们不能只作为文件列表中的普通 Markdown，也不能被压缩成摘要。

### 2.3 支撑产物稳定可查

导演表演、声音设计、剧本、资产检查、故事发展等产物虽然不是最终直接用于图片或视频生成的主产物，但它们是上游设计依据和下游质量保障，必须：

- 可发现
- 可打开
- 可预览
- 可追溯
- 可被下游引用
- 可参与校验
- 可进入最终导出包的附录或工程包

### 2.4 应用是总控，Agent 是执行者

核心职责重新划分：

```text
应用负责：
- 项目状态
- 阶段推进
- 任务调度
- 上下文选择
- 产物写入范围
- 产物索引
- 校验
- 审批策略
- UI 展示
- 导出

Agent 负责：
- 当前阶段内容生成
- 当前阶段内容修订
- 按 schema / prompt / workflow 产出草案
```

Agent 不应该再负责：

- 自己判断当前阶段
- 自己决定能否进入下一阶段
- 自己绕过 validator
- 自己直接写状态文件
- 自己决定哪些文件可被下游读取
- 自己手工维护全部 manifest 与 board

### 2.5 尽量低侵入 fork

在 lingji-cut 中新增 SceneForge 模块，尽量不破坏原有视频创作链路。

原则：

```text
新增模块 > 修改核心逻辑
注册扩展点 > 散改全局代码
复用 shell / token / provider > 重写 UI 框架
独立 project type > 混入原有项目类型
```

---

## 3. 产品定位

### 3.1 新项目类型

在 lingji-cut 中新增项目类型：

```text
SceneForge Project
```

它与 lingji-cut 原有视频项目并列，而不是替代原项目。

新建项目时可以选择：

```text
- Lingji Video Project
- SceneForge Prompt Pack Project
```

### 3.2 新工作台入口

新增工作区：

```text
SceneForge Studio
```

入口可以在：

1. 新建项目时选择 SceneForge 项目类型后自动进入。
2. 项目内顶部 Workspace Tabs 中出现 `SceneForge`。
3. 未来可在普通视频项目中通过“转为 SceneForge 创作线”生成衍生项目。

### 3.3 产品心智

SceneForge Studio 是：

```text
AI 视频 Prompt Pack 编译器
+
导演创作工作台
+
分镜 / 角色 / 视频提示词生产线
```

它不是：

```text
通用聊天机器人
普通 Markdown 文件编辑器
自动剪辑软件
单纯提示词模板工具
v9-dev Web Console 的桌面版本
```

---

## 4. 与 lingji-cut UI 风格保持一致

### 4.1 视觉风格

SceneForge Studio 必须服从 lingji-cut 的设计系统：

- macOS 深色专业创作工具
- 安静、专业、可信、高效
- 深色窗口背景
- 嵌套面板结构
- 轻量分隔线
- 小字号高信息密度
- 系统蓝作为主交互色
- 状态色只用于反馈
- 避免营销页风格
- 避免大面积渐变
- 避免 AI 玩具感发光、流光、炫彩标签

### 4.2 基础布局

沿用 lingji-cut 的专业工具布局：

```text
┌──────────────────────────────────────────────────────────────┐
│ Window Titlebar / Toolbar                                    │
├──────────────────────────────────────────────────────────────┤
│ Workspace Tabs / Secondary Nav                               │
├────────────────┬──────────────────────────────┬──────────────┤
│ Side Panel     │ Main Work Area                │ Inspector    │
│ Pipeline Flow  │ Current Stage Workspace       │ Artifact     │
│ Artifact Tree  │ Editor / Preview / Review     │ Details      │
├────────────────┴──────────────────────────────┴──────────────┤
│ Bottom Utility Area / Task Progress / Agent Log / Validator  │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 SceneForge 不另起 UI 风格

不要做：

- 独立炫酷 AI 工作台
- 网页 SaaS 大卡片仪表盘
- 每个阶段一套颜色体系
- 满屏 emoji 和大标签
- 过度动画化流程图

应该做：

- 类似 Final Cut / Xcode / Logic 的专业工具界面
- 左侧阶段流
- 中间创作区
- 右侧 Inspector
- 底部任务状态
- 低调清晰的产物列表和状态反馈

---

## 5. Fork 后仓库级扩展目录设计

### 5.1 总体策略

在 fork 的 lingji-cut 仓库中，新增独立 SceneForge 命名空间。

推荐目录：

```text
lingji-cut-fork/
  electron/
    sceneforge/
      index.ts
      project/
      pipeline/
      artifacts/
      validators/
      mcp/
      export/
      adapters/
      migrations/

  src/
    sceneforge/
      pages/
      components/
      stores/
      hooks/
      types/
      utils/
      styles/

  schemas/
    sceneforge/

  prompts/
    sceneforge/

  docs/
    sceneforge/

  tests/
    sceneforge/
```

### 5.2 electron/sceneforge

主进程侧 SceneForge 能力：

```text
electron/sceneforge/
  index.ts
  project/
    sceneProject.ts
    sceneProjectFile.ts
    sceneProjectFactory.ts
    sceneProjectMigration.ts

  pipeline/
    scenePipelineService.ts
    scenePipelineRegistry.ts
    sceneStageDefinitions.ts
    sceneApprovalPolicy.ts
    sceneTaskKinds.ts
    sceneContextBuilder.ts

  artifacts/
    sceneArtifactStore.ts
    sceneArtifactManifest.ts
    sceneArtifactDiscovery.ts
    sceneArtifactIndex.ts
    sceneArtifactTrace.ts
    sceneArtifactVersioning.ts

  validators/
    sceneValidator.ts
    validators.design.ts
    validators.storyboard.ts
    validators.videoPrompts.ts
    validators.audio.ts
    validators.performance.ts

  mcp/
    registerSceneForgeMcpTools.ts
    tools.project.ts
    tools.stage.ts
    tools.artifact.ts
    tools.validation.ts
    tools.export.ts

  export/
    scenePromptPackExporter.ts
    sceneExportTemplates.ts
    sceneExportZip.ts

  adapters/
    lingjiProviderAdapter.ts
    lingjiTaskProgressAdapter.ts
    lingjiProjectAdapter.ts
```

职责说明：

| 目录 | 职责 |
|---|---|
| `project/` | SceneForge 项目类型、project.json 扩展、迁移 |
| `pipeline/` | 阶段定义、任务执行、审批策略、上下文构建 |
| `artifacts/` | 产物注册、索引、追踪、版本 |
| `validators/` | 各阶段硬校验 |
| `mcp/` | 对外暴露给 Agent 的工具 |
| `export/` | 最终 Prompt Pack / ZIP / Markdown 导出 |
| `adapters/` | 复用 lingji-cut 原有能力的桥接层 |

### 5.3 src/sceneforge

渲染进程侧 SceneForge UI：

```text
src/sceneforge/
  pages/
    SceneForgeStudio.tsx
    SceneForgeProjectSetup.tsx

  components/
    layout/
      SceneForgeShell.tsx
      SceneForgeToolbar.tsx
      SceneForgeBottomBar.tsx

    pipeline/
      PipelineFlow.tsx
      StageCard.tsx
      StageArtifactList.tsx
      StageStatusBadge.tsx
      ApprovalPolicyBadge.tsx

    workspace/
      CurrentStageWorkspace.tsx
      DesignPromptWorkspace.tsx
      StoryboardPromptWorkspace.tsx
      VideoPromptWorkspace.tsx
      SupportStageWorkspace.tsx

    artifacts/
      ArtifactInspector.tsx
      ArtifactPreview.tsx
      ArtifactStructureView.tsx
      ArtifactTraceView.tsx
      ArtifactDiffView.tsx
      AllArtifactsDrawer.tsx
      ArtifactKindBadge.tsx

    approval/
      ApprovalGateCard.tsx
      ReviewRequestPanel.tsx
      ValidatorResultPanel.tsx
      ReRunActionPanel.tsx

    agent/
      SceneAgentChat.tsx
      AgentRunLog.tsx
      AgentToolCallList.tsx
      ContextModeToggle.tsx

    export/
      PromptPackExportPanel.tsx
      ExportChecklist.tsx
      ExportPreview.tsx

  stores/
    sceneProjectStore.ts
    scenePipelineStore.ts
    sceneArtifactStore.ts
    sceneAgentStore.ts
    scenePreviewStore.ts

  hooks/
    useSceneProject.ts
    useScenePipeline.ts
    useSceneArtifacts.ts
    useSceneMcpTools.ts
    useArtifactPreview.ts

  types/
    sceneProject.ts
    sceneStage.ts
    sceneArtifact.ts
    sceneApproval.ts

  styles/
    sceneforge.css
```

### 5.4 schemas/sceneforge

```text
schemas/sceneforge/
  project.schema.json
  pipeline.schema.json
  artifact.schema.json

  stages/
    source-intake.schema.json
    topic-gate.schema.json
    reference.schema.json
    story.schema.json
    assets.schema.json
    design.schema.json
    script.schema.json
    performance.schema.json
    storyboard.schema.json
    audio.schema.json
    video-prompts.schema.json
    publish.schema.json

  exports/
    prompt-pack.schema.json
```

### 5.5 prompts/sceneforge

将 SceneForge 现有 skill 中真正有价值的创作规则转成可被阶段调用的 prompt 模板，而不是让 Agent 自己扫描整个 `.agents/skills`。

```text
prompts/sceneforge/
  stage-system/
    source-intake.system.md
    topic-gate.system.md
    design.system.md
    storyboard.system.md
    video-prompts.system.md

  templates/
    design-prompt-template.md
    storyboard-prompt-template.md
    video-prompt-template.md
    performance-template.md
    audio-template.md

  review/
    design-review-checklist.md
    storyboard-review-checklist.md
    video-prompts-review-checklist.md
```

---

## 6. 用户项目目录结构设计

### 6.1 设计目标

每个 SceneForge 项目目录必须做到：

- 人能看懂
- 程序能控制
- Agent 不需要猜路径
- UI 能稳定索引
- 下游能按需读取
- 最终能打包导出
- 不把所有阶段产物平铺在根目录

### 6.2 项目命名规范

项目目录建议：

```text
<date>-<short-slug>-sceneforge/
```

示例：

```text
2026-06-16-million-pound-note-sceneforge/
2026-06-16-huaqiang-watermelon-sceneforge/
2026-06-16-worldcup-comedy-sceneforge/
```

项目名字段：

```json
{
  "name": "百万英镑名场面动画化再创作",
  "slug": "million-pound-note",
  "type": "sceneforge"
}
```

命名规则：

| 字段 | 规则 |
|---|---|
| `name` | 用户可读中文名 |
| `slug` | 英文短名，文件系统安全 |
| 目录名 | 日期 + slug + sceneforge |
| 项目类型 | `sceneforge` |

### 6.3 推荐项目目录

```text
2026-06-16-million-pound-note-sceneforge/
  project.json

  inputs/
    source.md
    user_brief.md
    references/
      reference_notes.md
      source_transcript.md
      source_timeline.md

  sceneforge/
    state.json
    pipeline.yaml
    approval_policy.yaml
    artifact_manifest.yaml
    decision_log.jsonl

    stages/
      source_intake/
        stage.json
        context_pack.json
        outputs/
        details/
        reviews/

      topic_gate/
        stage.json
        outputs/
        details/
        reviews/

      reference/
        stage.json
        outputs/
        details/
        reviews/

      story/
        stage.json
        outputs/
        details/
        reviews/

      assets/
        stage.json
        outputs/
        details/
        reviews/

      design/
        stage.json
        outputs/
          design_prompts.md
          character_prompts.md
          scene_prompts.md
          prop_prompts.md
          master_reference_prompt.md
        details/
        reviews/

      script/
        stage.json
        outputs/
          script.md
        details/
        reviews/

      performance/
        stage.json
        outputs/
          performance_direction.md
        details/
          character_performance_matrix.md
          emotion_arc.md
          action_timing_sheet.md
        reviews/

      storyboard/
        stage.json
        outputs/
          storyboard_prompt_pack.md
          control_board_prompts.md
          style_board_prompts.md
          master_board_prompt.md
        details/
          shotlist.md
          beat_breakdown.md
          continuity_map.md
        reviews/

      audio/
        stage.json
        outputs/
          audio_design.md
        details/
          music_direction.md
          sfx_sheet.md
          segment_sound_map.md
        reviews/

      video_prompts/
        stage.json
        outputs/
          video_prompt_pack.md
          video_prompt_pack_cn.md
        optional/
          video_prompt_pack_en.md
        details/
          segment_trace.md
          model_adaptation_notes.md
        reviews/

      publish/
        stage.json
        outputs/
          publish_copy.md
          title_options.md
          caption_copy.md
        details/
        reviews/

    handoffs/
      source_intake.handoff.json
      topic_gate.handoff.json
      design.handoff.json
      storyboard.handoff.json
      video_prompts.handoff.json

    runtime/
      tasks/
      validation/
      agent_runs/
      temp/

    exports/
      prompt_pack/
        final_prompt_pack.md
        design_prompts.md
        storyboard_prompts.md
        video_prompts.md
        sound_design.md
        publish_copy.md
      zip/
```

### 6.4 与 lingji-cut 原 project.json 的关系

根目录的 `project.json` 仍然作为 lingji-cut 项目的统一工程文件。

新增字段：

```json
{
  "type": "sceneforge",
  "name": "百万英镑名场面动画化再创作",
  "slug": "million-pound-note",
  "createdAt": "2026-06-16T00:00:00.000Z",
  "sceneforge": {
    "version": 1,
    "projectRoot": "sceneforge",
    "pipeline": "reference_remake",
    "currentStage": "design",
    "status": "in_progress",
    "coreArtifacts": {
      "design": "sceneforge/stages/design/outputs/design_prompts.md",
      "storyboard": null,
      "videoPrompts": null
    },
    "lastExportPath": null
  }
}
```

### 6.5 为什么不继续以 PROJECT_BOARD 为核心

可以保留 `PROJECT_BOARD.md`，但它不应该是主状态源。

推荐：

```text
project.json               应用主工程文件
sceneforge/state.json      SceneForge 状态机
sceneforge/artifact_manifest.yaml  产物索引
PROJECT_BOARD.md           可选的人类/Agent 轻摘要
```

也就是说：

- UI 读 `project.json` + `state.json` + `artifact_manifest.yaml`
- Agent 通过 MCP 读上下文
- `PROJECT_BOARD.md` 只是低成本摘要，不承担主控责任

---

## 7. Pipeline 阶段设计

### 7.1 默认 Pipeline

```text
source_intake
topic_gate
reference
story
assets
design
script
performance
storyboard
audio
video_prompts
publish
export
```

### 7.2 阶段分类

| 阶段 | 类型 | 产物权重 | 是否建议默认人工审批 |
|---|---|---:|---|
| source_intake | 支撑 | 中 | 否 |
| topic_gate | 决策 | 高 | 可选 |
| reference | 支撑 | 中 | 否 |
| story | 支撑 | 中 | 可选 |
| assets | 支撑 | 中 | 否 |
| design | 核心 | 最高 | 是 |
| script | 支撑 | 高 | 可选 |
| performance | 支撑 | 高 | 可选 / auto_if_valid |
| storyboard | 核心 | 最高 | 是 |
| audio | 支撑 | 高 | auto_if_valid |
| video_prompts | 核心 | 最高 | 是 |
| publish | 支撑 | 中 | 否 |
| export | 输出 | 最高 | 是 |

### 7.3 Stage Definition 示例

```yaml
id: storyboard
display_name: Storyboard Prompts
category: core
required_inputs:
  - design
  - script
  - performance
optional_inputs:
  - audio
produces:
  - storyboard_prompt_pack
  - control_board_prompts
  - style_board_prompts
  - master_board_prompt
approval_policy: required
validator:
  schema: schemas/sceneforge/stages/storyboard.schema.json
  semantic_rules:
    - has_control_board
    - has_style_board
    - has_master_board_prompt
    - shot_continuity_check
downstream:
  - video_prompts
  - export
```

---

## 8. Approval Policy 设计

### 8.1 审批不是所有阶段都强制

审批策略分四类：

```text
required       必须人工确认
optional       提供确认入口，但不强制
auto_if_valid  validator 通过后自动进入下一阶段
skip           内部系统阶段，无需审批
```

### 8.2 推荐默认配置

```yaml
source_intake: auto_if_valid
topic_gate: optional
reference: auto_if_valid
story: optional
assets: auto_if_valid
design: required
script: optional
performance: auto_if_valid
storyboard: required
audio: auto_if_valid
video_prompts: required
publish: optional
export: required
```

### 8.3 UI 上的审批交互

核心阶段完成后，中间工作区显示：

```text
Review Required

本阶段已生成核心产物：
- 角色设定图 Prompt
- 场景设定图 Prompt
- 道具设定图 Prompt
- 总参考图 Prompt

操作：
[Approve & Continue]
[Request Revision]
[Edit Manually]
[Regenerate]
```

支撑阶段完成后：

```text
Validation Passed

本阶段产物已通过校验，可自动进入下一阶段。
[View Output]
[Continue]
[Edit Before Continue]
```

### 8.4 什么时候强制暂停

即使阶段是 `auto_if_valid`，以下情况也必须暂停：

- validator failed
- 下游核心阶段依赖缺失
- 用户配置要求人工审批
- Agent 输出包含高风险内容
- 核心结构产物缺失
- 与上游核心设定不一致
- 产物文件存在但 manifest 未注册
- 生成结果为空或过短

---

## 9. Artifact 产物体系设计

### 9.1 三层产物分类

```text
Core Generation Assets
  直接用于图片 / 视频生成的核心产物

Direction & Support Assets
  支撑核心产物质量的导演、剧本、声音、资产产物

System & Review Assets
  状态、校验、handoff、日志、审查结果
```

### 9.2 Artifact 元数据

每个产物都应注册：

```json
{
  "id": "storyboard-prompt-pack-v1",
  "stage": "storyboard",
  "kind": "final",
  "role": "core_generation_asset",
  "title": "故事板 Prompt Pack",
  "path": "sceneforge/stages/storyboard/outputs/storyboard_prompt_pack.md",
  "core_asset": true,
  "display_priority": 100,
  "readable_by_downstream": true,
  "used_by": ["video_prompts", "export"],
  "view_modes": ["preview", "structure", "trace", "diff"],
  "schema": "schemas/sceneforge/stages/storyboard.schema.json",
  "created_at": "2026-06-16T00:00:00.000Z"
}
```

### 9.3 Core Artifacts

```text
design_prompts.md
character_prompts.md
scene_prompts.md
prop_prompts.md
master_reference_prompt.md

storyboard_prompt_pack.md
control_board_prompts.md
style_board_prompts.md
master_board_prompt.md

video_prompt_pack.md
video_prompt_pack_cn.md
video_prompt_pack_en.md optional
```

### 9.4 Support Artifacts

```text
script.md
performance_direction.md
character_performance_matrix.md
emotion_arc.md
audio_design.md
segment_sound_map.md
asset_check.md
story_development.md
reference_boundary.md
publish_copy.md
```

### 9.5 System Artifacts

```text
handoff.json
validation_result.json
quality_check.md
decision_log.jsonl
agent_run.json
context_pack.json
```

---

## 10. 产物浏览与查看设计

### 10.1 必须满足的用户目标

用户可以随时回答这些问题：

```text
我现在在哪个阶段？
这个阶段生成了什么？
以前阶段的产物在哪里？
导演表演在哪里？
声音设计在哪里？
这个视频 prompt 依赖了哪些上游？
哪个文件可以拿去生成图？
哪个文件可以拿去生成视频？
哪些产物还没通过校验？
```

### 10.2 左侧 Pipeline Flow

左侧每个阶段展示：

```text
✓ Design Prompts       Core     5 files
✓ Script               Support  3 files
✓ Performance          Support  4 files
✓ Storyboard Prompts   Core     6 files
✓ Audio Design         Support  5 files
✓ Video Prompt Packs   Core     12 files
```

每个阶段可展开：

```text
Performance Direction
  Open latest
  performance_direction.md       Final
  character_performance_matrix.md Detail
  emotion_arc.md                 Detail
  action_timing_sheet.md          Detail
  performance.handoff.json        Handoff
```

### 10.3 中间 Main Workspace

中间区显示当前阶段主要工作内容。

核心阶段：

- Design：角色 / 场景 / 道具 / 总参考 Prompt 编辑与预览
- Storyboard：故事板 Prompt Pack 编辑与结构预览
- Video Prompts：分包 Prompt 编辑、段落导航、模型适配

支撑阶段：

- Script：剧本编辑与结构化 beat
- Performance：导演表演矩阵、情绪弧、动作 timing
- Audio：声音地图、拟音、音乐方向、段落声音策略
- Publish：标题、简介、字幕文案

### 10.4 右侧 Artifact Inspector

右侧负责查看任意产物。

顶部显示：

```text
Artifact Inspector

Title: 导演表演设计
Stage: Performance
Kind: Final
Role: Support Direction
Used by: Storyboard, Video Prompts
Source: Manually opened
```

Tabs：

```text
Preview
Structure
Trace
Diff
Raw
```

#### Preview

Markdown 渲染。

#### Structure

从标题、frontmatter、schema 中解析结构化大纲。

例如 Performance：

```text
Performance Overview
Character Performance Matrix
Emotion Arc
Action Timing
Storyboard Handoff Notes
```

#### Trace

显示依赖关系：

```text
Upstream:
- script.md
- design_prompts.md

Downstream:
- storyboard_prompt_pack.md
- video_prompt_pack.md
```

#### Diff

对比前一版或上次审批前版本。

#### Raw

原始 Markdown / JSON。

### 10.5 All Artifacts 全局产物库

右上角提供：

```text
All Artifacts
```

打开抽屉：

```text
Filters:
[Core] [Support] [Review] [Handoff] [Final only] [Needs Review]

Groups:
Design Prompts
  character_prompts.md
  scene_prompts.md
  prop_prompts.md

Performance Direction
  performance_direction.md
  character_performance_matrix.md

Audio Design
  audio_design.md
  segment_sound_map.md

Video Prompt Packs
  video_prompt_pack_cn.md
  video_prompt_pack_en.md
```

这个入口解决跨阶段查找问题。

---

## 11. 导演表演产物详细设计

### 11.1 定位

导演表演阶段的目标是：

> 把剧本中的角色行为、情绪变化、动作节奏、喜剧 timing、表演层次，转译成后续分镜和视频提示词能继承的表演指令。

### 11.2 主产物

```text
sceneforge/stages/performance/outputs/performance_direction.md
```

### 11.3 建议结构

```markdown
# Performance Direction / 导演表演设计

## 1. 表演总基调

## 2. 角色表演矩阵

### Character A
- 外在行为：
- 内在情绪：
- 表情关键词：
- 身体动作：
- 喜剧 timing：
- 与道具交互：
- 禁区：

### Character B
...

## 3. 情绪弧线

## 4. 动作节奏与停顿

## 5. Beat 级表演说明

## 6. 给 Storyboard 的下游指令

## 7. 给 Video Prompt 的下游指令
```

### 11.4 UI 表现

中间区可分为：

```text
Overview
Character Matrix
Beat Notes
Downstream Notes
```

右侧 Inspector 显示：

```text
Used by:
- Storyboard Prompts
- Video Prompt Packs

Validation:
- character matrix complete
- emotion arc complete
- downstream notes present
```

---

## 12. 声音设计产物详细设计

### 12.1 定位

声音设计阶段的目标是：

> 把故事节奏、角色动作、空间环境、情绪变化，转译成音乐、环境声、拟音、声音转场和每段视频 prompt 的声音执行策略。

### 12.2 主产物

```text
sceneforge/stages/audio/outputs/audio_design.md
```

### 12.3 建议结构

```markdown
# Audio Design / 声音设计

## 1. 总体声音风格

## 2. 音乐方向

## 3. 环境声基调

## 4. 拟音策略

## 5. Segment Sound Map

### Segment 01
- music cue:
- ambient bed:
- foley:
- transition:
- silence / pause:
- must enter video prompt:

### Segment 02
...

## 6. Video Prompt Sound Execution Handoff

## 7. 声音禁区
```

### 12.4 与视频提示词关系

视频提示词阶段必须读取：

```text
audio_design.md
segment_sound_map.md
```

并将其转化为：

```text
pack_audio_execution_plan
segment_sound_execution
```

### 12.5 UI 表现

声音设计可以用表格 / 分段卡片展示：

```text
Segment | Music | Ambient | Foley | Transition | Used in Video Prompt
01      | ...   | ...     | ...   | ...        | yes
02      | ...   | ...     | ...   | ...        | yes
```

第一版可以先用 Markdown + Structure View，后续再做表格化编辑器。

---

## 13. Agent / MCP 交互设计

### 13.1 不建议以 PTY 作为主路径

v9-dev 的 PTY Bridge 适合快速验证，但产品化后建议主路径采用 MCP 工具。

原因：

- MCP 工具更结构化
- 不依赖解析终端输出
- 错误更可控
- UI 可以直接绑定任务状态
- Agent 不需要猜命令
- 更符合 lingji-cut 现有 Agent/MCP 设计模式

### 13.2 SceneForge MCP 工具

```text
scene_get_project_state
scene_get_current_stage
scene_get_stage_context
scene_start_stage
scene_submit_stage_draft
scene_write_artifact
scene_validate_stage
scene_complete_stage
scene_request_revision
scene_list_artifacts
scene_read_artifact
scene_get_artifact_trace
scene_export_prompt_pack
```

### 13.3 工具边界

Agent 不能直接写：

```text
project.json
sceneforge/state.json
sceneforge/artifact_manifest.yaml
```

Agent 可以通过工具提交：

```text
draft content
stage output
revision
review notes
```

应用负责：

```text
写文件
注册 artifact
更新状态
运行 validator
触发审批
通知 UI
```

### 13.4 Stage Context

`scene_get_stage_context` 返回：

```json
{
  "project": {},
  "stage": "storyboard",
  "task": "generate",
  "requiredInputs": [
    {
      "stage": "design",
      "path": "sceneforge/stages/design/outputs/design_prompts.md"
    },
    {
      "stage": "script",
      "path": "sceneforge/stages/script/outputs/script.md"
    },
    {
      "stage": "performance",
      "path": "sceneforge/stages/performance/outputs/performance_direction.md"
    }
  ],
  "outputContract": {},
  "approvalPolicy": "required",
  "forbiddenActions": [
    "do_not_advance_stage_directly",
    "do_not_modify_state_file",
    "do_not_read_unlisted_project_files"
  ]
}
```

---

## 14. 任务与进度交互设计

### 14.1 Task 类型

```text
scene_source_intake
scene_topic_gate
scene_reference
scene_story
scene_assets
scene_design
scene_script
scene_performance
scene_storyboard
scene_audio
scene_video_prompts
scene_publish
scene_export
scene_validate
scene_revision
```

### 14.2 Task 状态

沿用 lingji-cut 的任务心智：

```text
pending
running
succeeded
failed
canceled
```

### 14.3 UI 进度展示

底部状态栏显示：

```text
Generating Storyboard Prompts...
Step 2 / 5: Building control board prompts
Elapsed: 01:32
[Cancel]
```

完成后：

```text
Storyboard Prompts generated.
Validation: Passed
Approval: Required
[Review Now]
```

失败后：

```text
Validation failed: Missing Master Board Prompt
[Open Error]
[Ask Agent to Fix]
[Edit Manually]
```

---

## 15. Validator 设计

### 15.1 Validator 不改变创作内容，只守住边界

Validator 的目标不是把产物写成统一模板，而是保证核心结构完整。

### 15.2 三层校验

```text
Level 1: File / Manifest
- 文件是否存在
- 是否注册 artifact
- 是否在允许目录
- kind / role 是否正确

Level 2: Structure
- 必须标题是否存在
- frontmatter 是否完整
- 核心段落是否缺失

Level 3: Semantic
- 禁用词
- 角色名一致性
- segment 连续性
- 上下游引用完整性
- 声音执行是否进入 video prompts
```

### 15.3 核心阶段校验重点

Design：

```text
- character prompts present
- scene prompts present
- prop prompts present
- master reference prompt present
- visual continuity seed present
```

Storyboard：

```text
- storyboard prompt pack present
- control board prompts present
- style board prompts present
- master board prompt present
- shot continuity present
- downstream video prompt notes present
```

Video Prompts：

```text
- video prompt pack present
- segment structure present
- audio execution present
- visual continuity present
- negative constraints present
- model adaptation notes present
```

Performance：

```text
- character performance matrix present
- emotion arc present
- beat notes present
- downstream storyboard notes present
```

Audio：

```text
- audio overview present
- segment sound map present
- video prompt handoff present
```

---

## 16. 导出包设计

### 16.1 Export Package

最终导出：

```text
final_prompt_pack.md
design_prompts.md
storyboard_prompts.md
video_prompts.md
sound_design.md
performance_direction.md
publish_copy.md
manifest.json
```

### 16.2 导出 UI

```text
Export Prompt Pack

Included:
✓ Design Prompts
✓ Storyboard Prompts
✓ Video Prompt Packs
✓ Audio Design
✓ Performance Direction
✓ Publish Copy

Options:
[ ] Include support artifacts
[ ] Include English video prompts
[ ] Include validation reports
[ ] Export as Markdown folder
[ ] Export as ZIP

[Export]
```

---

## 17. 关键交互功能清单

### 17.1 项目创建

用户选择：

```text
New Project
  - Lingji Video Project
  - SceneForge Prompt Pack Project
```

SceneForge Project Setup：

```text
项目名称
项目 slug
输入类型：
  - 文字创意
  - 视频解析文本
  - 已有剧本
  - 参考片段说明

目标风格：
  - 3D 动画电影
  - 动画喜剧
  - 写实动画
  - 自定义

Pipeline：
  - Reference Remake
  - Original Scene
  - Prompt Pack Only
```

### 17.2 阶段运行

阶段卡按钮：

```text
[Run]
[Validate]
[Review]
[Continue]
```

### 17.3 产物打开

任何阶段：

```text
Click stage row -> open best artifact
Click arrow -> expand artifact list
Click artifact -> open in Inspector
```

### 17.4 手动编辑

用户可以打开产物并点击：

```text
[Edit]
[Save Draft]
[Validate]
[Mark as Final]
```

核心产物编辑后必须重新校验。

### 17.5 请求修订

```text
[Request Revision]
输入修订要求
选择修订范围：
  - current file
  - current stage
  - regenerate from upstream
```

### 17.6 上下游追踪

Inspector 中显示：

```text
Upstream
Current
Downstream
```

点击上游可直接打开对应产物。

### 17.7 自动继续

对 `auto_if_valid` 阶段：

```text
Run Stage -> Validate Passed -> Auto Continue Next Stage
```

但 UI 必须显示自动推进记录。

### 17.8 核心节点暂停

对 `required` 阶段：

```text
Run Stage -> Validate Passed -> Waiting User Review
```

用户操作：

```text
Approve & Continue
Request Revision
Edit Manually
Regenerate
```

---

## 18. 实施路线图

### Phase 0：fork 与低侵入扩展点

目标：

- 跑通 lingji-cut fork
- 新增 SceneForge 项目类型
- 新增 SceneForge Studio 空页面
- 不改原有视频工作流

交付：

```text
src/sceneforge/pages/SceneForgeStudio.tsx
electron/sceneforge/index.ts
project.json type=sceneforge
```

### Phase 1：SceneForge 项目模型与目录

目标：

- 创建 SceneForge 项目目录
- 写入 project.json
- 初始化 sceneforge/state.json
- 初始化 pipeline.yaml
- 初始化 artifact_manifest.yaml

### Phase 2：Pipeline Flow 与 Artifact Inspector

目标：

- 左侧阶段树
- 右侧产物预览
- All Artifacts 抽屉
- 产物分级：Core / Support / Review

### Phase 3：核心三产物工作区

目标：

- Design Workspace
- Storyboard Workspace
- Video Prompt Workspace
- 保留现有 SceneForge 核心产物结构

### Phase 4：支撑产物工作区

目标：

- Script
- Performance Direction
- Audio Design
- Publish

### Phase 5：MCP 工具与 Agent 执行

目标：

- Agent 可通过 MCP 执行阶段
- 不直接读写状态文件
- 应用负责 artifact 注册和 validator

### Phase 6：Approval Policy 与自动流程

目标：

- `required / optional / auto_if_valid / skip`
- 核心阶段人工审批
- 支撑阶段自动通过

### Phase 7：Export Package

目标：

- 导出 Prompt Pack
- 导出 ZIP
- 导出支撑产物附录

---

## 19. 最终建议

这次设计应坚持一个核心判断：

> **SceneForge 的创作主线和核心产物是产品灵魂，不能为了工程化而大改；lingji-cut 的价值是给它一个成熟的本地创作工具底座，让流程控制、状态管理、产物浏览、审批和 Agent 执行变得产品化。**

最终产品应该是：

```text
lingji-cut 原生风格的 SceneForge Studio
```

而不是：

```text
v9-dev Web Console 搬到 Electron
```

也不是：

```text
lingji-cut 里加一个 Markdown prompt 工具
```

更准确地说：

> **它是一个面向 AI 视频创作者的 Prompt Pack 编译工作台：核心产物强展示，支撑产物稳定可查，流程由应用控制，Agent 负责阶段生成，Validator 保证结构，审批策略可配置，最终导出可用于图片、故事板与视频生成的完整创作包。**
