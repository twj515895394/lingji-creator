# SceneForge Issue 06-07 Findings

## Requirements

### Issue 06

- Electron main 注册 SceneForge IPC。
- preload / `src/lib/electron-api.ts` 暴露并同步 `scene*` 方法。
- MCP 注册 `scene_get_project_state`、`scene_get_stage_context`、`scene_submit_stage_draft`、`scene_validate_stage`、`scene_approve_stage`、`scene_set_approval_policy`、`scene_list_artifacts`、`scene_read_artifact`、`scene_export_prompt_pack`。
- MCP submit 工具不接受任意 path。
- 新增 Pipeline task kind 不破坏现有 pipeline 测试。

### Issue 07

- Studio 显示 Design / Storyboard / Video Prompts 三个核心阶段。
- Artifact Inspector 显示 Preview / Structure / Trace / Raw。
- 预留 Copy tab/slot，不实现复制逻辑。
- Approval Policy 控件显示 Required / Optional / Auto if valid / Skip。
- 改策略时调用 `sceneSetApprovalPolicy`。
- 核心阶段切到 `auto_if_valid` 或 `skip` 时显示风险确认。
- Validator failed 时 UI 不允许 Approve & Continue。

## Research Findings

- Issue 04/05 已有 `SceneForgeService`，但只暴露 Design/Storyboard/Video 草案提交、审批和 Stage Context。
- `electron/main.ts` 当前已有旧的 `create-scene-forge-project` handler，可保留并新增 namespaced IPC。
- MCP 工具集中注册在 `electron/pipeline/tools/register.ts`，可引入 SceneForge 工具注册函数。
- Studio 当前是静态 shell，需要引入基础状态、tabs、策略控件和 Inspector 空/加载/错误状态。

## Resources

- `.scratch/sceneforge-studio/issues/06-electron-ipc-and-mcp-tools.md`
- `.scratch/sceneforge-studio/issues/07-studio-ui-artifact-inspector-and-approval-controls.md`
- `electron/sceneforge/service.ts`
- `electron/pipeline/tools/register.ts`
- `src/sceneforge/pages/SceneForgeStudio.tsx`
