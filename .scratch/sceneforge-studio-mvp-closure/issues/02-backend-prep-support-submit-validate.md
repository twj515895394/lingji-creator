Status: completed

## 父问题

`.scratch/sceneforge-studio-mvp-closure/PRD.md`

## 要构建什么

端到端扩展 **reference、story、assets** 的工坊写回与校验：扩展 `submitStageDraft` 支撑阶段配置（artifactKey 以 `scene-stage-definitions.ts` 为准：`reference_notes`、`story_direction`、`asset_plan`）；新增三阶段 validator 并注册到 `validateSceneStage`；扩展 IPC/MCP/preload/`electron-api` 的 submit、validate、approve stage 枚举。提交后行为与 intake/gate 一致（写 Artifact Store → 自动校验 → 状态机推进）。`scene_run_stage` 本 issue **可不**对三阶段开放 LLM。

## 验收标准

- [ ] 对测试项目 `sceneSubmitStageDraft` reference 写入 `reference_notes` 非空内容后 `validation.status === 'passed'`
- [ ] story、assets 同样可提交并通过结构校验
- [ ] 对 reference 调用 validate 不再返回 `UNSUPPORTED_STAGE_VALIDATOR`
- [ ] 非法 artifactKey 返回明确 `SceneForgeServiceError` / 契约错误码
- [ ] `npx vitest run tests/sceneforge-*.test.ts` 中新增或扩展用例通过；`npx tsc --noEmit`

## 被阻塞于

- `.scratch/sceneforge-studio-mvp-closure/issues/01-docs-and-adr.md`

## 类型说明

AFK