Status: completed-local

# SceneForge Electron IPC 与 MCP 工具闭环

Type: AFK

## 父问题

`.scratch/sceneforge-studio/PRD.md`

## 要构建什么

把 SceneForgeService 暴露给 Renderer 和 Agent：Electron IPC 提供 UI 调用面，MCP 工具提供 Agent 调用面。两者必须走同一套服务逻辑，避免 UI 与 Agent 状态推进不一致。

## 验收标准

- [x] Electron main 注册 SceneForge IPC。
- [x] preload 暴露 `sceneGetProjectState`、`sceneGetStageContext`、`sceneSubmitStageDraft`、`sceneValidateStage`、`sceneApproveStage`、`sceneSetApprovalPolicy`、`sceneListArtifacts`、`sceneReadArtifact`、`sceneExportPromptPack`。
- [x] `src/lib/electron-api.ts` 类型与 preload 同步。
- [x] MCP 注册 `scene_get_project_state`、`scene_get_stage_context`、`scene_submit_stage_draft`、`scene_validate_stage`、`scene_approve_stage`、`scene_set_approval_policy`、`scene_list_artifacts`、`scene_read_artifact`、`scene_export_prompt_pack`。
- [x] MCP submit 工具不接受任意 path，只接受 stage、artifactKey 和 content。
- [x] ACP/Agent 执行路径只接收程序构建的 Stage Context 和 Stage Skill Pack 指令，不让 Agent 自行扫描 `.agents/skills`。
- [x] 覆盖 IPC 契约测试和 MCP 注册测试。

## Review Checklist

- [x] main/preload/electron-api 三件套同步，没有漂移。
- [x] MCP 和 UI 调用同一个 SceneForgeService。
- [x] Agent 不能直接写 `project.json`、`state.json`、`artifact_manifest.yaml`。
- [x] 工具错误返回结构化，包含可用于 UI/CLI 展示的 code/message。
- [x] 新增 Pipeline task kind 不破坏现有 pipeline 测试。
- [x] 没有引入 PTY 或解析终端输出作为主路径。
- [x] ACP/Claude CLI 只作为 runner/执行者，不作为流程总控。

## 被阻塞于

- Issue 02：需要审批策略服务。
- Issue 03：需要 Artifact Store。
- Issue 04：需要阶段状态与 Validator。

## Implementation Notes

- 已注册 SceneForge IPC、preload/electron-api 类型面和 MCP 工具面，UI 与 Agent 共用 `SceneForgeService`。
- `scene_get_stage_context` 已在 Issue 09 后包含 Stage Skill Pack 摘要；完整 agent instructions 由 Stage Pack loader 提供。
- 对应执行记录：`.planning/tasks/sceneforge-issue-06-07/`。

## Verification

- 覆盖 IPC 契约、MCP 注册、Pipeline task kind 兼容和 Electron API 类型同步。
- 已纳入 1-9 串联回归：`npx tsc --noEmit` 通过；SceneForge 相关 17 个测试文件共 51 tests passed。

## Remaining Risk

- 当前 MCP 工具注册与契约已覆盖；真实 ACP/Claude CLI runner 执行链路仍由后续 runner issue 扩展。
