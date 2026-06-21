# SceneForge Issue 04 Findings

## Requirements

- Design 阶段可提交 `design_prompts`、`character_prompts`、`scene_prompts`、`prop_prompts`、`master_reference_prompt`。
- Design Validator 缺少任一核心产物时返回失败和稳定错误码。
- Validator 通过后，`required` 策略进入 `waiting_approval`，不能把 `validated` 当成 `approved`。
- 用户审批后 Design 状态进入 `approved`。
- Design 未 approved 前不会出现在下游默认 Stage Context。
- 覆盖 `draft_submitted -> validated -> waiting_approval -> approved` 测试。

## Research Findings

- Issue 02 已提供 `resolveSceneApprovalPolicy()` 和阶段 required artifacts。
- Issue 03 已提供 `writeSceneArtifact()`、`listSceneArtifacts()`、`readSceneArtifact()`，可作为产物事实源。
- `sceneforge/state.json` 当前由项目初始化写出，尚无读写状态机。
- 本票不应接入 Electron IPC、MCP、UI 或完整 Stage Pack。

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Design 提交输入采用 artifactKey 到 content 的映射 | 和 required artifact 清单一一对应，测试和后续 IPC 都容易使用 |
| Validator 错误码采用 `SCENE_DESIGN_MISSING_<KEY>` | 稳定、可断言、便于 UI/Agent 定位缺口 |
| 审批前要求状态为 `waiting_approval` | 防止 validation failed 或未提交阶段被直接 approve |
| Stage Context 返回 artifact 元数据与内容 | 后续 Agent/Runner 不需要扫描项目目录 |
| Service 入口拒绝未知 Design artifact key | 防止后续 IPC/MCP 传入额外 JSON 字段污染 manifest |

## Resources

- `.scratch/sceneforge-studio/issues/04-design-stage-validate-and-approve.md`
- `docs/superpowers/plans/2026-06-16-sceneforge-studio-core-flow.md`
- `docs/sceneforge/2026-06-16-sceneforge-domain-contracts.md`
- `electron/sceneforge/pipeline/scene-approval-policy.ts`
- `electron/sceneforge/pipeline/scene-stage-definitions.ts`
- `electron/sceneforge/artifacts/scene-artifact-store.ts`
