# Stage Context 与 Handoff 设计

> 日期：2026-06-17  
> 状态：已定稿（approved）  
> 依赖：Issues 01–12（Artifact Store、Stage Context 初版、Asset Library）

## 1. 问题陈述

当前 `SceneForgeService.getStageContext` 对 `storyboard` / `video_prompts` 将上游 **全部 `requiredArtifacts` 全文** 放入 `requiredInputs`，且 **video 阶段缺少 audio、performance**，与旧 SceneForge `scene-video-prompt-builder` 的「紧凑预算」和架构 v2 不一致，易导致 **上下文爆炸** 或 **关键声音/表演信息缺失**。

目标：

- 程序按 **声明式 contextPolicy** 组装上下文；**handoff 为第一来源**；**acp 可同时包含 policy 允许的 full**。
- Agent **不**扫描项目目录；**不**默认「凡 approved 则全文」。

## 2. 概念模型

```text
Stage Definition (dependencies, requiredArtifacts)  → 状态机 / Validator「文件是否存在」
Context Policy (context-policy.yaml)              → 生成 / Runner「喂给模型什么」
Handoff (sceneforge/handoffs/<stage>.handoff.json)→ approve 时写的下游专用摘要+指针
```

二者分离：**校验要齐** ≠ **生成要全读**。

## 3. context-policy.yaml

### 3.1 位置

```text
prompts/sceneforge/
  pipeline/
    default-context-policy.yaml    # 可选：全局默认 delivery 上限
  stages/
    video_prompts/
      context-policy.yaml
      handoff-template.yaml        # 本阶段 approve 时产出 handoff 的字段模板
```

固定策略放 **YAML**（易迁移、易 diff、不编译进 TS）。运行时由 **`SceneContextBuilder`** 读取（新文件，SRP）。

### 3.2 Schema（v1 草案）

```yaml
version: 1
stage: video_prompts
consumerRunners: [manual_submit, direct_llm, acp_agent]  # 可选：限制适用 runner

inputs:
  - id: storyboard_pack
    fromStage: storyboard
    artifactKey: storyboard_prompt_pack
    delivery: handoff_first          # handoff | full | summary | handoff_first | pointer
    fallback: full                   # handoff 缺失时
    required: true

  - id: audio_plan
    fromStage: audio
    artifactKey: audio_design
    delivery: handoff_first
    fallback: full
    required: true

  - id: performance_sheet
    fromStage: performance
    artifactKey: performance_direction
    delivery: full                   # MVP：表演细节怕丢，直接 full
    required: true

  - id: design_master
    fromStage: design
    artifactKey: master_reference_prompt
    delivery: full
    required: true

  - id: design_summary
    fromStage: design
    artifactKey: design_prompts
    delivery: handoff_first
    fallback: summary
    required: false

optionalInputs:
  - fromStage: design
    artifactKey: character_prompts
    delivery: summary
    maxChars: 6000

assetLibrary:
  allowSelectedStyleProfile: true    # 合并 resolveSceneAssetsForStage

forbidden:
  - { fromStage: design, artifactKey: prop_prompts }   # 示例：video 可不读

runnerOverrides:
  acp_agent:
    maxTotalChars: 120000            # 软预算，超限则截断 summary 并打 warning
  direct_llm:
    maxTotalChars: 200000
```

**delivery 语义：**

| delivery | 行为 |
| --- | --- |
| `handoff` | 仅 `handoffs/<fromStage>.handoff.json` 内对应切片 |
| `handoff_first` | 有 handoff 用 handoff；否则 `fallback` |
| `full` | `readSceneArtifact` 全文进 `content` |
| `summary` | Display Model summary 或程序截断 |
| `pointer` | 仅 id/path/title，无 content（acp 用 `scene_read_artifact` 按需拉） |

### 3.3 与 manifest `usedBy` 的关系

- **逐步替代**「仅靠 `resolveUsedBy` + 全文」的 optional 逻辑。
- 过渡期：`usedBy` 仅作 **未写 policy 的阶段** 回退；core 三阶段 **必须** 有 `context-policy.yaml`。

## 4. 分阶段策略（MVP，已确认）

### 4.1 storyboard（消费者）

对齐 `scene-storyboard-director` 输入边界（旧 skill）：

| 输入 | artifactKey（lingji） | delivery（MVP） |
| --- | --- | --- |
| design | master_reference_prompt, character_prompts, scene_prompts | handoff_first + full fallback 关键项 |
| script | script_draft | handoff_first / full |
| performance | performance_direction | full |
| 风格 | style profile（assets） | snippets（selectedIds） |

**不**默认 design 五文件全文（除非 policy 显式）。

### 4.2 video_prompts（消费者）— 已确认 MVP

| 输入 | artifactKey | delivery（MVP） |
| --- | --- | --- |
| storyboard | storyboard_prompt_pack | handoff_first, fallback **full** |
| audio | audio_design | handoff_first, fallback **full** |
| performance | performance_direction | **full** |
| design | master_reference_prompt | **full** |
| design | design_prompts | handoff_first, fallback summary |
| storyboard 其他板 | control/style/master board | handoff 或 summary，**非**默认全文 |

**明确禁止（MVP default policy）：** 将 design 五文件 + storyboard 四文件无差别全文堆入 `requiredInputs`（即废除当前 9 文件行为）。

### 4.3 design（消费者）

| 输入 | 来源 | delivery |
| --- | --- | --- |
| assets / story / reference | 支撑阶段 handoff | handoff_first |
| style profile | assets registry | snippets |

## 5. Handoff

### 5.1 路径

```text
<project>/sceneforge/handoffs/
  design.handoff.json
  storyboard.handoff.json
  audio.handoff.json
  performance.handoff.json
  video_prompts.handoff.json   # 可选：给 publish/export
```

### 5.2 生成时机

- 在 **`approveStage` 成功路径**（或 `auto_if_valid` 进入 approved 等价路径）调用 **`SceneHandoffWriter`**。
- 输入：该阶段 final artifacts + `handoff-template.yaml` + 可选 Display Model 结构字段。
- 输出：JSON；写入后登记 **system artifact** 或仅索引在 manifest（实现时二选一，须可 trace）。

### 5.3 下游读取顺序

```text
buildContext(input)
  → 对每条 policy：先 handoff slice
  → 缺失则 fallback（full/summary）
  → 记录 warnings[] 进 StageContext
```

### 5.4 handoff JSON 形状（示例片段）

```json
{
  "version": 1,
  "sourceStage": "audio",
  "generatedAt": "ISO-8601",
  "downstreamNotes": {
    "video_prompts": {
      "segmentSoundMap": [],
      "packAudioExecutionSummary": "",
      "continuityHooks": []
    }
  },
  "pointers": [
    { "artifactId": "audio.audio_design", "path": "sceneforge/stages/audio/outputs/audio_design.md" }
  ]
}
```

## 6. API 形状变更（概念）

### 6.1 `SceneStageContext` 扩展

```ts
interface SceneStageContextInput {
  stage: SceneStageId;
  artifactId: string;
  path: string;
  title: string;
  content: string;              // 可能为空（pointer）
  delivery: DeliveryKind;
  source: 'handoff' | 'artifact' | 'summary' | 'asset_library';
}

interface SceneStageContext {
  // ...existing
  contextPolicyVersion?: number;
  warnings: Array<{ code: string; message: string }>;
  handoffRefs: Array<{ stage: SceneStageId; path: string }>;
  runner?: SceneStageRunnerType;  // 构建时传入，影响 overrides
}
```

### 6.2 MCP

- `scene_get_stage_context` 增加可选参数：`runner?: 'acp_agent' | 'direct_llm' | 'manual_submit'`。
- 文档明确：返回体可能仍较大（含 full）；**禁止**在服务端附加「未在 policy 中的 artifact」。

## 7. 代码落点（SRP，≤800 行）

| 模块 | 路径 | 职责 |
| --- | --- | --- |
| SceneContextBuilder | `electron/sceneforge/pipeline/scene-context-builder.ts` | 读 policy、handoff、artifact，组装 Context |
| SceneHandoffWriter | `electron/sceneforge/pipeline/scene-handoff-writer.ts` | approve 时写 handoff |
| Policy loader | `electron/sceneforge/pipeline/scene-context-policy.ts` | 解析 YAML |
| SceneForgeService | `service.ts` | 委托 builder；**删除**内联 9 文件逻辑 |

## 8. 测试要求

- 更新 `sceneforge-stage-context.test.ts`：video 阶段 **不含** 9 全文；含 audio/performance（有产物时）。
- 新增：handoff 存在时 `source: handoff`；缺失时 fallback。
- 新增：forbidden 项不出现。

## 9. 与现码差距

| 项 | 现码 | 目标 |
| --- | --- | --- |
| video requiredInputs | design×5 + storyboard×4 全文 | policy MVP |
| audio / performance | 未进 video required | policy required |
| handoff | 无 | approve 生成 |
| context source | `getStageContext` 内硬编码 | SceneContextBuilder + yaml |

## 10. 开放问题（实现前可定）

- `script_draft` / `audio_design` 等支撑产物在 lingji 中尚未有完整 submit 链：MVP 可 **测试用 writeSceneArtifact 模拟**，policy 先写好。
- storyboard **details**（Beat/VGU）是否单独 artifactKey：Phase 2 可先塞进 storyboard handoff，后续再拆文件。