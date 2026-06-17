# SceneForge Studio 领域契约设计

> 日期：2026-06-16  
> 状态：设计草案  
> 目标：定义第一版核心流程的稳定领域对象和边界。

## 1. 设计原则

- `project.json` 是应用主工程文件。
- `sceneforge/state.json` 是 SceneForge 阶段状态源。
- `sceneforge/artifact_manifest.yaml` 是产物索引源。
- `PROJECT_BOARD.md` 可作为可读摘要，不作为主状态源。
- Agent 不直接写状态文件，只提交内容草案和修订请求。
- 下游阶段只能读取 Stage Context 显式列出的上游产物。

## 2. Project Contract

`project.json` 新增 SceneForge 段落：

```json
{
  "type": "sceneforge",
  "name": "百万英镑名场面动画化再创作",
  "slug": "million-pound-note",
  "sceneforge": {
    "version": 1,
    "projectRoot": "sceneforge",
    "pipelineId": "reference_remake",
    "currentStage": "design",
    "status": "in_progress",
    "coreArtifacts": {
      "design": null,
      "storyboard": null,
      "videoPrompts": null
    },
    "lastExportPath": null
  }
}
```

第一版不要求普通 Lingji Video Project 与 SceneForge Project 相互转换。

## 3. Directory Contract

推荐项目目录：

```text
project.json
inputs/
  source.md
  user_brief.md
sceneforge/
  state.json
  pipeline.yaml
  approval_policy.yaml
  artifact_manifest.yaml
  decision_log.jsonl
  stages/
    design/
      stage.json
      context_pack.json
      outputs/
      details/
      reviews/
    storyboard/
      stage.json
      context_pack.json
      outputs/
      details/
      reviews/
    video_prompts/
      stage.json
      context_pack.json
      outputs/
      details/
      reviews/
    performance/
      outputs/
      details/
    audio/
      outputs/
      details/
  runtime/
    tasks/
    validation/
    agent_runs/
  exports/
    prompt_pack/
    zip/
```

MVP 只要求 Design、Storyboard、Video Prompts 三个核心阶段完整；Performance、Audio、Script 可作为支撑阶段先落地最小产物。

## 4. Stage Contract

默认阶段顺序：

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

MVP 执行主线：

```text
design
-> storyboard
-> video_prompts
-> export
```

支撑阶段可作为输入或后续增强，不阻塞核心闭环。

Stage 状态：

```text
ready
in_progress
draft_submitted
validation_failed
validated
waiting_approval
approved
revision_requested
completed
skipped
```

核心阶段的完成条件：

```text
draft_submitted
-> validated
-> waiting_approval
-> approved
-> completed
```

`validated` 不等于 `approved`。Validator 只证明结构完整，用户审批才证明创作方向可进入下游。

## 5. Approval Policy

策略枚举：

```text
required
optional
auto_if_valid
skip
```

审批策略必须可配置，不能写死在代码分支中。默认策略来自内置 pipeline definition，项目创建时写入 `sceneforge/approval_policy.yaml`；用户可在项目级覆盖某个阶段策略。运行时以“项目覆盖 > pipeline 默认值”的顺序解析。

默认策略：

| Stage | Policy | 原因 |
| --- | --- | --- |
| design | required | 决定角色、场景、道具和视觉统一性 |
| storyboard | required | 决定镜头语言、构图、动作节奏 |
| video_prompts | required | 直接面向外部视频模型 |
| performance | auto_if_valid | 支撑产物，可先自动推进 |
| audio | auto_if_valid | 支撑产物，可先自动推进 |
| publish | optional | 用户可后续调整 |
| export | required | 最终交付前需要确认 |

推荐配置形态：

```yaml
version: 1
defaults:
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
overrides:
  performance: required
  audio: optional
```

`overrides` 为空时使用默认策略。UI 可以允许用户把某些支撑阶段改为 required，也可以把核心阶段从 required 改为 optional，但必须显示风险提示：核心阶段未人工审批会增加下游返工风险。

任何阶段出现以下情况必须暂停：

- Validator failed。
- 核心产物为空或过短。
- Manifest 中缺少已写入产物。
- 下游依赖的 approved 核心产物缺失。
- 用户策略要求人工审批。

## 6. Artifact Contract

Artifact 必备字段：

```json
{
  "id": "storyboard-prompt-pack-v1",
  "stage": "storyboard",
  "kind": "final",
  "role": "core_generation_asset",
  "title": "故事板 Prompt Pack",
  "path": "sceneforge/stages/storyboard/outputs/storyboard_prompt_pack.md",
  "coreAsset": true,
  "displayPriority": 100,
  "readableByDownstream": true,
  "usedBy": ["video_prompts", "export"],
  "viewModes": ["preview", "structure", "copy", "trace", "raw"],
  "displayModelVersion": 1,
  "copyTargets": ["full", "section", "prompt"],
  "primaryCopyTarget": "full",
  "createdAt": "2026-06-16T00:00:00.000Z"
}
```

Artifact kind：

```text
preview
draft
review
final
system
export
```

Artifact role：

```text
core_generation_asset
support_direction_asset
system_review_asset
export_asset
```

## 7. Core Artifacts

Design：

```text
design_prompts.md
character_prompts.md
scene_prompts.md
prop_prompts.md
master_reference_prompt.md
```

Storyboard：

```text
storyboard_prompt_pack.md
control_board_prompts.md
style_board_prompts.md
master_board_prompt.md
```

Video Prompts：

```text
video_prompt_pack.md
video_prompt_pack_cn.md
video_prompt_pack_en.md optional
```

## 8. Support Artifacts

```text
script.md
performance_direction.md
character_performance_matrix.md
emotion_arc.md
audio_design.md
segment_sound_map.md
story_development.md
asset_check.md
publish_copy.md
```

支撑产物可以被下游读取，但必须通过 manifest 和 Stage Context 显式授权。

## 9. Artifact Display Model Contract

核心三阶段最终产物不能只是一份长 Markdown。Artifact Store 读取 `kind=final` 且 `coreAsset=true` 的产物时，需要提供面向 UI 和程序取值的 Display Model。

```json
{
  "artifactId": "video-prompt-pack-v1",
  "displayModelVersion": 1,
  "title": "Video Prompt Pack",
  "summary": "用于外部视频模型的最终分段提示词包。",
  "sections": [
    {
      "id": "segment-01",
      "title": "Segment 01",
      "kind": "prompt",
      "copyBlockIds": ["segment-01-prompt"]
    }
  ],
  "copyBlocks": [
    {
      "id": "segment-01-prompt",
      "label": "复制 Segment 01 Prompt",
      "target": "prompt",
      "format": "plain_text",
      "text": "A cinematic 3D animated shot..."
    }
  ],
  "warnings": []
}
```

Copy Block 规则：

- `text` 必须是可直接粘贴到外部图片或视频生成工具的纯文本。
- `id` 必须稳定，不能包含时间戳或随机数。
- `target` 第一版支持 `full`、`section`、`prompt`。
- 解析失败时返回 warning，并提供 raw full copy 兜底。
- raw content 仍然保留，Display Model 只是 UI 和程序消费层。

核心产物至少提供：

| Stage | Required copy blocks |
| --- | --- |
| design | full、character、scene、prop、master_reference |
| storyboard | full、control_board、style_board、master_board、segment_prompt |
| video_prompts | full、video_pack_cn、video_pack_en optional、segment_prompt |

## 10. Stage Context Contract

`scene_get_stage_context` 返回：

```json
{
  "stage": "storyboard",
  "task": "generate",
  "requiredInputs": [
    {
      "stage": "design",
      "artifactId": "design-prompts-v1",
      "path": "sceneforge/stages/design/outputs/design_prompts.md"
    }
  ],
  "optionalInputs": [
    {
      "stage": "performance",
      "artifactId": "performance-direction-v1",
      "path": "sceneforge/stages/performance/outputs/performance_direction.md"
    }
  ],
  "outputContract": {
    "requiredArtifacts": ["storyboard_prompt_pack", "control_board_prompts", "style_board_prompts"]
  },
  "approvalPolicy": "required",
  "forbiddenActions": [
    "do_not_modify_state_file",
    "do_not_modify_manifest_directly",
    "do_not_read_unlisted_project_files",
    "do_not_advance_stage_directly"
  ]
}
```

## 11. Validator Contract

三层校验：

1. File / Manifest：文件存在、路径合法、manifest 已注册、kind/role 正确。
2. Structure：标题、frontmatter、核心章节、段落结构完整。
3. Semantic：角色/场景一致性、segment 连续性、声音执行继承、禁用词、上游引用完整性。

Validator 输出：

```json
{
  "stage": "video_prompts",
  "status": "failed",
  "validatedAt": "2026-06-16T00:00:00.000Z",
  "errors": [
    {
      "code": "SF-VIDEO-SEGMENT-MISSING-AUDIO",
      "level": "error",
      "artifactId": "video-prompt-pack-v1",
      "message": "Segment 03 缺少声音执行说明。",
      "suggestion": "从 audio_design.md 的 Segment Sound Map 继承 music / ambient / foley。"
    }
  ]
}
```

## 12. Export Contract

最终导出目录：

```text
final_prompt_pack.md
design_prompts.md
storyboard_prompts.md
video_prompts.md
performance_direction.md
sound_design.md
publish_copy.md
manifest.json
validation_summary.json
```

MVP 必须包含：

- `design_prompts.md`
- `storyboard_prompts.md`
- `video_prompts.md`
- `manifest.json`
