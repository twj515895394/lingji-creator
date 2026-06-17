# SceneForge Studio Electron / MCP 集成架构

> 日期：2026-06-16  
> 状态：设计草案  
> 目标：定义 SceneForge Studio 如何低侵入接入 Lingji Cut 的 Electron、Pipeline、Task Progress 和 MCP 体系。

## 1. 架构结论

SceneForge Studio 应作为 Lingji Cut 内部独立命名空间实现：

```text
electron/sceneforge/
src/sceneforge/
tests/sceneforge/
docs/sceneforge/
```

主路径不是 PTY，也不是解析 CLI 输出，而是：

```text
Renderer UI
-> preload/electron-api
-> electron/sceneforge service
-> project file + artifact store + validator
-> task-progress / MCP tools
```

Agent 通过 MCP 工具提交草案，应用负责写文件、注册 manifest、更新状态、运行 validator 和触发审批。

## 2. 进程边界

### 2.1 Renderer

Renderer 只负责 UI 与用户交互：

- 展示阶段流。
- 展示当前阶段工作区。
- 展示 Artifact Inspector。
- 发起 run、validate、approve、revision、export 操作。
- 订阅任务进度和项目更新。

Renderer 不直接读写项目目录。

### 2.2 Preload / Electron API

新增 SceneForge API 类型桥接：

```text
sceneCreateProject
sceneLoadProject
sceneGetProjectState
sceneGetStageContext
sceneSubmitStageDraft
sceneValidateStage
sceneApproveStage
sceneRequestRevision
sceneListArtifacts
sceneReadArtifact
sceneExportPromptPack
onSceneProjectUpdated
onSceneTaskUpdate
```

具体命名可在实施计划中与现有 `src/lib/electron-api.ts` 风格对齐。

### 2.3 Main Process

主进程负责：

- 项目初始化。
- 状态机推进。
- 产物写盘。
- Manifest 注册。
- Validator 执行。
- 审批策略判断。
- 导出 Prompt Pack。
- MCP 工具实现。
- 任务状态桥接。

## 3. 推荐目录

```text
electron/sceneforge/
  index.ts
  project/
    scene-project.ts
    scene-project-file.ts
    scene-project-factory.ts
  pipeline/
    scene-stage-definitions.ts
    scene-pipeline-service.ts
    scene-approval-policy.ts
    scene-context-builder.ts
  artifacts/
    scene-artifact-store.ts
    scene-artifact-manifest.ts
    scene-artifact-index.ts
    scene-artifact-trace.ts
  validators/
    scene-validator.ts
    validators.design.ts
    validators.storyboard.ts
    validators.video-prompts.ts
  mcp/
    register-scene-tools.ts
    tools.project.ts
    tools.stage.ts
    tools.artifact.ts
    tools.export.ts
  export/
    scene-prompt-pack-exporter.ts
  adapters/
    lingji-task-progress-adapter.ts
```

Renderer：

```text
src/sceneforge/
  pages/
    SceneForgeStudio.tsx
    SceneForgeProjectSetup.tsx
  components/
    pipeline/
    workspace/
    artifacts/
    approval/
    export/
  stores/
    sceneProjectStore.ts
    scenePipelineStore.ts
    sceneArtifactStore.ts
  hooks/
  types/
```

## 4. Pipeline Service

`ScenePipelineService` 是核心深模块。它对外暴露简单接口：

```ts
interface ScenePipelineService {
  getState(projectDir: string): Promise<SceneProjectState>;
  getStageContext(projectDir: string, stage: SceneStageId): Promise<SceneStageContext>;
  submitDraft(input: SubmitStageDraftInput): Promise<SubmitStageDraftResult>;
  validateStage(projectDir: string, stage: SceneStageId): Promise<SceneValidationResult>;
  approveStage(input: ApproveStageInput): Promise<SceneStageState>;
  requestRevision(input: RequestRevisionInput): Promise<SceneStageState>;
}
```

实现约束：

- `submitDraft` 只接收结构化内容，不允许调用方传任意写入路径。
- 写入路径由 stage definition 和 artifact contract 决定。
- 写入后必须更新 manifest。
- 核心阶段提交后默认进入 `draft_submitted`。
- `validateStage` 成功后进入 `validated` 或 `waiting_approval`。
- `approveStage` 只能在 `validated/waiting_approval` 后调用。

## 4.1 Stage Runner 抽象

流程推进由应用控制，不由模型控制。每次运行阶段时，`ScenePipelineService` 先构建 Stage Context，再选择执行器：

```text
manual_submit
direct_llm
acp_agent
```

推荐接口：

```ts
type SceneStageRunnerType = 'manual_submit' | 'direct_llm' | 'acp_agent';

interface SceneStageRunner {
  type: SceneStageRunnerType;
  run(input: SceneStageRunInput): Promise<SceneStageDraft>;
}
```

三种 runner 的边界：

| Runner | 用途 | 约束 |
| --- | --- | --- |
| `manual_submit` | 用户手动粘贴或测试提交产物 | 只生成 draft，不写状态 |
| `direct_llm` | 应用直接调用 Lingji AI Provider 生成草案 | Prompt 由程序根据 Stage Skill Pack 渲染 |
| `acp_agent` | 通过 ACP/Claude CLI 等 Agent 执行复杂阶段 | Agent 只能使用 Scene MCP 工具提交草案 |

无论使用哪种 runner，最终都必须进入同一条提交路径：

```text
runner output
-> submitStageDraft
-> Artifact Store
-> Manifest
-> Validator
-> Approval Policy
```

Runner 不允许：

- 直接写 `project.json`。
- 直接写 `sceneforge/state.json`。
- 直接写 `sceneforge/artifact_manifest.yaml`。
- 自行把阶段标记为 completed。
- 自行读取 Stage Context 未列出的项目文件。

## 4.2 Stage Skill Pack

每个阶段对应一个 Stage Skill Pack。它不是运行时直接调用的 `.agents/skills/<stage>/SKILL.md`，而是产品内可版本化、可校验、可绑定模型的阶段能力包。

第一版推荐目录：

```text
prompts/sceneforge/
  stages/
    design/
      system.md
      user.md
      agent-instructions.md
      output-contract.yaml
      artifact-templates/
      review-checklist.md
    storyboard/
    video-prompts/
```

Stage Skill Pack 包含：

- `stage definition`：阶段 id、依赖、默认审批策略、允许 runner。
- `prompt templates`：给 `direct_llm` 使用的 system/user prompt。
- `agent instructions`：给 `acp_agent` 使用的阶段执行说明。
- `output contract`：必须产出的 artifact key、角色、路径和结构。
- `artifact templates`：Markdown 产物模板。
- `validator rules`：硬校验规则引用。
- `review checklist`：人工审查清单。
- `version metadata`：版本号、来源、迁移说明。

程序负责加载 Stage Skill Pack，并把需要的规则注入 Stage Context 或 direct LLM prompt。LLM/Agent 不负责自己扫描技能目录，也不负责判断该读哪些规则。

旧 `scene_forge/.agents/skills/scene-forge/**` 的处理方式：

```text
旧 skill 文档
-> 稳定创作规则抽到 prompt templates
-> 硬规则抽到 validator rules
-> 人工判断项抽到 review-checklist.md
-> 产物格式抽到 artifact templates
-> 保留来源引用，便于追溯
```

## 5. Artifact Store

`SceneArtifactStore` 封装大量文件操作，对外提供稳定接口：

```ts
interface SceneArtifactStore {
  writeArtifact(input: WriteSceneArtifactInput): Promise<SceneArtifact>;
  listArtifacts(projectDir: string, filter?: SceneArtifactFilter): Promise<SceneArtifact[]>;
  readArtifact(projectDir: string, artifactId: string): Promise<SceneArtifactContent>;
  getTrace(projectDir: string, artifactId: string): Promise<SceneArtifactTrace>;
}
```

关键规则：

- 不暴露任意文件写入 API。
- 所有 path 必须在项目目录内。
- 所有核心产物必须落在 `sceneforge/stages/<stage>/outputs/`。
- reviews、validation、agent_runs 放入 runtime 或 reviews 目录，不混入 outputs。

## 6. MCP 工具

第一版 MCP 工具：

```text
scene_get_project_state
scene_get_current_stage
scene_get_stage_context
scene_submit_stage_draft
scene_validate_stage
scene_request_revision
scene_list_artifacts
scene_read_artifact
scene_export_prompt_pack
```

后续再加：

```text
scene_approve_stage
scene_get_artifact_trace
scene_compare_artifacts
scene_update_approval_policy
```

### 6.1 Agent 禁止事项

MCP 工具返回给 Agent 的上下文必须明确禁止：

- 直接写 `project.json`。
- 直接写 `sceneforge/state.json`。
- 直接写 `sceneforge/artifact_manifest.yaml`。
- 扫描整个项目目录寻找输入。
- 将 draft/preview 当作 final 输入。
- 自行推进阶段状态。

### 6.2 工具返回值

所有工具返回值应结构化：

```json
{
  "ok": true,
  "projectDir": "/path/to/project",
  "stage": "design",
  "state": "waiting_approval",
  "artifacts": [],
  "validation": null,
  "nextActions": ["review", "request_revision", "approve"]
}
```

错误返回：

```json
{
  "ok": false,
  "errorCode": "SCENE_STAGE_NOT_VALIDATED",
  "message": "Design 阶段尚未通过校验，不能审批。",
  "nextActions": ["validate_stage", "request_revision"]
}
```

## 7. Task Progress

所有超过 2 秒的操作接入 Lingji Cut 统一任务系统：

```text
scene_stage_run
scene_stage_validate
scene_stage_revision
scene_export_prompt_pack
```

任务阶段示例：

```text
Generating Storyboard Prompts
Step 1/4: Building stage context
Step 2/4: Waiting for draft submission
Step 3/4: Registering artifacts
Step 4/4: Running validator
```

第一版如果 Agent 生成由外部客户端完成，应用内任务可以覆盖“提交后写入、注册、校验、审批状态更新”这一段。

## 8. Validator 集成

Validator 不作为 UI 附属功能，而是状态推进前置条件。

```text
submitDraft
-> state: draft_submitted
validateStage
-> validation failed: validation_failed
-> validation passed + required approval: waiting_approval
-> validation passed + auto_if_valid: completed
```

核心阶段即便 Validator passed，也不能自动 completed，必须等待审批。

## 9. 与 v9-dev Engine 的关系

可借鉴：

- `Project` + manifest schema。
- `StateMachine` 状态推进思路。
- `Validator` 三层检查。
- `ArtifactRegistry` 下游读取隔离。
- CLI JSON API 的错误码和结构化输出经验。

不直接搬：

- v9-dev 的 Web Console server。
- Claude 自然语言推进状态。
- PTY bridge 主路径。
- `PROJECT_BOARD.md` 主控模式。

如果复用代码，应先抽象成 Lingji Cut 内部 service，不把 `@scene-forge/engine` 当外部运行时强依赖。

## 10. 测试策略

第一版测试重点：

- Project factory 能生成合法目录和 `project.json`。
- Stage context 只包含允许下游读取的 artifact。
- Submit draft 后 artifact 写入路径正确且 manifest 注册。
- Validator failed 时不能 approve。
- Validator passed 但 required approval 时不能自动 completed。
- Export 只包含 approved 核心产物。
- MCP 工具不能越权写状态文件。
