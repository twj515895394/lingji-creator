# 从 scene_forge v9-dev 到 SceneForge Studio 的取舍清单

> 日期：2026-06-16  
> 状态：设计草案  
> 源项目：`/Users/tangwujun/Documents/trae_projects/scene_forge`  
> 源分支：`codex/v9-dev`

## 1. 迁移结论

`scene_forge` v9-dev 是问题域和工程实验的高价值参考，但不是目标产品架构。

目标不是：

```text
把 v9-dev Web Console 搬进 Lingji Cut
```

而是：

```text
把 v9-dev 验证过的阶段、产物、状态、校验经验，重构为 Lingji Cut 原生 SceneForge Studio。
```

## 2. 可复用内容

### 2.1 阶段主线

可复用阶段认知：

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
```

第一版不需要全量实现，但阶段命名和依赖应与该主线兼容。

### 2.2 Artifact Manifest 思路

可复用：

- 产物必须注册。
- final / draft / review 物理隔离。
- 下游只读 `readable_by_downstream=true` 的 final 产物。
- manifest 是 UI 和上下文构建的主要依据。

需要改造：

- Manifest 路径从根目录 `artifacts.manifest.yaml` 收敛到 `sceneforge/artifact_manifest.yaml`。
- 字段命名与 Lingji Cut TypeScript 类型统一。
- 加入 `displayPriority`、`viewModes`、`usedBy`、`coreAsset` 等 UI 需要字段。

### 2.3 State Machine 思路

可复用：

- 阶段依赖检查。
- `in_progress`、`validated`、`completed` 的基本流转。
- validation result 落盘。
- handoff 生成思路。

需要改造：

- 增加 `waiting_approval`、`approved`、`revision_requested`。
- `validated` 不再等同于可 completed。
- 核心阶段必须经过用户审批。
- 状态文件从 `PROJECT_STATE.json` 收敛到 `sceneforge/state.json`。

### 2.4 Validator 规则

可复用：

- Design 必须包含角色、场景、道具、总参考图 Prompt。
- Storyboard 必须包含 control/styled/master board、shot continuity。
- Video Prompts 必须包含 segment、audio execution、visual continuity、negative constraints、prompt trace。
- Performance / Audio 的支撑结构可作为二期增强。

需要改造：

- Validator 不读取 `PROJECT_BOARD.md` 作为主状态依据。
- Validator 输出需要适配 UI 高亮、Artifact Inspector 和 task progress。
- Validator 错误码要稳定，供 MCP 和 UI 使用。

### 2.5 CLI JSON API 经验

可复用：

- `status --json`
- `validate --stage --json`
- 结构化错误返回。
- 明确 error_code / message / details。

需要改造：

- Lingji Cut 内部主路径应是 service + MCP，不是 shelling out 到 CLI。
- CLI 可作为后续 headless 能力，不作为第一版 Studio 的内部依赖。

## 3. 不迁移内容

### 3.1 Web Console UI

不迁移：

- `apps/web-console` 的三栏 Web Console 实现。
- shadcn 独立组件体系。
- Lobby / VariantB 聊天布局。
- 独立 CSS 视觉风格。

原因：

- Lingji Cut 已有桌面工具 UI 体系。
- SceneForge Studio 应与 ScriptWorkbench / Editor / Settings 风格一致。
- 搬 Web Console 会形成第二套产品。

### 3.2 PTY Bridge 主路径

不以 PTY 作为主路径：

- 不解析终端输出驱动 UI。
- 不依赖 `claude --print` 输出文本判断状态。
- 不把自然语言命令作为阶段推进依据。

原因：

- MCP 工具更结构化。
- UI 状态可直接绑定 service 返回。
- 错误与权限边界更可控。

### 3.3 PROJECT_BOARD 主控

不迁移 `PROJECT_BOARD.md` 主控模型。

保留方式：

- 可生成 `PROJECT_BOARD.md` 作为人类摘要。
- 可供外部 Agent 快速理解项目。
- 不作为 UI、Validator、Stage Context 的权威状态源。

权威源：

```text
project.json
sceneforge/state.json
sceneforge/artifact_manifest.yaml
```

### 3.4 Claude 直接写状态文件

不允许 Agent 直接写：

```text
project.json
sceneforge/state.json
sceneforge/artifact_manifest.yaml
```

Agent 只可提交：

```text
stage draft
revision instruction
review note
```

应用负责写盘和推进。

## 4. v9-dev 风险转化为 Studio 设计约束

| v9-dev 风险 | Studio 约束 |
| --- | --- |
| 状态机无硬约束 | 状态推进只能由 ScenePipelineService 执行 |
| Manifest 更新依赖 Claude 自觉 | Artifact Store 写入后自动注册 |
| Validator 未接入工作流 | Validator 是 approve/complete 前置条件 |
| Claude 可直接读写文件 | MCP 只返回 Stage Context 和结构化提交入口 |
| Web Console 与 Engine 状态割裂 | Electron service 是唯一主路径 |
| draft/final 容易混读 | Stage Context 只暴露 approved final 产物 |

## 5. 建议迁移步骤

### Step 1: 规则提取

从 v9-dev 提取：

- Stage id / display name / dependencies。
- Core artifact required list。
- Validator required headers / markers。
- 常用 error code 和 suggestion。

输出到 Lingji Cut：

```text
electron/sceneforge/pipeline/scene-stage-definitions.ts
electron/sceneforge/validators/*
```

### Step 2: 数据模型重写

不要复制旧 `Project` 类；按 Lingji Cut 项目模型重写：

```text
project.json.sceneforge
sceneforge/state.json
sceneforge/artifact_manifest.yaml
```

### Step 3: Artifact Store 先行

先实现 Artifact Store，再做 UI。因为 UI、Stage Context、Export、Validator 都依赖 manifest 和 artifact content。

### Step 4: 核心三阶段 Validator

只先做：

- Design Validator。
- Storyboard Validator。
- Video Prompts Validator。

Performance / Audio Validator 二期补。

### Step 5: UI 绑定 service

UI 不直接读目录，不扫文件。所有数据来自 Electron API：

```text
sceneGetProjectState
sceneListArtifacts
sceneReadArtifact
sceneValidateStage
```

## 6. 兼容旧项目策略

第一版不承诺直接打开 v9-dev 旧项目并完整迁移。

可提供“导入参考”能力：

- 读取旧项目 `outputs/`、`details/`、`artifacts.manifest.yaml`。
- 显示可导入产物列表。
- 用户选择核心产物导入新 SceneForge Studio 项目。
- 导入后重新生成 `sceneforge/artifact_manifest.yaml`。

不做：

- 自动迁移所有 `PROJECT_STATE.json` 状态。
- 自动迁移 Web Console 会话。
- 自动继承 Claude session。

## 7. 验收方式

迁移设计通过标准：

- 能解释每个 v9-dev 模块是“复用、改造、废弃、延后”中的哪一种。
- 第一版没有引入 `apps/web-console` 运行时依赖。
- 第一版没有以 `PROJECT_BOARD.md` 作为状态推进依据。
- 第一版核心闭环可在 Lingji Cut 原生 UI 中完成。
- Validator 和 Approval 都由应用控制，而不是由 Agent 自述完成。

