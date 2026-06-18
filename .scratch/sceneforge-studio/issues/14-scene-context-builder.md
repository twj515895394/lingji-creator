Status: ready-for-agent

# SceneContextBuilder 与受控 Stage Context

Type: AFK

## 父问题

- `.scratch/sceneforge-studio/PRD.md`
- 设计：`docs/sceneforge/2026-06-17-sceneforge-stage-context-and-handoff-design.md`
- 计划：Wave A2

## 要构建什么

实现 **`SceneContextBuilder`**，按 context-policy 组装 `requiredInputs` / `optionalInputs`（handoff_first、full、summary、pointer），接入已有 **`resolveSceneAssetsForStage`**。`SceneForgeService.getStageContext` **委托** builder，**删除**当前「上游 core 阶段全部 requiredArtifacts 全文」硬编码（含 video 9 文件行为）。

扩展 `SceneStageContext`：`delivery`、`source`、`warnings`、`handoffRefs`、可选 `runner` 与软预算。本票 **可不** 写 handoff 文件（handoff 缺失时走 fallback），但须为 Issue 15 预留接口。

## 验收标准

- [ ] `electron/sceneforge/pipeline/scene-context-builder.ts` 实现；`service.ts` 变薄编排。
- [ ] 更新 `tests/sceneforge-stage-context.test.ts`：video **不含** 9 全文；有 audio/performance 产物时出现在 context；storyboard 行为符合 policy。
- [ ] forbidden 项不出现在 inputs。
- [ ] `npx vitest run tests/sceneforge-stage-context.test.ts tests/sceneforge-service.test.ts` 通过；`npx tsc --noEmit` 通过。

## Review Checklist

- [ ] 单文件 ≤800 行；builder 与 service 职责分离。
- [ ] MCP `scene_get_stage_context` 行为与 service 一致（若本票改 service，同步 MCP 无额外逻辑）。

## 被阻塞于

- Issue 13：Context Policy 与 YAML 加载